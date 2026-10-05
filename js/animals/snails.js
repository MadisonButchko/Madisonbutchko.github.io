/* js/animals/snails.js
   Purpose : six small snails resting in open margins around the page, two kinds. SHY snails (3): tap one: it hides in its shell, tiny eyes peek out, it slowly comes back out. Tap again: after peeking it crawls to a nearby plant leaving a faint dew-and-sparkle trail (sometimes ending in a tiny flourish). Keep tapping and it gets shy. RAINBOW snails (3): tap one and it crawls a short way leaving a faint glowing rainbow trail, then says its next line in a pastel bubble matching its shell.
   Owns    : the .snail elements (placement, tap/keyboard handling, hide/peek/emerge, crawling, trail + flourish, petal and rare shell variation, five personalities and palettes) and its re-layout on load/resize.
   Uses    : core.utils, core.scheduler (Life: crawls take the stage; Beat.onBeat: ambient wandering, no new timer), core.safe-zones (contentRects), core.particles (FX budget for trail bits), animals.animals (registry), environment.weather (onRain: wet snails are livelier).
             Read-only geometry lookups of other features (never mutated): `.page-posy, .scatter` (plants a snail may crawl to) and `.vine` (fixed side vines a snail must not sit under).
   Used by : js/main.js (start(), last in the order, so nothing earlier changes).
   Placement: each snail has a slot (section + hand-picked anchor spots, tried in order, then a random open spot). Never within the side-vine band (vines and the flowers they grow sit at both screen edges), nor near text, buttons, photos, nests or birds.
   Mobile / reduced motion: 6 snails on desktop and tablet, 4 under 700 px (smaller, tap area padded). Tap and Enter/Space work; no hover needed. Under prefers-reduced-motion they stay put: hide/peek/emerge only (no crawling, wandering or trail). Sections that scroll off screen pause CSS motion via .is-off. */
MB.define('animals.snails', ['core.utils', 'core.scheduler', 'core.safe-zones', 'core.particles', 'animals.animals', 'environment.weather'], function (utils, scheduler, zones, particles, animals, weather) {
    'use strict';
    const { $, $$, rand, pick, clamp, f1, reduce } = utils, { Life, Beat } = scheduler, { contentRects, inView } = zones, { FX } = particles;

    /* slot i = snail i: its section and a few hand-picked safe anchor spots [fraction across the space between the vine bands, fraction down the section (the snail's feet)], tried in order */
    const SLOTS = [
        { sel: '#about', at: [[0.2, 0.97], [0.5, 0.985], [0.78, 0.97]] },
        { sel: '#experience', at: [[0.12, 0.995], [0.22, 0.995], [0.5, 0.995]] },
        { sel: '#skills', at: [[0.2, 0.985], [0.8, 0.985], [0.5, 0.995]] },
        { sel: '#gallery', at: [[0.12, 0.98], [0.88, 0.98], [0.5, 0.995]] },
        { sel: '#contact', at: [[0.25, 0.9], [0.75, 0.9], [0.5, 0.96]] },
        { sel: '#experience', at: [[0.72, 0.93], [0.62, 0.95], [0.82, 0.95], [0.65, 0.995]] }
    ];
    /* the side vines (fixed, both screen edges) and the blooms they grow reach this far in from the edge: no creature sits or crawls there */
    const vineBand = () => innerWidth >= 1240 ? 160 : innerWidth >= 700 ? 70 : 52;
    /* shell, shell line, body */
    const PALETTES = [['#f4b9a8', '#d98b7b', '#f0e0cc'], ['#c9b2ec', '#9b7fcf', '#ece4dc'], ['#a8d8be', '#6fb391', '#ece8d2'], ['#f6d36b', '#d9a63a', '#f1e6cc'], ['#a9d8ea', '#6fa9c9', '#ece6dc'], ['#f4a7bf', '#d9738f', '#f2e2d6']];
    const PETALS = ['#f6a9c4', '#d8c3f2', '#fbdc84', '#ffd1c4'];
    /* hide/peek/emerge: ms in the shell, ms peeking, ms to come back out · wander: chance per heartbeat while on screen · range: px · speed: px/s */
    const PERSONAS = [   /* by slot */
        { hide: 900, peek: 800, emerge: 1900, wander: 0.10, range: 150, speed: 22 },   /* bold */
        { hide: 2000, peek: 1500, emerge: 2900, wander: 0.03, range: 90, speed: 14 },  /* shy */
        { hide: 1500, peek: 1100, emerge: 2600, wander: 0.02, range: 80, speed: 11 },  /* sleepy */
        { hide: 1000, peek: 700, emerge: 1700, wander: 0.14, range: 230, speed: 26 },  /* wanderer */
        { hide: 1200, peek: 900, emerge: 2100, wander: 0.07, range: 130, speed: 18 }   /* curious */
    ];

    /* each snail has its own lines (by creation order) and says the next one every time it reaches the speech-bubble step, looping after the last */
    /* kind: shy (tucks into its shell) or rainbow (crawls, glowing trail, then speaks) · pal: PALETTES index · bubble: [background, border, text] pastel to match the shell */
    const SNAILS = [
        { kind: 'shy', pal: 5, bubble: ['255,226,236', '#e6a0ba', '#6b3550'], lines: ['Please respect my shell.', 'I live here, you know.', 'This is my emotional support shell.', 'Occupied.'] },
        { kind: 'rainbow', pal: 1, bubble: ['232,222,250', '#b6a0dc', '#4d3a78'], lines: ['Did you see my sparkles?', 'Everything is more fun with glitter.', 'I\u2019m basically a tiny rainbow.', 'Follow the shimmer!'] },
        { kind: 'shy', pal: 2, bubble: ['214,243,229', '#8cc8a6', '#2f5e48'], lines: ['Um\u2026 can I help you?', 'I\u2019m not home.', 'Is it gone? Is it safe?', 'Maybe just a peek\u2026'] },
        { kind: 'rainbow', pal: 3, bubble: ['255,243,198', '#e0bf58', '#69501a'], lines: ['Sunshine-powered slime!', 'Slow and glowy wins the race.', 'Ta-da! Fresh sparkles.', 'I left you a little gift.'] },
        { kind: 'rainbow', pal: 0, bubble: ['255,229,218', '#eaa790', '#70402f'], lines: ['Ooh, a new view!', 'Pretty trail, right?', 'Shhh, I\u2019m on an adventure.', 'Colors follow me everywhere.'] },
        { kind: 'shy', pal: 4, bubble: ['212,235,248', '#84bbd9', '#2f5870'], lines: ['Five more minutes\u2026', 'Shh, napping.', 'Come back after tea.', 'I was just thinking.'] }
    ];
    const IDLE_MS = 9000;   /* a snail left hiding or talking comes back out by itself */

    const ART = '<span class="sn-flip"><svg viewBox="0 0 44 32" aria-hidden="true">'
        + '<g class="sn-body"><path class="sn-foot" d="M2 28.6 Q2 25 7 25 H30 C33.5 25 35 22.5 35.3 19 C35.6 15.8 38.6 15.4 39.2 18 C39.8 21 39.4 24.6 38.4 26.6 Q36.8 28.8 32 28.8 H5 Q2 28.8 2 28.6Z"/>'
        + '<g class="sn-eyes"><path class="sn-stalk" d="M36.2 17.2 L35.3 9.6 M39 17.6 L41 10.4"/><circle class="sn-eye" cx="35.2" cy="9" r="1.5"/><circle class="sn-eye" cx="41.1" cy="9.8" r="1.5"/></g></g>'
        + '<circle class="sn-shell" cx="19" cy="17" r="11"/><path class="sn-spiral" d="M19 17 C20.5 17 21 15.5 20 14.6 C18 13 15.5 15 16 17.5 C16.7 21 21 22 23.5 19.5 C26.5 16.5 24.5 11.5 20 11 C14.5 10.5 11 15 12 19.5"/>'
        + '<ellipse class="sn-hi" cx="24.5" cy="11" rx="2.6" ry="1.4" transform="rotate(-35 24.5 11)"/>'
        + '<g class="sn-dec"><circle cx="14" cy="22" r="1.1"/><circle cx="25" cy="22.5" r="1"/><circle cx="27.5" cy="16" r="1"/></g>'
        + '<path class="sn-petal" d="M15 7.6 C11.2 3.8 17.8 1.2 20.4 4.6 C21.6 7.6 17.4 9.6 15 7.6Z"/></svg></span>';
    const FLOURISH = {
        heart: '<svg viewBox="0 0 16 16"><path d="M8 14 C2 9.5 2 4.5 5.2 3.8 C6.8 3.5 7.8 4.6 8 5.6 C8.2 4.6 9.2 3.5 10.8 3.8 C14 4.5 14 9.5 8 14Z" fill="#f4a7bf"/></svg>',
        spiral: '<svg viewBox="0 0 16 16"><path d="M8 8 C9 8 9.4 7 8.8 6.4 C7.6 5.4 5.8 6.6 6.2 8.2 C6.8 10.6 9.8 10.8 11 8.8 C12.4 6.4 10.4 3.4 7.6 3.4" fill="none" stroke="#b79ae0" stroke-width="1.3" stroke-linecap="round"/></svg>',
        flower: '<svg viewBox="0 0 16 16">' + [0, 72, 144, 216, 288].map(a => '<ellipse cx="8" cy="4.6" rx="2" ry="3" fill="#fbdc84" transform="rotate(' + a + ' 8 8)"/>').join('') + '<circle cx="8" cy="8" r="1.8" fill="#e8a43a"/></svg>',
        sprout: '<svg viewBox="0 0 16 16"><path d="M8 14 V8" stroke="#7fa65c" stroke-width="1.3" stroke-linecap="round"/><path d="M8 9 C4 9 3 5.6 3.4 4.4 C6.4 4.2 8 6.2 8 9Z" fill="#a9d68a"/><path d="M8 7.6 C8 5 9.6 3.4 12.6 3.6 C12.8 6 11 7.8 8 7.6Z" fill="#8db36a"/></svg>'
    };

    const snails = [];
    let wetUntil = 0, crawling = null, started = false, lastW = innerWidth;
    const wet = () => performance.now() < wetUntil;

    /* ------------------------------------------------------------------
       Geometry (all in section coordinates; a box is {l, t, r, b})
       ------------------------------------------------------------------ */
    const size = () => innerWidth < 700 ? { w: 35, h: 26 } : { w: 42, h: 31 };   /* base size; each snail is a little bigger or smaller (sn.k) */
    const boxOf = (x, y, s) => ({ l: x, t: y, r: x + s.w, b: y + s.h });
    const hit = (b, rs, m) => rs.some(r => r.l < b.r + m && r.r > b.l - m && r.t < b.b + m && r.b > b.t - m);
    function obstacles(sn) {
        const sr = sn.sec.getBoundingClientRect();
        const rel = r => ({ l: r.left - sr.left, r: r.right - sr.left, t: r.top - sr.top, b: r.bottom - sr.top, el: r.el });
        const out = contentRects(sn.sec).map(rel);
        $$('.vine').forEach(v => { const r = v.getBoundingClientRect(); if (r.width) out.push(rel(r)); });
        /* nest birds (animals/nest.js) perch, flutter and land around their nest: keep a wide berth */
        $$('.bn').forEach(v => { const r = v.getBoundingClientRect(); if (r.width) { const q = rel(r); out.push({ l: q.l - 90, r: q.r + 90, t: q.t - 50, b: q.b + 50 }); } });
        /* side-vine band (fixed at both screen edges, in viewport coordinates) and the guide bird */
        const vb = vineBand(), Wd = document.documentElement.clientWidth;
        out.push({ l: -sr.left - 999, r: vb - sr.left, t: -99999, b: 99999 }, { l: Wd - vb - sr.left, r: Wd - sr.left + 999, t: -99999, b: 99999 });
        $$('.guide-bird').forEach(v => { const r = v.getBoundingClientRect(); if (r.width) { const q = rel(r); out.push({ l: q.l - 40, r: q.r + 40, t: q.t - 30, b: q.b + 30 }); } });
        snails.forEach(o => { if (o !== sn && o.sec === sn.sec && !o.el.hidden) out.push({ l: o.x - 40, r: o.x + o.w + 40, t: o.y - 14, b: o.y + o.h + 14 }); });
        return out;
    }
    const inBounds = (sn, b) => {
        const sr = sn.sec.getBoundingClientRect(), W = document.documentElement.clientWidth;
        return sr.left + b.l >= 6 && sr.left + b.r <= W - 6 && b.t >= 4 && b.b <= sr.height - 2;
    };
    const pathClear = (sn, from, to, blocks, m) => {
        const n = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) / 8));
        for (let i = 1; i <= n; i++) if (hit(boxOf(from.x + (to.x - from.x) * i / n, from.y + (to.y - from.y) * i / n, sn), blocks, m)) return false;
        return true;
    };
    const valid = sn => { const b = boxOf(sn.x, sn.y, sn); return inBounds(sn, b) && !hit(b, obstacles(sn), 10); };

    /* an open spot near the bottom of the section (its margins and edges first) */
    function findSpot(sn) {
        const sr = sn.sec.getBoundingClientRect(), W = document.documentElement.clientWidth, blocks = obstacles(sn), vb = vineBand();
        for (const [fx, fy] of SLOTS[sn.slot].at) {   /* the hand-picked spots first */
            const b = boxOf(vb + fx * (W - 2 * vb) - sr.left - sn.w / 2, sr.height * fy - sn.h, sn);
            if (inBounds(sn, b) && !hit(b, blocks, 14)) return { x: b.l, y: b.t };
        }
        for (let k = 0; k < 60; k++) {
            const x = rand(6 - sr.left, W - 6 - sr.left - sn.w), by = sr.height * (k < 25 ? rand(0.9, 0.995) : rand(0.4, 0.995));
            const b = boxOf(x, by - sn.h, sn);
            if (inBounds(sn, b) && !hit(b, blocks, 14)) return { x, y: b.t };
        }
        return null;
    }

    /* where to crawl: beside a nearby plant when there is one, else a short open stretch */
    function plan(sn, range) {
        const sr = sn.sec.getBoundingClientRect(), blocks = obstacles(sn), from = { x: sn.x, y: sn.y };
        const plants = $$('.page-posy, .scatter', sn.sec).filter(e => e.getClientRects().length).map(e => { const r = e.getBoundingClientRect(); return { l: r.left - sr.left, r: r.right - sr.left, t: r.top - sr.top, b: r.bottom - sr.top }; })
            .map(p => ({ p, d: Math.hypot((p.l + p.r) / 2 - sn.x - sn.w / 2, p.b - sn.y - sn.h) })).filter(o => o.d > 50 && o.d < range * 1.6).sort((a, b) => a.d - b.d);
        for (const { p } of plants) {
            const rest = blocks.filter(r => !(Math.abs(r.l - p.l) < 2 && Math.abs(r.t - p.t) < 2));
            for (const x of pick([[p.l - sn.w - 5, p.r + 5], [p.r + 5, p.l - sn.w - 5]])) {
                const to = { x, y: p.b - sn.h }, b = boxOf(to.x, to.y, sn);
                if (inBounds(sn, b) && !hit(b, rest, 3) && pathClear(sn, from, to, rest, 4)) return { to, plant: true };
            }
        }
        for (let k = 0; k < 16; k++) {
            const a = rand(-0.5, 0.5) + (Math.random() < 0.5 ? 0 : Math.PI), d = rand(range * 0.5, range);
            const to = { x: sn.x + Math.cos(a) * d, y: sn.y + Math.sin(a) * d * 0.5 }, b = boxOf(to.x, to.y, sn);
            if (inBounds(sn, b) && !hit(b, blocks, 10) && pathClear(sn, from, to, blocks, 6)) return { to, plant: false };
        }
        return null;
    }

    /* ------------------------------------------------------------------
       Timing: how long a snail stays in its shell after tap number `n`
       (n counts taps in a row, reset after 20 s of leaving it alone)
       ------------------------------------------------------------------ */
    function hideTime(n, pers) {
        // TODO(human): shape the shyness curve. n = 1, 2, 3 ... taps in a row; pers.hide is this snail's base time in ms.
        return pers.hide * (1 + 0.6 * (n - 1));
    }

    /* ------------------------------------------------------------------
       One snail
       ------------------------------------------------------------------ */
    const later = (sn, fn, ms) => { const id = setTimeout(() => { sn.t = sn.t.filter(i => i !== id); fn(); }, ms); sn.t.push(id); };
    function setState(sn, s) { sn.el.classList.toggle('is-hidden', s === 'hid'); sn.el.classList.toggle('is-peek', s === 'peek'); }
    function palette(sn, pal) { sn.pal = pal; sn.el.style.setProperty('--sh1', pal[0]); sn.el.style.setProperty('--sh2', pal[1]); sn.el.style.setProperty('--bd', pal[2]); }
    const commit = sn => { sn.el.style.left = f1(sn.x) + 'px'; sn.el.style.top = f1(sn.y) + 'px'; sn.el.style.transform = ''; };
    function put(sn, spot) { sn.x = spot.x; sn.y = spot.y; commit(sn); }

    function stop(sn) {   /* cancels timers and any crawl in progress; the snail stays where it is */
        sn.t.forEach(clearTimeout); sn.t = [];
        if (sn.raf) { cancelAnimationFrame(sn.raf); sn.raf = 0; }
        if (sn.moving) { sn.moving(); sn.moving = null; }
        sn.el.classList.remove('is-crawl');
    }

    function drop(sn, cx, cy, ang, n) {   /* one bit of the glimmer trail: a soft dew streak, every third one with a sparkle */
        if (FX.room(1) < 1) return;
        const d = document.createElement('i'), spark = n % 3 === 0, rb = sn.kind === 'rainbow', hue = (n * 41) % 360;
        d.className = spark ? 'sn-spark' : rb ? 'sn-trail sn-rain' : 'sn-trail'; d.setAttribute('aria-hidden', 'true');
        if (spark) { d.style.left = f1(cx + rand(-4, 4)) + 'px'; d.style.top = f1(cy - rand(4, 9)) + 'px'; d.style.background = rb ? 'hsl(' + hue + ',90%,85%)' : pick(['#fff6c8', '#ffffff', sn.pal[0]]); }
        else { d.style.left = f1(cx - 5) + 'px'; d.style.top = f1(cy - 2) + 'px'; d.style.setProperty('--r', f1(ang) + 'deg'); if (rb) d.style.setProperty('--hue', hue); }
        sn.sec.appendChild(d); FX.track(d, null, rb ? (spark ? 3400 : 5200) : spark ? 2600 : 3800);
    }
    function flourish(sn, cx, cy) {
        if (FX.room(1) < 1) return;
        const f = document.createElement('i'); f.className = 'sn-flour'; f.setAttribute('aria-hidden', 'true');
        f.innerHTML = FLOURISH[pick(Object.keys(FLOURISH))];
        f.style.left = f1(cx - 8) + 'px'; f.style.top = f1(cy - 15) + 'px';
        sn.sec.appendChild(f); FX.track(f, null, 6400);
    }

    function crawl(sn, dest, opts) {
        if (reduce || crawling || !Life.claim('snail', 40000, !!opts.force)) return false;
        crawling = sn; sn.state = 'crawl';
        const from = { x: sn.x, y: sn.y }, dist = Math.hypot(dest.x - from.x, dest.y - from.y);
        const dir = dest.x >= from.x ? 1 : -1, ang = Math.atan2(dest.y - from.y, dest.x - from.x) * 180 / Math.PI;
        const dur = dist / (sn.pers.speed * (wet() ? 1.4 : 1)) * 1000, t0 = performance.now();
        sn.el.classList.toggle('is-left', dir < 0); sn.el.classList.add('is-crawl');
        let n = 0, last = 0;
        sn.moving = () => { crawling = null; sn.state = 'idle'; Life.release('snail'); };
        (function step(now) {
            const p = Math.min(1, (now - t0) / dur), e = 0.5 - Math.cos(Math.PI * p) / 2;
            const dx = (dest.x - from.x) * e, dy = (dest.y - from.y) * e;
            sn.el.style.transform = 'translate(' + f1(dx) + 'px,' + f1(dy) + 'px)';
            const travelled = dist * e;
            if (opts.trail && travelled - last > 11) { last = travelled; drop(sn, from.x + dx + sn.w / 2 - dir * sn.w * 0.32, from.y + dy + sn.h, ang, n++); }
            if (p < 1) { sn.raf = requestAnimationFrame(step); return; }
            sn.raf = 0; sn.x = dest.x; sn.y = dest.y; commit(sn); sn.el.classList.remove('is-crawl');
            if (opts.flourish) flourish(sn, sn.x + sn.w / 2 - dir * 20, sn.y + sn.h);
            sn.moving(); sn.moving = null;
            if (opts.done) opts.done();
        })(t0);
        return true;
    }

    /* the snail slowly comes back out; now and then it comes back a little different */
    function emerge(sn) {
        sn.el.style.setProperty('--sn-in', (sn.pers.emerge / 1000) + 's');
        setState(sn, 'out');
        if (Math.random() < 0.08) {   /* (the shell colour stays: the speech bubble matches it) */
            sn.el.classList.toggle('is-deco', Math.random() < 0.6);
            sn.el.classList.add('is-new'); later(sn, () => sn.el.classList.remove('is-new'), 1400);
        }
        const petal = sn.el.classList.contains('has-petal');
        if (petal ? Math.random() < 0.2 : Math.random() < 0.12) { sn.el.classList.toggle('has-petal', !petal); sn.el.style.setProperty('--pt', pick(PETALS)); }
    }

    /* speech bubble: small, above the snail (below if that would cover content or leave the screen), kept inside the viewport */
    function hideBubble(sn) { clearTimeout(sn.bt); if (sn.bubble) { sn.bubble.remove(); sn.bubble = null; } }
    function say(sn) {
        hideBubble(sn);
        const b = document.createElement('span');
        b.className = 'sn-say'; b.setAttribute('role', 'status'); b.textContent = sn.lines[sn.line++ % sn.lines.length];
        sn.el.appendChild(b); sn.bubble = b; sn.bt = setTimeout(() => hideBubble(sn), 2000);   /* every bubble closes by itself after about 2 s */
        const r = sn.el.getBoundingClientRect(), bw = b.offsetWidth, bh = b.offsetHeight, W = document.documentElement.clientWidth;
        const x = clamp(r.left + r.width / 2 - bw / 2, 6, Math.max(6, W - 6 - bw)), blocks = contentRects(sn.sec);
        const up = { l: x, r: x + bw, t: r.top - bh - 8, b: r.top - 4 }, down = { l: x, r: x + bw, t: r.bottom + 4, b: r.bottom + bh + 8 };
        const ok = c => c.t >= 4 && !hit(c, blocks, 1);
        b.style.setProperty('--dx', f1(x - (r.left + r.width / 2 - bw / 2)) + 'px');
        b.classList.toggle('is-below', !ok(up) && ok(down));
    }

    /* tap 1: tucks into its shell and waits · tap 2: says its next line · tap 3: peeks, comes out and crawls a little way off */
    function tap(sn) {
        const step = sn.step;
        stop(sn); commit(sn); hideBubble(sn);
        sn.x = parseFloat(sn.el.style.left) || sn.x; sn.y = parseFloat(sn.el.style.top) || sn.y;
        const p = sn.pers;
        sn.state = 'hid'; sn.el.style.setProperty('--sn-in', '0.22s'); setState(sn, 'hid');
        if (step < 2) {
            sn.step = step + 1;
            if (step === 1) say(sn);
            later(sn, () => { sn.step = 0; hideBubble(sn); emerge(sn); later(sn, () => { sn.state = 'idle'; }, p.emerge + 300); }, IDLE_MS);
            return;
        }
        sn.step = 0;
        sn.el.style.setProperty('--sn-in', '0.6s'); setState(sn, 'peek');
        let at = p.peek;
        later(sn, () => emerge(sn), at); at += p.emerge + 300;
        later(sn, () => {
            sn.state = 'idle';
            if (!reduce) {
                const go = plan(sn, p.range * (wet() ? 1.7 : 1));
                if (go) crawl(sn, go.to, { trail: true, flourish: Math.random() < 0.35, force: true });
            }
        }, at);
    }

    /* rainbow snail: crawls a short way leaving a glowing rainbow trail, then speaks (at once if it cannot, or under reduced motion) */
    function rainbowTap(sn) {
        const r = sn.el.getBoundingClientRect(), sr = sn.sec.getBoundingClientRect();
        stop(sn); hideBubble(sn);
        sn.x = r.left - sr.left; sn.y = r.top - sr.top; commit(sn); sn.state = 'idle';
        const done = () => say(sn);
        const go = reduce ? null : plan(sn, Math.min(sn.pers.range, 120));
        if (!go || !crawl(sn, go.to, { trail: true, force: true, done })) done();
    }

    function wander(sn) {   /* ambient: a short, unhurried crawl while nobody is touching it */
        if (reduce || sn.state !== 'idle' || crawling || !inView(sn.el)) return false;
        const go = plan(sn, sn.pers.range * (wet() ? 1.7 : 1));
        return !!go && crawl(sn, go.to, { trail: true, flourish: Math.random() < 0.12 });
    }

    function make(sec, i) {
        const conf = SNAILS[i];
        const el = document.createElement('div'), s = size();
        el.className = 'snail'; el.setAttribute('role', 'button'); el.setAttribute('tabindex', '0');
        el.setAttribute('aria-label', conf.kind === 'rainbow' ? 'A small rainbow snail. Press to watch it crawl' : 'A small shy snail. Press to say hello'); el.innerHTML = ART;
        const k = rand(0.9, 1.1), sn = { el, sec, slot: i, kind: conf.kind, pers: PERSONAS[i % PERSONAS.length], w: Math.round(s.w * k), h: Math.round(s.h * k), x: 0, y: 0, state: 'idle', step: 0, line: 0, lines: conf.lines, bubble: null, k, t: [], raf: 0, moving: null, pal: null };
        palette(sn, PALETTES[conf.pal]);
        el.style.setProperty('--bb', 'rgba(' + conf.bubble[0] + ',.9)'); el.style.setProperty('--bbd', conf.bubble[1]); el.style.setProperty('--bt', conf.bubble[2]);
        if (Math.random() < 0.3) { el.classList.add('has-petal'); el.style.setProperty('--pt', pick(PETALS)); }
        if (Math.random() < 0.3) el.classList.add('is-deco');
        el.classList.toggle('is-left', Math.random() < 0.5);
        const act = () => conf.kind === 'rainbow' ? rainbowTap(sn) : tap(sn);
        el.addEventListener('click', act);
        el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(); } });
        sec.appendChild(el);
        return sn;
    }

    const fit = (sn, s) => { sn.w = Math.round(s.w * sn.k); sn.h = Math.round(s.h * sn.k); sn.el.style.width = sn.w + 'px'; sn.el.style.height = sn.h + 'px'; };

    /* place new snails, and move any that no longer have a clear spot (load, resize, late layout) */
    function layout() {
        const cap = innerWidth < 700 ? 4 : SLOTS.length, s = size();
        snails.forEach(sn => { if (sn.state === 'idle') fit(sn, s); });
        SLOTS.forEach((slot, i) => {
            const sec = $(slot.sel); if (!sec) return;
            let sn = snails.find(o => o.slot === i);
            if (!sn) { if (i >= cap) return; sn = make(sec, i); fit(sn, s); sn.el.hidden = true; snails.push(sn); }
            if (sn.state !== 'idle') return;
            if (i >= cap) { sn.el.hidden = true; return; }   /* narrower screen: fewer snails (the extra ones just rest unseen) */
            if (!sn.el.hidden && valid(sn)) return;
            const spot = findSpot(sn);
            if (spot) { put(sn, spot); sn.el.hidden = false; } else { sn.el.hidden = true; }
        });
    }

    function start() {
        if (started) return; started = true;
        layout();
        if (document.readyState !== 'complete') addEventListener('load', () => setTimeout(layout, 300), { once: true });
        setTimeout(layout, 3500);   /* plants and images settle a moment after load */
        let rt = 0;
        addEventListener('resize', () => { if (innerWidth === lastW) return; lastW = innerWidth; clearTimeout(rt); rt = setTimeout(layout, 250); });
        weather.onRain(() => { wetUntil = performance.now() + 240000; snails.forEach(sn => sn.el.classList.add('is-wet')); setTimeout(() => { if (!wet()) snails.forEach(sn => sn.el.classList.remove('is-wet')); }, 240500); });
        Beat.onBeat(() => {
            for (const sn of snails) { if (!sn.el.hidden && Math.random() < sn.pers.wander * (wet() ? 3 : 1) && wander(sn)) break; }
        });
    }

    return animals.register('snails', { start });
});
