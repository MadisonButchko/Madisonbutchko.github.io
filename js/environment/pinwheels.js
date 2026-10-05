/* js/environment/pinwheels.js
   Purpose : three small decorative pinwheels (pink/lilac, sunny yellow/peach, mint/sky) resting in open space in the hero, Experience and Skills sections. Hover (mouse) spins one gently; a click or tap spins it faster and it eases back down; quick repeated clicks build momentum, and after about five in a row it spins very fast, shimmers pastel, lets a few sparkles and petals drift off, and sets a tiny breeze going that sways only the nearby flowers; after more clicks it sometimes shows one tiny handwritten line beside it.
   Owns    : the .pinwheel elements (placement, hover/click/keyboard handling, the spin loop, shimmer, sparkles/petals, local breeze, the occasional phrase) and their re-layout on load/resize/section height change.
   Uses    : core.utils, core.particles (FX budget for every sparkle/petal), core.safe-zones (contentRects). Read-only geometry of other features (never mutated): .vine, .wild, .snail, .bn, .guide-bird, .hero-flowers .bloom, .about-bloom. The breeze only sets --wd on .g-art/.h-art (their existing wind hook) and adds a short additive `rotate` animation to a few nearby decorative flowers.
   Used by : js/main.js (start(), after the nest). One rAF loop shared by all three, running only while a pinwheel is spinning; no timer, scheduler or global pointer listener of its own.
   Placement: each pinwheel has a section and hand-picked anchor spots (tried in order, then random tries); a spot must clear all text, images, controls and other decorations by a wide margin and stay out of the side-vine band. No clear spot: that pinwheel stays hidden (so phones usually show fewer).
   Mobile / reduced motion: smaller under 700 px; tap = click. Hover does nothing on touch. Under prefers-reduced-motion a click only turns the pinwheel a little (no loop, shimmer, particles, breeze or text). */
MB.define('environment.pinwheels', ['core.utils', 'core.particles', 'core.safe-zones'], function (utils, particles, zones) {
    'use strict';
    const { $, $$, rand, pick, clamp, f1, reduce } = utils, { FX } = particles, { contentRects } = zones;

    const SLOTS = [   /* [fraction across the space between the vine bands, fraction down the section (the head's centre)] */
        { sel: '#home', at: [[0.06, 0.2], [0.94, 0.2], [0.07, 0.5], [0.93, 0.5], [0.05, 0.78], [0.95, 0.78]], c: ['#f4a7bf', '#b9a2de'], glow: '#d46b98', ink: '#8a3b63' },
        { sel: '#experience', at: [[0.07, 0.3], [0.93, 0.3], [0.06, 0.62], [0.94, 0.62], [0.5, 0.96]], c: ['#f2c230', '#ffc9a3'], glow: '#e0a41a', ink: '#8a5a12' },
        { sel: '#skills', at: [[0.06, 0.18], [0.94, 0.18], [0.07, 0.88], [0.93, 0.88], [0.5, 0.97]], c: ['#8fd0b0', '#9fd0ea'], glow: '#5aa98a', ink: '#2f6a56' }
    ];
    const SAYINGS = ['you’re blowing me away', 'wheee!', 'okay, okay!', 'that’s a lot of wind', 'you’re really making it spin'];
    const SPARK = '#fff6c8,#ffd9e6,#e6dcff,#d6f2e4,#d4ecfa'.split(',');
    const HOVER = 150, MAXW = 1100, CHAIN = 1400;   /* hover speed, top speed (deg/s), max ms between clicks that still count as a streak */
    const BURST = 5, SAYS = 7;                       /* streak length for the burst effects / for a chance of a phrase */

    const size = () => innerWidth < 700 ? { w: 40, h: 74 } : { w: 54, h: 98 };
    const vineBand = () => innerWidth >= 1240 ? 160 : innerWidth >= 700 ? 70 : 52;
    const boxOf = (x, y, s) => ({ l: x, t: y, r: x + s.w, b: y + s.h });
    const hit = (b, rs, m) => rs.some(r => r.l < b.r + m && r.r > b.l - m && r.t < b.b + m && r.b > b.t - m);

    const art = (c) => '<span class="pw-halo"></span><span class="pw-stick"></span>'
        + '<svg class="pw-head" viewBox="0 0 64 64" aria-hidden="true">'
        + [0, 1, 2, 3].map(i => '<g transform="rotate(' + i * 90 + ' 32 32)"><path d="M32 32 L32 3 C48 5 52 21 40 30 Z" fill="' + c[i % 2] + '"/><path d="M32 32 L40 30 C37 22 33 14 32 3 Z" fill="#fff" opacity=".32"/></g>').join('')
        + '<circle cx="32" cy="32" r="3.6" fill="#fffaf0" stroke="rgba(110,80,50,.35)" stroke-width="1"/></svg>';

    const pws = [];
    let raf = 0, last = 0, started = false, lastW = innerWidth;

    /* ------------------------------------------------------------------
       Geometry (section coordinates)
       ------------------------------------------------------------------ */
    function obstacles(pw) {
        const sr = pw.sec.getBoundingClientRect();
        const rel = (r, m) => ({ l: r.left - sr.left - m, r: r.right - sr.left + m, t: r.top - sr.top - m, b: r.bottom - sr.top + m });
        const out = contentRects(pw.sec).map(r => rel(r, 0));
        $$('.vine, .wild, .snail:not([hidden]), .bn, .guide-bird, .hero-flowers .bloom, .about-bloom').forEach(v => { const r = v.getBoundingClientRect(); if (r.width) out.push(rel(r, 10)); });
        pws.forEach(o => { if (o !== pw && !o.el.hidden) { const r = o.el.getBoundingClientRect(); out.push(rel(r, 120)); } });   /* keep pinwheels well apart */
        const vb = vineBand(), W = document.documentElement.clientWidth;
        out.push({ l: -sr.left - 999, r: vb - sr.left, t: -99999, b: 99999 }, { l: W - vb - sr.left, r: W - sr.left + 999, t: -99999, b: 99999 });
        return out;
    }
    const inBounds = (pw, b) => {
        const sr = pw.sec.getBoundingClientRect(), W = document.documentElement.clientWidth;
        return sr.left + b.l >= 8 && sr.left + b.r <= W - 8 && b.t >= (pw.slot === 0 ? 100 : 4) && b.b <= sr.height - 4;   /* the hero keeps clear of the fixed nav pill at the top */
    };
    const margin = () => innerWidth < 700 ? 16 : 24;
    const valid = pw => { const b = boxOf(pw.x, pw.y, pw); return inBounds(pw, b) && !hit(b, obstacles(pw), margin()); };

    function findSpot(pw) {
        const sr = pw.sec.getBoundingClientRect(), W = document.documentElement.clientWidth, blocks = obstacles(pw), vb = vineBand(), m = margin();
        for (const [fx, fy] of SLOTS[pw.slot].at) {
            const b = boxOf(vb + fx * (W - 2 * vb) - sr.left - pw.w / 2, sr.height * fy - pw.w / 2, pw);
            if (inBounds(pw, b) && !hit(b, blocks, m)) return { x: b.l, y: b.t };
        }
        for (let k = 0; k < 50; k++) {
            const left = Math.random() < 0.5, x = left ? rand(vb, vb + (W - 2 * vb) * 0.3) : rand(W - vb - (W - 2 * vb) * 0.3 - pw.w, W - vb - pw.w);
            const b = boxOf(x - sr.left, rand(0.1, 0.9) * sr.height - pw.w / 2, pw);
            if (inBounds(pw, b) && !hit(b, blocks, m)) return { x: b.l, y: b.t };
        }
        return null;
    }
    function put(pw, spot) { pw.x = Math.round(spot.x); pw.y = Math.round(spot.y); pw.el.style.left = pw.x + 'px'; pw.el.style.top = pw.y + 'px'; }

    /* ------------------------------------------------------------------
       The spin: one rAF loop for all three, only while something moves
       ------------------------------------------------------------------ */
    function frame(t) {
        raf = 0;
        const dt = Math.min(0.05, (t - last) / 1000); last = t;
        let alive = false;
        for (const pw of pws) {
            if (pw.el.hidden) continue;
            const target = pw.hover ? HOVER : 0;
            pw.spd += (target - pw.spd) * (1 - Math.exp(-dt * (pw.spd > target ? 1.25 : 4)));   /* eases back down slowly, picks up quicker */
            if (!pw.hover && pw.spd < 0.6) pw.spd = 0;
            pw.angle = (pw.angle + pw.spd * dt) % 360;
            pw.head.style.transform = 'rotate(' + f1(pw.angle) + 'deg)';
            if (pw.spd > 0 || pw.hover) alive = true;
        }
        if (alive) raf = requestAnimationFrame(frame);
        else pws.forEach(pw => { pw.head.style.willChange = ''; });
    }
    function kick() {
        if (raf) return;
        pws.forEach(pw => { pw.head.style.willChange = 'transform'; });
        last = performance.now(); raf = requestAnimationFrame(frame);
    }

    /* ------------------------------------------------------------------
       Effects (all short-lived and drawn from the shared particle budget)
       ------------------------------------------------------------------ */
    const later = (pw, fn, ms) => { const id = setTimeout(() => { pw.t = pw.t.filter(x => x !== id); fn(); }, ms); pw.t.push(id); };
    const centre = pw => { const r = pw.head.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };

    function sparkle(pw) {
        const n = FX.room(innerWidth < 700 ? 3 : 5), cfg = SLOTS[pw.slot];
        for (let i = 0; i < n; i++) {
            const s = document.createElement('span'), petal = i % 2 === 1, d = rand(0, Math.PI * 2), dist = rand(34, 72);
            s.className = petal ? 'pw-bit pw-petal' : 'pw-bit pw-spark'; s.setAttribute('aria-hidden', 'true');
            s.style.setProperty('--bc', petal ? cfg.c[0] : pick(SPARK));
            pw.el.appendChild(s);
            const a = s.animate([
                { transform: 'translate(0,0) scale(.3) rotate(0deg)', opacity: 0 },
                { transform: 'translate(' + f1(Math.cos(d) * dist * 0.5) + 'px,' + f1(Math.sin(d) * dist * 0.5 - 6) + 'px) scale(1) rotate(' + f1(rand(-90, 90)) + 'deg)', opacity: 1, offset: 0.35 },
                { transform: 'translate(' + f1(Math.cos(d) * dist) + 'px,' + f1(Math.sin(d) * dist + (petal ? 18 : 0)) + 'px) scale(.2) rotate(' + f1(rand(-200, 200)) + 'deg)', opacity: 0 }
            ], { duration: rand(1100, 1700), easing: 'ease-out', fill: 'forwards' });
            FX.track(s, a, 2200);
        }
    }

    /* only what is close to this pinwheel sways: a few flowers and leaves */
    const SWAY = '.g-art, .h-art, .scatter, .page-posy, .wild, .hero-flowers .bloom, .about-bloom, .title-bloom';
    function breeze(pw) {
        const c = centre(pw), R = innerWidth < 700 ? 120 : 190;
        const near = $$(SWAY).map(el => { const r = el.getBoundingClientRect(); return { el, d: r.width ? Math.hypot(r.left + r.width / 2 - c.x, r.top + r.height / 2 - c.y) : 1e9, dx: r.left + r.width / 2 - c.x }; })
            .filter(o => o.d < R).sort((a, b) => a.d - b.d).slice(0, 6);
        near.forEach(({ el, d, dx }) => {
            const k = (1 - d / R) * (dx < 0 ? -1 : 1);
            if (el.matches('.g-art, .h-art')) {   /* their own wind hook: the property's transition eases it home */
                el.style.setProperty('--wd', f1(clamp(k * 1.4, -1, 1)));
                later(pw, () => el.style.setProperty('--wd', '0'), 700);
            } else if (el.animate) {
                try { el.animate([{ rotate: '0deg' }, { rotate: f1(k * 9) + 'deg' }, { rotate: f1(-k * 5) + 'deg' }, { rotate: '0deg' }], { duration: 1500, easing: 'ease-in-out', composite: 'add' }); } catch (e) { }
            }
        });
    }

    function say(pw) {
        if (pw.say) return;
        const sr = pw.sec.getBoundingClientRect(), blocks = obstacles(pw).filter(r => r.l > -900 && r.r < 99999), line = pick(SAYINGS.filter(s => s !== pw.lastSay)), tw = Math.round(line.length * 7.2 + 14), th = 26;
        let side = null;
        for (const s of (pw.x + sr.left > innerWidth / 2 ? ['l', 'r'] : ['r', 'l'])) {   /* the side with room first; skip the phrase if neither is clear */
            const x = s === 'l' ? pw.x - 6 - tw : pw.x + pw.w + 6, b = boxOf(x, pw.y + 2, { w: tw, h: th });
            if (inBounds(pw, b) && !hit(b, blocks, 2)) { side = s; break; }
        }
        if (!side) return;
        const el = document.createElement('span'); el.className = 'pw-say is-' + side; el.setAttribute('aria-hidden', 'true'); el.textContent = line;
        el.style.color = SLOTS[pw.slot].ink; pw.el.appendChild(el); pw.say = el; pw.lastSay = line; pw.lastSayAt = performance.now();
        later(pw, () => { el.remove(); if (pw.say === el) pw.say = null; }, 2600);
    }

    /* ------------------------------------------------------------------
       Interaction
       ------------------------------------------------------------------ */
    function poke(pw) {
        if (reduce) {   /* a small, calm turn and nothing else */
            pw.angle += 55; pw.head.style.transition = 'transform .7s ease-out'; pw.head.style.transform = 'rotate(' + pw.angle + 'deg)';
            return;
        }
        const now = performance.now();
        pw.streak = now - pw.lastClick < CHAIN ? pw.streak + 1 : 1; pw.lastClick = now;
        pw.spd = Math.min(MAXW, pw.spd + 240 + 85 * Math.min(pw.streak, 7));   /* each quick click adds more than the last */
        kick();
        if (pw.streak >= BURST && now - pw.lastFx > 1700) {
            pw.lastFx = now;
            pw.el.classList.add('is-shimmer'); clearTimeout(pw.shimmerT); pw.shimmerT = setTimeout(() => pw.el.classList.remove('is-shimmer'), 1900);
            sparkle(pw); breeze(pw);
        }
        if (pw.streak >= SAYS && !pw.say && now - pw.lastSayAt > 7000 && Math.random() < 0.45) say(pw);   /* never on the first clicks, not every time */
    }

    function make(sec, i) {
        const cfg = SLOTS[i], el = document.createElement('div'), s = size();
        el.className = 'pinwheel'; el.setAttribute('role', 'button'); el.setAttribute('tabindex', '0'); el.setAttribute('aria-label', 'A small pinwheel. Press to spin it');
        el.innerHTML = art(cfg.c); el.style.setProperty('--pg', cfg.glow);
        const pw = { el, head: el.querySelector('.pw-head'), sec, slot: i, w: s.w, h: s.h, x: 0, y: 0, angle: rand(0, 90), spd: 0, hover: false, streak: 0, lastClick: 0, lastFx: 0, lastSayAt: 0, lastSay: '', say: null, shimmerT: 0, t: [] };
        el.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse' && !reduce) { pw.hover = true; kick(); } });
        el.addEventListener('pointerleave', () => { pw.hover = false; });
        el.addEventListener('click', () => poke(pw));
        el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); poke(pw); } });
        sec.appendChild(el);
        pw.head.style.transform = 'rotate(' + f1(pw.angle) + 'deg)';
        return pw;
    }

    /* place new pinwheels, and move any that no longer have a clear spot (load, resize, late layout) */
    function layout() {
        const s = size();
        SLOTS.forEach((slot, i) => {
            const sec = $(slot.sel); if (!sec) return;
            let pw = pws.find(o => o.slot === i);
            if (!pw) { pw = make(sec, i); pw.el.hidden = true; pws.push(pw); }
            pw.w = s.w; pw.h = s.h; pw.el.style.width = pw.w + 'px'; pw.el.style.height = pw.h + 'px';
            if (!pw.el.hidden && valid(pw)) return;
            const spot = findSpot(pw);
            if (spot) { put(pw, spot); pw.el.hidden = false; } else { pw.el.hidden = true; pw.hover = false; }
        });
    }
    function start() {
        if (started) return; started = true;
        layout();
        if (document.readyState !== 'complete') addEventListener('load', () => setTimeout(layout, 400), { once: true });
        setTimeout(layout, 3800);   /* plants and images settle a moment after load */
        let rt = 0; const relayout = () => { clearTimeout(rt); rt = setTimeout(layout, 450); };
        addEventListener('resize', () => { if (innerWidth === lastW) return; lastW = innerWidth; relayout(); });
        if (window.ResizeObserver) { const ro = new ResizeObserver(relayout); SLOTS.forEach(s => { const sec = $(s.sel); if (sec) ro.observe(sec); }); }   /* a section opening/closing its stage */
    }

    return { start };
});
