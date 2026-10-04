/* js/animals/butterflies.js
   Purpose : small creatures that answer the visitor in the botanical interface: the visiting butterfly/bee (also the rare ambient visitor) and the ladybug on a Skills piece.
   Owns    : WINGS/BEE/LADYBUG art, visitFlower, shouldVisit (still the visit-policy placeholder, returns false as before), ladybugOn; drift(): the page's occasional drifting butterfly.
   Uses    : core.utils (f1, reduce), core.scheduler (Life).   Used by: botanical/stage.js, botanical/easter-eggs (LADYBUG), plants/flowers.js (rare visitor), main.js (drift).
   Mobile / reduced motion: nothing at all under prefers-reduced-motion; they go through the Life director so they never pile up.
   Moved verbatim from legacy/190-botanical.js (Migration Step 13); behaviour, order and timing unchanged. */
MB.define('animals.butterflies', ['core.utils', 'core.scheduler'], function (utils, scheduler) {
    'use strict';
    const { f1, reduce } = utils, { Life } = scheduler;
    /* ------------------------------------------------------------------
       Small creatures that answer what the visitor does. They go through
       the shared Life director, so they never pile up.
       ------------------------------------------------------------------ */
    const WINGS = (c1, c2) => '<svg viewBox="-24 -20 48 40" aria-hidden="true"><g class="bf-wing-l"><path d="M-1 -2 C-10 -20 -26 -16 -21 -3 C-18 4 -8 3 -1 0Z" fill="' + c1 + '"/><path d="M-1 1 C-9 3 -18 10 -13 16 C-8 19 -3 10 -1 3Z" fill="' + c2 + '"/></g><g class="bf-wing-r"><path d="M1 -2 C10 -20 26 -16 21 -3 C18 4 8 3 1 0Z" fill="' + c1 + '"/><path d="M1 1 C9 3 18 10 13 16 C8 19 3 10 1 3Z" fill="' + c2 + '"/></g><rect x="-1.5" y="-8" width="3" height="20" rx="1.5" fill="#5a4366"/><path d="M-1 -8 Q-5 -15 -7 -16 M1 -8 Q5 -15 7 -16" stroke="#5a4366" stroke-width="1" fill="none"/></svg>';
    const BEE = '<svg viewBox="-16 -14 32 28" aria-hidden="true"><g class="bee-wings"><ellipse cx="-4" cy="-8" rx="5" ry="7" fill="#eaf6ff" stroke="#a9cbe0" stroke-width=".8" transform="rotate(-25 -4 -8)"/><ellipse cx="4" cy="-8" rx="5" ry="7" fill="#eaf6ff" stroke="#a9cbe0" stroke-width=".8" transform="rotate(25 4 -8)"/></g><ellipse rx="10" ry="7.2" fill="#f6cf4a" stroke="#c9961a" stroke-width=".8"/><path d="M-4 -6.6 V6.6 M2 -7 V7" stroke="#4a3a2a" stroke-width="2.6"/><circle cx="10" cy="-1" r="4.4" fill="#4a3a2a"/><circle cx="11.6" cy="-2.2" r="1" fill="#fff"/><path d="M-10 0 L-13.5 0" stroke="#4a3a2a" stroke-width="1.4" stroke-linecap="round"/></svg>';
    const LADYBUG = '<svg viewBox="-10 -9 20 18" aria-hidden="true"><circle cx="7" cy="0" r="3.6" fill="#3a2b33"/><ellipse rx="7.4" ry="6.6" fill="#e2483d"/><path d="M-7.4 0 H7.4" stroke="#3a2b33" stroke-width=".9"/><circle cx="-3" cy="-3" r="1.3" fill="#3a2b33"/><circle cx="2" cy="-3.4" r="1.1" fill="#3a2b33"/><circle cx="-2.4" cy="3.2" r="1.2" fill="#3a2b33"/><circle cx="2.6" cy="3" r="1.3" fill="#3a2b33"/><circle cx="-5" cy="-1.8" r=".9" fill="#fff" opacity=".55"/></svg>';
    let lastVisit = 0;
    /* a butterfly (or bee) flies to `target`, settles on it for a moment, then leaves */
    function visitFlower(target, kind) {
        if (reduce || document.hidden || !target || performance.now() - lastVisit < 9000) return;
        if (!Life.claim('visitor', 14000, true)) return;
        lastVisit = performance.now();
        const bee = kind === 'bee', el = document.createElement('div');
        el.className = 'visitor ' + (bee ? 'is-bee' : 'is-butterfly'); el.setAttribute('aria-hidden', 'true');
        const pal = [['#c9b2ec', '#f4a7bf'], ['#fbdc84', '#f9b8cf'], ['#a9d8ea', '#c9b2ec']][Math.floor(Math.random() * 3)];
        el.innerHTML = bee ? BEE : WINGS(pal[0], pal[1]);
        document.body.appendChild(el);
        const W = innerWidth, H = innerHeight, fromLeft = Math.random() < 0.5;
        let x = fromLeft ? -40 : W + 40, y = H * (0.2 + Math.random() * 0.4);
        const spot = () => { const r = target.getBoundingClientRect(); return { x: r.left + r.width * (0.4 + Math.random() * 0.2), y: r.top + r.height * 0.3 }; };
        const place = (px, py, rot) => { el.style.transform = 'translate(' + f1(px) + 'px,' + f1(py) + 'px) rotate(' + f1(rot) + 'deg)'; };
        place(x, y, 0);
        const go = (dur, to, wobble, done) => {
            const t0 = performance.now(), x0 = x, y0 = y;
            (function step(now) {
                if (!document.contains(el)) return;
                const t = Math.min(1, (now - t0) / dur), e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2, p = to();
                x = x0 + (p.x - x0) * e + Math.sin(t * Math.PI * 3) * wobble;
                y = y0 + (p.y - y0) * e - Math.sin(t * Math.PI) * 40 + Math.sin(t * 26) * (bee ? 4 : 2);
                place(x, y, Math.cos(t * 20) * (bee ? 8 : 14));
                if (t < 1) requestAnimationFrame(step); else done && done();
            })(t0);
        };
        const finish = () => { el.remove(); Life.release('visitor'); };
        const leave = () => { el.classList.remove('perched'); const ex = Math.random() < 0.5 ? -60 : W + 60; go(1700, () => ({ x: ex, y: -50 }), 30, finish); };
        const land = spot();
        go(2000, () => land, 26, () => {
            if (bee) {   /* a bee investigates: two small loops, then away */
                const c = spot(), t0 = performance.now();
                (function loop(now) {
                    if (!document.contains(el)) return;
                    const t = (now - t0) / 1600, a = t * Math.PI * 2;
                    x = c.x + Math.cos(a) * 18; y = c.y + Math.sin(a) * 9; place(x, y, Math.sin(a) * 10);
                    if (t < 2) requestAnimationFrame(loop); else leave();
                })(t0);
            } else {
                el.classList.add('perched');
                const stay = performance.now() + 2800;
                (function follow() { if (!document.contains(el)) return; const p = spot(); x += (p.x - x) * 0.25; y += (p.y - y) * 0.25; place(x, y, 0); if (performance.now() < stay) requestAnimationFrame(follow); else leave(); })();
                target.classList.add('is-visited-by'); setTimeout(() => target.classList.remove('is-visited-by'), 2800);
            }
        });
    }
    /* Should a creature come to visit the piece the visitor just chose for the first time?
       nthFound: how many pieces they have explored so far this visit (1 on their very first).
       isExp:    true for an Experience bloom (butterfly), false for a Skills piece (ladybug).
       visitFlower/ladybugOn already enforce a cooldown and the one-creature-at-a-time director. */
    function shouldVisit(nthFound, isExp) {
        // TODO(human): return true when a visitor should appear
        return false;
    }
    let lastBug = 0;
    function ladybugOn(piece) {
        if (reduce || !piece || performance.now() - lastBug < 12000) return;
        lastBug = performance.now();
        const bug = document.createElement('span'); bug.className = 'ladybug'; bug.setAttribute('aria-hidden', 'true'); bug.innerHTML = LADYBUG;
        piece.appendChild(bug); setTimeout(() => bug.remove(), 3600);
    }

    /* Flower FX (d): a butterfly drifts across now and then (was legacy/070) */
    function drift() {
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduce) return;
        const rand = (a, b) => a + Math.random() * (b - a);
        const bf = document.createElement('div'); bf.className = 'butterfly'; bf.setAttribute('aria-hidden', 'true');
        bf.innerHTML = '<svg viewBox="-24 -20 48 40"><g class="bf-wing-l"><path d="M-1 -2 C-10 -20 -26 -16 -21 -3 C-18 4 -8 3 -1 0Z" fill="#b9a2de"/><path d="M-1 1 C-9 3 -18 10 -13 16 C-8 19 -3 10 -1 3Z" fill="#f4a7bf"/><circle cx="-14" cy="-7" r="3" fill="#fff" opacity=".7"/></g><g class="bf-wing-r"><path d="M1 -2 C10 -20 26 -16 21 -3 C18 4 8 3 1 0Z" fill="#b9a2de"/><path d="M1 1 C9 3 18 10 13 16 C8 19 3 10 1 3Z" fill="#f4a7bf"/><circle cx="14" cy="-7" r="3" fill="#fff" opacity=".7"/></g><rect x="-1.5" y="-8" width="3" height="20" rx="1.5" fill="#5a4366"/><path d="M-1 -8 Q-5 -15 -7 -16 M1 -8 Q5 -15 7 -16" stroke="#5a4366" stroke-width="1" fill="none"/></svg>';
        document.body.appendChild(bf);
        function fly(){
            let yielded = false;
            if (!Life.claim('butterfly', (innerWidth + 120) / 38 * 1000 + 500, false, () => { yielded = true; bf.style.opacity = 0; setTimeout(fly, rand(28000, 48000)); })) { setTimeout(fly, rand(8000, 14000)); return; }
            const ltr = Math.random() > 0.5, W = innerWidth, H = innerHeight;
            const x0 = ltr ? -60 : W + 60, x1 = ltr ? W + 60 : -60, y0 = rand(H * 0.15, H * 0.7), y1 = rand(H * 0.1, H * 0.75);
            const dur = (W + 120) / rand(38, 48) * 1000, start = performance.now(), amp = rand(24, 50), waves = rand(1.5, 3);
            bf.style.opacity = 1;
            (function step(now){
                if (yielded) return;
                const t = Math.min(1, (now - start) / dur);
                const x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t + Math.sin(t * Math.PI * 2 * waves) * amp + Math.sin(t * 40) * 4;
                const tilt = Math.cos(t * Math.PI * 2 * waves) * 18 * (ltr ? 1 : -1);
                bf.style.transform = `translate(${x}px,${y}px) rotate(${(ltr ? 70 : -70) + tilt}deg)`;
                if (t < 1) requestAnimationFrame(step); else { bf.style.opacity = 0; Life.release('butterfly'); setTimeout(fly, rand(28000, 48000)); }
            })(start);
        }
        setTimeout(fly, 9000);
    }

    return { visitFlower, shouldVisit, ladybugOn, LADYBUG, drift };
});
