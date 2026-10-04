/* js/environment/breeze.js
   Purpose : sunlight + wind: flowers near the cursor lean toward it by a few degrees; the corner sunflower turns its face to follow.
   Owns    : wind(arts): fast cursor passes make some plants bend away (one pointermove listener, rAF-throttled, sets --wd; fine pointers only, not under reduced motion). Sunlight: the pointermove/scroll/resize/mouseleave listeners and one rAF-throttled update (sets --sun on flowers, --face on .to-top .sf-sway).
   Uses    : core.utils ($, $$, clamp, f1, reduce, fine).   Used by: legacy/200-little-world.js calls start() at the spot the block used to run. and wind(arts) (Step 11)
   Mobile / reduced motion: nothing on touch / coarse pointers or under prefers-reduced-motion (checked once at start, as before).
   Moved verbatim from legacy/200 (Migration Step 10b) and ecosystem.js (wind, Step 11; called by plants/flowers.js at the spot it ran); behaviour, order and timing unchanged. */
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

    function wind(arts) {
        const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
        const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
        const f1 = n => Math.round(n * 10) / 10;       /* number-returning, as in the old ecosystem.js (not utils.f1) */
        /* fast cursor passes make a few plants bend away in a tiny breeze; slow ones are left to the "sun" lean */
        if (fine && !reduce) {
            const seeded = (k => () => (k = (k * 16807) % 2147483647) / 2147483647)(23);
            const windy = new Set(arts.filter(() => seeded() < 0.6));
            let lx = 0, ly = 0, lt = 0, q = 0, ev = null;
            addEventListener('pointermove', e => {
                ev = e; if (q) return;
                q = requestAnimationFrame(() => {
                    q = 0; const now = performance.now(), dt = Math.max(8, now - lt);
                    const vx = (ev.clientX - lx) / dt * 1000, vy = (ev.clientY - ly) / dt * 1000, sp = Math.hypot(vx, vy);
                    lx = ev.clientX; ly = ev.clientY; lt = now;
                    if (sp < 1300) return;
                    windy.forEach(a => {
                        if (now - (a._wt || 0) < 1500) return;
                        const r = a.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return;
                        const cx = r.left + r.width / 2, cy = r.top + r.height * 0.45;
                        if (Math.hypot(ev.clientX - cx, ev.clientY - cy) > 170) return;
                        a._wt = now;
                        a.style.setProperty('--wd', f1(clamp((cx - ev.clientX) / 120, -1, 1) * clamp(sp / 3200, 0.45, 1)));
                        setTimeout(() => a.style.setProperty('--wd', '0'), 200);   /* the property's own transition eases it home */
                    });
                });
            }, { passive: true });
        }

    }

    return { start, wind };
});
