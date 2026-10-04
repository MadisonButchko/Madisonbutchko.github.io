/* js/botanical/links.js
   Purpose : the "ways in": #links and data-goto/data-skill/data-open/data-gallery clicks (nav scrolling, hero interests, bouquet entries, cross-links between experiences and skills), the gallery opener/closer focus hand-off, and "a seed of curiosity" (the seed packet that sprouts a surprise piece of work).
   Owns    : openById (also published as ctx.openById for the bouquet), gotoItem, openGallery, the document click handler, the seed packet (bag draw, pour via plants.seeds, preview).
   Uses    : core.state (mem), botanical.content (+ ctx.xpStage / ctx.skStage, read at call time), plants.seeds (pour), gallery.gallery (openArtwork, buildCollage), gallery.artworks.
   Used by : legacy/190 orchestrator (start()).
   Mobile / reduced motion: unchanged; the seed pour is skipped (350 ms wait) under prefers-reduced-motion.
   Moved verbatim from legacy/190-botanical.js (Migration Step 13); behaviour, order and timing unchanged. */
MB.define('botanical.links', ['botanical.content', 'gallery.gallery', 'gallery.artworks', 'plants.seeds', 'core.state'], function (content, gallery, art, seeds, state) {
    'use strict';
    const { $, $$, wait, f1, clamp, reduce, fine, frame, settle, esc, plain, behavior, hash, rng, navH, focusQuiet, bringIntoView, visits, visit, EXP, SK, PIECE_WORD, ctx } = content;
    const { openArtwork, buildCollage } = gallery, artworks = art.artworks, mem = state.mem;

    function start() {
    ctx.openById = openById;
    /* ------------------------------------------------------------------
       Ways in: links, hero interests, bouquet, cross-links between
       experiences and skills
       ------------------------------------------------------------------ */
    function openById(id) {
        const { xpStage, skStage } = ctx;
        const [kind, cat] = id.split(':');
        if (kind === 'exp' && xpStage) xpStage.open(cat);
        else if (kind === 'skill' && skStage) skStage.open(cat);
    }
    function gotoItem(spec, opts) {
        const { xpStage } = ctx;
        const [cat, id] = spec.split(':'); if (!xpStage || !EXP[cat]) return false;
        const i = xpStage.indexOf(cat, id);
        xpStage.open(cat, Object.assign({ select: i < 0 ? null : i }, opts));
        return true;
    }
    let galleryOpener = null;
    function openGallery(filter, file) {
        const modal = $('#galleryModal'); if (!modal) return false;
        galleryOpener = document.activeElement;
        modal.classList.add('active'); document.body.style.overflow = 'hidden';
        const tab = filter ? $('.gallery-modal-tab[data-filter="' + filter + '"]') : null;
        if (tab) tab.click(); else if (typeof buildCollage === 'function') buildCollage();
        if (file && typeof openArtwork === 'function') openArtwork(file);
        setTimeout(() => focusQuiet(file ? $('#lightboxClose') : $('#galleryClose')), 50);
        return true;
    }
    const gClose = $('#galleryClose');
    if (gClose) gClose.addEventListener('click', () => { if (galleryOpener && document.contains(galleryOpener)) focusQuiet(galleryOpener); galleryOpener = null; });
    const prevw = $('#galleryPreview');
    if (prevw) {
        prevw.addEventListener('click', () => { galleryOpener = prevw; });
        prevw.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); prevw.click(); setTimeout(() => focusQuiet($('#galleryClose')), 50); } });
    }
    document.addEventListener('click', e => {
        const a = e.target.closest('a[href^="#"], [data-gallery]');
        if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey) return;
        if (a.dataset.gallery) { e.preventDefault(); openGallery(a.dataset.gallery); return; }
        if (a.dataset.open) { e.preventDefault(); openById(a.dataset.open); return; }
        if (a.dataset.goto) { e.preventDefault(); gotoItem(a.dataset.goto); return; }
        if (a.dataset.skill) { e.preventDefault(); const { skStage } = ctx; if (skStage) skStage.open(a.dataset.skill); return; }
        const id = a.getAttribute('href').slice(1); if (!id) return;
        const t = document.getElementById(id); if (!t) return;
        e.preventDefault();
        if (id === 'home') scrollTo({ top: 0, behavior: behavior() });
        else { const y = t.getBoundingClientRect().top - navH() - (id === 'about' ? 0 : 6); if (Math.abs(y) > 2) scrollBy({ top: y, behavior: behavior() }); }
        const h = t.querySelector('h2, h1'); if (h && !a.closest('.nav, .m-menu')) setTimeout(() => focusQuiet(h), reduce ? 0 : 450);
    });

    /* ------------------------------------------------------------------
       "A seed of curiosity": a surprise piece of work
       ------------------------------------------------------------------ */
    (function () {
        const packet = $('#seedPacket'), status = $('#seedStatus'); if (!packet || !status) return;
        const card = id => { for (const d of Object.values(EXP)) { const it = d.items.find(x => x.id === id); if (it) return it; } return null; };
        const CANDIDATES = [
            ...['xp-pinn', 'xp-energy', 'xp-biophysics', 'xp-tweezers', 'xp-mesophyll', 'xp-materials'].map(id => ({ key: id, type: 'card', cat: 'research', id })),
            { key: 'w-chinahands', type: 'link', cat: 'writing', id: 'xp-chinahands', url: 'https://chinahandsmagazine.org/author/madisonbutchko/', title: 'Articles in China Hands Magazine', source: 'China Hands Magazine', desc: 'Chinese history, technology & social issues.' },
            { key: 'w-hercampus', type: 'link', cat: 'writing', id: 'xp-hercampus', url: 'https://www.hercampus.com/author/maddie-butchko/', title: 'Articles in Her Campus at Yale', source: 'Her Campus at Yale', desc: 'Weekly lifestyle content.' },
            { key: 'w-ydn', type: 'link', cat: 'writing', id: 'xp-ydn', url: 'https://yaledailynews.com/author/madison-butchko', title: 'Columns in the Yale Daily News', source: 'Yale Daily News', desc: 'Personal essays with illustrations.' },
            { key: 'w-herald', type: 'link', cat: 'writing', id: 'xp-herald', url: 'https://yale-herald.com/2025/03/30/a-guide-to-achieving-perfect-skin/', title: 'A Guide to Achieving Perfect Skin', source: 'Yale Herald', desc: 'A personal essay.' },
            { key: 't-classrooms', type: 'link', cat: 'teaching', id: 'xp-gtp', url: 'https://globalteachingproject.com/2024/05/24/from-classrooms-to-change/', title: 'From Classrooms to Change', source: 'Global Teaching Project', desc: 'An article linked from the AP Physics Teaching Assistant role.' },
            { key: 't-beyond', type: 'link', cat: 'teaching', id: 'xp-gtp', url: 'https://globalteachingproject.com/2025/04/18/beyond-physics/', title: 'Beyond Physics', source: 'Global Teaching Project', desc: 'An article linked from the AP Physics Teaching Assistant role.' },
            ...['mandala_passion.png', 'Tulips.jpg', 'calligraphy3.jpg', 'face_full_of_stars.png', 'Little_prince_2.jpg', 'peonies.png', 'Reader.jpg', 'madeinchina.jpg'].map(file => ({ key: 'a-' + file, type: 'art', file }))
        ];
        const ARTS = typeof artworks !== 'undefined' ? artworks : [];
        const POOL = CANDIDATES.filter(it => it.type === 'art' ? ARTS.some(a => a.file === it.file) : !!card(it.id));
        POOL.forEach(it => {
            if (it.type === 'card') { const c = card(it.id); it.title = plain(c.role) + ', ' + plain(c.org).split('·')[0].trim(); }
            if (it.type === 'art') it.title = (ARTS.find(a => a.file === it.file) || {}).title || 'Artwork';
        });
        if (!POOL.length) { packet.closest('.seed-wrap').hidden = true; return; }
        const bagStore = mem('mb-seed-bag-v1', null);
        function draw() {
            const bag = bagStore.get() || { left: [], last: null };
            bag.left = (bag.left || []).filter(k => POOL.some(p => p.key === k));
            if (!bag.left.length) {
                const keys = POOL.map(p => p.key);
                for (let i = keys.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [keys[i], keys[j]] = [keys[j], keys[i]]; }
                if (keys.length > 1 && keys[0] === bag.last) keys.push(keys.shift());
                bag.left = keys;
            }
            const key = bag.left.shift(); bag.last = key; bagStore.set(bag);
            return POOL.find(p => p.key === key);
        }
        let busy = false, noteT = 0;
        function say(text, keep) { clearTimeout(noteT); status.innerHTML = '<p class="seed-note">' + esc(text) + '</p>'; if (!keep) noteT = setTimeout(() => { if (status.querySelector('.seed-note')) status.innerHTML = ''; }, 5000); }
        function preview(it) {
            clearTimeout(noteT);
            status.innerHTML = '<div class="seed-preview"><button type="button" class="sv-close" aria-label="Close preview">&times;</button><p class="sv-kicker">' + esc(it.source) + '</p><p class="sv-title">' + esc(it.title) + '</p><p class="sv-desc">' + esc(it.desc) + '</p>'
                + '<a class="sv-link" href="' + esc(it.url) + '" target="_blank" rel="noopener">Read on ' + esc(it.source) + ' <span aria-hidden="true">&#8599;&#xFE0E;</span><span class="vh"> (opens in a new tab)</span></a></div>';
            $('.sv-close', status).addEventListener('click', () => { status.innerHTML = ''; focusQuiet(packet); });
        }
        packet.addEventListener('click', () => {
            if (busy) return; busy = true;
            const it = draw();
            packet.classList.add('opening'); say('Sprouting: ' + it.title, true);
            const pour = MB.use('plants.seeds').pour(packet);   /* plants/seeds.js (was window.__eco.pour) */
            setTimeout(() => {
                packet.classList.remove('opening'); busy = false;
                if (it.type === 'card') { gotoItem(it.cat + ':' + it.id); say('Planted: ' + it.title); }
                else if (it.type === 'link') { gotoItem(it.cat + ':' + it.id, { focus: false }); preview(it); }
                else { say('Planted: ' + it.title); openGallery(null, it.file); }
            }, reduce ? 350 : Math.max(1300, pour + 250));
        });
    })();
    }

    return { start };
});
