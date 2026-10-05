/* js/animals/nest.js
   Purpose : a small bird nest of overlapping twigs just below the bottom-right corner of the artwork gallery preview, advanced by plain clicks (one discrete state each, nothing timed or random): 0 two adult birds sit on it · 1 they flutter and fly away, revealing three eggs · 2-7 each egg cracks, then hatches, one at a time · then every click brings a parent with a worm who feeds chick 1, 2 and 3 in turn (always, one at a time); after 3 feedings (the chicks grow bigger after each, and the second parent joins the 2nd) the chicks fly off one after another, the empty nest stays, the next click brings the adults back with new eggs and the cycle restarts. No text, counters or buttons.
   Owns    : the .bn element (SVG art, placement below the gallery preview's corner and re-placement on resize/load), the click state `n` (0..9) and feed count, in memory only: every page load starts again at 0, the click/keyboard handler, the ?nestdebug hook.
   Uses    : core.utils, core.scheduler (Life: parent visits take the stage by force), animals.animals (registry), animals.art (BIRD_SVG), animals.birds (seed.onDrop for the seed hook, sparkle).
   Used by : js/main.js (start(), last in the order). The older, CSS-hidden `.w-nest` at the contact photo (animals/birds.js) is untouched.
   Mobile / reduced motion: sits right of the button when it fits, else just below it; larger on phones. The whole nest is one control (tap, Enter or Space). Under prefers-reduced-motion nothing animates or flies; each click still advances the state. Contact section's .is-off pauses CSS motion off screen.
   Debug   : ?nestdebug adds window.__nest { state() -> {n, locked, feeds}, click(), reset(), about: { same } } (about = the second nest, right of "hello, I'm Madison" in the About section, with lilac adult birds). */
MB.define('animals.nest', ['core.utils', 'core.scheduler', 'animals.animals', 'animals.art', 'animals.birds'], function (utils, scheduler, animals, art, birds) {
    'use strict';
    const { $, f1, reduce } = utils, { Life } = scheduler;

    /* n: 0 adults on the nest · 1 eggs · 2/3 egg 1 cracks/hatches · 4/5 egg 2 · 6/7 egg 3 · 7 = chicks: each click feeds (FEEDS of them) ·
       8 the grown chicks fly off one by one · 9 empty nest; the next click brings the adults back with new eggs (n 0 -> 1, the same sequence again) */
    const LAST = 7, FEEDS = 3, GONE = 9, FX = [0.275, 0.5, 0.725];   /* FX: each chick's x across the nest (SLOT_X / 80) */
    const EGG_TINT = ['#e6f1f8', '#f7e9ee', '#e8f3e6'], BABY_TINT = [['#f8e6b8', '#e8cf8f'], ['#f9d6df', '#eab4c4'], ['#d3e7f3', '#b2d0e4']];

    /* one nest per call: the state below is per instance (the contact nest and the about nest are independent) */
    function create(cfg) {
    let n = 0;   /* not saved: a reload starts the story again */
    /* what each egg shows at click count n: '' (not laid) | '0' egg | '1' cracked | '2' hatched */
    const slotSt = i => (n < 1 || n >= GONE ? '' : n >= 3 + 2 * i ? '2' : n >= 2 + 2 * i ? '1' : '0');
    let feeds = 0, returning = false;   /* completed feedings of this brood */

    /* ---- art ------------------------------------------------------------ */
    const SLOT_X = [22, 40, 58];
    function slotSVG(i) {
        const bt = (cfg.babies || BABY_TINT)[i];
        return '<g class="bn-slot bn-c' + i + '" data-st="" transform="translate(' + SLOT_X[i] + ' 0)" style="--ec:' + EGG_TINT[i] + ';--bc:' + bt[0] + ';--bc2:' + bt[1] + ';--d:' + (-i * 0.9) + 's">'
            + '<g class="bn-shell" transform="translate(0 40) scale(1.5) translate(0 -40)"><path d="M-5 36.6 Q-4.6 41.4 0 41.4 Q4.6 41.4 5 36.6 L3.2 38 L1.6 36 L0 38 L-1.6 36 L-3.2 38Z" style="fill:var(--ec)" stroke="#9ab8cc" stroke-width=".7" stroke-linejoin="round"/></g>'
            + '<g class="bn-baby"><g transform="translate(0 41) scale(1.5) translate(0 -41)"><ellipse cx="0" cy="37" rx="6" ry="5.2" style="fill:var(--bc)"/>'
            + '<g class="bn-head"><circle cx="0" cy="30.2" r="4.8" style="fill:var(--bc)"/><path d="M-1.6 25.8 Q0 23.6 1.7 25.7" fill="none" stroke-width="1.1" stroke-linecap="round" style="stroke:var(--bc2)"/>'
            + '<circle cx="-3.4" cy="31.4" r="1.05" fill="#f4a7bf" opacity=".55"/><circle cx="3.4" cy="31.4" r="1.05" fill="#f4a7bf" opacity=".55"/>'
            + '<circle class="bn-eye" cx="-1.9" cy="29.3" r=".85" fill="#5a4366"/><circle class="bn-eye" cx="1.9" cy="29.3" r=".85" fill="#5a4366"/>'
            + '<path class="bn-beak" d="M-1.3 31 L1.3 31 L0 33Z" fill="#f2c230"/>'
            + '<g class="bn-mouth"><path d="M-3 31 L3 31 L0 32.2Z" fill="#f2c230"/><ellipse cx="0" cy="32.6" rx="2.8" ry="2.2" fill="#e0607e"/><ellipse cx="0" cy="33.4" rx="1.4" ry=".9" fill="#f4a7bf"/></g></g></g></g>'
            + '<g class="bn-egg" transform="translate(0 34.6) scale(1.75) translate(0 -34.6)"><g class="bn-eggbody"><ellipse cx="0" cy="34.6" rx="5" ry="6.5" style="fill:var(--ec)" stroke="#9ab8cc" stroke-width=".8"/>'
            + '<circle cx="-1.8" cy="32" r=".6" fill="#b9a7c9" opacity=".7"/><circle cx="1.6" cy="35.4" r=".55" fill="#b9a7c9" opacity=".7"/><circle cx="-0.6" cy="37.4" r=".5" fill="#c9a58a" opacity=".7"/>'
            + '<path class="bn-crack" d="M-3.6 33.4 L-1.6 35.4 L0 32.8 L1.8 35.6 L3.6 33.2" fill="none" stroke="#6f8aa0" stroke-width=".9" stroke-linejoin="round" stroke-linecap="round"/></g></g></g>';
    }

    /* The nest body: a bowl of many thin, overlapping twigs and grass blades (a fixed pseudo-random scatter, so it always looks the same), plus a few ends poking out. */
    const TWIGS = (function () {
        let seed = 11;
        const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647, between = (a, b) => a + r() * (b - a);
        const CX = 40, CY = 36, RX = 31, RY = 22;
        const rim = x => CY + 5 * Math.sqrt(Math.max(0, 1 - Math.pow((x - CX) / RX, 2)));
        const bot = x => CY + RY * Math.sqrt(Math.max(0, 1 - Math.pow((x - CX) / RX, 2)));
        const COL = ['#8a5a2a', '#9a6b3a', '#b07f4a', '#c4955c', '#7a4f26', '#a37445'];
        const stroke = (x1, y1, x2, y2, bend, col, w) => '<path d="M' + f1(x1) + ' ' + f1(y1) + ' Q' + f1((x1 + x2) / 2 + bend * (y2 - y1) * 0.25) + ' ' + f1((y1 + y2) / 2 - bend * (x2 - x1) * 0.25) + ' ' + f1(x2) + ' ' + f1(y2) + '" stroke="' + col + '" stroke-width="' + f1(w) + '"/>';
        let body = '';
        for (let k = 0; k < 46; k++) {   /* twigs lying around the bowl, following its curve */
            const x = between(11, 69), d = r(), y = rim(x) + d * (bot(x) - rim(x));
            const dx = 1, dy = (rim(x + 1) + d * (bot(x + 1) - rim(x + 1))) - y;
            let ang = Math.atan2(dy, dx) + between(-0.5, 0.5);
            const len = between(10, 24), hx = Math.cos(ang) * len / 2, hy = Math.sin(ang) * len / 2;
            body += stroke(x - hx, y - hy, x + hx, y + hy, between(-1, 1), COL[Math.floor(r() * COL.length)], between(1.1, 2.1));
        }
        for (let k = 0; k < 7; k++) {    /* a few grass blades woven in */
            const x = between(14, 66), d = between(0.1, 0.8), y = rim(x) + d * (bot(x) - rim(x)), a = between(-0.6, 0.6), len = between(9, 16);
            body += stroke(x, y, x + Math.cos(a) * len, y + Math.sin(a) * len * 0.5, between(-1.4, 1.4), r() < 0.5 ? '#a7b86a' : '#c9c27a', between(0.9, 1.3));
        }
        let rimFront = '', pokes = '';
        for (let k = 0; k < 12; k++) {    /* thicker twigs along the front edge of the opening */
            const x = between(10, 70), y = rim(x) + between(-0.8, 0.8), len = between(9, 18), ang = Math.atan2(rim(x + 1) - rim(x), 1) + between(-0.3, 0.3);
            rimFront += stroke(x - Math.cos(ang) * len / 2, y - Math.sin(ang) * len / 2, x + Math.cos(ang) * len / 2, y + Math.sin(ang) * len / 2, between(-0.8, 0.8), COL[Math.floor(r() * COL.length)], between(1.6, 2.4));
        }
        for (let k = 0; k < 9; k++) {     /* ends poking out of the bowl */
            const left = k % 2 === 0, t = between(0.15, 0.9), x = left ? between(8, 16) : between(64, 72), y = CY + t * 9, a = (left ? Math.PI : 0) + between(-0.9, 0.9) * (left ? -1 : 1) - 0.25 * (left ? -1 : 1), len = between(5, 10);
            pokes += stroke(x, y, x + Math.cos(a) * len, y + Math.sin(a) * len, between(-0.7, 0.7), COL[Math.floor(r() * COL.length)], between(1.1, 1.7));
        }
        return { body, rimFront, pokes };
    })();
    const BOWL = 'M9 36 Q10 55 40 58 Q70 55 71 36 Q40 46.5 9 36Z';
    const BIRD = cfg.tint ? art.BIRD_SVG.replace(/#a9d8ea/g, cfg.tint[0]).replace(/#8fc3dc/g, cfg.tint[1]).replace(/#7fb3cc/g, cfg.tint[2]) : art.BIRD_SVG;
    /* a chick leaving the nest is drawn in its own colour (same three body colours as the adults' tint) */
    const chickBird = i => { const bt = (cfg.babies || BABY_TINT)[i]; return art.BIRD_SVG.replace(/#a9d8ea/g, bt[0]).replace(/#8fc3dc/g, bt[1]).replace(/#7fb3cc/g, bt[1]); };
    /* two adult birds sitting in the nest (BIRD_SVG, drawn as nested svgs so the front twigs overlap their lower bodies) */
    const SEAT = (bx, flip) => '<g class="bn-adult" transform="' + (flip ? 'translate(' + (bx + 36) + ' 0) scale(-1 1)' : 'translate(' + bx + ' 0)') + '">' + BIRD.replace('<svg viewBox="0 0 40 32">', '<svg x="0" y="9.5" width="36" height="28.5" viewBox="0 0 40 32" overflow="visible">') + '</g>';
    const ART = '<svg viewBox="0 0 80 60" focusable="false" aria-hidden="true">'
        + '<g class="bn-p"><ellipse cx="40" cy="37" rx="29.5" ry="7.5" fill="#5e3f22"/><ellipse cx="40" cy="37.8" rx="26" ry="5.6" fill="#e6d29c"/><path d="M17 39 Q27 35 36 38.6 M44 37.8 Q54 34 63 38.6 M26 36.6 Q40 33.6 54 36.6" fill="none" stroke="#c9b27a" stroke-width=".9" stroke-linecap="round"/>'
        + '<g fill="none" stroke-linecap="round">' + '<path d="M11 34 Q40 27 69 34" stroke="#8a5a2a" stroke-width="2"/><path d="M13 35.6 Q40 29.4 67 35.6" stroke="#b07f4a" stroke-width="1.4"/></g></g>'
        + slotSVG(0) + slotSVG(1) + slotSVG(2)
        + '<g class="bn-adults">' + SEAT(4, false) + SEAT(40, true) + '</g>'
        + '<g class="bn-p"><clipPath id="bnBowl' + cfg.id + '"><path d="' + BOWL + '"/></clipPath><path d="' + BOWL + '" fill="#6f4a2a"/>'
        + '<g clip-path="url(#bnBowl' + cfg.id + ')" fill="none" stroke-linecap="round">' + TWIGS.body + '</g>'
        + '<g fill="none" stroke-linecap="round">' + TWIGS.rimFront + TWIGS.pokes + '</g></g>'
        + '</svg>';

    /* ---- the element ------------------------------------------------------ */
    let el = null, links = null, slots = [], locked = false, lastPlace = '';
    const later = (fn, ms) => setTimeout(fn, ms);

    function render() {
        slots.forEach((g, i) => { g.dataset.st = slotSt(i); });
        el.classList.toggle('has-adults', n < 1);
        el.setAttribute('aria-label', n < 1 ? 'A small bird nest with two birds sitting on it. Press to see what is underneath' : n < 3 ? 'A nest with eggs. Press to help one hatch' : n < GONE ? 'A nest with baby birds. Press to feed them' : 'An empty nest. Press to bring the birds back');
    }

    /* the nest sits just right of its anchor, resting on its baseline; if that does not fit (phones) it sits just below it (above it for the about nest, which has text underneath) */
    function place() {
        if (!el) return;
        const g = cfg.geom(); if (!g.width) return;
        const w = el.offsetWidth, h = el.offsetHeight, vw = document.documentElement.clientWidth, left0 = links.getBoundingClientRect().left;
        let x = g.left + g.width + cfg.gap, y = g.top + g.height - h + 4;
        if (cfg.corner) {   /* just below the anchor's bottom-right corner, right edges aligned */
            x = Math.max(-left0 + 8, Math.min(g.left + g.width - w, vw - 14 - w - left0)); y = g.top + g.height + cfg.corner;
            const key = f1(x) + ',' + f1(y);
            if (key !== lastPlace) { lastPlace = key; el.style.left = f1(x) + 'px'; el.style.top = f1(y) + 'px'; }
            return;
        }
        if (left0 + x + w > vw - 14) { x = Math.min(g.left + g.width - w * 0.35, vw - 14 - w - left0); y = cfg.above ? g.top - h + 4 : g.top + g.height + 8; }
        const key = f1(x) + ',' + f1(y);
        if (key !== lastPlace) { lastPlace = key; el.style.left = f1(x) + 'px'; el.style.top = f1(y) + 'px'; }
    }

    /* ---- chicks ------------------------------------------------------------ */
    const gapeAll = on => slots.forEach(g => { const b = $('.bn-baby', g); b.classList.toggle('gape', on); });
    const nestPt = (fx, fy) => { const r = el.getBoundingClientRect(); return { x: r.left + r.width * fx, y: r.top + r.height * fy }; };
    const fly = (b, frames, ms, easing, done) => { const a = b.animate(frames, { duration: ms, easing, fill: 'forwards' }); a.onfinish = done; return a; };
    const at = (p, dx, dy) => 'translate(' + f1(p.x - 18 + (dx || 0)) + 'px,' + f1(p.y - 26 + (dy || 0)) + 'px)';
    const newBird = (fromLeft) => {
        const b = document.createElement('div'); b.className = 'vine-bird flying w-bird bn-parent' + (fromLeft ? '' : ' left-facing'); b.setAttribute('aria-hidden', 'true');
        b.innerHTML = '<div class="c-flip"><div class="c-body">' + BIRD + '</div></div>'; document.body.appendChild(b); return b;
    };

    /* one feeding = the parent arrives with a worm, feeds chick 1, then 2, then 3, and leaves; only then can the next click start another (locked). Always happens: it takes the stage by force.
       The 2nd feeding brings the second parent too. After each feeding the chicks grow (data-grow 1..3, see the CSS --g). */
    function feed() {
        locked = true;
        let counted = false;   /* the safety timer and the animation end can both report; a feeding counts once */
        const pair = feeds === 1;
        let mate = null;
        const done = () => { if (counted) return; counted = true; if (mate) mate.remove(); feeds++; el.dataset.grow = feeds; locked = false; if (feeds >= FEEDS) growUp(); };
        if (reduce) { gapeAll(true); later(() => { gapeAll(false); done(); }, 500); return; }
        Life.claim('nest-bird', 9000, true);
        const hover = i => nestPt(FX[i], -0.02), tgt = hover(0), fromLeft = tgt.x < innerWidth / 2 ? true : false;
        const bird = newBird(fromLeft), sx = fromLeft ? -60 : innerWidth + 60, sy = Math.max(-20, tgt.y - 160);
        const worm = document.createElement('i'); worm.className = 'bn-worm'; $('.c-body', bird).appendChild(worm);
        if (pair) mate = newBird(fromLeft);
        let pos = tgt;   /* where the feeding parent hovers now */
        const guard = later(() => { bird.remove(); Life.release('nest-bird'); gapeAll(false); done(); }, 9000);   /* safety: a click can never stay blocked */
        const exit = { x: fromLeft ? innerWidth + 60 : -60, y: sy };
        const leave = () => {
            bird.classList.remove('eating'); bird.classList.add('flying'); bird.classList.toggle('left-facing', fromLeft);
            if (mate) { mate.classList.remove('nflap'); mate.classList.add('flying'); mate.classList.toggle('left-facing', fromLeft); fly(mate, [{ transform: at(mateAt) }, { transform: at({ x: exit.x, y: sy - 30 }) }], 1000, 'ease-in', () => { mate.remove(); mate = null; }); }
            fly(bird, [{ transform: at(pos) }, { transform: at(exit) }], 1000, 'ease-in', () => { bird.remove(); clearTimeout(guard); Life.release('nest-bird'); done(); });
        };
        const mateAt = nestPt(fromLeft ? 1 : 0, 0.05);   /* the near edge of the nest, on the side opposite the arrival */
        if (mate) {   /* lands beside the nest, then the same few movements every time: head tilt, wing flutter, tiny hop */
            const body = $('.c-body', mate), nudge = (kf, ms) => body.animate(kf, { duration: ms, easing: 'ease-in-out' });
            fly(mate, [{ transform: at({ x: sx, y: sy - 30 }) }, { transform: at(mateAt) }], 1200, 'ease-out', () => {
                mate.classList.remove('flying');
                later(() => nudge([{ rotate: '0deg' }, { rotate: (fromLeft ? -9 : 9) + 'deg' }, { rotate: '0deg' }], 600), 150);
                later(() => { mate.classList.add('nflap'); later(() => mate.classList.remove('nflap'), 450); }, 800);
                later(() => nudge([{ translate: '0 0' }, { translate: '0 -4px' }, { translate: '0 0' }], 400), 1500);
            });
        }
        /* hover over chick i, open its beak, hand the worm over, then go on to the next chick (or leave after the last) */
        const feedChick = i => {
            const hp = hover(i), b = $('.bn-baby', slots[i]);
            bird.classList.remove('flying'); bird.classList.add('eating'); b.classList.add('gape');
            later(() => {
                const w = document.createElement('i'); w.className = 'bn-worm fly'; document.body.appendChild(w);
                const p0 = { x: hp.x + (fromLeft ? 8 : -8), y: hp.y + 4 }, p1 = nestPt(FX[i], 0.42);
                fly(w, [{ transform: 'translate(' + f1(p0.x) + 'px,' + f1(p0.y) + 'px)', opacity: 1 }, { transform: 'translate(' + f1(p1.x) + 'px,' + f1(p1.y) + 'px) scale(.4)', opacity: 0 }], 450, 'ease-in', () => w.remove());
                later(() => { b.classList.remove('gape'); b.classList.add('hop'); later(() => b.classList.remove('hop'), 950); }, 450);
            }, 300);
            later(() => {
                if (i === 2) { worm.remove(); leave(); return; }
                const nx = hover(i + 1); bird.classList.remove('eating'); bird.classList.add('flying');
                fly(bird, [{ transform: at(pos) }, { transform: at(nx) }], 450, 'ease-in-out', () => { pos = nx; feedChick(i + 1); });
            }, 1000);
        };
        fly(bird, [{ transform: at({ x: sx, y: sy }) }, { transform: at(tgt) }], 1100, 'ease-out', () => feedChick(0));
    }

    /* the third feeding is done: after a short pause the grown chicks fly off one after another; the nest stays, empty */
    function growUp() {
        locked = true; n = 8;
        if (reduce) { later(() => leaveNest(), 400); return; }
        later(leaveNest, 1500);
    }
    function leaveNest() {
        const rects = slots.map(g => $('.bn-baby', g).getBoundingClientRect());
        n = GONE;
        Life.claim('nest-bird', 5000, true);
        if (reduce) { render(); Life.release('nest-bird'); locked = false; return; }
        rects.forEach((r, i) => later(() => {
            slots[i].dataset.st = '';
            flyAway(r, i - 1, i === 2 ? () => { Life.release('nest-bird'); locked = false; } : null, chickBird(i));
            if (i === 2) render();
        }, i * 550));
        later(() => { if (n === GONE && !returning) locked = false; }, 5500);   /* safety */
    }

    /* the adults come back: they land on the nest, then flutter off and leave a new clutch (the same step as the very first click) */
    function adultsReturn() {
        locked = true; returning = true;
        const finish = () => { if (!returning) return; returning = false; n = 1; feeds = 0; el.dataset.grow = 0; el.classList.add('has-adults'); birdsLeave(); };
        if (reduce) { finish(); return; }
        el.classList.add('has-adults');
        const rects = [...el.querySelectorAll('.bn-adult')].map(a => a.getBoundingClientRect());
        el.classList.remove('has-adults');
        Life.claim('nest-bird', 6000, true);
        let landed = 0;
        rects.forEach((r, i) => {
            const b = newBird(i === 0), dir = i === 0 ? -1 : 1, x = r.left - 3, y = r.top - 2, t = (dx, dy) => 'translate(' + f1(x + dx) + 'px,' + f1(y + dy) + 'px)';
            if (i === 1) b.classList.add('left-facing'); else b.classList.remove('left-facing');
            fly(b, [{ transform: t(dir * 420, -240), opacity: 0 }, { transform: t(dir * 70, -70), opacity: 1, offset: 0.65 }, { transform: t(0, 0), opacity: 1 }], 1500 + i * 200, 'ease-out', () => { b.remove(); if (++landed === 2) { Life.release('nest-bird'); finish(); } });
        });
        later(() => { if (n === GONE) { Life.release('nest-bird'); finish(); } }, 5000);   /* safety */
    }

    /* the first click: both birds flutter their wings, then fly off, and the eggs are there underneath */
    function birdsLeave() {
        locked = true;
        const reveal = () => { render(); slots.forEach(g => { g.classList.add('fresh'); later(() => g.classList.remove('fresh'), 1000); }); locked = false; };
        if (reduce) { reveal(); return; }
        el.classList.add('flutter');
        later(() => {
            const rects = [...el.querySelectorAll('.bn-adult')].map(a => a.getBoundingClientRect());
            el.classList.remove('flutter'); reveal();
            Life.claim('nest-bird', 5000);
            rects.forEach((r, i) => flyAway(r, i, i === 1 ? () => Life.release('nest-bird') : null));
        }, 900);
    }
    function flyAway(r, i, done, svg) {
        const b = document.createElement('div'); b.className = 'vine-bird flying w-bird bn-parent' + (i <= 0 ? ' left-facing' : ''); b.setAttribute('aria-hidden', 'true');
        b.innerHTML = '<div class="c-flip"><div class="c-body">' + (svg || BIRD) + '</div></div>'; document.body.appendChild(b);
        const x = r.left - 3, y = r.top - 2, dir = i <= 0 ? -1 : 1;
        const t = (dx, dy) => 'translate(' + f1(x + dx) + 'px,' + f1(y + dy) + 'px)';
        b.animate([{ transform: t(0, 0), opacity: 1 }, { transform: t(dir * 70, -70), opacity: 1, offset: 0.35 }, { transform: t(dir * 420, -240), opacity: 0 }], { duration: 1700 + Math.abs(i) * 200, easing: 'ease-in' }).onfinish = () => { b.remove(); done && done(); };
    }

    /* ---- one click = one predictable step ----------------------------------- */
    function advance() {
        if (locked) return;
        if (n === 0) { n = 1; birdsLeave(); return; }
        if (n === GONE) { adultsReturn(); return; }
        if (n < LAST) {
            n++;
            const i = Math.floor((n - 2) / 2), g = slots[i];
            locked = true;
            if (n % 2 === 0) {                      /* this egg wiggles and cracks */
                g.classList.add('wig');
                later(() => { g.classList.remove('wig'); render(); locked = false; }, reduce ? 0 : 750);
            } else {                                /* this egg hatches */
                g.classList.add('shake');
                later(() => {
                    g.classList.remove('shake'); render(); locked = false;
                    g.classList.add('born'); later(() => g.classList.remove('born'), 1500);
                    const r = g.getBoundingClientRect(); birds.sparkle(r.left + r.width / 2 + scrollX, r.top + r.height * 0.55 + scrollY);
                    const b = $('.bn-baby', g); b.classList.add('gape'); later(() => b.classList.remove('gape'), 1600);
                }, reduce ? 0 : 650);
            }
            return;
        }
        feed();
    }

    /* an existing garden seed: tapped or dropped on the nest, it is carried to the chicks (see birds.seed.onDrop) */
    function onSeed(p, tap) {
        if (n !== LAST || locked) return false;
        if (!tap) {
            const r = el.getBoundingClientRect();
            if (Math.hypot(p.x - (r.left + r.width / 2), p.y - (r.top + r.height * 0.55)) > Math.max(r.width * 0.75, 60)) return false;
        }
        feed(); return true;
    }

    function start() {
        links = cfg.host();
        if (!links || !cfg.geom || el) return;
        el = document.createElement('div'); el.className = 'bn w-piece' + (cfg.cls ? ' ' + cfg.cls : ''); el.dataset.grow = 0; el.setAttribute('role', 'button'); el.setAttribute('tabindex', '0');
        el.innerHTML = ART; links.appendChild(el);
        slots = [...el.querySelectorAll('.bn-slot')];
        el.addEventListener('click', advance);
        el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); advance(); } });
        render(); place();
        let w0 = innerWidth;
        addEventListener('resize', () => { if (innerWidth !== w0) { w0 = innerWidth; place(); } });
        addEventListener('load', place);
        birds.seed.onDrop(onSeed);
    }
    return {
        start,
        debug: {
            state: () => ({ n, locked, feeds }),
            click: () => advance(),
            reset: () => { n = 0; feeds = 0; locked = false; el.dataset.grow = 0; render(); }
        }
    };
    }

    function startAll() {
        const contact = create({
            id: '', gap: 30, above: false, corner: 12,
            host: () => $('.gallery-container'),
            geom: () => { const l = $('#galleryPreview'), h = $('.gallery-container'); if (!l || !h) return { width: 0 }; const r = l.getBoundingClientRect(), o = h.getBoundingClientRect(); return { left: r.left - o.left, top: r.top - o.top, width: r.width, height: r.height }; }
        });
        const about = create({
            id: 'About', gap: 24, above: true, cls: 'bn-about', babies: [['#f3877e', '#d8605a'], ['#f8df7e', '#e6c557'], ['#c8a6ea', '#a883d3']], tint: ['#d9c3f0', '#bfa3e3', '#ad8fd6'],
            host: () => $('.about-hello'),
            geom: h => { const p = $('.about-hello'); return p ? { left: 0, top: 0, width: p.offsetWidth, height: p.offsetHeight } : { width: 0 }; }
        });
        contact.start(); about.start();
        if (/[?&]nestdebug\b/.test(location.search)) window.__nest = Object.assign({}, contact.debug, { about: about.debug });
    }

    return animals.register('nest', { start: startAll });
});
