/* js/plants/plants.js
   Purpose : the small art and helpers the vine/garden code shares: bloom palettes, the "click the vine" flower icon, creature art (SVG), tween, burstAt/fxFlower, the bird art (from animals/art.js).
   Owns    : NS, hoverable/act, rand/pick, ease, FLI, BLOOMS, BIRD_SVG, SVG (the garden adds SVG.caterpillar later), tween, fxFlower, burstAt.
   Uses    : nothing.   Used by: plants/vine-sprigs.js, animals/birds.js, animals/vine-caterpillar.js, legacy/140 (garden game).
   Mobile / reduced motion: reduced motion is read once, as before (burstAt does nothing under it).
   Moved verbatim from legacy/140 (Migration Step 12d); behaviour, order and timing unchanged. */
MB.define('plants.plants', ['animals.art'], function (art) {
    'use strict';
        const NS = 'http://www.w3.org/2000/svg', reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
        const hoverable = matchMedia('(hover: hover)').matches, act = hoverable ? 'click' : 'tap';
        const rand = (a, b) => a + Math.random() * (b - a), pick = a => a[Math.floor(Math.random() * a.length)];
        const ease = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        const FLI = '<svg class="tiny-fl" viewBox="-50 -50 100 100" aria-hidden="true"><use href="#fl-bloom" x="-50" y="-50" width="100" height="100"/></svg>';
        const BLOOMS = [['fl-bloom','#f4a7bf','#f2c230'],['fl-daisy','#ffffff','#f2c230'],['fl-forsythia','#f2c230','#d99a12'],['fl-bloom','#b9a2de','#f2c230'],['fl-daisy','#c9b2ec','#fbe7a1'],['fl-bloom','#e9789f','#fff1cc'],['fl-daisy','#f2c230','#7a4a1e'],['fl-bloom','#f8c9a0','#e07fa3']];
        const BIRD_SVG = art.BIRD_SVG;
        const SVG = {
            bunny: '<svg viewBox="0 0 46 40"><circle cx="6" cy="27" r="4" fill="#fff" stroke="#e8dcea"/><ellipse cx="18" cy="28" rx="13" ry="10" fill="#f3ece6" stroke="#d9cbd0"/><ellipse cx="12" cy="36" rx="7" ry="3" fill="#e9dfd8"/><ellipse cx="30" cy="9" rx="3" ry="8" fill="#f3ece6" stroke="#d9cbd0" transform="rotate(-14 30 9)"/><ellipse cx="30" cy="9" rx="1.3" ry="5.5" fill="#f9c6d6" transform="rotate(-14 30 9)"/><ellipse cx="35.5" cy="8" rx="3" ry="8" fill="#f3ece6" stroke="#d9cbd0" transform="rotate(10 35.5 8)"/><ellipse cx="35.5" cy="8" rx="1.3" ry="5.5" fill="#f9c6d6" transform="rotate(10 35.5 8)"/><circle cx="33" cy="21" r="8" fill="#f3ece6" stroke="#d9cbd0"/><circle cx="35.5" cy="25" r="2" fill="#f9c6d6" opacity=".7"/><circle cx="36" cy="19" r="1.4" fill="#5a4366"/><circle cx="40.5" cy="22.5" r="1.3" fill="#f4a7bf"/><ellipse cx="28" cy="37" rx="4" ry="2.5" fill="#e9dfd8"/></svg>',
            snail: '<svg viewBox="0 0 40 26"><path d="M2 24 Q2 18 10 19 L30 19 Q33 13 35 10 Q39 12 37 18 Q36 24 30 24 Z" fill="#e8cfa8"/><path d="M34 12 L33 4 M36 12 L38 4" stroke="#c9a979" stroke-width="1.2" stroke-linecap="round"/><circle cx="33" cy="4" r="1.6" fill="#5a4366"/><circle cx="38" cy="4" r="1.6" fill="#5a4366"/><circle cx="18" cy="12" r="10" fill="#c9b2ec" stroke="#8a63b8" stroke-width="1.2"/><path d="M18 6 a6 6 0 1 1 -5.2 3 a4 4 0 1 1 4.2 -1 a2 2 0 1 1 1.6 2.6" fill="none" stroke="#8a63b8" stroke-width="1.2" stroke-linecap="round"/><circle cx="14" cy="7" r="2" fill="#fff" opacity=".5"/></svg>',
            bird: BIRD_SVG,
            flutter: '<svg viewBox="-24 -20 48 40"><g class="bf-wing-l"><path d="M-1 -2 C-10 -20 -26 -16 -21 -3 C-18 4 -8 3 -1 0Z" fill="#fbdc84"/><path d="M-1 1 C-9 3 -18 10 -13 16 C-8 19 -3 10 -1 3Z" fill="#f9b8cf"/></g><g class="bf-wing-r"><path d="M1 -2 C10 -20 26 -16 21 -3 C18 4 8 3 1 0Z" fill="#fbdc84"/><path d="M1 1 C9 3 18 10 13 16 C8 19 3 10 1 3Z" fill="#f9b8cf"/></g><rect x="-1.5" y="-8" width="3" height="20" rx="1.5" fill="#5a4366"/></svg>'
        };
        function tween(dur, fn, done){
            const t0 = performance.now(), tok = { stop: false };
            (function step(now){ if (tok.stop) return; const t = Math.min(1, (now - t0) / Math.max(dur, 1)); fn(t); if (t < 1) requestAnimationFrame(step); else done && done(); })(t0);
            return tok;
        }
        function fxFlower(size){
            const f = pick(BLOOMS), s = document.createElementNS(NS, 'svg');
            s.setAttribute('class', 'fx-flower'); s.setAttribute('viewBox', '-50 -50 100 100');
            s.style.width = s.style.height = size + 'px'; s.style.color = f[1]; s.style.setProperty('--center', f[2]);
            s.innerHTML = '<use href="#' + f[0] + '" x="-50" y="-50" width="100" height="100"/>';
            return s;
        }
        function burstAt(x, y, n){
            if (reduce) return;
            for (let k = 0; k < n; k++){
                const size = rand(22, 40), fl = fxFlower(size), ang = (k / n) * Math.PI * 2 + rand(-0.3, 0.3), dist = rand(50, 120);
                fl.style.left = (x - size / 2) + 'px'; fl.style.top = (y - size / 2) + 'px'; document.body.appendChild(fl);
                const dx = Math.cos(ang) * dist, dy = Math.sin(ang) * dist - 40;
                fl.animate([{ transform: 'translate(0,0) scale(0) rotate(0deg)', opacity: 1 }, { transform: `translate(${dx}px,${dy}px) scale(1) rotate(200deg)`, opacity: 1, offset: 0.5 }, { transform: `translate(${dx * 1.2}px,${dy + 60}px) scale(0.4) rotate(360deg)`, opacity: 0 }],
                    { duration: rand(1300, 1900), easing: 'cubic-bezier(0.22,1,0.36,1)', delay: k * 20 }).onfinish = () => fl.remove();
            }
        }

    return { NS, hoverable, act, ease, FLI, BLOOMS, BIRD_SVG, SVG, tween, fxFlower, burstAt };
});
