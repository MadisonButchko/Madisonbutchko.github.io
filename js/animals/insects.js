/* js/animals/insects.js
   Purpose : tap a decorative leaf (`.scatter.sc-leaf`) and a tiny insect (ladybug most often; caterpillar, bee or beetle) slips out from under it, crawls around the leaf for a moment, then moves on to a nearby decorative leaf, bloom or posy and stays there. Tap a landed insect: ladybugs, bees and beetles fly a short curve to another decorative spot; caterpillars crawl.
   Owns    : the leaf tap (replaces the old one-ladybug easter egg), the four insects (art, weights, sizes), their landing-spot search, and their lifecycle (at most 3 on desktop / 2 on phones; each fades after about 45 s).
   Uses    : core.utils, core.scheduler (Life: one creature at a time; no timer or heartbeat of its own), core.safe-zones (contentRects: text and controls), animals.animals (registry), animals.butterflies (ladybug and bee art).
             Read-only geometry lookups (never mutated): `.scatter, .page-posy, .wild` (landing spots), `.guide-bird`, `.bn` (nest birds), `.snail`, `.vine` (kept clear).
   Used by : js/main.js (start()).
   Placement: insects live inside the leaf's section (absolute, so they scroll with it). A landing spot must be an opened decoration, outside the side-vine band, clear of text/photos/controls/creatures, and the whole flight path must stay clear of text and controls; otherwise the insect simply rests on its leaf. Insects ignore pointer events except while landed (then only their own small tap area).
   Mobile / reduced motion: 0.85x size, shorter hops, 2 at a time under 700 px; paths stay inside the viewport. Tap only (no hover). Under prefers-reduced-motion the whole feature stays off. Moves are Web Animations (cancelled on dismiss); a width change dismisses every insect. */
MB.define('animals.insects', ['core.utils', 'core.scheduler', 'core.safe-zones', 'animals.animals', 'animals.butterflies'], function (utils, scheduler, zones, animals, creatures) {
    'use strict';
    const { $$, rand, pick, clamp, reduce } = utils, { Life } = scheduler, { contentRects } = zones, { LADYBUG, BEE } = creatures;

    const CATERPILLAR = '<svg viewBox="0 0 40 16" aria-hidden="true"><path d="M8 14.6 V16 M15 14.6 V16 M22 14.6 V16 M29 14.6 V16" stroke="#7fa65c" stroke-width="1.2" stroke-linecap="round"/><circle cx="6" cy="10" r="4.4" fill="#8db36a"/><circle cx="12.5" cy="9" r="4.8" fill="#a9d68a"/><circle cx="19.5" cy="9" r="5" fill="#8db36a"/><circle cx="26.5" cy="9" r="5" fill="#a9d68a"/><circle cx="33" cy="8" r="5.6" fill="#f4b9a8"/><circle cx="35.2" cy="6.8" r="1.2" fill="#3a2b33"/><circle cx="34.6" cy="10.2" r="1.3" fill="#f4a7bf" opacity=".7"/><path d="M32 3 Q31 .8 29 .6 M35.4 3.2 Q37 1 39 1.2" stroke="#5a4366" stroke-width="1" fill="none" stroke-linecap="round"/></svg>';
    const BEETLE = '<svg viewBox="-10 -9 20 18" aria-hidden="true"><path d="M-3 -6 L-5 -8.4 M1 -6 L2.4 -8.6 M-3 6 L-5 8.4 M1 6 L2.4 8.6" stroke="#2f3b4a" stroke-width=".9" stroke-linecap="round"/><path d="M9 -2.4 Q11.4 -3.8 12.4 -2.8 M9 2.4 Q11.4 3.8 12.4 2.8" stroke="#2f3b4a" stroke-width=".8" fill="none" stroke-linecap="round"/><circle cx="7" cy="0" r="3.3" fill="#2f3b4a"/><ellipse rx="7.4" ry="6.5" fill="#4a9d96"/><path d="M-7.4 0 H6.6" stroke="#2c6b66" stroke-width=".9"/><ellipse cx="-2" cy="-3.3" rx="3.3" ry="1.3" fill="#fff" opacity=".4" transform="rotate(-8)"/></svg>';

    /* w/h: desktop px · weight: how often it comes out · fly: flies when tapped (else crawls) · top: drawn from above, so it turns to face where it goes (the others face left or right) */
    const KINDS = {
        ladybug: { art: LADYBUG, w: 28, h: 25, weight: 50, fly: true, top: true },
        caterpillar: { art: CATERPILLAR, w: 44, h: 18, weight: 18, fly: false, top: false },
        bee: { art: BEE, w: 32, h: 28, weight: 16, fly: true, top: false },
        beetle: { art: BEETLE, w: 28, h: 25, weight: 16, fly: true, top: true }
    };
    const NAMES = Object.keys(KINDS), TOTAL = NAMES.reduce((a, k) => a + KINDS[k].weight, 0);
    const STAY_MS = 45000;   /* a landed insect fades out by itself after this long */

    const insects = [], busy = new WeakSet();   /* busy: leaves with an insect still coming out of them */
    let started = false, lastW = innerWidth;
    const small = () => innerWidth < 700;
    const cap = () => small() ? 2 : 3;
    /* the side vines (fixed, at both screen edges) and the blooms they grow reach this far in: nothing lands there (same figures as animals/snails.js) */
    const vineBand = () => innerWidth >= 1240 ? 160 : innerWidth >= 700 ? 70 : 52;

    function pickKind() { let r = Math.random() * TOTAL; for (const k of NAMES) { r -= KINDS[k].weight; if (r <= 0) return k; } return 'ladybug'; }

    /* ------------------------------------------------------------------
       Geometry (section coordinates; a box is {l, t, r, b})
       ------------------------------------------------------------------ */
    const boxAt = (p, ins) => ({ l: p.x - ins.w / 2, t: p.y - ins.h / 2, r: p.x + ins.w / 2, b: p.y + ins.h / 2 });
    const hit = (b, rs, m) => rs.some(r => r.l < b.r + m && r.r > b.l - m && r.t < b.b + m && r.b > b.t - m);
    const line = (a, b) => t => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    const bezier = (a, c, b) => t => { const u = 1 - t; return { x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y }; };
    const wavy = (a, b, amp, n) => {   /* a straight crawl with a gentle sideways wobble that dies out at both ends */
        const d = Math.hypot(b.x - a.x, b.y - a.y) || 1, nx = -(b.y - a.y) / d, ny = (b.x - a.x) / d;
        return t => { const w = Math.sin(t * Math.PI * 2 * n) * amp * Math.sin(Math.PI * t); return { x: a.x + (b.x - a.x) * t + nx * w, y: a.y + (b.y - a.y) * t + ny * w }; };
    };

    /* what is in this section right now, as seen from `ins` */
    function scene(ins) {
        const sec = ins.sec, sr = sec.getBoundingClientRect(), W = document.documentElement.clientWidth;
        const rel = r => ({ l: r.left - sr.left, r: r.right - sr.left, t: r.top - sr.top, b: r.bottom - sr.top });
        const decor = $$('.scatter, .page-posy, .wild', sec).filter(e => e.getClientRects().length).map(e => e.getBoundingClientRect());
        const isDecor = r => decor.some(d => Math.abs(d.left - r.left) < 1.5 && Math.abs(d.top - r.top) < 1.5 && Math.abs(d.width - r.width) < 1.5);
        const blocks = contentRects(sec).filter(r => !isDecor(r)).map(rel);   /* text lines, images, controls (the decorations themselves are fine to cross) */
        const avoid = [], grow = (q, x, y) => ({ l: q.l - x, r: q.r + x, t: q.t - y, b: q.b + y });
        [['.guide-bird', 40, 30], ['.bn', 60, 40], ['.snail', 12, 8]].forEach(([sel, x, y]) => $$(sel).forEach(e => { const r = e.getBoundingClientRect(); if (r.width) avoid.push(grow(rel(r), x, y)); }));
        insects.forEach(o => { if (o !== ins && o.sec === sec) avoid.push({ l: o.x - 24, r: o.x + 24, t: o.y - 20, b: o.y + 20 }); });
        const vines = $$('.vine').map(e => e.getBoundingClientRect()).filter(r => r.width).map(rel);
        return { sr, W, blocks, avoid, vines };
    }
    const inside = (sc, b) => sc.sr.left + b.l >= 6 && sc.sr.left + b.r <= sc.W - 6 && b.t >= 2 && b.b <= sc.sr.height - 2;
    function pathClear(ins, P, sc) {
        for (let i = 1; i <= 16; i++) { const b = boxAt(P(i / 16), ins); if (!inside(sc, b) || hit(b, sc.blocks, 1) || hit(b, sc.avoid, 0)) return false; }
        return true;
    }

    /* another decorative leaf, bloom or posy within [lo, hi] px whose whole flight/crawl is clear: {to, el, P, dist} or null */
    function findTarget(ins, lo, hi) {
        const sc = scene(ins), K = KINDS[ins.kind], vb = vineBand();
        const from = { x: ins.x, y: ins.y }, spots = [];
        $$('.scatter.open, .page-posy.open, .wild.open', ins.sec).forEach(el => {
            if (el === ins.on || !el.getClientRects().length) return;
            const r = el.getBoundingClientRect(), q = { l: r.left - sc.sr.left, r: r.right - sc.sr.left, t: r.top - sc.sr.top, b: r.bottom - sc.sr.top };
            const cx = (q.l + q.r) / 2 + rand(-0.12, 0.12) * (q.r - q.l), cy = q.t + (q.b - q.t) * (el.classList.contains('page-posy') ? 0.62 : 0.5);
            const to = { x: cx, y: cy }, d = Math.hypot(cx - from.x, cy - from.y), vx = sc.sr.left + cx;
            if (d < lo || d > hi || vx < vb || vx > sc.W - vb) return;
            const b = boxAt(to, ins);
            if (!inside(sc, b) || hit(b, sc.blocks, 3) || hit(b, sc.avoid, 4) || hit(b, sc.vines, 6)) return;
            spots.push({ to, el, dist: d });
        });
        spots.sort(() => Math.random() - 0.5);
        for (const s of spots) {
            if (!K.fly) { const P = wavy(from, s.to, small() ? 2 : 3, 2.5); if (pathClear(ins, P, sc)) return { ...s, P }; continue; }
            const dx = s.to.x - from.x, dy = s.to.y - from.y, d = s.dist || 1, h = clamp(d * 0.35, 12, small() ? 40 : 70);
            let nx = -dy / d, ny = dx / d; if (ny > 0) { nx = -nx; ny = -ny; }   /* bow upward first */
            for (const sg of [1, -1]) {
                const P = bezier(from, { x: (from.x + s.to.x) / 2 + nx * h * sg, y: (from.y + s.to.y) / 2 + ny * h * sg }, s.to);
                if (pathClear(ins, P, sc)) return { ...s, P };
            }
        }
        return null;
    }

    /* ------------------------------------------------------------------
       Movement: one Web Animation along a path (cancelled by dismiss)
       ------------------------------------------------------------------ */
    function place(ins, p, ang) {
        ins.x = p.x; ins.y = p.y; ins.ang = ang;
        ins.el.style.transform = 'translate(' + (p.x - ins.w / 2).toFixed(1) + 'px,' + (p.y - ins.h / 2).toFixed(1) + 'px) rotate(' + ang.toFixed(1) + 'deg)';
    }
    function glide(ins, P, dur, ease) {
        return new Promise(res => {
            if (ins.dead) return res(false);
            const K = KINDS[ins.kind], N = clamp(Math.round(dur / 90), 8, 28), kf = [];
            const end = P(1), start = P(0);
            if (!K.top) ins.el.classList.toggle('is-left', end.x < start.x - 0.5);
            let prev = ins.ang, last = prev;
            for (let i = 0; i <= N; i++) {
                const t = i / N, e = ease ? 0.5 - Math.cos(Math.PI * t) / 2 : t, p = P(e), q = P(Math.min(1, e + 0.02)), r = P(Math.max(0, e - 0.02));
                const vx = q.x - r.x, vy = q.y - r.y;
                let a = last;
                if (Math.abs(vx) + Math.abs(vy) > 0.01) {
                    a = K.top ? Math.atan2(vy, vx) * 180 / Math.PI : clamp(Math.atan2(vy, Math.abs(vx)) * 180 / Math.PI * (vx < 0 ? -1 : 1), -25, 25);
                    if (K.top) { while (a - prev > 180) a -= 360; while (a - prev < -180) a += 360; }
                }
                prev = last = a;
                kf.push({ transform: 'translate(' + (p.x - ins.w / 2).toFixed(1) + 'px,' + (p.y - ins.h / 2).toFixed(1) + 'px) rotate(' + a.toFixed(1) + 'deg)', offset: t });
            }
            const anim = ins.anim = ins.el.animate(kf, { duration: dur, easing: 'linear' });
            anim.onfinish = () => { ins.anim = null; place(ins, end, last); res(true); };
            anim.oncancel = () => { ins.anim = null; res(false); };
        });
    }
    const crawlTo = (ins, to) => { const d = Math.hypot(to.x - ins.x, to.y - ins.y); return glide(ins, line({ x: ins.x, y: ins.y }, to), clamp(d * 45, 350, 800), true); };
    const later = (ins, fn, ms) => { const id = setTimeout(() => { ins.t = ins.t.filter(i => i !== id); fn(); }, ms); ins.t.push(id); };

    /* ------------------------------------------------------------------
       Life of one insect
       ------------------------------------------------------------------ */
    function dismiss(ins, now) {
        if (ins.dead) return; ins.dead = true;
        ins.t.forEach(clearTimeout); ins.t = [];
        if (ins.anim) ins.anim.cancel();
        if (ins.leaf) busy.delete(ins.leaf);
        if (ins.holds) { ins.holds = false; Life.release('insect'); }
        const i = insects.indexOf(ins); if (i >= 0) insects.splice(i, 1);
        ins.el.classList.remove('is-landed', 'is-fly', 'is-crawl'); ins.el.classList.add('is-out');
        if (now) ins.el.remove(); else setTimeout(() => ins.el.remove(), 600);
    }
    function settle(ins, el) {   /* resting: tappable, and gone by itself after a while */
        ins.on = el; ins.state = 'landed';
        ins.el.classList.remove('is-fly', 'is-crawl'); ins.el.classList.add('is-landed');
        if (ins.holds) { ins.holds = false; Life.release('insect'); }
        later(ins, () => dismiss(ins), STAY_MS);
    }
    /* flies (or crawls) to `go`, then settles there */
    async function travel(ins, go) {
        const K = KINDS[ins.kind];
        ins.state = 'moving'; ins.el.classList.remove('is-landed'); ins.el.classList.add(K.fly ? 'is-fly' : 'is-crawl');
        const dur = K.fly ? clamp(go.dist * (small() ? 8 : 7), 900, 1800) : clamp(go.dist * 30, 1500, 5000);
        const ok = await glide(ins, go.P, dur, K.fly);
        if (ok && !ins.dead) settle(ins, go.el);
    }

    async function emerge(ins, leaf) {
        const sc = scene(ins), r = leaf.getBoundingClientRect(), lr = { l: r.left - sc.sr.left, r: r.right - sc.sr.left, t: r.top - sc.sr.top, b: r.bottom - sc.sr.top };
        const cx = (lr.l + lr.r) / 2, cy = (lr.t + lr.b) / 2, lw = lr.r - lr.l, lh = lr.b - lr.t;
        const ok = p => { const b = boxAt(p, ins); return inside(sc, b) && !hit(b, sc.blocks, 0) && !hit(b, sc.avoid, 0); };   /* the critter is bigger than the leaf: only step where it clears text, controls and creatures */
        const a0 = rand(0, Math.PI * 2); let exit = null;
        for (let k = 0; k < 8 && !exit; k++) { const a = a0 + k * Math.PI / 4, p = { x: cx + Math.cos(a) * (lw * 0.5 + ins.w * 0.3), y: cy + Math.sin(a) * (lh * 0.5 + ins.h * 0.3) }; if (ok(p)) exit = p; }
        const rp = () => { for (let k = 0; k < 6; k++) { const p = { x: cx + rand(-0.5, 0.5) * lw, y: cy + rand(-0.5, 0.5) * lh }; if (ok(p)) return p; } return { x: cx, y: cy }; };
        place(ins, { x: cx, y: cy }, rand(-180, 180));
        ins.el.classList.add('is-under');                      /* starts beneath the leaf */
        requestAnimationFrame(() => ins.el.classList.add('is-in'));
        ins.el.classList.add('is-crawl');
        if (!exit) { ins.el.classList.remove('is-under'); busy.delete(leaf); ins.leaf = null; settle(ins, leaf); return; }   /* no clear side to step out on: rests on its leaf */
        if (!await crawlTo(ins, exit) || ins.dead) return;
        ins.el.classList.remove('is-under');                   /* out from under it, now over the leaf */
        for (const p of [rp(), rp()]) if (!await crawlTo(ins, p) || ins.dead) return;
        busy.delete(leaf); ins.leaf = null;
        const go = findTarget(ins, small() ? 40 : 50, small() ? 150 : 260);
        if (go) await travel(ins, go); else settle(ins, leaf);
    }

    function spawn(leaf) {
        if (!leaf.classList.contains('open') || busy.has(leaf) || document.hidden) return;
        const sec = leaf.parentElement;
        if (!sec || getComputedStyle(sec).position === 'static') return;
        if (insects.length >= cap()) dismiss(insects[0]);
        const kind = pickKind(), K = KINDS[kind], s = small() ? 0.85 : 1;
        const el = document.createElement('span');
        el.className = 'insect in-' + kind; el.setAttribute('aria-hidden', 'true');
        el.innerHTML = '<span class="in-flip"><span class="in-body">' + K.art + '</span></span>';
        const ins = { el, sec, leaf, kind, w: Math.round(K.w * s), h: Math.round(K.h * s), x: 0, y: 0, ang: 0, on: leaf, state: 'out', t: [], anim: null, dead: false, holds: false };
        el.style.width = ins.w + 'px'; el.style.height = ins.h + 'px';
        el.addEventListener('click', e => { e.stopPropagation(); if (ins.state === 'landed') hop(ins); });
        sec.appendChild(el); insects.push(ins); busy.add(leaf);
        ins.holds = Life.claim('insect', 12000, true);
        emerge(ins, leaf).catch(() => dismiss(ins, true));
    }

    /* a tap on a landed insect: off to another spot (flies if it can, otherwise crawls); if nowhere is clear it just wiggles */
    function hop(ins) {
        if (ins.dead || ins.state !== 'landed') return;
        ins.t.forEach(clearTimeout); ins.t = [];
        const K = KINDS[ins.kind], sm = small(), go = K.fly ? findTarget(ins, sm ? 50 : 70, sm ? 170 : 300) : findTarget(ins, sm ? 30 : 40, sm ? 110 : 160);
        ins.holds = Life.claim('insect', 12000, true);
        if (go) { travel(ins, go).catch(() => dismiss(ins, true)); return; }
        ins.el.classList.remove('is-wiggle'); void ins.el.offsetWidth; ins.el.classList.add('is-wiggle');
        settle(ins, ins.on);
    }

    function start() {
        if (started || reduce) return; started = true;
        document.addEventListener('click', e => { const leaf = e.target.closest && e.target.closest('.sc-leaf'); if (leaf) spawn(leaf); });
        addEventListener('resize', () => { if (innerWidth === lastW) return; lastW = innerWidth; insects.slice().forEach(i => dismiss(i, true)); });
    }

    return animals.register('insects', { start });
});
