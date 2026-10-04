/* js/garden/critters.js
   Purpose : the garden's visitors: pests (bunny, bird, snail, caterpillar) that walk or fly to a flower and eat it unless shooed, and the friendly butterfly that pollinates a new seedling; plus the shared critter helpers (makeCritter, go, setPos, groundY, dropCritter, leave, shooFx) the deer also uses.
   Owns    : SVG.caterpillar (added to the shared art), SIZES/SPEED/EAT_MS/FLEE, makeCritter, go, dropCritter, walkTo, spawnPest, arrive, shooFx, leave, spawnFlutter.
   Uses    : core.utils, plants.plants (act, ease, FLI, SVG, tween); the garden API `ga` (bed, P, C, S, deer, inView, plant, removePlant, headOf, shedPetals, sparkles, fx, flash, award, updateHud, touched, hitDeer ...).
   Used by : garden/garden.js (create), animals/deer.js (through ga).
   Mobile / reduced motion: unchanged; moves are tweened, or a short timeout under reduced motion (butterflies and pests are not spawned under reduced motion: the heartbeat skips them).
   Moved verbatim from legacy/140-side-vines-and-garden.js (Migration Step 14; only shared-state access was rewritten to go through the garden-facing API object `ga`); behaviour, order and timing unchanged. */
MB.define('garden.critters', ['core.utils', 'plants.plants'], function (utils, plants) {
    'use strict';
    const { f1, rand, pick, reduce } = utils;
    const { act, ease, FLI, SVG, tween } = plants;

    function create(ga) {
        /* --- critters --- */
        SVG.caterpillar = '<svg viewBox="0 0 44 22"><g class="cat-segs">' + [6, 12, 18, 24, 30].map((x, k) => `<circle cx="${x}" cy="15" r="5.4" fill="${k % 2 ? '#b6d88f' : '#9cc27a'}"/><circle cx="${x}" cy="20.5" r="1.3" fill="#6e9a4c"/>`).join('') + '</g><path d="M35 5 L33 0.5 M39 5 L41 0.5" stroke="#6e9a4c" stroke-width="1.2" stroke-linecap="round"/><circle cx="33" cy="0.8" r="1.3" fill="#f4a7bf"/><circle cx="41" cy="0.8" r="1.3" fill="#f4a7bf"/><circle cx="37" cy="11" r="7" fill="#8db36a"/><circle cx="39.5" cy="9.5" r="1.4" fill="#5a4366"/><circle cx="40" cy="13.4" r="1.6" fill="#f9c6d6" opacity=".9"/><path d="M41.5 12 Q43 13 41.8 14" stroke="#5a4366" stroke-width=".9" fill="none"/></svg>';
        const SIZES = { bunny: [46, 40], snail: [40, 26], bird: [36, 29], flutter: [26, 22], caterpillar: [44, 22], deer: [108, 97] };
        const SPEED = { bunny: 150, snail: 42, caterpillar: 34 };
        const EAT_MS = { bunny: 2400, bird: 2200, snail: 3800, caterpillar: 3400 };
        const FLEE = { bunny: 'bolted for the hedge', bird: 'flapped away', snail: 'slid off in a huff', caterpillar: 'inched away' };
        function makeCritter(kind){
            const [w, h] = SIZES[kind], el = document.createElement('div');
            el.className = 'critter ' + kind; el.innerHTML = `<div class="c-flip"><div class="c-body">${SVG[kind]}</div></div>`;
            ga.bed.appendChild(el);
            const c = { el, kind, w: el.offsetWidth || w, h: el.offsetHeight || h, x: 0, y: 0, state: 'coming', pest: kind !== 'flutter', tok: null, timer: 0, shed: 0, munch: 0, meals: 0 };
            if (c.pest){
                el.setAttribute('role', 'button'); el.setAttribute('tabindex', '0'); el.setAttribute('aria-label', kind === 'deer' ? 'Chase off the deer' : 'Shoo the ' + kind);
                const hit = e => { e.stopPropagation(); ga.touched(); if (kind === 'deer') ga.hitDeer(c); else leave(c, true); };
                el.addEventListener('click', hit);
                el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); hit(e); } });
            }
            ga.C.push(c); return c;
        }
        const setPos = c => { c.el.style.transform = `translate(${f1(c.x)}px,${f1(c.y)}px)`; };
        const groundY = c => ga.bed.clientHeight - 6 - c.h;
        function go(c, x1, y1, speed, arc, done, wobble){
            if (c.tok) c.tok.stop = true;
            const x0 = c.x, y0 = c.y, dur = Math.max(250, Math.hypot(x1 - x0, y1 - y0) / speed * 1000), linear = c.kind !== 'bird' && c.kind !== 'flutter';
            if (Math.abs(x1 - x0) > 2) c.el.classList.toggle('left-facing', x1 < x0);
            if (reduce){ const tok = c.tok = { stop: false }; setTimeout(() => { if (tok.stop) return; c.x = x1; c.y = y1; setPos(c); if (done) done(); }, Math.min(dur, 700)); return; }
            c.el.classList.add('moving');
            c.tok = tween(dur, t => {
                const e = linear ? t : ease(t);
                c.x = x0 + (x1 - x0) * e; c.y = y0 + (y1 - y0) * e - Math.sin(Math.PI * t) * arc + (wobble ? Math.sin(t * dur / 110) * wobble : 0);
                setPos(c);
            }, () => { c.el.classList.remove('moving'); if (done) done(); });
        }
        function dropCritter(c){
            if (c.tok) c.tok.stop = true; clearTimeout(c.timer); clearInterval(c.shed); clearInterval(c.munch); clearInterval(c.watch);
            c.el.remove(); const i = ga.C.indexOf(c); if (i > -1) ga.C.splice(i, 1);
            if (ga.deer === c){ ga.deer = null; ga.bed.classList.remove('deer-alert'); }
            ga.updateHud();
        }
        const edible = p => (p.state === 'bloom' || p.state === 'thirsty') && !p.targeted;
        function walkTo(c, hx){ go(c, c.x + c.w / 2 < hx ? hx - c.w + 6 : hx - 6, c.y, SPEED[c.kind], 0, () => arrive(c)); }

        function spawnPest(only){
            const opts = ga.P.filter(edible); if (!opts.length) return;
            const kind = only || pick(['bunny', 'bunny', 'bird', 'bird', 'snail', 'caterpillar']);
            const tasty = opts.filter(p => p.flower), target = pick(tasty.length ? tasty : opts);
            const c = makeCritter(kind), W = ga.bed.clientWidth, hd = ga.headOf(target);
            c.target = target; target.targeted = true;
            if (kind === 'bird'){
                c.fromLeft = Math.random() < 0.5; c.x = c.fromLeft ? -c.w - 10 : W + 10; c.y = rand(-40, -12); setPos(c);
                go(c, c.fromLeft ? hd.x - c.w + 5 : hd.x - 5, Math.max(0, hd.y - c.h + 9), 230, -35, () => arrive(c));
            } else {
                c.fromLeft = kind === 'bunny' ? Math.random() < 0.5 : hd.x < W / 2;
                c.x = c.fromLeft ? -c.w - 10 : W + 10; c.y = groundY(c); setPos(c); walkTo(c, hd.x);
            }
            ga.updateHud();
        }
        /* eating: the plant shakes and sheds petals, then is eaten (visibly disappears, count drops). Bunnies go back for seconds. */
        function arrive(c){
            if (c.state !== 'coming') return;
            const t = c.target;
            if (!t || t.state === 'gone') return leave(c, false);
            c.state = 'eating'; c.el.classList.add('eating'); t.el.classList.add('nibbled'); ga.updateHud();
            if (!reduce) c.shed = setInterval(() => ga.shedPetals(t, 1), 480);
            c.timer = setTimeout(() => {
                if (c.state !== 'eating') return;
                clearInterval(c.shed); c.el.classList.remove('eating');
                if (t.state !== 'gone'){ ga.removePlant(t, 'eaten'); ga.flash(`the ${c.kind} ate a ${ga.nameOf(t)} — ${act} the soil to regrow it`, 3000); }
                c.meals++;
                if (c.kind === 'bunny' && c.meals < 3){
                    const W = ga.bed.clientWidth, cx = c.x + c.w / 2;
                    const next = ga.P.filter(p => edible(p) && Math.abs(p.x / 100 * W - cx) < W * 0.18).sort((a, b) => Math.abs(a.x / 100 * W - cx) - Math.abs(b.x / 100 * W - cx))[0];
                    if (next){ c.target = next; next.targeted = true; c.state = 'coming'; walkTo(c, ga.headOf(next).x); ga.updateHud(); return; }
                }
                leave(c, false);
            }, EAT_MS[c.kind]);
        }
        function shooFx(c, text){
            const pop = document.createElement('span'); pop.className = 'shoo-pop'; pop.innerHTML = text + ' ' + FLI;
            pop.style.left = f1(Math.max(44, Math.min(ga.bed.clientWidth - 44, c.x + c.w / 2))) + 'px'; pop.style.top = f1(Math.max(4, c.y - 22)) + 'px';
            ga.bed.appendChild(pop); setTimeout(() => pop.remove(), 1200);
            for (let k = 0; k < 7; k++){ const a = (k / 7) * Math.PI * 2, d = rand(16, 30); ga.fx('puff', c.x + c.w / 2, c.y + c.h - 4, [{ transform: 'translate(-50%,-50%) scale(.4)', opacity: 0.9 }, { transform: `translate(calc(-50% + ${f1(Math.cos(a) * d)}px), calc(-50% + ${f1(Math.sin(a) * d * 0.5 - 6)}px)) scale(1.3)`, opacity: 0 }], rand(450, 650)); }
        }
        function leave(c, scared){
            if (c.state === 'leaving') return;
            c.state = 'leaving'; clearTimeout(c.timer); clearInterval(c.shed); c.el.classList.remove('eating');
            const t = c.target;
            if (t && t.state !== 'gone'){
                t.targeted = false; t.el.classList.remove('nibbled');
                if (scared){ t.el.classList.add('saved'); setTimeout(() => t.el.classList.remove('saved'), 900); if (ga.inView){ const hd = ga.headOf(t); ga.sparkles(hd.x, hd.y + 8, 5); } }
            }
            if (scared){ ga.S.shooed++; shooFx(c, 'shoo!'); ga.flash(`saved! the ${c.kind} ${FLEE[c.kind]} ${FLI}`, 2400); ga.save(); }
            const W = ga.bed.clientWidth, back = c.x + c.w / 2 < W / 2 ? -c.w - 30 : W + 30;
            const run = () => {
                if (!c.el.isConnected) return; c.el.classList.remove('startled');
                if (c.kind === 'bird') go(c, back, -60, scared ? 520 : 260, 25, () => dropCritter(c));
                else go(c, back, c.y, scared ? { bunny: 430, snail: 150, caterpillar: 130 }[c.kind] : SPEED[c.kind] * 1.1, 0, () => dropCritter(c));
            };
            if (scared && !reduce){ if (c.tok) c.tok.stop = true; c.el.classList.add('startled'); setTimeout(run, 320); } else run();
            ga.updateHud();
        }

        /* friendly butterfly: visits blooms and sometimes pollinates a new seedling nearby */
        function spawnFlutter(){
            const c = makeCritter('flutter'), W = ga.bed.clientWidth;
            c.fromLeft = Math.random() < 0.5; c.x = c.fromLeft ? -30 : W + 10; c.y = rand(70, 110); setPos(c);
            let visits = 0;
            const next = () => {
                if (!c.el.isConnected) return;
                const opts = ga.P.filter(p => p.state === 'bloom' && p.flower);
                if (visits >= 3 || !opts.length){ c.state = 'leaving'; return go(c, c.fromLeft ? W + 40 : -40, 40, 90, 20, () => dropCritter(c), 6); }
                const p = pick(opts), hd = ga.headOf(p);
                go(c, hd.x - c.w / 2, Math.max(0, hd.y - c.h + 6), 85, 30, () => {
                    visits++; c.el.classList.add('perch');
                    setTimeout(() => {
                        if (!c.el.isConnected) return;
                        c.el.classList.remove('perch');
                        if (p.state === 'bloom' && Math.random() < 0.45){
                            const seedling = ga.plant(p.x + (Math.random() < 0.5 ? -1 : 1) * rand(3, 8), 0, null, { quiet: true });
                            if (seedling){ ga.award('pollen'); ga.flash('a butterfly pollinated a flower — a new seedling sprouted ' + FLI, 2800); }
                        }
                        next();
                    }, rand(1400, 2200));
                }, 6);
            };
            next();
        }
        Object.assign(ga, { dropCritter, go, groundY, makeCritter, setPos, shooFx, spawnFlutter, spawnPest });
    }

    return { create };
});
