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

    window.__eco = { pour };
})();
