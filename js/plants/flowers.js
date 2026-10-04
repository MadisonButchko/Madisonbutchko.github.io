/* js/plants/flowers.js
   Purpose : ambient life for the Experience / Skills flowers: each breathes at its own pace, pauses off screen, puffs pollen on click; a tactile ~230 ms click delay before content opens; a very rare butterfly visitor.
   Owns    : the ambient breathing styles, the off-screen IntersectionObserver, pollen(), the CAPTURE-PHASE click handler on document (replays a trusted click after 230 ms; none under reduced motion), the rare-visitor timer (calls window.__visitFlower from legacy/190).
   Uses    : core.utils ($, $$), environment.breeze (wind(arts), called right after the click handler, as before); reads window.__visitFlower at call time.
   Used by : nothing (self-running; loaded LAST, at the position ecosystem.js had, so listener and init order are unchanged).
   Mobile / reduced motion: unchanged: wind only on fine pointers and not under reduced motion; reduced motion = no click delay, no pollen, no visitor; touch taps still bloom.
   Moved verbatim from ecosystem.js (Migration Step 11); behaviour, order and timing unchanged. */
MB.define('plants.flowers', ['core.utils', 'environment.breeze'], function (utils) {
    'use strict';
    const { $, $$, reduce } = utils;
    const rnd = (a, b) => a + Math.random() * (b - a);
    const f1 = n => Math.round(n * 10) / 10;           /* number-returning, as in the old ecosystem.js (not utils.f1) */

    /* ================================================================
       2. Experience / Skills flowers: every one breathes at its own pace
       ================================================================ */
    (function ambient() {
        const seeded = (k => () => (k = (k * 16807) % 2147483647) / 2147483647)(11);
        $$('.g-art, .h-art').forEach((art, i) => {
            const r = seeded();
            art.style.setProperty('--amp', f1(0.7 + seeded() * 0.9));
            art.style.setProperty('--dir', seeded() < 0.5 ? -1 : 1);
            art.style.animationDuration = f1(5.2 + seeded() * 4.6) + 's';
            art.style.animationDelay = '-' + f1(seeded() * 9) + 's';
            const u = art.firstElementChild; if (u) { u.style.setProperty('--bd', f1(4.5 + seeded() * 4) + 's'); u.style.setProperty('--bl', '-' + f1(seeded() * 8) + 's'); u.style.setProperty('--bs', f1(1.8 + seeded() * 2.2)); }
        });
    })();

    /* ================================================================
       3. Living plants: breeze from fast cursor passes, a tactile click
          before content opens, a few grains of pollen, quiet off-screen,
          and a very rare visitor. One shared pointer listener for all.
       ================================================================ */
    (function alive() {
        const arts = $$('.g-art, .h-art');
        if (!arts.length) return;
        const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
        const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

        /* plants that are off-screen stop animating (and cost nothing) */
        if ('IntersectionObserver' in window) {
            const io = new IntersectionObserver(es => es.forEach(en => en.target.style.setProperty('--ps', en.isIntersecting ? 'running' : 'paused')), { rootMargin: '120px' });
            arts.forEach(a => io.observe(a));
        }

        /* pollen: 3-6 tiny pastel dots that drift up and fade; never repeated quickly from the same flower */
        const PAL = ['#f6d36b', '#f9c6d6', '#fff1cc', '#cbb9ea', '#f4a7bf'];
        function pollen(art) {
            if (reduce || !art || performance.now() - (art._pol || 0) < 1400) return;
            art._pol = performance.now();
            const r = art.getBoundingClientRect(); if (!r.width) return;
            const n = 3 + Math.floor(Math.random() * 4);
            for (let i = 0; i < n; i++) {
                const d = document.createElement('i'), sz = rnd(2, 3.4), x = r.left + r.width * rnd(0.3, 0.7), y = r.top + r.height * rnd(0.18, 0.42);
                d.setAttribute('aria-hidden', 'true');
                d.style.cssText = 'position:fixed;left:' + f1(x) + 'px;top:' + f1(y) + 'px;width:' + f1(sz) + 'px;height:' + f1(sz) + 'px;border-radius:50%;background:' + PAL[i % PAL.length] + ';pointer-events:none;z-index:60;opacity:0';
                document.body.appendChild(d);
                const dx = rnd(-18, 18), dy = rnd(-26, -8), dur = rnd(520, 780);
                d.animate([{ transform: 'translate(0,0)', opacity: 0.9 }, { transform: 'translate(' + f1(dx) + 'px,' + f1(dy) + 'px)', opacity: 0.8, offset: 0.55 }, { transform: 'translate(' + f1(dx * 1.25) + 'px,' + f1(dy + 8) + 'px)', opacity: 0 }],
                    { duration: dur, delay: i * 40, easing: 'cubic-bezier(0.22,1,0.36,1)' }).onfinish = () => d.remove();
            }
        }

        /* click / tap: the flower reacts first (about 230ms), then the content opens */
        let go = null;
        document.addEventListener('click', e => {
            const b = e.target.closest && e.target.closest('.g-cat, .h-spec'); if (!b) return;
            if (b._go) return;                      /* this is the replayed click: let it through */
            const art = $('.g-art, .h-art', b);
            b.classList.add('is-bloom'); clearTimeout(b._bt); b._bt = setTimeout(() => b.classList.remove('is-bloom'), 700);
            pollen(art);
            if (reduce || !e.isTrusted) return;     /* reduced motion: no delay at all; scripted clicks pass straight through */
            e.stopImmediatePropagation(); e.preventDefault();
            if (b._pend) return; b._pend = true;
            setTimeout(() => { b._pend = false; b._go = true; try { b.click(); } finally { b._go = false; } }, 230);
        }, true);

        /* fast cursor passes (js/environment/breeze.js) */
        MB.use('environment.breeze').wind(arts);

        /* very rarely, a butterfly (or bee) drops by one of the flowers */
        if (!reduce) (function rare() {
            setTimeout(function () {
                const cats = $$('.g-cat .g-art').filter(a => { const r = a.getBoundingClientRect(); return r.width && r.top > 80 && r.bottom < innerHeight - 40; });
                if (!document.hidden && cats.length && window.__visitFlower && Math.random() < 0.7) window.__visitFlower(cats[Math.floor(Math.random() * cats.length)], 'butterfly');
                rare();
            }, rnd(90000, 170000));
        })();
    })();

    return {};
});
