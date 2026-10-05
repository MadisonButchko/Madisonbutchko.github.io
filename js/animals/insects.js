/* js/animals/insects.js
   Purpose : tap a standalone decorative leaf (LEAF: the scattered `.sc-leaf` leaves plus the three hero leaves `.hero-flowers .bloom.f5/.f8/.f9`) and a tiny insect (ladybug, caterpillar or beetle in rotation, never the same twice in a row) slips out from under it, then crawls away along its own randomized, curving path until it is completely off the screen, where it is removed.
   Owns    : the leaf tap (replaces the old one-ladybug easter egg), the three insects (art, sizes, speeds, the rotation), the exit-path search, and their lifecycle (at most 5 on desktop / 3 on phones; none stays on the page).
   Uses    : core.utils, core.scheduler (Life: held only while a critter is coming out; no timer or heartbeat of its own), core.safe-zones (contentRects: text and controls), animals.animals (registry), animals.butterflies (ladybug art).
             Read-only geometry lookups (never mutated): `.page-posy, .wild` and the hero flower blooms (flower artwork, kept clear; the leaf it came from excepted), `.guide-bird`, `.bn` (nest birds), `.snail`, `.vine` (kept clear), every visible section's text/photos/controls, and the routes of other active critters.
   Used by : js/main.js (start()).
   Paths   : insects live inside the leaf's section (absolute, so they scroll with it). After stepping out from under the leaf, a critter tries random curved paths off the top or bottom of the screen (nearest first, never past the end of the page), each sampled and rejected if it touches text, photos, controls, flower clusters, creatures, other critters' routes or the side-vine area. If none is clear it tries a sideways exit through the screen edge (the only route that must cross the vine strip, quickly), and if that is blocked too the critter just fades out rather than overlap anything.
   Mobile / reduced motion: 0.85x size, narrower spread and curves, 3 at a time under 700 px (5 otherwise); paths still run fully off screen. Tap only (no hover). Under prefers-reduced-motion the whole feature stays off. Moves are Web Animations (cancelled on dismiss); a width change dismisses every insect. */
MB.define('animals.insects', ['core.utils', 'core.scheduler', 'core.safe-zones', 'animals.animals', 'animals.butterflies'], function (utils, scheduler, zones, animals, creatures) {
    'use strict';
    const { $$, rand, clamp, reduce } = utils, { Life } = scheduler, { contentRects } = zones, { LADYBUG } = creatures;

    const CATERPILLAR = '<svg viewBox="0 0 40 16" aria-hidden="true"><path d="M8 14.6 V16 M15 14.6 V16 M22 14.6 V16 M29 14.6 V16" stroke="#7fa65c" stroke-width="1.2" stroke-linecap="round"/><circle cx="6" cy="10" r="4.4" fill="#8db36a"/><circle cx="12.5" cy="9" r="4.8" fill="#a9d68a"/><circle cx="19.5" cy="9" r="5" fill="#8db36a"/><circle cx="26.5" cy="9" r="5" fill="#a9d68a"/><circle cx="33" cy="8" r="5.6" fill="#f4b9a8"/><circle cx="35.2" cy="6.8" r="1.2" fill="#3a2b33"/><circle cx="34.6" cy="10.2" r="1.3" fill="#f4a7bf" opacity=".7"/><path d="M32 3 Q31 .8 29 .6 M35.4 3.2 Q37 1 39 1.2" stroke="#5a4366" stroke-width="1" fill="none" stroke-linecap="round"/></svg>';
    const BEETLE = '<svg viewBox="-10 -9 20 18" aria-hidden="true"><path d="M-3 -6 L-5 -8.4 M1 -6 L2.4 -8.6 M-3 6 L-5 8.4 M1 6 L2.4 8.6" stroke="#2f3b4a" stroke-width=".9" stroke-linecap="round"/><path d="M9 -2.4 Q11.4 -3.8 12.4 -2.8 M9 2.4 Q11.4 3.8 12.4 2.8" stroke="#2f3b4a" stroke-width=".8" fill="none" stroke-linecap="round"/><circle cx="7" cy="0" r="3.3" fill="#2f3b4a"/><ellipse rx="7.4" ry="6.5" fill="#4a9d96"/><path d="M-7.4 0 H6.6" stroke="#2c6b66" stroke-width=".9"/><ellipse cx="-2" cy="-3.3" rx="3.3" ry="1.3" fill="#fff" opacity=".4" transform="rotate(-8)"/></svg>';

    /* w/h: desktop px · speed: px/s · top: drawn from above, so it turns to face where it goes (the others face left or right) */
    const KINDS = {
        ladybug: { art: LADYBUG, w: 28, h: 25, speed: 90, top: true },
        caterpillar: { art: CATERPILLAR, w: 44, h: 18, speed: 55, top: false },
        beetle: { art: BEETLE, w: 28, h: 25, speed: 80, top: true }
    };
    const NAMES = Object.keys(KINDS);
    /* the leaves that react: scattered decorative leaves, and the two hero leaves (not the tiny leaves drawn inside vines, posies or flower art) */
    const LEAF = '.sc-leaf, .hero-flowers .bloom.f5, .hero-flowers .bloom.f8, .hero-flowers .bloom.f9';
    let lastKind = '', bag = [];

    const insects = [], busy = new WeakSet();   /* busy: leaves with an insect still coming out of them */
    let started = false, lastW = innerWidth;
    const small = () => innerWidth < 700;
    const cap = () => small() ? 3 : 5;
    /* how far in from the screen edge the side vines and the blooms they grow reach (the figures plants/decor.js keeps its own flowers out of) */
    const vineBand = () => innerWidth >= 1240 ? 100 : innerWidth >= 700 ? 46 : 40;

    function pickKind() {   /* a rotation: each kind once per round, in a fresh random order, and a round never starts with the kind that ended the last one */
        if (!bag.length) {
            bag = NAMES.slice().sort(() => Math.random() - 0.5);
            if (bag[0] === lastKind) bag.push(bag.shift());
        }
        return lastKind = bag.shift();
    }

    /* ------------------------------------------------------------------
       Geometry (section coordinates; a box is {l, t, r, b}; they may reach outside the section: the page is the stage)
       ------------------------------------------------------------------ */
    const boxAt = (p, ins) => ({ l: p.x - ins.w / 2, t: p.y - ins.h / 2, r: p.x + ins.w / 2, b: p.y + ins.h / 2 });
    const hit = (b, rs, m) => rs.some(r => r.l < b.r + m && r.r > b.l - m && r.t < b.b + m && r.b > b.t - m);
    const line = (a, b) => t => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    const bezier = (a, c, b) => t => { const u = 1 - t; return { x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y }; };

    /* what is on the screen right now, as seen from `ins` */
    function scene(ins) {
        const sec = ins.sec, sr = sec.getBoundingClientRect(), W = document.documentElement.clientWidth;
        const rel = r => ({ l: r.left - sr.left, r: r.right - sr.left, t: r.top - sr.top, b: r.bottom - sr.top });
        const decor = $$('.scatter, .page-posy').filter(e => e.getClientRects().length).map(e => e.getBoundingClientRect());
        const isDecor = r => decor.some(d => Math.abs(d.left - r.left) < 1.5 && Math.abs(d.top - r.top) < 1.5 && Math.abs(d.width - r.width) < 1.5);
        const blocks = [];   /* text lines, images, controls of every section on screen (the decorations themselves are fine to cross) */
        const fan = $$('.collage').filter(e => e.getClientRects().length).map(e => e.getBoundingClientRect());   /* the photo fan: tilted cards, so boxes are far too coarse (the hero leaves sit in the gaps); it is tested by real hit-testing instead (onPhoto) */
        const fanQ = fan.concat($$('.collage img').map(e => e.getBoundingClientRect()));
        const isFan = r => fanQ.some(d => Math.abs(d.left - r.left) < 1.5 && Math.abs(d.top - r.top) < 1.5 && Math.abs(d.width - r.width) < 1.5 && Math.abs(d.height - r.height) < 1.5);
        $$('section, footer').forEach(s => { const r = s.getBoundingClientRect(); if (r.bottom > -120 && r.top < innerHeight + 120) contentRects(s).filter(q => !isDecor(q) && !isFan(q)).forEach(q => blocks.push(rel(q))); });
        const avoid = [], grow = (q, x, y) => ({ l: q.l - x, r: q.r + x, t: q.t - y, b: q.b + y });
        [['.guide-bird', 40, 30], ['.bn', 60, 40], ['.snail', 12, 8], ['.page-posy', 10, 10], ['.wild', 10, 10], ['.hero-flowers .bloom', 2, 2]].forEach(([sel, x, y]) => $$(sel).filter(e => e !== ins.leaf0 && !(e.querySelector && e.querySelector('use[href="#fl-leaf"]') && sel.includes('hero'))).forEach(e => { const r = e.getBoundingClientRect(); if (r.width) avoid.push(grow(rel(r), x, y)); }));
        insects.forEach(o => { if (o !== ins) (o.route || [{ x: o.x, y: o.y }]).forEach(q => avoid.push({ l: q.x + (o.sec.getBoundingClientRect().left - sr.left) - 32, r: q.x + (o.sec.getBoundingClientRect().left - sr.left) + 32, t: q.y + (o.sec.getBoundingClientRect().top - sr.top) - 28, b: q.y + (o.sec.getBoundingClientRect().top - sr.top) + 28 })); });   /* other critters: where they are and the whole route they are on */
        const vb = vineBand(), vines = $$('.vine').map(e => e.getBoundingClientRect()).filter(r => r.width).map(rel);
        vines.push({ l: -sr.left - 999, r: vb - sr.left, t: -99999, b: 99999 }, { l: W - vb - sr.left, r: W - sr.left + 999, t: -99999, b: 99999 });
        const onPhoto = b => {   /* does any of 9 points of the box (plus a margin) sit on a photo card? */
            const m = 4, x0 = b.l - m, x1 = b.r + m, y0 = b.t - m, y1 = b.b + m;
            if (!fan.some(d => d.left - sr.left < x1 && d.right - sr.left > x0 && d.top - sr.top < y1 && d.bottom - sr.top > y0)) return false;
            for (const x of [x0, (x0 + x1) / 2, x1]) for (const y of [y0, (y0 + y1) / 2, y1]) if (document.elementsFromPoint(x + sr.left, y + sr.top).some(e => e.closest && e.closest('.fan-card'))) return true;
            return false;
        };
        return { sr, W, blocks, avoid, vines, onPhoto };
    }
    /* a route is clear when every step along it keeps off text/controls, flower clusters, creatures and (unless `edge`) the vine strip and the screen sides */
    function routeClear(ins, P, sc, edge) {
        const n = 60;
        for (let i = 1; i <= n; i++) {
            const t = i / n, p = P(t), b = boxAt(p, ins), vx = sc.sr.left + p.x;
            if (!edge && (vx - ins.w / 2 < 6 || vx + ins.w / 2 > sc.W - 6)) return false;
            if (hit(b, sc.blocks, 3) || hit(b, sc.avoid, 0) || sc.onPhoto(b) || (!edge && t > 0.1 && hit(b, sc.vines, 4))) return false;
        }
        return true;
    }

    /* random curved route from `from` to `to`: a bezier bowed sideways by up to `curve` px */
    function curve(from, to, curveAmt) {
        const dx = to.x - from.x, dy = to.y - from.y, d = Math.hypot(dx, dy) || 1, k = rand(-1, 1) * curveAmt;
        return bezier(from, { x: (from.x + to.x) / 2 - dy / d * k, y: (from.y + to.y) / 2 + dx / d * k }, to);
    }
    /* the route a critter leaves on: off the top or bottom of the screen, else out through a side edge; null if every try touches something */
    function findExit(ins) {
        const sc = scene(ins), from = { x: ins.x, y: ins.y }, sm = small(), spread = sm ? 80 : 240, bow = sm ? 45 : 130;
        const topY = -sc.sr.top - ins.h - 24, botY = innerHeight - sc.sr.top + ins.h + 24;
        const canDown = pageYOffset + innerHeight + ins.h + 24 <= document.documentElement.scrollHeight;   /* never past the end of the page */
        const tries = [];
        for (let k = 0; k < 14; k++) {
            const x = from.x + rand(-1, 1) * spread;
            tries.push({ to: { x, y: topY } }, ...(canDown ? [{ to: { x, y: botY } }] : []));
        }
        tries.forEach(c => { c.len = Math.hypot(c.to.x - from.x, c.to.y - from.y) * rand(0.8, 1.5); });   /* nearest way off first, but different every time */
        tries.sort((a, b) => a.len - b.len);
        for (const c of tries) { const P = curve(from, c.to, bow); if (routeClear(ins, P, sc, false)) return { P, to: c.to }; }
        const sides = [];
        for (let k = 0; k < 8; k++) sides.push({ x: sc.W - sc.sr.left + ins.w + 24, y: from.y + rand(-90, 90) }, { x: -sc.sr.left - ins.w - 24, y: from.y + rand(-90, 90) });
        sides.sort((a, b) => Math.abs(a.x - from.x) * rand(0.8, 1.5) - Math.abs(b.x - from.x) * rand(0.8, 1.5));
        for (const to of sides) { const P = curve(from, to, bow * 0.4); if (routeClear(ins, P, sc, true)) return { P, to }; }
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
            const K = KINDS[ins.kind], N = clamp(Math.round(dur / 90), 8, 70), kf = [];
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

    /* ------------------------------------------------------------------
       Life of one insect
       ------------------------------------------------------------------ */
    function dismiss(ins, now) {
        if (ins.dead) return; ins.dead = true;
        if (ins.anim) ins.anim.cancel();
        if (ins.leaf) busy.delete(ins.leaf);
        if (ins.holds) { ins.holds = false; Life.release('insect'); }
        const i = insects.indexOf(ins); if (i >= 0) insects.splice(i, 1);
        ins.el.classList.remove('is-crawl'); ins.el.classList.add('is-out');
        if (now) ins.el.remove(); else setTimeout(() => ins.el.remove(), 600);
    }

    /* crawls away along its own route until it is fully off the screen, then is removed */
    async function leave(ins) {
        const go = findExit(ins);
        if (ins.holds) { ins.holds = false; Life.release('insect'); }
        if (!go) { dismiss(ins); return; }   /* no clear way out: fade away rather than overlap anything */
        ins.route = Array.from({ length: 24 }, (_, i) => go.P((i + 1) / 24));
        ins.el.classList.add('is-crawl');
        const len = ins.route.reduce((a, p, i, r) => a + Math.hypot(p.x - (i ? r[i - 1].x : ins.x), p.y - (i ? r[i - 1].y : ins.y)), 0);
        if (await glide(ins, go.P, len / (KINDS[ins.kind].speed * (small() ? 0.9 : 1)) * 1000, false)) dismiss(ins, true);
    }

    async function emerge(ins, leaf) {
        const sc = scene(ins), r = leaf.getBoundingClientRect(), lr = { l: r.left - sc.sr.left, r: r.right - sc.sr.left, t: r.top - sc.sr.top, b: r.bottom - sc.sr.top };
        const cx = (lr.l + lr.r) / 2, cy = (lr.t + lr.b) / 2, lw = lr.r - lr.l, lh = lr.b - lr.t;
        const ok = p => { const b = boxAt(p, ins); return b.l + sc.sr.left >= 6 && b.r + sc.sr.left <= sc.W - 6 && !hit(b, sc.blocks, 0) && !hit(b, sc.avoid, 0) && !hit(b, sc.vines, 2) && !sc.onPhoto(b); };   /* the critter is bigger than the leaf: only step where it clears text, controls and creatures */
        const a0 = rand(0, Math.PI * 2); let exit = null;
        for (let k = 0; k < 8 && !exit; k++) { const a = a0 + k * Math.PI / 4, p = { x: cx + Math.cos(a) * (lw * 0.5 + ins.w * 0.3), y: cy + Math.sin(a) * (lh * 0.5 + ins.h * 0.3) }; if (ok(p)) exit = p; }
        if (!exit || insects.some(o => o !== ins && Math.abs(o.x + (o.sec.getBoundingClientRect().left - sc.sr.left) - cx) < 32 && Math.abs(o.y + (o.sec.getBoundingClientRect().top - sc.sr.top) - cy) < 28)) { dismiss(ins, true); return; }   /* no clear side to step out on, or another critter is right here: skip this one */
        place(ins, { x: cx, y: cy }, rand(-180, 180));
        ins.el.classList.add('is-under');                      /* starts beneath the leaf */
        requestAnimationFrame(() => ins.el.classList.add('is-in'));
        ins.el.classList.add('is-crawl');
        if (!await crawlTo(ins, exit) || ins.dead) return;
        ins.el.classList.remove('is-under');                   /* out from under it, now over the leaf */
        busy.delete(leaf); ins.leaf = null;
        await leave(ins);
    }

    function spawn(leaf, retry) {
        if (+getComputedStyle(leaf).opacity < 0.3 || busy.has(leaf) || document.hidden) return;
        const sec = leaf.parentElement;
        if (!sec || getComputedStyle(sec).position === 'static') return;
        if (insects.length >= cap()) {   /* crowded: this tap tries once more in a moment, then gives up (critters leave by themselves) */
            if (!retry) setTimeout(() => spawn(leaf, true), 700);
            return;
        }
        const kind = pickKind(), K = KINDS[kind], s = small() ? 0.85 : 1;
        const el = document.createElement('span');
        el.className = 'insect in-' + kind; el.setAttribute('aria-hidden', 'true');
        el.innerHTML = '<span class="in-flip"><span class="in-body">' + K.art + '</span></span>';
        const ins = { el, sec, leaf, leaf0: leaf, kind, w: Math.round(K.w * s), h: Math.round(K.h * s), x: 0, y: 0, ang: 0, route: null, anim: null, dead: false, holds: false };
        el.style.width = ins.w + 'px'; el.style.height = ins.h + 'px';
        sec.appendChild(el); insects.push(ins); busy.add(leaf);
        ins.holds = Life.claim('insect', 12000, true);
        emerge(ins, leaf).catch(() => dismiss(ins, true));
    }

    /* the hero leaves sit beneath the transparent photo-fan wrappers (.collage / .hero-inner), which take the click first: when the click lands on a bare wrapper, look through it for a leaf at that point */
    function leafAt(e) {
        const t = e.target; if (!t || !t.closest) return null;
        const leaf = t.closest(LEAF); if (leaf) return leaf;
        if (!t.matches('.collage, .hero-inner')) return null;
        return document.elementsFromPoint(e.clientX, e.clientY).find(el => el.matches && el.matches('.hero-flowers .bloom') && el.matches(LEAF)) || null;
    }

    function start() {
        if (started || reduce) return; started = true;
        document.addEventListener('click', e => { const leaf = leafAt(e); if (leaf) spawn(leaf); }, true);   /* capture: plants/flowers.js stops leaf clicks from bubbling */
        addEventListener('resize', () => { if (innerWidth === lastW) return; lastW = innerWidth; insects.slice().forEach(i => dismiss(i, true)); });
    }

    return animals.register('insects', { start });
});
