/* js/plants/seeds.js
   Purpose : dandelion seeds that took root: small flowers that appear later, further down the page, while that spot is out of sight.
   Owns    : pour (the seed packet pouring seeds; was window.__eco.pour), SECTIONS (the page's section order), sprouts() (draws the saved sprouts, reveals each while unseen), plantSeed() (adds one, at most 4).
   Uses    : core.state (WorldState, GardenLog), core.utils (rand), core.safe-zones (whenUnseen).
   Used by : legacy/190-botanical.js (pour, when the packet is opened), legacy/200-little-world.js (the 1.5 s first draw, window.World.plantSeed, the ?worlddebug hook).
   Mobile / reduced motion: no motion of its own; persists in WorldState.sprouts.
   Moved verbatim from legacy/200 (Migration Step 10a) and ecosystem.js (pour, Step 11); behaviour, order and timing unchanged. */
MB.define('plants.seeds', ['core.state', 'core.utils', 'core.safe-zones'], function (state, utils, zones) {
    'use strict';
    const { rand, $, reduce } = utils, { whenUnseen } = zones, GardenLog = state.GardenLog;
    const W = state.WorldState.get();
    const save = () => state.WorldState.save();
    const rnd = (a, b) => a + Math.random() * (b - a);
    const f1 = n => Math.round(n * 10) / 10;           /* number-returning, as in the old ecosystem.js (not utils.f1) */
    const settle = (anim, ms) => new Promise(res => { let d = false; const f = () => { if (!d) { d = true; res(); } }; try { anim.onfinish = f; anim.oncancel = f; } catch (e) { } setTimeout(f, ms + 80); });
    const SECTIONS = ['home', 'about', 'experience', 'skills', 'gallery', 'contact'];
    /* seeds that took root: small flowers along the bottom of a later section */
    function sprouts() {
        W.sprouts.forEach((sp, k) => {
            const sec = document.getElementById(sp.sec); if (!sec) return;
            let f = sec.querySelector('.w-sprout[data-k="' + k + '"]');
            const reveal = () => {
                if (f) return;
                f = document.createElement('div'); f.className = 'w-sprout'; f.dataset.k = k; f.setAttribute('aria-hidden', 'true');
                const col = ['#fbe7a1', '#f9c6d6', '#d9cbf3'][k % 3], kind = sp.type || 'daisy';
                const stem = '<path d="M12 40 C11 32 13 24 12 14" stroke="#8db36a" stroke-width="1.4" fill="none"/><path d="M12 30 C7 28 5 24 5 21 C9 23 11 26 12 30Z" fill="#9fbe88"/>';
                f.innerHTML = '<svg viewBox="0 0 24 40">' + (kind === 'sprout' ? '<path d="M12 40 C11 34 13 30 12 26" stroke="#8db36a" stroke-width="1.4" fill="none"/><path d="M12 27 C6 26 3 21 4 17 C9 18 12 22 12 27Z" fill="#9fbe88"/><path d="M12 28 C17 26 20 22 20 18 C15 19 12 23 12 28Z" fill="#8db36a"/>'
                    : kind === 'dandelion' ? stem + '<use href="#fl-daisy" x="4" y="6" width="16" height="16" style="color:#f6cf3a;--center:#e0a020"/>'
                    : stem + '<use href="#fl-daisy" x="2" y="4" width="20" height="20" style="color:' + col + ';--center:#f2c230"/>') + '</svg>';
                if (GardenLog) GardenLog.add({ id: 'sprout:' + k + ':' + sp.sec, kind: 'sprout', sym: kind === 'sprout' ? 'fl-leaf' : 'fl-daisy', color: kind === 'dandelion' ? '#f6cf3a' : kind === 'sprout' ? '#8db36a' : col, center: '#f2c230' });
                f.style.left = (sp.fx * 100).toFixed(1) + '%';
                sec.appendChild(f); sp.shown = true; save();
            };
            if (sp.shown) reveal(); else if (!f) whenUnseen(sec, reveal);
        });
    }
    /* a dandelion seed that took root: it shows up later, further down, while that spot is out of sight */
    function plantSeed(fromId) {
        if (W.sprouts.length >= 4) return false;
        const here = SECTIONS.indexOf(fromId), next = SECTIONS[Math.min(SECTIONS.length - 1, Math.max(1, here + 1 + (Math.random() < 0.5 ? 1 : 0)))];
        W.sprouts.push({ sec: next, fx: rand(0.06, 0.94), shown: false, type: ['daisy', 'sprout', 'dandelion'][Math.floor(Math.random() * 3)] });
        save(); sprouts(); return true;
    }

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

    return { sprouts, plantSeed, pour };
});
