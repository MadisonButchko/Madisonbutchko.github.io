/* js/animals/birds.js
   Purpose : the world's birds: a visiting bird (for seeds and petals), the seed you can feed a bird, petal/seed theft, material gathering and the nest at the contact photo.
   Owns    : the vine bird and the page flybys (vineBird(), flyby(): each starts its own timer and returns the function, for ?v11debug), visitingBird, gather, the seed (spawn/drag/feed/take), sparkle, steal, the nest (render/visit; stays inside this file), WorldState.nest/nestShown/nestBits updates.
   Uses    : plants.plants (tween, ease, BIRD_SVG), plants.vine-sprigs (VINE, fadeSprout), core.utils (rand, f1, $, reduce), core.state (WorldState), core.scheduler (Life), core.safe-zones (clearAt, navBottom, openSpot, whenUnseen, inView), animals.animals; reads window.__birdSVG and window.__guideBird at call time.
   Used by : legacy/200-little-world.js (heartbeat: seed spawn, steal, nest render/visit; window.World helpers; ?worlddebug hook) and, through window.World.gather, legacy/140.
   Mobile / reduced motion: unchanged: the seed is a pointer-drag (touch works) or Enter/Space; no visiting birds, theft or nest visits under prefers-reduced-motion (a fed seed is simply eaten).
   Moved verbatim from legacy/200 (Migration Step 10d) and legacy/140 (vine bird + flyby, Step 12e); behaviour, order and timing unchanged. */
MB.define('animals.birds', ['core.utils', 'core.state', 'core.scheduler', 'core.safe-zones', 'animals.animals', 'plants.plants', 'plants.vine-sprigs'], function (utils, state, scheduler, zones, animals, plants, sprigs) {
    'use strict';
    const { $, rand, f1, reduce } = utils, { Life } = scheduler;
    const pick = a => a[Math.floor(Math.random() * a.length)];
    const { tween, ease, BIRD_SVG } = plants, { VINE, fadeSprout } = sprigs;
    const { clearAt, navBottom, openSpot, whenUnseen, inView } = zones;
    const W = state.WorldState.get();
    const save = () => state.WorldState.save();

    /* ------------------------------------------------------------------
       A small bird that comes in for something (a seed, a petal), shared
       by feeding and stealing. Uses the vine-bird look and states.
       ------------------------------------------------------------------ */
    function visitingBird(getTarget, opts) {
        opts = opts || {};
        const el = document.createElement('div'); el.className = 'vine-bird flying w-bird'; el.setAttribute('aria-hidden', 'true');
        el.innerHTML = '<div class="c-flip"><div class="c-body">' + (window.__birdSVG || '') + '</div></div>';
        document.body.appendChild(el);
        const t0 = getTarget(), fromLeft = t0.x > innerWidth / 2 ? false : true;
        let x = fromLeft ? -50 : innerWidth + 50, y = rand(-40, innerHeight * 0.25);
        el.classList.toggle('left-facing', !fromLeft);
        const set = () => { el.style.transform = 'translate(' + f1(x - 18) + 'px,' + f1(y - 26) + 'px)'; }; set();
        const go = (to, dur, arc, done) => {
            const s0 = performance.now(), x0 = x, y0 = y;
            (function step(now) {
                if (!document.contains(el)) return;
                const t = Math.min(1, (now - s0) / dur), e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2, p = to();
                x = x0 + (p.x - x0) * e; y = y0 + (p.y - y0) * e - Math.sin(Math.PI * t) * arc; set();
                if (t < 1) requestAnimationFrame(step); else done && done();
            })(s0);
        };
        const away = () => {
            el.classList.remove('eating'); el.classList.add('flying'); el.classList.toggle('left-facing', fromLeft);
            const ex = fromLeft ? innerWidth + 60 : -60, ey = rand(-60, innerHeight * 0.2);
            go(() => ({ x: ex, y: ey }), 1500, 30, () => { el.remove(); opts.done && opts.done(); });
        };
        go(getTarget, opts.swoop ? 1100 : 1700, opts.swoop ? -30 : -50, () => {
            if (opts.swoop) { opts.arrive && opts.arrive(el); away(); return; }
            el.classList.remove('flying'); el.classList.add('eating');
            opts.arrive && opts.arrive(el);
            setTimeout(away, opts.stay || 1500);
        });
        return el;
    }
    /* birds keep what they find: every few pieces of material, the nest grows by one stage */
    function gather() { W.nestBits = (W.nestBits || 0) + 1; if (W.nestBits >= 2 && W.nest < 5) { W.nestBits = 0; W.nest++; } save(); nest.render(); }

    /* ------------------------------------------------------------------
       A seed to feed a bird: drag it near a bird (or anywhere, if no bird
       is around, and one will come). Keyboard: Enter scatters it.
       ------------------------------------------------------------------ */
    const seed = (function () {
        let el = null, timer = 0, shownThisVisit = 0;
        const SVG = '<svg viewBox="-8 -11 16 22" aria-hidden="true"><path d="M0 -10 C6 -6 6 6 0 10 C-6 6 -6 -6 0 -10Z" fill="#c9a06a" stroke="#8a5a2a" stroke-width="1"/><path d="M0 -8 C3 -4 3 4 0 8" stroke="#f3dcbd" stroke-width="1.4" fill="none" stroke-linecap="round"/></svg>';
        function remove(fade) { if (!el) return; const e = el; el = null; clearTimeout(timer); if (fade) { e.classList.add('gone'); setTimeout(() => e.remove(), 900); } else e.remove(); }
        function docPos() { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
        function feed(near) {
            const s = el; if (!s || s.classList.contains('taken')) return; s.classList.add('taken'); s.setAttribute('aria-disabled', 'true');
            const gb = window.__guideBird, pos = docPos();
            const eat = bird => { s.classList.add('eaten'); if (bird) { bird.classList.add('fed'); setTimeout(() => bird.classList.remove('fed'), 1400); } sparkle(pos.x, pos.y); setTimeout(() => remove(false), 500); gather(); };
            if (near && gb && gb.visible()) { gb.visit(pos.x, pos.y, () => eat(gb.el)); return; }
            if (reduce) { eat(null); return; }
            Life.claim('fed-bird', 9000, true);
            visitingBird(() => docPos(), { stay: 1300, arrive: b => eat(b), done: () => Life.release('fed-bird') });
        }
        function spawn(at) {
            if (el || shownThisVisit >= 3 || reduce) return false;
            const spot = at && clearAt(at.x, at.y, 14) ? at : openSpot(18); if (!spot) return false;
            shownThisVisit++;
            el = document.createElement('div'); el.className = 'w-seed w-piece'; el.innerHTML = SVG;
            el.setAttribute('role', 'button'); el.setAttribute('tabindex', '0'); el.setAttribute('aria-label', 'A seed. Drag it to a bird, or press Enter to scatter it for the birds');
            el.style.left = f1(spot.x + scrollX) + 'px'; el.style.top = f1(spot.y + scrollY) + 'px';
            document.body.appendChild(el);
            let drag = null;
            el.addEventListener('pointerdown', e => { if (el.classList.contains('taken')) return; e.preventDefault(); drag = { id: e.pointerId, dx: e.pageX - parseFloat(el.style.left), dy: e.pageY - parseFloat(el.style.top), moved: 0, sx: e.pageX, sy: e.pageY }; try { el.setPointerCapture(e.pointerId); } catch (_) { } el.classList.add('held'); });
            el.addEventListener('pointermove', e => {
                if (!drag || e.pointerId !== drag.id) return;
                el.style.left = f1(e.pageX - drag.dx) + 'px'; el.style.top = f1(e.pageY - drag.dy) + 'px';
                drag.moved = Math.max(drag.moved, Math.hypot(e.pageX - drag.sx, e.pageY - drag.sy));
                const gb = window.__guideBird;
                if (gb && gb.visible()) { const p = gb.at(); gb.el.classList.toggle('curious', Math.hypot(p.x - e.clientX, p.y - e.clientY) < 220); }
            });
            const drop = e => {
                if (!drag || e.pointerId !== drag.id) return;
                const moved = drag.moved; drag = null; el.classList.remove('held');
                const gb = window.__guideBird; if (gb) gb.el.classList.remove('curious');
                if (moved < 24) { el.classList.remove('wiggle'); void el.offsetWidth; el.classList.add('wiggle'); return; }
                const p = docPos(), near = gb && gb.visible() && Math.hypot(gb.at().x - p.x, gb.at().y - p.y) < 220;
                feed(near || !(gb && gb.visible()));
            };
            el.addEventListener('pointerup', drop); el.addEventListener('pointercancel', drop);
            el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); feed(true); } });
            /* unclaimed seeds blow away after a while */
            timer = setTimeout(() => remove(true), 75000);
            return true;
        }
        return { spawn, get el() { return el; }, take: () => { const e = el; el = null; clearTimeout(timer); return e; } };
    })();
    function sparkle(x, y) {
        if (reduce) return;
        for (let k = 0; k < 4; k++) {
            const s = document.createElement('i'); s.className = 'w-spark'; s.style.left = f1(x) + 'px'; s.style.top = f1(y) + 'px';
            document.body.appendChild(s);
            const a = k / 4 * Math.PI * 2 + 0.4;
            s.animate([{ transform: 'translate(0,0) scale(.3)', opacity: 1 }, { transform: 'translate(' + f1(Math.cos(a) * 18) + 'px,' + f1(Math.sin(a) * 18 - 8) + 'px) scale(1)', opacity: 0 }], { duration: 700, easing: 'ease-out' }).onfinish = () => s.remove();
        }
    }

    /* uncommon: a bird swoops for a loose seed, or snatches a petal out of the air, and carries it off */
    function steal() {
        if (reduce || !Life.claim('thief', 9000)) return false;
        let carried = seed.el && !seed.el.classList.contains('held') && !seed.el.classList.contains('taken') && inView(seed.el) ? seed.take() : null;
        let x, y;
        if (carried) { const r = carried.getBoundingClientRect(); x = r.left + r.width / 2; y = r.top + r.height / 2; }
        else {
            const spot = openSpot(14); if (!spot) { Life.release('thief'); return false; }
            carried = document.createElement('div'); carried.className = 'w-petal'; carried.setAttribute('aria-hidden', 'true');
            document.body.appendChild(carried);
            x = spot.x; y = navBottom() + 20;
        }
        carried.classList.add('w-loose');
        const t0 = performance.now(), driftTo = y + rand(120, 200);
        const pos = () => { const t = (performance.now() - t0) / 1000; return { x: x + Math.sin(t * 1.6) * 16, y: Math.min(driftTo, y + t * 34) }; };
        carried.style.position = 'fixed';
        const place = () => { const p = pos(); carried.style.left = f1(p.x) + 'px'; carried.style.top = f1(p.y) + 'px'; };
        let falling = true;
        (function fall() { if (!falling) return; place(); requestAnimationFrame(fall); })();
        setTimeout(() => visitingBird(pos, {
            swoop: true,
            arrive: b => { falling = false; carried.style.cssText = ''; carried.className = 'w-carried ' + (carried.classList.contains('w-seed') ? 'is-seed' : 'is-petal'); b.querySelector('.c-body').appendChild(carried); },
            done: () => { Life.release('thief'); gather(); }
        }), 1600);
        return true;
    }

    /* ------------------------------------------------------------------
       The nest: tucked at a corner of the contact photo. It only changes
       while out of sight, a twig at a time, and birds visit it later.
       ------------------------------------------------------------------ */
    const nest = (function () {
        const host = $('.contact-photo'); if (!host) return { render() { }, visit() { return false; } };
        const el = document.createElement('div'); el.className = 'w-nest'; el.setAttribute('aria-hidden', 'true');
        el.innerHTML = '<svg viewBox="0 0 80 46">'
            + '<g class="n1"><path d="M8 34 L58 26" stroke="#9a6b3a" stroke-width="2.2" stroke-linecap="round"/><path d="M40 29 L48 21" stroke="#9a6b3a" stroke-width="1.4" stroke-linecap="round"/></g>'
            + '<g class="n2"><path d="M18 38 L70 33" stroke="#b07f4a" stroke-width="2" stroke-linecap="round"/><path d="M26 37 L20 31" stroke="#b07f4a" stroke-width="1.3" stroke-linecap="round"/></g>'
            + '<g class="n3" fill="none" stroke="#a7b86a" stroke-width="1.3" stroke-linecap="round"><path d="M14 33 Q30 28 44 33"/><path d="M36 36 Q50 30 66 34"/><path d="M22 30 Q28 24 34 30"/></g>'
            + '<g class="n4"><path d="M14 30 Q40 50 66 30 Q60 40 40 42 Q20 40 14 30Z" fill="#b8865a" stroke="#8a5a2a" stroke-width="1.2"/><path d="M18 32 Q40 44 62 32" fill="none" stroke="#d9b07a" stroke-width="1.2"/><path d="M22 35 L58 35 M26 38 L54 38" stroke="#9a6b3a" stroke-width=".8"/></g>'
            + '<g class="n5"><ellipse cx="34" cy="30" rx="4.2" ry="5" fill="#cfe5f2" stroke="#9ab8cc" stroke-width=".7"/><ellipse cx="44" cy="31" rx="4" ry="4.8" fill="#dbeef8" stroke="#9ab8cc" stroke-width=".7"/><path d="M58 24 q6 -4 9 2" stroke="#f4a7bf" stroke-width="1.6" fill="none" stroke-linecap="round"/></g></svg>';
        host.appendChild(el);
        function render() {
            if (W.nestShown === W.nest) { el.dataset.stage = W.nestShown; return; }
            /* the next twig appears while nobody is looking */
            whenUnseen(el, () => { W.nestShown = W.nest; save(); el.dataset.stage = W.nestShown; });
        }
        el.dataset.stage = W.nestShown || 0;
        render();
        let lastVisit = 0;
        function visit() {
            if (reduce || W.nestShown < 4 || !inView(el) || performance.now() - lastVisit < 180000 || !Life.claim('nest-bird', 9000)) return false;
            lastVisit = performance.now();
            visitingBird(() => { const r = el.getBoundingClientRect(); return { x: r.left + r.width * 0.5, y: r.top + r.height * 0.45 }; }, { stay: 3200, done: () => Life.release('nest-bird') });
            return true;
        }
        return { render, visit };
    })();

    /* ---- vine birds (Migration Step 12e, moved verbatim from legacy/140): one that drops by to snack on a vine flower (click to shoo), and flybys across the page ---- */
    function vineBirdStart() {
            /* a bird drops by now and then to snack on a vine flower; click it to scare it off (wide screens) */
            function vineBird(){
                if (Life.busy() && !Life.claim('vine-bird-ask', 1, 'preempt')) { setTimeout(vineBird, 6000); return; }   /* someone else is out: try again soon */
                Life.release('vine-bird-ask');
                setTimeout(vineBird, rand(18000, 30000));
                if (document.hidden || innerWidth < 1024 || document.querySelector('.vine-bird')) return;
                /* anything blooming along the side vines: grown sprigs and the vine's own flowers */
                const all = [];
                ['left', 'right'].forEach(side => { const v = VINE[side]; if (v) v.slots.forEach(s => { if (s.sp && !s.sp.gone && !s.sp.leafy){ const h = s.sp.g.querySelector('.sprout.main:not(.bitten)'); if (h) all.push({ side, el: h, sp: s.sp }); } }); });
                document.querySelectorAll('.vine-item.spin.on:not(.eaten)').forEach(it => all.push({ side: it.closest('.vine-left') ? 'left' : 'right', el: it }));
                const seen = all.filter(t => { const r = t.el.getBoundingClientRect(); return r.width && r.top > 80 && r.bottom < innerHeight - 30; });
                if (!seen.length) return;
                const target = pick(seen), side = target.side, hr = target.el.getBoundingClientRect();
                if (!Life.claim('vine-bird', 12000)) return;
                if (target.sp) target.sp.targeted = true;   /* it will not wilt while the bird is on its way */
                const el = document.createElement('div'); el.className = 'vine-bird flying' + (side === 'left' ? ' left-facing' : '');
                el.setAttribute('role', 'button'); el.setAttribute('aria-label', 'Shoo the bird');
                el.innerHTML = `<div class="c-flip"><div class="c-body">${BIRD_SVG}</div></div>`; document.body.appendChild(el);
                const cxh = hr.left + hr.width / 2;
                let x = side === 'left' ? cxh + 260 : cxh - 300, y = -40, state = 'coming', tok, timer;
                const set = () => { el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`; }; set();
                const fly = (x1, y1, dur, arc, done) => { const x0 = x, y0 = y; if (tok) tok.stop = true; tok = tween(dur, t => { const e = ease(t); x = x0 + (x1 - x0) * e; y = y0 + (y1 - y0) * e - Math.sin(Math.PI * t) * arc; set(); }, done); };
                const leave = scared => {
                    if (state === 'leaving') return; state = 'leaving'; clearTimeout(timer);
                    target.el.classList.remove('pecked'); if (target.sp) target.sp.targeted = false;
                    el.classList.remove('eating'); el.classList.add('flying'); el.classList.toggle('left-facing', side !== 'left');
                    fly(side === 'left' ? x + 300 : x - 300, -90, scared ? 650 : 1300, 20, () => { el.remove(); Life.release('vine-bird'); });
                };
                el.addEventListener('click', e => { e.stopPropagation(); leave(true); });
                fly(side === 'left' ? cxh - 5 : cxh - 31, hr.top - 21, 1500, -45, () => {
                    if (state !== 'coming') return;
                    if (target.sp && target.sp.gone) return leave(false);
                    /* the bird has arrived: it pecks (the flower trembles), and only then is the flower gone */
                    state = 'eating'; el.classList.remove('flying'); el.classList.add('eating'); target.el.classList.add('pecked');
                    timer = setTimeout(() => {
                        if (state !== 'eating') return;
                        target.el.classList.remove('pecked');
                        if (target.sp) fadeSprout(target.sp, true);
                        else { target.el.classList.add('eaten'); setTimeout(() => target.el.classList.remove('eaten'), rand(45000, 80000)); }
                        leave(false);
                    }, 2600);
                });
            }

            setTimeout(vineBird, 14000);
            return vineBird;
    }
    function flybyStart() {
            /* now and then a bird (or a pair) flies across the page on a varied path */
            const TINTS = [['#a9d8ea', '#8fc3dc', '#7fb3cc'], ['#f9c6d6', '#f4a7bf', '#e98fb0'], ['#fbe7a1', '#f6d36b', '#e8b923'], ['#d9cbf3', '#c9b2ec', '#b39ddc']];
            function flyby(){
                setTimeout(flyby, rand(35000, 60000));
                if (document.hidden || document.querySelector('.gallery-modal.active, .lightbox.active')) return;
                const W = innerWidth, H = innerHeight;
                if (!Life.claim('flyby', (W + 140) / 42 * 1000 + 1500)) return;
                const ltr = Math.random() < 0.5, kind = pick(['glide', 'swoop', 'wave']);
                const n = Math.random() < 0.3 ? 2 : 1, y0 = rand(H * 0.12, H * 0.5), dur = (W + 140) / rand(42, 56) * 1000; /* constant ~50px/s at every width */
                for (let k = 0; k < n; k++){
                    const t = pick(TINTS), el = document.createElement('div'); el.className = 'flyby-bird' + (ltr ? '' : ' left-facing'); el.setAttribute('aria-hidden', 'true');
                    el.innerHTML = `<div class="c-flip"><div class="c-body">${BIRD_SVG.replace(/#a9d8ea/g, t[0]).replace(/#8fc3dc/g, t[1]).replace(/#7fb3cc/g, t[2])}</div></div>`;
                    el.style.setProperty('--fs', (rand(0.6, 0.8) * (W < 600 ? 0.8 : 1)).toFixed(2));
                    /* now and then the first bird carries something home for its nest: a twig, a strand of grass, a bit of fluff */
                    const carries = k === 0 && window.World && World.gather && (World.nestStage ? World.nestStage() < 5 : true) && Math.random() < 0.4;
                    if (carries){ const it = document.createElement('i'); it.className = 'w-twig is-' + pick(['twig', 'grass', 'fluff']); el.querySelector('.c-body').appendChild(it); el.__carry = true; }
                    document.body.appendChild(el);
                    const yy = y0 + k * 22, lag = k * 0.06;
                    tween(dur * (1 + lag), q => {
                        const u = Math.max(0, q * (1 + lag) - lag), x = ltr ? -70 + (W + 140) * u : W + 70 - (W + 140) * u;
                        const y = kind === 'glide' ? yy - u * H * 0.08 + Math.sin(u * 7) * 6 : kind === 'swoop' ? yy + Math.sin(Math.PI * u) * H * 0.16 : yy + Math.sin(u * Math.PI * 3) * 26;
                        el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
                    }, () => { if (el.__carry) World.gather(); el.remove(); });
                }
            }
            setTimeout(flyby, 30000);
            return flyby;
    }

    return animals.register('birds', { seed, steal, nest, gather, sparkle, visitingBird, vineBird: vineBirdStart, flyby: flybyStart });
});
