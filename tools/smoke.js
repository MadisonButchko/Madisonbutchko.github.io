/* Console smoke test + fingerprint (verification aid, not part of the site).
 *
 * Paste into the browser console (or run through the Browser pane's javascript tool) on a page opened with
 *   /?gardendebug&worlddebug&v11debug
 * It scrolls the whole page, opens and closes the gallery/lightbox and one Experience + one Skills plant,
 * pokes the debug hooks, and returns a JSON fingerprint: element counts, DOM node counts (to catch leaks),
 * storage keys, errors raised while it ran, and the debug state objects.
 * Set  window.__SAVE_AS = 'name.json'  first and (with tools/serve.py --save-dir) it POSTs the result to disk.
 * Compare two fingerprints with tools/compare_json.py.
 *
 * It does NOT catch errors raised before it was pasted: also read the console log of the page load
 * (read_console_messages) for the "zero errors on load" check.
 * Counts of random decorations (blooms, birds, ...) jitter a little between runs: compare with a tolerance.
 * It cannot emulate reduced motion; that check stays manual (see tools/README.md).
 */
(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const $ = (s, r) => (r || document).querySelector(s);
    const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
    const errors = [];
    const onErr = e => errors.push(String(e.message || e.reason || e));
    addEventListener('error', onErr); addEventListener('unhandledrejection', onErr);
    const step = {};
    const safe = async (name, fn) => { try { step[name] = await fn(); } catch (e) { step[name] = 'THREW: ' + e.message; errors.push(name + ': ' + e.message); } };
    const esc = () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    const COUNTS = {
        nav: '.nav', mobileHeader: '.m-header', sections: 'main > section', hero: '.hero', fanCards: '.fan-card',
        petalCanvases: '.petals-canvas', pageBg: '.page-bg', toTop: '.to-top',
        expFlowers: '#expGarden .g-cat', skillSpecimens: '#skillGarden .h-spec', previewItems: '#galleryPreview .preview-item',
        vines: '.vine', gardenBed: '.garden-bed', reveal: '.reveal', revealVisible: '.reveal.visible',
        svgSymbols: 'symbol', templates: 'template', scatter: '.scatter', letters: '.ltr',
        guideBird: '.guide-bird', bouquet: '.mb-bouquet', dandelions: '[class*="dand"]', collageItems: '.collage-item'
    };
    const count = () => Object.fromEntries(Object.entries(COUNTS).map(([k, s]) => [k, $$(s).length]));
    const nodes = () => document.querySelectorAll('*').length;

    const env = {
        innerWidth, innerHeight, dpr: devicePixelRatio,
        reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
        finePointer: matchMedia('(hover: hover) and (pointer: fine)').matches,
        url: location.pathname + location.search
    };
    const before = { counts: count(), nodes: nodes(), docHeight: document.documentElement.scrollHeight };

    await safe('scrollWholePage', async () => {
        const H = () => document.documentElement.scrollHeight;
        for (let y = 0; y < H() - innerHeight; y += Math.round(innerHeight * 0.8)) { scrollTo(0, y); await wait(350); }
        scrollTo(0, H()); await wait(2500);                        /* footer garden builds and settles */
        return { docHeightAtBottom: H() };
    });
    const afterScroll = { counts: count(), nodes: nodes() };

    await safe('gallery', async () => {
        const out = {};
        $('#galleryPreview').click(); await wait(700);
        out.modalOpen = $('#galleryModal').classList.contains('active');
        out.tilesAll = $$('.collage-item').length;
        out.tilesByFilter = {};
        for (const t of $$('.gallery-modal-tab')) { t.click(); await wait(350); out.tilesByFilter[t.dataset.filter] = $$('.collage-item').length; }
        $('.gallery-modal-tab[data-filter="all"]').click(); await wait(350);
        const first = $('.collage-item'); if (first) { first.click(); await wait(500); }
        out.lightboxOpen = $('#lightbox').classList.contains('active');
        out.lightboxTitle = ($('#lightboxTitle') || {}).textContent || '';
        $('#lightboxNext').click(); await wait(300);
        out.lightboxCounterAfterNext = ($('#lightboxCounter') || {}).textContent || '';
        esc(); await wait(300);
        out.lightboxClosedByEscape = !$('#lightbox').classList.contains('active');
        esc(); await wait(400);
        out.modalClosedByEscape = !$('#galleryModal').classList.contains('active');
        out.bodyScrollRestored = document.body.style.overflow !== 'hidden';
        return out;
    });

    for (const [name, sel, stage] of [['experience', '#expGarden .g-cat', '#xpStage'], ['skills', '#skillGarden .h-spec', '#skStage']]) {
        await safe(name, async () => {
            const b = $(sel); b.scrollIntoView({ block: 'center' }); await wait(500);
            b.click(); await wait(1600);                            /* ~230 ms bloom, then the flight and growth */
            const st = $(stage);
            const out = { stageVisible: !!st && !st.hidden, buds: $$('.gs-bud', st).length, noteText: (($('.xl-item, .g-note, .note', st) || {}).textContent || '').trim().slice(0, 60) };
            esc(); await wait(1500);
            out.closedByEscape = !st || st.hidden || !st.classList.contains('open');
            return out;
        });
    }

    await safe('debugHooks', async () => {
        const out = {};
        if (window.__world) {
            for (const k of ['seed', 'steal', 'rain', 'nestVisit']) { try { window.__world[k](); out['world.' + k] = 'ok'; } catch (e) { out['world.' + k] = 'THREW ' + e.message; errors.push('world.' + k + ': ' + e.message); } await wait(600); }
            out.worldState = JSON.parse(JSON.stringify(window.__world.state || {}));
        } else out.world = 'hook absent (open with ?worlddebug)';
        if (window.__story) { try { window.__story.advance(); out.story = 'ok'; } catch (e) { out.story = 'THREW ' + e.message; } }
        if (window.__garden) {
            for (const k of ['spawnPest', 'spawnDeer']) { try { window.__garden[k](); out['garden.' + k] = 'ok'; } catch (e) { out['garden.' + k] = 'THREW ' + e.message; errors.push('garden.' + k + ': ' + e.message); } await wait(600); }
            try { out.gardenState = JSON.parse(JSON.stringify(window.__garden.state())); delete out.gardenState.saved; /* random plant list */ } catch (e) { out.gardenState = 'THREW ' + e.message; }
        } else out.garden = 'hook absent (open with ?gardendebug)';
        await wait(2500);
        return out;
    });

    scrollTo(0, 0); await wait(3500);
    const idleA = nodes(); await wait(3000); const idleB = nodes();

    removeEventListener('error', onErr); removeEventListener('unhandledrejection', onErr);
    const store = s => Object.fromEntries(Object.keys(s).filter(k => k.startsWith('mb-')).map(k => [k, s.getItem(k).length]));
    const globalsOfInterest = ['Life', 'World', 'GardenLog', '__fx', '__eco', '__rainbow', '__spin', '__story', '__guideBird', '__visitFlower',
        '__vineUpdate', '__vineQ', '__vineBonus', '__vineSprigs', '__onVineLayout', '__onVineTick', '__birdSVG', '__cloudSVG', '__gm',
        '__deerSVG', '__scatterPlace', '__adoptFlowers', '__garden', '__world', '__dand', '__vineDebug'];
    const result = {
        env, before, afterScroll, steps: step,
        domNodes: { start: before.nodes, afterScroll: afterScroll.nodes, idleA, idleB, idleDrift: idleB - idleA },
        errorsDuringRun: errors,
        storage: { local: store(localStorage), session: store(sessionStorage) },
        globalsPresent: Object.fromEntries(globalsOfInterest.map(k => [k, typeof window[k]]))
    };
    if (window.__SAVE_AS) { try { await fetch('/__save/' + window.__SAVE_AS, { method: 'POST', body: JSON.stringify(result, null, 1) }); result.savedAs = window.__SAVE_AS; } catch (e) { result.saveError = e.message; } }
    return result;
})()
