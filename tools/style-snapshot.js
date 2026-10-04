/* Computed-style snapshot (verification aid, not part of the site).
 *
 * Use before and after any CSS move (MIGRATION_PLAN Phase E2) to prove the cascade still resolves the same.
 * Paste into the console / javascript tool; it returns a JSON object keyed by selector with the computed values of
 * a fixed property list for the first few matching elements (+ their box size). Compare with tools/compare_json.py.
 *
 *   window.__SNAP_SELECTORS = ['.my-new-thing', ...];   // optional: replace the default selector list
 *   window.__SNAP_PROPS     = ['color', ...];            // optional: replace the property list
 *   window.__SAVE_AS = 'styles.desktop.json';            // optional: POST to tools/serve.py --save-dir
 *
 * Deliberately absent: .fan-card (auto-shuffles) and generic button/a (include creatures and tooltips).
 * Caveats: pieces that animate or are randomly placed (petals, birds, scattered blooms, plants mid-bloom) change on their own;
 * the default properties avoid transform/opacity/position for that reason, and the default selectors are structural.
 * Run at a stable moment (after load + a couple of seconds, scrolled to top) and at the same viewport width each time.
 */
(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const SELECTORS = window.__SNAP_SELECTORS || [
        'body', 'main', '.nav', '.nav a', '.m-header', '.hero', '.hero h1', '.hero-text',
        '.about-section', '.about-text', '.about-photo-wrap', '#experience', '#experience .section-title', '.garden', '.g-cat', '.g-stage',
        '#skills', '.herbarium', '.h-spec', '.gallery-section', '.gallery-frame', '.gallery-preview', '.preview-item',
        '.contact-section', '.contact-photo', '.social-link', 'footer', '.garden-bed',
        '.gallery-modal', '.gallery-modal-tab', '.gallery-modal-title', '#lightbox', '.lightbox-arrow', '.lightbox-info',
        '.vine', '.to-top', '.petals-canvas', '.page-bg', '.guide-bird', '.mb-bouquet', '.section-head', '.section-hint',
        'h1', 'h2', 'h3', 'p'
    ];
    const PROPS = window.__SNAP_PROPS || [
        'display', 'visibility', 'width', 'height', 'min-height', 'max-width', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
        'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'color', 'background-color', 'background-image', 'border-top-width',
        'border-top-color', 'border-radius', 'font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing', 'text-align',
        'z-index', 'overflow-x', 'overflow-y', 'flex-direction', 'justify-content', 'align-items', 'grid-template-columns', 'cursor', 'pointer-events'
    ];
    const PER_SELECTOR = 3;
    await wait(300);
    const out = { env: { innerWidth, innerHeight, url: location.pathname + location.search }, styles: {} };
    for (const sel of SELECTORS) {
        const els = [...document.querySelectorAll(sel)];
        out.styles[sel] = { count: els.length, sample: els.slice(0, PER_SELECTOR).map(el => {
            const cs = getComputedStyle(el), o = {};
            for (const p of PROPS) o[p] = cs.getPropertyValue(p);
            const r = el.getBoundingClientRect(); o.box = [Math.round(r.width), Math.round(r.height)];
            return o;
        }) };
    }
    if (window.__SAVE_AS) { try { await fetch('/__save/' + window.__SAVE_AS, { method: 'POST', body: JSON.stringify(out, null, 1) }); out.savedAs = window.__SAVE_AS; } catch (e) { out.saveError = e.message; } }
    return out;
})()
