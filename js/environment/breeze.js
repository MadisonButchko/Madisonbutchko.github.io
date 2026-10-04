/* js/environment/breeze.js
   Purpose : sunlight: flowers near the cursor lean toward it by a few degrees; the corner sunflower turns its face to follow.
   Owns    : the pointermove/scroll/resize/mouseleave listeners and one rAF-throttled update (sets --sun on flowers, --face on .to-top .sf-sway).
   Uses    : core.utils ($, $$, clamp, f1, reduce, fine).   Used by: legacy/200-little-world.js calls start() at the spot the block used to run. (Wind joins here later.)
   Mobile / reduced motion: nothing on touch / coarse pointers or under prefers-reduced-motion (checked once at start, as before).
   Moved verbatim from legacy/200 (Migration Step 10b); behaviour, order and timing unchanged. */
MB.define('environment.breeze', ['core.utils'], function (utils) {
    'use strict';
    const { $, $$, clamp, f1, reduce, fine } = utils;

    function start() {
    /* ------------------------------------------------------------------
       Sunlight: flowers near the cursor lean toward it by a few degrees;
       the sunflower in the corner turns its face to follow, slowly.
       ------------------------------------------------------------------ */
    if (fine && !reduce) {
        const SEL = '.g-art, .h-art, .hello-flower, .w-dandelion:not([hidden]), .page-posy, .w-sprout, .v11-bud';   /* flowers with stems: a tilt reads on them (on a turning bloom it would not) */
        let items = [], dirty = true, q = 0, px = -1e4, py = -1e4;
        const sun = $('.to-top .sf-sway'), sunHost = $('.to-top');
        const refresh = () => { items = $$(SEL).map(el => ({ el, r: el.getBoundingClientRect() })).filter(o => o.r.width && o.r.bottom > -50 && o.r.top < innerHeight + 50); dirty = false; };
        addEventListener('scroll', () => { dirty = true; }, { passive: true });
        addEventListener('resize', () => { dirty = true; });
        addEventListener('pointermove', e => {
            px = e.clientX; py = e.clientY; if (q) return;
            q = requestAnimationFrame(() => {
                q = 0; if (dirty) refresh();
                const R = 240;
                items.forEach(o => {
                    const cx = o.r.left + o.r.width / 2, cy = o.r.top + o.r.height * 0.45, dx = px - cx, dy = py - cy, d = Math.hypot(dx, dy);
                    const tilt = d < R ? clamp(dx / (d || 1) * 7 * (1 - d / R) * (dy < 0 ? 1 : 0.6), -6, 6) : 0;
                    if (Math.abs((o.t || 0) - tilt) > 0.15) { o.t = tilt; o.el.style.setProperty('--sun', f1(tilt) + 'deg'); }
                });
                if (sun) {
                    const r = sunHost.getBoundingClientRect(), dx = px - (r.left + r.width / 2), d = Math.hypot(dx, py - r.top);
                    sun.style.setProperty('--face', f1(d < 1100 ? clamp(dx / 22, -24, 24) : 0) + 'deg');   /* the one flower that follows noticeably, still within a gentle range */
                }
            });
        }, { passive: true });
        document.addEventListener('mouseleave', () => { items.forEach(o => { o.t = 0; o.el.style.setProperty('--sun', '0deg'); }); if (sun) sun.style.setProperty('--face', '0deg'); });
    }
    }
    return { start };
});
