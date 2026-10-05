/* js/plants/decor.js
   Purpose : flower patches ("page-posy") and scattered blooms/leaves ("scatter") dropped into empty margins; each spot is checked against text, photos, panels and the other decorations, and re-checked on load, resize and clicks.
   Owns    : both placers and their own copies of the content-avoidance selector lists (CONTENT: deliberately NOT unified until Phase D).
   Uses    : core.utils (rand, reduce); core.safe-zones (contentRects, for the wild blooms); the seeded generators `rng`/`vf` are small private copies of the ones legacy/140 uses.
   Used by : legacy/140-side-vines-and-garden.js calls start() at the spot the two blocks ran; plants/flowers.js adopts the results later (adoptLate); weather reads .page-posy.
   Also    : WILD BLOOMS (hydrangea, daisy, cosmos, poppy, bellflower, forget-me-not): VARIETIES config + the placer that builds each flower with its variety, personality and special flag (behaviour: plants/flowers.js `adoptWild`). It runs from the scatter block's own re-layout timer, so it counts everything placed before it and adds no listeners.
   Mobile / reduced motion: unchanged: patch hover-bloom only where hover exists, taps bloom too; reduced motion skips the petal burst. Wild blooms: 1 per section on phones (smaller, no large specimens), no idle animation at all.
   Moved verbatim from legacy/140 (Migration Step 12b); behaviour, order and timing unchanged. */
MB.define('plants.decor', ['core.utils', 'core.safe-zones'], function (utils, safeZones) {
    'use strict';
    const { rand, reduce } = utils;
    const hoverable = matchMedia('(hover: hover)').matches;
    const rng = seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const vf = v => (+v).toFixed(1);

    function start() {
        let afterScatter = () => {};                     /* the wild-bloom placer, set below; the scatter block calls it right after its own placement */
        /* =========================================================
           FLOWER PATCHES in open spaces: small arrangements placed only
           where they touch no text, photo, button or panel (re-checked
           when the layout changes). They sway; hover or tap and they bloom
           and bounce, shaking off a few petals.
           ========================================================= */
        (function(){
            const SPOTS = { home: [[0.05, 0.95], [0.95, 0.97]], about: [[0.94, 0.9], [0.06, 0.92]], experience: [[0.06, 0.16], [0.94, 0.14], [0.86, 0.99], [0.14, 0.99]],
                skills: [[0.07, 0.88], [0.93, 0.88], [0.08, 0.2], [0.92, 0.2]], gallery: [[0.05, 0.06], [0.95, 0.07], [0.12, 0.995], [0.88, 0.995]], contact: [[0.93, 0.25], [0.07, 0.88], [0.93, 0.9], [0.22, 0.98], [0.78, 0.98]] };
            const CONTENT = 'p,h1,h2,h3,h4,li,a,button,img,input,label,span.tag,.hero-text,.collage,.about-photo-wrap,.section-head,.section-hint,.xp-head,.garden,.herbarium,.gallery-frame,.gallery-preview,.gallery-deviant,.contact-inner,.contact-photo,.garden-bed,.garden-tip';
            const SPECIES = [['fl-bloom', '#f4a7bf', '#f2c230'], ['fl-daisy', '#ffffff', '#f2c230'], ['fl-forsythia', '#f2c230', '#d99a12'], ['fl-bloom', '#b9a2de', '#f2c230'], ['fl-daisy', '#c9b2ec', '#fbe7a1'], ['fl-bloom', '#e9789f', '#fff1cc'], ['fl-bloom', '#f8c9a0', '#e07fa3']];
            const patches = [];
            function make(seed){
                const R = rng(seed), n = 3 + Math.floor(R() * 3), el = document.createElement('div');
                el.className = 'page-posy'; el.setAttribute('aria-hidden', 'true');
                let h = '<svg viewBox="-70 -120 140 140">';
                for (let k = 0; k < 4; k++){ const gx = (k - 1.5) * 7 + (R() - 0.5) * 4, gh = 10 + R() * 9, b = (R() - 0.5) * 8; h += `<path class="pp-grass" d="M${vf(gx)} 0 Q${vf(gx + b * 0.4)} ${vf(-gh * 0.6)} ${vf(gx + b)} ${vf(-gh)}"/>`; }
                for (let k = 0; k < n; k++){
                    const a = (-34 + 68 * (n === 1 ? 0.5 : k / (n - 1)) + (R() - 0.5) * 10) * Math.PI / 180, L = 46 + R() * 36, tx = Math.sin(a) * L, ty = -Math.cos(a) * L;
                    const f = SPECIES[Math.floor(R() * SPECIES.length)], sz = 20 + R() * 10, lx = tx * 0.45, ly = ty * 0.45, side = k % 2 ? 1 : -1;
                    h += `<g class="pp-stem" style="--sd:${vf(3 + R() * 2)}s;--dl:-${vf(R() * 3)}s"><path class="pp-st" d="M0 0 Q${vf(tx * 0.2 + side * 6)} ${vf(ty * 0.55)} ${vf(tx)} ${vf(ty)}"/>`
                        + `<g style="color:${R() < 0.5 ? '#8db36a' : '#7fa65c'}"><use href="#fl-leaf" x="${vf(lx)}" y="${vf(ly - 12)}" width="12" height="12" transform="rotate(${side > 0 ? 10 : -100} ${vf(lx)} ${vf(ly)})"/></g>`
                        + `<g class="pp-fl" transform="translate(${vf(tx)} ${vf(ty)})" style="--i:${k}"><g class="pp-pop" style="color:${f[1]};--center:${f[2]}"><use href="#${f[0]}" x="${vf(-sz / 2)}" y="${vf(-sz / 2)}" width="${vf(sz)}" height="${vf(sz)}"/></g></g></g>`;
                }
                el.innerHTML = h + '</svg>';
                const boing = () => {
                    if (reduce) return;
                    el.classList.remove('boing'); void el.offsetWidth; el.classList.add('boing');
                    el.querySelectorAll('.pp-fl').forEach((fl, k) => {
                        if (Math.random() < 0.5) return;
                        const p = document.createElement('i'); p.className = 'pp-petal'; p.style.background = getComputedStyle(fl.firstChild).color;
                        const b = fl.getBoundingClientRect(), r = el.getBoundingClientRect(); p.style.left = (b.left - r.left + b.width / 2) + 'px'; p.style.top = (b.top - r.top + b.height / 2) + 'px';
                        el.appendChild(p); const dx = rand(-30, 30);
                        p.animate([{ transform: 'translate(0,0) rotate(0)', opacity: 1 }, { transform: `translate(${dx}px, ${rand(30, 60)}px) rotate(${rand(-300, 300)}deg)`, opacity: 0 }], { duration: rand(900, 1300), delay: k * 60, easing: 'ease-in', fill: 'backwards' }).onfinish = () => p.remove();
                    });
                };
                el.addEventListener('click', e => { boing(); });
                el.addEventListener('mouseenter', () => { if (hoverable) boing(); });
                return el;
            }
            const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) e.target.classList.add('open'); }), { threshold: 0.4 });
            function place(){
                const W = document.documentElement.clientWidth, narrow = W < 700, wide = W >= 1240;
                const size = narrow ? 64 : W < 1100 ? 80 : 96, maxAll = narrow ? 4 : 8;
                const xMin = wide ? 104 : 26, xMax = W - xMin;
                let used = 0, idx = 0; const placed = [];
                Object.keys(SPOTS).forEach(id => {
                    const sec = document.getElementById(id); if (!sec) return;
                    const sr = sec.getBoundingClientRect(), blocks = [...sec.querySelectorAll(CONTENT)].map(e => e.getBoundingClientRect()).filter(r => r.width && r.height);
                    let inSec = 0;
                    SPOTS[id].forEach(([fx, fy]) => {
                        const key = id + fx + fy; let p = patches.find(q => q.key === key);
                        const room = size * 1.15 + 12;
                        const cx = Math.max(room + 8, Math.min(W - room - 8, sr.left + sr.width * fx)), by = sr.top + sr.height * fy, box = { l: cx - room, r: cx + room, t: by - size * 1.5, b: by + size * 0.3 };
                        const m = 14, clear = used < maxAll && inSec < 2 && box.l >= 6 && box.r <= W - 6 && cx > xMin && cx < xMax && box.t > sr.top && box.b < sr.bottom
                            && !blocks.some(r => r.left < box.r + m && r.right > box.l - m && r.top < box.b + m && r.bottom > box.t - m)
                            && !placed.some(q => Math.abs(q.cx - cx) < size && Math.abs(q.by - by) < size);
                        if (!clear){ if (p) p.el.style.display = 'none'; return; }
                        if (!p){ p = { key, el: make(1 + (idx * 7919 + key.length * 104729) % 2147483646) }; patches.push(p); sec.appendChild(p.el); io.observe(p.el); }
                        p.el.style.display = ''; p.el.style.width = p.el.style.height = size + 'px';
                        p.el.style.left = (cx - sr.left - size / 2).toFixed(0) + 'px'; p.el.style.top = (by - sr.top - size).toFixed(0) + 'px';
                        placed.push({ cx, by }); used++; inSec++; idx++;
                    });
                });
            }
            let pt = 0; const later = ms => { clearTimeout(pt); pt = setTimeout(place, ms); };
            addEventListener('load', () => later(400)); later(1200);
            let lastW = innerWidth; addEventListener('resize', () => { if (innerWidth !== lastW){ lastW = innerWidth; later(300); } });
            /* panels open and close, skills expand: re-check after clicks */
            document.addEventListener('click', e => { if (!e.target.closest('.page-posy')) later(650); });
        })();

        /* =========================================================
           SCATTERED BLOOMS AND LEAVES: single flowers and leaves in the same
           style as the ones around the hero (slow spin / gentle leaf sway),
           dropped into empty margins and gaps. Each candidate spot is checked
           against text, photos, panels and the other decorations, so nothing
           is ever covered, and the check re-runs when the layout changes.
           ========================================================= */
        (function(){
            const IDS = ['home', 'about', 'experience', 'skills', 'gallery', 'contact'];
            const CONTENT = 'p,h1,h2,h3,h4,li,a,button,img,input,label,span.tag,.hero-text,.collage,.about-body,.about-photo-wrap,.section-head,.section-hint,.xp-head,.garden,.herbarium,.gallery-frame,.gallery-preview,.gallery-deviant,.contact-inner,.contact-photo,.garden-bed,.garden-tip,.bloom,.page-posy,.footer-flowers';
            const SPECIES = [['fl-bloom', '#f4a7bf', '#f2c230'], ['fl-daisy', '#ffffff', '#f2c230'], ['fl-forsythia', '#f2c230', '#d99a12'], ['fl-bloom', '#b9a2de', '#f2c230'], ['fl-daisy', '#c9b2ec', '#fbe7a1'], ['fl-bloom', '#e9789f', '#fff1cc'], ['fl-bloom', '#f8c9a0', '#e07fa3'], ['fl-leaf', '#8db36a'], ['fl-leaf', '#7fa65c'], ['fl-leaf', '#a6c47f']];
            const mk = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
            const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) e.target.classList.add('open'); }), { threshold: 0.3 });
            const made = new Map();
            function build(key, seed, leafy){
                const R = mk(seed), pool = SPECIES.filter(f => (f[0] === 'fl-leaf') === leafy), f = pool[Math.floor(R() * pool.length)];
                const el = document.createElement('div'); el.className = 'scatter ' + (leafy ? 'sc-leaf' : 'sc-bloom'); el.setAttribute('aria-hidden', 'true');
                el.style.setProperty('--spin', (30 + R() * 28).toFixed(0) + 's'); el.style.setProperty('--sdl', '-' + (R() * 30).toFixed(1) + 's'); el.style.setProperty('--rot', ((R() - 0.5) * 70).toFixed(0) + 'deg');
                el.innerHTML = `<svg viewBox="-50 -50 100 100" style="color:${f[1]};${f[2] ? '--center:' + f[2] : ''}"><use href="#${f[0]}"/></svg>`;
                return el;
            }
            function place(){
                const W = document.documentElement.clientWidth, narrow = W < 700, wide = W >= 1240;
                const xMin = wide ? 100 : 10, perSec = narrow ? 2 : W < 1100 ? 3 : 4, gap = narrow ? 140 : 190;
                const taken = [...document.querySelectorAll('.page-posy')].filter(e => e.style.display !== 'none').map(e => e.getBoundingClientRect());
                IDS.forEach(id => {
                    const sec = document.getElementById(id); if (!sec) return;
                    const sr = sec.getBoundingClientRect(), blocks = [...sec.querySelectorAll(CONTENT)].filter(e => !e.classList.contains('scatter')).map(e => e.getBoundingClientRect()).filter(r => r.width && r.height);
                    const R = mk(id.length * 7717 + 13), cand = [];
                    const rows = Math.max(3, Math.round(sr.height / (narrow ? 230 : 190)));
                    /* v10: blooms gather along the page edges only, never in the reading column */
                    const EDGE = narrow ? [0.05, 0.95] : [0.03, 0.08, 0.13, 0.87, 0.92, 0.97];
                    for (let r = 0; r < rows; r++) for (let c = 0; c < EDGE.length; c++){
                        const fx = EDGE[c];
                        cand.push({ i: r * 20 + c, fx: Math.min(0.97, Math.max(0.03, fx + (R() - 0.5) * 0.03)), fy: (r + 0.15 + R() * 0.7) / rows, o: R() });
                    }
                    cand.sort((a, b) => a.o - b.o);
                    const mine = []; let n = 0;
                    cand.forEach(cd => {
                        const key = id + ':' + cd.i, leafy = cd.o > 0.62, size = leafy ? 22 + cd.o * 14 : 28 + (1 - cd.o) * 22;
                        let item = made.get(key);
                        const radius = size * 1.32 * Math.SQRT1_2 + 12;
                        const cx = Math.max(radius + 8, Math.min(W - radius - 8, sr.left + sr.width * cd.fx)), cy = sr.top + sr.height * cd.fy, m = 14, h = size / 2;
                        const box = { l: cx - radius, r: cx + radius, t: cy - radius, b: cy + radius };
                        const ok = n < perSec && box.l >= 8 && box.r <= W - 8 && cx > xMin && cx < W - xMin && box.t > sr.top + 4 && box.b < sr.bottom - 4
                            && !blocks.some(r => r.left < box.r + m && r.right > box.l - m && r.top < box.b + m && r.bottom > box.t - m)
                            && !taken.some(r => r.left < box.r + 10 && r.right > box.l - 10 && r.top < box.b + 10 && r.bottom > box.t - 10)
                            && !mine.some(q => Math.hypot(q.x - cx, q.y - cy) < gap);
                        if (!ok){ if (item) item.style.display = 'none'; return; }
                        if (!item){ item = build(key, 31 + cd.i * 977 + id.length * 131, leafy); made.set(key, item); sec.appendChild(item); io.observe(item); }
                        item.style.display = ''; item.style.width = item.style.height = size.toFixed(0) + 'px';
                        item.style.left = (cx - sr.left - h).toFixed(0) + 'px'; item.style.top = (cy - sr.top - h).toFixed(0) + 'px';
                        mine.push({ x: cx, y: cy }); n++;
                    });
                });
            }
            let pt = 0; const later = ms => { clearTimeout(pt); pt = setTimeout(() => { place(); afterScatter(); }, ms); };
            addEventListener('load', () => later(900)); later(1800);
            let lastW = innerWidth; addEventListener('resize', () => { if (innerWidth !== lastW){ lastW = innerWidth; later(350); } });
            document.addEventListener('click', () => later(800));
        })();

        /* =========================================================
           WILD BLOOMS: more varied flowers (hydrangea, daisy, cosmos, poppy,
           bellflower, forget-me-not) in the page margins. Variety and
           personality are separate config choices with compatible pairings,
           both fixed per flower from its seed. Each spot is checked against
           text, photos, controls and every other decoration, using the whole
           bounds plus room for its movement; no safe spot means no flower.
           Nothing here animates by itself (the reactions are plants/flowers.js).
           ========================================================= */
        (function(){
            const IDS = ['home', 'about', 'experience', 'skills', 'gallery', 'contact'];
            /* boxed things that must stay clear as a whole; running text is measured line by line (safe-zones.contentRects), so open margins beside short lines count as free */
            const PANELS = '.collage,.about-photo-wrap,.garden,.herbarium,.gallery-frame,.gallery-preview,.gallery-deviant,.contact-inner,.contact-photo,.garden-bed,.garden-tip,.bloom,.footer-flowers,.mb-bouquet,.seed-wrap,.guide-bird,.w-piece,.w-dandelion,.w-sprout,.title-bloom,.about-bloom,.g-cat,.h-spec,.section-head';
            /* sym: art in the sprite · stem: draw a stalk and leaf under the head · w: pick weight · cols: [petal, centre] variations (playful flowers cycle them) · pers: compatible personalities */
            const VARIETIES = {
                daisy:       { label: 'Daisy',            sym: 'fl-daisy',       stem: 1, w: 22, cols: [['#ffffff', '#f2b92c'], ['#fff4f7', '#f2b92c'], ['#fbe7a1', '#e08a1e']], pers: ['happy', 'playful', 'shy'] },
                cosmos:      { label: 'Cosmos',           sym: 'fl-cosmos',      stem: 1, w: 20, cols: [['#f4a7bf', '#f2c230'], ['#d7b8f0', '#f6d36b'], ['#fbd0de', '#f2c230']], pers: ['romantic', 'playful', 'dramatic', 'shy'] },
                poppy:       { label: 'Poppy',            sym: 'fl-poppy',       stem: 1, w: 16, cols: [['#f58a6f', '#3b2a38'], ['#f8b4a0', '#3b2a38'], ['#f4a7bf', '#3b2a38']], pers: ['dramatic', 'sleepy', 'romantic', 'shy'] },
                bellflower:  { label: 'Bellflower',       sym: 'fl-bellflower',  stem: 0, w: 14, cols: [['#b9a2de'], ['#9db4e8'], ['#cdb8f2']], pers: ['shy', 'sleepy', 'dramatic'] },
                forgetmenot: { label: 'Forget-me-nots',   sym: 'fl-forgetmenot', stem: 0, w: 20, cols: [['#8fb4ec', '#f6d36b'], ['#a9c4f2', '#f6d36b'], ['#b9a2de', '#f6d36b']], pers: ['shy', 'romantic', 'happy', 'playful'] },
                hydrangea:   { label: 'Hydrangea',        sym: 'fl-hydrangea',   stem: 0, w: 8,  cols: [['#b9a2de'], ['#9db4e8'], ['#f4c4d6'], ['#cdb8f2']], pers: ['happy', 'romantic', 'sleepy'], big: 1 }
            };
            const NAMES = Object.keys(VARIETIES), TOTAL = NAMES.reduce((a, k) => a + VARIETIES[k].w, 0);
            const mk = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
            const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) e.target.classList.add('open'); }), { threshold: 0.3 });
            const specs = new Map(), made = new Map(); let nSpec = 0;
            /* everything about one flower, decided once from its key and kept for its lifetime (never rerolled) */
            function specFor(key, seed, narrow){
                let sp = specs.get(key); if (sp) return sp;
                const R = mk(seed); let r = R() * TOTAL, name = NAMES[0];
                for (const k of NAMES){ r -= VARIETIES[k].w; if (r <= 0){ name = k; break; } }
                const v = VARIETIES[name], large = !v.big && !narrow && R() < 0.22;
                const size = v.big ? (narrow ? 46 + R() * 8 : 56 + R() * 14) : large ? 62 + R() * 14 : (narrow ? 30 + R() * 8 : 34 + R() * 12);
                sp = { name, v, size, large: large || !!v.big, pers: v.pers[Math.floor(R() * v.pers.length)], ci: Math.floor(R() * v.cols.length), msg: Math.floor(R() * 4),
                    special: nSpec++ % 4 === 1, h: size * (v.stem ? 1.4 : 1), rot: (R() - 0.5) * 16 };
                specs.set(key, sp); return sp;
            }
            const vf = n => (+n).toFixed(1);
            function build(sp, R){
                const v = sp.v, c = v.cols[sp.ci], el = document.createElement('div');
                el.className = 'wild w-ignore wl-' + sp.name + (v.stem ? ' wl-stemmed' : '');
                el.setAttribute('role', 'button'); el.tabIndex = 0;
                el.setAttribute('aria-label', v.label + ', a ' + sp.pers + ' flower. Press to say hello.');
                el.dataset.var = sp.name; el.dataset.pers = sp.pers; el.dataset.special = sp.special ? '1' : ''; el.dataset.msg = sp.msg; el.dataset.ci = sp.ci; el.dataset.cols = JSON.stringify(v.cols);
                const head = `<g class="wl-head" style="color:${c[0]};${c[1] ? '--center:' + c[1] : ''}"><use href="#${v.sym}" x="${v.stem ? -31 : -50}" y="${v.stem ? -31 : -50}" width="${v.stem ? 62 : 100}" height="${v.stem ? 62 : 100}"/></g>`;
                let body = '';
                if (v.stem){
                    const side = R() < 0.5 ? 1 : -1, bend = (R() - 0.5) * 14;
                    body = `<g class="wl-stem"><path class="wl-st" d="M0 26 Q${vf(bend)} 58 ${vf(-bend * 0.4)} 90"/><g style="color:#8db36a"><use href="#fl-leaf" x="-10" y="-10" width="20" height="20" transform="translate(${vf(side * 7)} 62) scale(${side} 1)"/></g></g>`;
                }
                el.innerHTML = `<svg class="wl-svg" viewBox="-50 -50 100 ${v.stem ? 140 : 100}" aria-hidden="true" focusable="false">${body}${head}</svg>`;
                el.style.rotate = vf(sp.rot * (v.stem ? 0.4 : 1)) + 'deg';
                return el;
            }
            function place(){
                const W = document.documentElement.clientWidth, narrow = W < 700, wide = W >= 1240;
                const edge = wide ? 96 : narrow ? 8 : 46;                  /* keep clear of the side vines (90 px wide at the edge on wide screens, 38 px below that) */
                const perSec = narrow ? 1 : W < 1100 ? 3 : 4, maxAll = narrow ? 4 : W < 1100 ? 10 : 14, maxHydra = narrow ? 1 : 2, base = narrow ? 120 : 150;
                const taken = [...document.querySelectorAll('.page-posy, .scatter')].filter(e => e.style.display !== 'none').map(e => e.getBoundingClientRect());
                const mine = []; let total = 0, hydra = 0;
                IDS.forEach(id => {
                    const sec = document.getElementById(id); if (!sec) return;
                    const sr = sec.getBoundingClientRect(), blocks = safeZones.contentRects(sec).concat([...sec.querySelectorAll(PANELS)].map(e => e.getBoundingClientRect()).filter(r => r.width && r.height));
                    const R = mk(id.length * 4421 + 101), cand = [], rows = Math.max(3, Math.round(sr.height / (narrow ? 260 : 210)));
                    const EDGE = narrow ? [0.1, 0.3, 0.7, 0.9] : wide ? [0.085, 0.115, 0.145, 0.855, 0.885, 0.915] : [0.05, 0.08, 0.11, 0.89, 0.92, 0.95];   /* fractions of the VIEWPORT width: the gutters beside the reading column */
                    for (let r = 0; r < rows; r++) for (let c = 0; c < EDGE.length; c++)
                        cand.push({ i: r * 10 + c, fx: EDGE[c] + (R() - 0.5) * 0.02, fy: (r + 0.2 + R() * 0.6) / rows, o: R(), p: R() });
                    cand.sort((a, b) => a.o - b.o);
                    let n = 0;
                    cand.forEach(cd => {
                        const key = id + ':' + cd.i; let item = made.get(key);
                        if (!item && cd.p > 0.7) return;                  /* only some slots are ever used: gaps stay empty */
                        const sp = specFor(key, 9001 + cd.i * 613 + id.length * 71, narrow), bw = sp.size, bh = sp.h, pad = Math.max(8, bw * 0.18);
                        const cx = W * cd.fx, cy = sr.top + sr.height * cd.fy, m = 10;
                        const box = { l: cx - bw / 2 - pad, r: cx + bw / 2 + pad, t: cy - bh / 2 - pad, b: cy + bh / 2 + pad };
                        const ok = n < perSec && total < maxAll && !(sp.name === 'hydrangea' && hydra >= maxHydra)
                            && box.l >= edge && box.r <= W - edge && box.t > sr.top + 4 && box.b < sr.bottom - 4
                            && !blocks.some(r => r.left < box.r + m && r.right > box.l - m && r.top < box.b + m && r.bottom > box.t - m)
                            && !taken.some(r => r.left < box.r + 10 && r.right > box.l - 10 && r.top < box.b + 10 && r.bottom > box.t - 10)
                            && !mine.some(q => Math.hypot(q.x - cx, q.y - cy) < Math.max(base, (q.size + bw) / 2 + (q.large || sp.large ? 240 : 100)));
                        if (!ok){ if (item) item.style.display = 'none'; return; }
                        if (!item){
                            item = build(sp, mk(cd.i * 31 + id.length)); made.set(key, item); sec.appendChild(item); io.observe(item);
                            if (MB.has('plants.flowers')) MB.use('plants.flowers').adoptWild(item);
                        }
                        item.style.display = ''; item.style.width = bw.toFixed(0) + 'px'; item.style.height = bh.toFixed(0) + 'px';
                        item.style.left = (cx - sr.left - bw / 2).toFixed(0) + 'px'; item.style.top = (cy - sr.top - bh / 2).toFixed(0) + 'px';
                        mine.push({ x: cx, y: cy, size: bw, large: sp.large }); n++; total++; if (sp.name === 'hydrangea') hydra++;
                    });
                });
            }
            afterScatter = place;
        })();
    }

    return { start };
});
