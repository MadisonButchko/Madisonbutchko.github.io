/* Seed-packet pouring and ambient movement for Experience / Skills flowers.
   Loaded after script.js; exposes window.__eco.pour for the seed packet. */
(function () {
    'use strict';
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const $ = (s, r) => (r || document).querySelector(s);
    const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
    const rnd = (a, b) => a + Math.random() * (b - a);
    const f1 = n => Math.round(n * 10) / 10;
    const settle = (anim, ms) => new Promise(res => { let d = false; const f = () => { if (!d) { d = true; res(); } }; try { anim.onfinish = f; anim.oncancel = f; } catch (e) { } setTimeout(f, ms + 80); });

    /* ================================================================
       1. Seeds pour out of the packet
       ================================================================ */
    function arc(dx, dy, n, bounce) {
        /* gravity-like fall: x drifts, y accelerates; optional small bounce at the end. Returns translate keyframes. */
        const out = [];
        for (let i = 0; i <= n; i++) { const t = i / n; out.push({ x: dx * t, y: dy * t * t, t }); }
        if (bounce) {
            const h = bounce, steps = 6;
            for (let i = 1; i <= steps; i++) { const u = i / steps; out.push({ x: dx + bounce * 0.8 * u * (Math.random() < 0.5 ? -1 : 1) * 0.6 + bounce * 0.5 * u, y: dy - 4 * h * u * (1 - u), t: 1 + u * 0.35 }); }
        }
        return out;
    }
    function pour(packet) {
        if (reduce || !packet) return 0;
        const art = $('.seed-art', packet), host = packet.closest('.seed-wrap'); if (!art || !host) return 0;
        const hr = host.getBoundingClientRect(), ar = art.getBoundingClientRect();
        const gardenTop = (() => { const g = $('#expGarden .g-row'); return g ? g.getBoundingClientRect().top : ar.bottom + 180; })();
        /* the packet tilts toward its left: its mouth swings out to the left and a little below its centre */
        art.animate([{ rotate: '-6deg' }, { rotate: '-14deg', offset: 0.16 }, { rotate: '-112deg', offset: 0.45 }, { rotate: '-112deg', offset: 0.85 }, { rotate: '-6deg' }],
            { duration: 1650, easing: 'cubic-bezier(.3,.7,.3,1)' });
        const cx = ar.left + ar.width / 2 - hr.left, cy = ar.top + ar.height / 2 - hr.top;
        const mouthX = cx - 17, mouthY = cy + 8;
        const ground = Math.max(110, Math.min(250, gardenTop - (ar.top + ar.height / 2) + 6));
        const N = 11, nodes = [];
        for (let i = 0; i < N; i++) {
            const s = document.createElement('i'); s.className = 'pour-seed'; s.setAttribute('aria-hidden', 'true');
            const w = rnd(5, 9); s.style.cssText = 'width:' + f1(w) + 'px;height:' + f1(w * rnd(1.25, 1.7)) + 'px;left:' + f1(mouthX - w / 2) + 'px;top:' + f1(mouthY) + 'px;opacity:0';
            host.appendChild(s); nodes.push(s);
            const dx = -rnd(10, 80), dy = ground + rnd(-24, 22), fall = rnd(560, 820), delay = 420 + i * rnd(45, 85), spin = rnd(-300, 300);
            const ks = arc(dx, dy, 10, rnd(7, 15)).map(p => ({
                transform: 'translate(' + f1(p.x) + 'px,' + f1(p.y) + 'px) rotate(' + f1(spin * Math.min(1, p.t)) + 'deg)',
                opacity: p.t > 1.2 ? 0.95 : 1, offset: Math.min(1, p.t / 1.35)
            }));
            ks.unshift({ transform: 'translate(0,0) rotate(0deg) scale(.6)', opacity: 0, offset: 0 });
            ks[1].offset = Math.max(ks[1].offset, 0.02);
            const a = s.animate(ks, { duration: fall + 380, delay, easing: 'linear', fill: 'both' });
            settle(a, fall + 380 + delay).then(() => s.animate([{ opacity: 0.95 }, { opacity: 0 }], { duration: 380, fill: 'forwards' }).finished.then(() => s.remove(), () => s.remove()));
        }
        setTimeout(() => nodes.forEach(n => n.remove()), 3200);
        return 1500;
    }

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

        /* very rarely, a butterfly (or bee) drops by one of the flowers */
        if (!reduce) (function rare() {
            setTimeout(function () {
                const cats = $$('.g-cat .g-art').filter(a => { const r = a.getBoundingClientRect(); return r.width && r.top > 80 && r.bottom < innerHeight - 40; });
                if (!document.hidden && cats.length && window.__visitFlower && Math.random() < 0.7) window.__visitFlower(cats[Math.floor(Math.random() * cats.length)], 'butterfly');
                rare();
            }, rnd(90000, 170000));
        })();
    })();

    window.__eco = { pour };
})();
