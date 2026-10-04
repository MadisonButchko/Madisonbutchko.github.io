    /* v7: tidy vine blooms (grow on spaced spots, fade over time, birds visit) + garden game */
    (function(){
        const NS = 'http://www.w3.org/2000/svg', reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
        const hoverable = matchMedia('(hover: hover)').matches, act = hoverable ? 'click' : 'tap';
        const rand = (a, b) => a + Math.random() * (b - a), pick = a => a[Math.floor(Math.random() * a.length)];
        const ease = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        const FLI = '<svg class="tiny-fl" viewBox="-50 -50 100 100" aria-hidden="true"><use href="#fl-bloom" x="-50" y="-50" width="100" height="100"/></svg>';
        const BLOOMS = [['fl-bloom','#f4a7bf','#f2c230'],['fl-daisy','#ffffff','#f2c230'],['fl-forsythia','#f2c230','#d99a12'],['fl-bloom','#b9a2de','#f2c230'],['fl-daisy','#c9b2ec','#fbe7a1'],['fl-bloom','#e9789f','#fff1cc'],['fl-daisy','#f2c230','#7a4a1e'],['fl-bloom','#f8c9a0','#e07fa3']];
        const BIRD_SVG = window.__birdSVG = '<svg viewBox="0 0 40 32"><path d="M5 15 L0 10 L1.5 18 Z" fill="#7fb3cc"/><ellipse cx="18" cy="18" rx="13" ry="10" fill="#a9d8ea"/><ellipse cx="20" cy="22" rx="8" ry="5.5" fill="#fff4e0"/><circle cx="29" cy="11" r="7" fill="#a9d8ea"/><circle cx="31" cy="9.5" r="1.4" fill="#5a4366"/><circle cx="31.5" cy="13.2" r="1.6" fill="#f9c6d6" opacity=".85"/><path d="M35 10.5 L40 12.5 L35 14 Z" fill="#f2c230"/><g class="c-wing"><path d="M11 15 C15 5 26 7 24 16 C21 20 13 20 11 15Z" fill="#8fc3dc"/></g><path d="M15 27.5 L14 31.5 M21 27.5 L22 31.5" stroke="#c98a06" stroke-width="1.3" stroke-linecap="round"/></svg>';
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

        /* =========================================================
           SIDE VINES: click (or tap, on phones) a vine to grow it.
           Every valid click visibly extends the vine and adds two new
           sprigs (stem, leaves, a flower) right next to what has already
           grown, so growth travels along the vine instead of piling up
           in one spot, and fills out one nearby sprig (a side bud, then a
           second bloom). Sprigs stay until a bird or caterpillar eats
           them. Limit: one sprig per spot (~every 46px) at 3 levels.
           ========================================================= */
        const VINE = { left: null, right: null };
        const GROWN = { left: new Map(), right: new Map() }; /* slot index -> { level, seed, leafy } (survives re-layout) */
        const rng = seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
        const vf = v => (+v).toFixed(1);
        function buildSlots(){
            ['left', 'right'].forEach(side => {
                const svg = document.querySelector('.vine-' + side), path = svg && svg.querySelector('.vine-path');
                if (!path){ VINE[side] = null; return; }
                const k = (svg.clientWidth || 90) / 90, narrow = k < 0.8, len = path.getTotalLength(), slots = []; let j = 0;
                for (let d = 73; d < len - 12; d += 46, j++){
                    const p = path.getPointAtLength(d), a = path.getPointAtLength(Math.max(0, d - 3)), b = path.getPointAtLength(Math.min(len, d + 3));
                    let tx = b.x - a.x, ty = b.y - a.y; const m = Math.hypot(tx, ty) || 1; tx /= m; ty /= m;
                    const s = j % 2 ? 1 : -1; let nx = (side === 'left' ? 1 : -1) * Math.abs(ty), ny = tx * s - 0.45;
                    /* phones: the vine lives in the page gutter, so sprigs hang along it instead of reaching into the text */
                    if (narrow){ nx = (side === 'left' ? 0.35 : -0.35) * (j % 2 ? 1 : 0.4); ny = j % 3 ? 0.9 : -0.9; }
                    const nm = Math.hypot(nx, ny) || 1;
                    slots.push({ i: j, d, x: p.x, y: p.y, nx: nx / nm, ny: ny / nm, sp: null, pending: false });
                }
                const layer = document.createElementNS(NS, 'g'); layer.setAttribute('class', 'vine-sprigs'); svg.appendChild(layer);
                const v = VINE[side] = { svg, path, len, slots, layer, k, narrow, side };
                GROWN[side].forEach((spec, i) => { if (slots[i]) renderSprig(v, slots[i], spec, 99); else GROWN[side].delete(i); });
            });
        }
        function vineShown(v){ return v.len - (parseFloat(v.path.style.strokeDashoffset) || 0); }
        const leafAt = (x, y, ang, size, color) => `<g class="vs-leaf" style="color:${color || '#8db36a'}"><use href="#fl-leaf" x="${vf(x)}" y="${vf(y - size)}" width="${vf(size)}" height="${vf(size)}" transform="rotate(${vf(ang)} ${vf(x)} ${vf(y)})"/></g>`;
        /* the slow spin goes on a wrapper group: rotating a <use> directly pivots around the wrong point in Chrome */
        const bloomAt = (x, y, size, f, cls) => `<g class="sprout ${cls || ''}" style="color:${f[1]};--center:${f[2]}"><g class="sp-spin"><use href="#${f[0]}" x="${vf(x - size / 2)}" y="${vf(y - size / 2)}" width="${vf(size)}" height="${vf(size)}"/></g></g>`;
        /* draws one sprig at its slot. `fresh` = the level that is new (it animates in); lower levels appear instantly. */
        function renderSprig(v, s, spec, fresh){
            if (s.sp && s.sp.g) s.sp.g.remove();
            const R = rng(spec.seed), z = v.narrow ? 1.7 : 1.15;
            const L = (17 + R() * 6) * z, bend = (R() - 0.5) * 10 * z;
            // Clamp the bloom, then draw its stem to that same anchor.
            const safeBloom = (x, y, size) => {
                const margin = size * 1.25 + 8 / v.k, H = v.svg.viewBox.baseVal.height;
                const bx = v.side === 'left' ? Math.max(x, margin - s.x) : Math.min(x, 90 - margin - s.x);
                return [bx, Math.max(margin - s.y, Math.min(H - margin - s.y, y))];
            };
            const [ex, ey] = safeBloom(s.nx * L, s.ny * L, 25 * z);
            const cx = ex * 0.5 + s.ny * bend * 0.5, cy = ey * 0.5 - s.nx * bend * 0.5, ang = Math.atan2(ey, ex) * 180 / Math.PI;
            const f = BLOOMS[Math.floor(R() * BLOOMS.length)], f2 = BLOOMS[Math.floor(R() * BLOOMS.length)], f3 = BLOOMS[Math.floor(R() * BLOOMS.length)];
            const lv = n => `vs-lv sp-lv" data-lv="${n}`;
            let h = `<g class="${lv(1)}"><path pathLength="1" class="sprout-stem" d="M0 0 Q ${vf(cx)} ${vf(cy)} ${vf(ex)} ${vf(ey)}"/>${leafAt(ex * 0.45, ey * 0.45, ang - 60, 10 * z)}`;
            h += spec.leafy ? `<g class="sprout leafy" style="color:#7fa65c"><use href="#fl-leaf" x="${vf(ex - 8 * z)}" y="${vf(ey - 8 * z)}" width="${vf(16 * z)}" height="${vf(16 * z)}" transform="rotate(${vf(ang - 45)} ${vf(ex)} ${vf(ey)})"/></g>` : bloomAt(ex, ey, (19 + R() * 6) * z, f, 'main');
            h += '</g>';
            const side = R() < 0.5 ? 1 : -1, px = -s.ny * side, py = s.nx * side; /* perpendicular to the sprig */
            if (spec.level >= 2){
                const mx = ex * 0.55, my = ey * 0.55, tl = 11 * z;
                const [bx, by] = safeBloom(mx + (px * 0.85 + s.nx * 0.5) * tl, my + (py * 0.85 + s.ny * 0.5) * tl, 12 * z);
                h += `<g class="${lv(2)}"><path pathLength="1" class="sprout-stem" d="M${vf(mx)} ${vf(my)} Q ${vf((mx + bx) / 2 + s.nx * 3)} ${vf((my + by) / 2 + s.ny * 3)} ${vf(bx)} ${vf(by)}"/>${leafAt(mx, my, ang + 70 * side, 9 * z, '#7fa65c')}${bloomAt(bx, by, 12 * z, f2)}</g>`;
            }
            if (spec.level >= 3){
                const mx = ex * 0.3, my = ey * 0.3, tl = 12 * z;
                const [bx, by] = safeBloom(mx - (px * 0.9 - s.nx * 0.4) * tl, my - (py * 0.9 - s.ny * 0.4) * tl, 11 * z);
                h += `<g class="${lv(3)}"><path pathLength="1" class="sprout-stem" d="M${vf(mx)} ${vf(my)} Q ${vf((mx + bx) / 2)} ${vf((my + by) / 2 + 3)} ${vf(bx)} ${vf(by)}"/>${bloomAt(bx, by, 14 * z, ['fl-daisy', f3[1] === '#ffffff' ? '#fde1ea' : '#ffffff', '#f2c230'])}`
                    + `<path pathLength="1" class="sprout-stem tendril" d="M${vf(ex)} ${vf(ey)} q ${vf(s.nx * 6 * z)} ${vf(s.ny * 6 * z)} ${vf((s.nx * 4 + px * 4) * z)} ${vf((s.ny * 4 + py * 4) * z)} q ${vf(-px * 3 * z)} ${vf(-py * 3 * z)} ${vf(-s.nx * 2 * z)} ${vf(-s.ny * 2 * z)}"/></g>`;
            }
            const g = document.createElementNS(NS, 'g'); g.setAttribute('class', 'vine-sprout'); g.setAttribute('transform', `translate(${vf(s.x)},${vf(s.y)})`);
            const swayD = 5.5 + R() * 4, swayO = R() * 8;   /* phase follows the clock, so redrawing a sprig never restarts its sway */
            g.innerHTML = `<g class="vs-sway" style="--sd:${vf(swayD)}s;--sl:-${vf(((performance.now() / 1000 + swayO) % (2 * swayD)))}s">${h}</g>`; v.layer.appendChild(g);
            const lvs = Array.from(g.querySelectorAll('.vs-lv')).map(el => ({ el, n: +el.dataset.lv }));
            s.sp = { g, spec, slot: s, side: v.side, leafy: !!spec.leafy, lvs, sway: g.firstElementChild };
            updateSprig(s.sp, window.__vineQ ? window.__vineQ(v.side) : 0, performance.now());   /* painted at its true growth before the next frame: no blink */
        }
        /* a sprig's three stages (stem, leaf, bloom) follow the vine's visible growth at its own slot, and a
           short clock for the moment a level was earned. Whichever is behind wins, so a new bloom still
           opens bud -> stem -> petals, and a bloom can never outrun the vine carrying it. */
        function updateSprig(sp, q, now){
            const { range, clamp01 } = window.__gm; let anim = false;
            const u0 = (q - sp.slot.d) / 70;
            sp.lvs.forEach(({ el, n }) => {
                const a = clamp01((now - (sp.spec.t[n] || 0)) / (n === 1 ? 800 : 650)); if (a < 1) anim = true;
                const o = n > 1 ? 0.18 : 0, u = (u0 - o) / (1 - o);   /* side buds start once the main stem is partly out */
                const stem = Math.min(range(u, 0, 0.4), range(a, 0, 0.5));
                const leaf = Math.min(range(u, 0.15, 0.6), range(a, 0.2, 0.7));
                const open = Math.min(range(u, 0.3, 1), range(a, 0.4, 1)), bud = 0.22 * clamp01((stem - 0.5) * 2);
                const key = stem.toFixed(3) + leaf.toFixed(3) + open.toFixed(3);
                if (el._k === key) return; el._k = key;
                el.style.setProperty('--st', stem.toFixed(3)); el.style.setProperty('--lf', leaf.toFixed(3)); el.style.setProperty('--bl', (bud + (1 - bud) * open).toFixed(3));
            });
            return anim;
        }
        window.__vineSprigs = (side, q, now) => {
            const v = VINE[side]; if (!v) return false; let anim = false;
            v.slots.forEach(s => { if (s.sp && !s.sp.gone && updateSprig(s.sp, q, now)) anim = true; });
            return anim;
        };
        /* tiny pollen puffs and a bend of the nearby branches: the garden answers a click it cannot grow from */
        function react(v, x, y){
            v.slots.forEach(s => { if (s.sp && !s.sp.gone && s.sp.sway){ const r = s.sp.g.getBoundingClientRect(); if (Math.abs(r.top - y) < 130) s.sp.sway.animate([{ scale: 1 }, { scale: 1.08 }, { scale: 0.98 }, { scale: 1 }], { duration: 700, easing: 'ease-out' }); } });
            if (reduce) return;
            for (let k = 0; k < 6; k++){
                const d = document.createElement('i'), sz = rand(2, 3.6);
                d.setAttribute('aria-hidden', 'true'); d.style.cssText = `position:fixed;left:${x}px;top:${y}px;width:${sz}px;height:${sz}px;border-radius:50%;background:#f2c230;pointer-events:none;z-index:130;opacity:0`;
                document.body.appendChild(d);
                const dx = rand(-26, 26), dy = rand(-34, -8);
                d.animate([{ transform: 'translate(0,0)', opacity: 0.9 }, { transform: `translate(${dx}px,${dy}px)`, opacity: 0.8, offset: 0.6 }, { transform: `translate(${dx * 1.3}px,${dy + 14}px)`, opacity: 0 }], { duration: rand(700, 1000), easing: 'ease-out', delay: k * 30 }).onfinish = () => d.remove();
            }
        }
        /* eaten by a bird or caterpillar: the sprig drops away and its spot is free to regrow */
        function fadeSprout(sp, eaten){
            if (!sp || sp.gone) return; sp.gone = true;
            GROWN[sp.side].delete(sp.slot.i);
            sp.g.classList.add(eaten ? 'eaten' : 'wilt');
            setTimeout(() => { sp.g.remove(); if (sp.slot.sp === sp) sp.slot.sp = null; }, eaten ? 900 : 1700);
        }
        /* a click does not draw anything itself: it earns the vine some extra growth, and the shared system draws it */
        function extendVine(v, side, d){ if (window.__vineBonus) window.__vineBonus(side, d); }
        /* TODO(human): how many click-grown blooms may one vine carry in total? Picking this number is a
           design decision: a low number keeps the composition airy, a high one rewards persistent clicking.
           (v.narrow is true on phones, where the vine is slimmer and the page gutter is tighter.) */
        function clickGrowthLimit(v){ return v.narrow ? 14 : 24; }
        let vineClicks = 0;
        /* returns false when that stretch of vine is already at its limit */
        function growVine(side, clientY){
            const v = VINE[side]; if (!v) return false;
            vineClicks++;
            const r = v.svg.getBoundingClientRect(), py = (clientY - r.top) / v.k, win = 320 / v.k, grown = GROWN[side];
            let used = 0; grown.forEach(sp => { used += sp.level; });
            const room = clickGrowthLimit(v) - used;
            /* 1) the vine grows on from its current tip (toward the click if it was below the tip) */
            const tipD = Math.max(vineShown(v), (v.reach || 0) * v.len), STEP = 280;
            const clickD = v.slots.reduce((b, s) => Math.abs(s.y - py) < Math.abs(b.y - py) ? s : b, v.slots[0]).d;
            const endD = Math.min(v.len - 12, tipD + Math.min(420, Math.max(STEP, clickD + 80 - tipD)));
            const grew = endD > tipD + 8;
            /* 2) blooms are planted along that new stretch (evenly spread); once the vine is fully out they go near the click instead */
            const adj = s => grown.has(s.i - 1) || grown.has(s.i + 1) ? 1 : 0;
            let fresh = [], upg = [];
            if (room > 0){
                if (grew){
                    const fringe = v.slots.filter(s => !s.sp && !s.pending && s.d > tipD - 20 && s.d <= endD);
                    const want = Math.min(4, room), stride = Math.max(1, Math.floor(fringe.length / want));
                    for (let i = Math.min(1, fringe.length - 1); i < fringe.length && fresh.length < want; i += stride) fresh.push(fringe[i]);
                } else {
                    const near = v.slots.filter(s => Math.abs(s.y - py) < win && s.d <= tipD + 60);
                    const empty = near.filter(s => !s.sp && !s.pending).sort((a, b) => (adj(b) - adj(a)) || Math.abs(a.y - py) - Math.abs(b.y - py));
                    fresh = empty.slice(0, Math.min(2, room));
                    upg = near.filter(s => s.sp && !s.sp.gone && s.sp.spec.level < 3).sort((a, b) => Math.abs(a.y - py) - Math.abs(b.y - py)).slice(0, Math.min(fresh.length ? 1 : 3, room - fresh.length));
                }
            }
            if (!grew && !fresh.length && !upg.length) return false;
            if (grew) extendVine(v, side, endD);
            if (window.GardenLog && (fresh.length || upg.length)) GardenLog.add({ id: 'vine:' + side, kind: 'flower', sym: 'fl-bloom', color: side === 'left' ? '#e9789f' : '#b9a2de', center: '#fff1cc' });
            const now = performance.now();
            fresh.forEach(s => {
                const spec = { level: 1, seed: 1 + Math.floor(Math.random() * 2e9), leafy: Math.random() < 0.12, t: { 1: now } };
                grown.set(s.i, spec); renderSprig(v, s, spec, 1);
            });
            upg.forEach(s => { const spec = s.sp.spec; spec.level++; spec.t[spec.level] = now; renderSprig(v, s, spec, spec.level); });
            return true;
        }
        window.__onVineLayout = buildSlots;

        if (!reduce){
            buildSlots();
            const tip = document.createElement('div'); tip.className = 'vine-tip'; document.body.appendChild(tip);
            const TIP = (hoverable ? 'click' : 'tap') + ' the vine to grow it ' + FLI;
            let tipHold = 0, tipTimer = 0;
            ['left', 'right'].forEach(side => {
                const hit = document.createElement('div'); hit.className = 'vine-hit ' + side; hit.setAttribute('aria-hidden', 'true'); document.body.appendChild(hit);
                hit.addEventListener('mousemove', e => {
                    if (vineClicks > 3 && Date.now() > tipHold) { tip.classList.remove('show'); return; }
                    if (Date.now() > tipHold && tip.innerHTML !== TIP) tip.innerHTML = TIP;
                    tip.classList.add('show');
                    tip.style.transform = `translate(${side === 'left' ? e.clientX + 20 : e.clientX - tip.offsetWidth - 20}px, ${e.clientY - 14}px)`;
                });
                hit.addEventListener('mouseleave', () => tip.classList.remove('show'));
                let lastGrow = 0;
                hit.addEventListener('click', e => {
                    const v = VINE[side]; if (!v) return;
                    /* blooms already on the vine near the click give a happy bounce */
                    v.svg.querySelectorAll('.vine-item.on, .vine-sprout .sprout').forEach(it => { const b = it.getBoundingClientRect(); if (Math.abs(b.top + b.height / 2 - e.clientY) < 90){ it.classList.add('grow'); setTimeout(() => it.classList.remove('grow'), 650); } });
                    const quick = Date.now() - lastGrow < 450;   /* rapid clicks only make the plant react, never pile on more growth */
                    if (!quick && growVine(side, e.clientY)){ lastGrow = Date.now(); return; }
                    react(v, e.clientX, e.clientY);
                    if (quick) return;
                    clearTimeout(tipTimer);   /* a new tap resets the one message instead of stacking */
                    tip.innerHTML = 'this stretch is in full bloom ' + FLI;
                    const life = hoverable ? 1600 : 1200;   /* phones: brief, so it never covers what is being read */
                    tipHold = Date.now() + life; tip.classList.add('show');
                    if (hoverable) tip.style.transform = `translate(${side === 'left' ? e.clientX + 20 : e.clientX - tip.offsetWidth - 20}px, ${e.clientY - 14}px)`;
                    else {
                        /* compact and clamped inside the viewport, hovering just above the tap so the finger does not hide it */
                        const w = tip.offsetWidth, h = tip.offsetHeight, m = 8;
                        const x = Math.min(innerWidth - w - m, Math.max(m, e.clientX - w / 2 + (side === 'left' ? w / 2 + 14 : -w / 2 - 14)));
                        const y = Math.min(innerHeight - h - m, Math.max(m, e.clientY - h - 18));
                        tip.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
                    }
                    tipTimer = setTimeout(() => tip.classList.remove('show'), life);
                });
            });
            if (window.__vineUpdate) window.__vineUpdate();   /* size the click strips to the drawn vine right away */
            /* phones have no hover, so show the hint once, next to the vine, a few seconds in */
            /* (the vine stays hidden until the visitor scrolls past the hero, so wait until there is a vine to tap) */
            if (!hoverable) (function hint(tries){ setTimeout(() => {
                if (vineClicks || !VINE.left) return;
                const hit = document.querySelector('.vine-hit.left');
                if (!hit || hit.style.display === 'none' || (hit._h || 0) < innerHeight * 0.5){ if (tries < 12) hint(tries + 1); return; }
                tip.innerHTML = TIP; tip.style.transform = `translate(24px, ${Math.round(innerHeight - 70)}px)`; tip.classList.add('show');
                setTimeout(() => tip.classList.remove('show'), 3800);
            }, 6000); })(0);

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

            /* Caterpillars live on the side vines: a few at a time (a small cap, spaced apart), each crawling along
               the real vine path at its own pace, resting now and then. Any bloom they pass may catch their eye: the
               caterpillar crawls up so its mouth reaches that one bloom, leans in, nibbles, and only that bloom goes.
               They show up as soon as a stretch of vine is drawn (no need for the whole vine), and stay inside the
               part of the vine that is on screen. A click/tap drops one off. Once the chrysalis story has begun
               (WorldState) they no longer appear. */
            const CAT_MAX = () => innerWidth < 1240 ? 2 : 3, CAT_PER_VINE = () => innerWidth < 1240 ? 1 : 2;
            const CAT_MOUTH = { x: 15.5, y: 5 };   /* the mouth, in px from the caterpillar's anchor on the vine (desktop size) */
            const cats = [], catClaims = new Set();
            let catRaf = 0, catLast = 0;
            const angDiff = a => { a %= 360; return a > 180 ? a - 360 : a < -180 ? a + 360 : a; };
            /* the path only runs downhill, so a binary search finds the path distance at a given screen height */
            const dAtScreenY = (v, top, py) => { let a = 0, b = v.len; for (let i = 0; i < 14; i++){ const m = (a + b) / 2; if (top + v.path.getPointAtLength(m).y * v.k < py) a = m; else b = m; } return a; };
            /* the stretch of vine a caterpillar may use: drawn so far, and on screen */
            const catSpan = v => { const top = v.svg.getBoundingClientRect().top; return { lo: dAtScreenY(v, top, 70), hi: Math.min(vineShown(v) - 8, dAtScreenY(v, top, innerHeight - 50)) }; };
            const pathPose = (v, d) => {
                const p = v.path.getPointAtLength(d), p0 = v.path.getPointAtLength(Math.max(0, d - 5)), p1 = v.path.getPointAtLength(Math.min(v.len, d + 5));
                return { x: p.x, y: p.y, a: Math.atan2(p1.y - p0.y, p1.x - p0.x) * 180 / Math.PI };
            };
            function catFlowers(v, span){
                const out = [], ok = b => b.width > 8 && b.top + b.height / 2 > 70 && b.top + b.height / 2 < innerHeight - 50;
                v.slots.forEach(s => { const sp = s.sp; if (!sp || sp.gone || sp.targeted) return;
                    sp.g.querySelectorAll('.sprout:not(.leafy):not(.bitten)').forEach(el => { if (catClaims.has(el)) return; const b = el.getBoundingClientRect();
                        if (ok(b)) out.push({ el, sp, kind: 'sprig', d: s.d, cx: b.left + b.width / 2, cy: b.top + b.height / 2, fr: Math.min(b.width, b.height) / 2 }); }); });
                v.svg.querySelectorAll('.vine-item.spin.on:not(.eaten)').forEach(el => { if (catClaims.has(el)) return; const b = el.getBoundingClientRect();
                    if (ok(b)) out.push({ el, kind: 'item', d: parseFloat(el.dataset.d), cx: b.left + b.width / 2, cy: b.top + b.height / 2, fr: Math.min(b.width, b.height) / 2 }); });
                return out.filter(f => f.d > span.lo - 10 && f.d < span.hi + 10);
            }
            /* where on the vine to stop (and how far to lean) so the mouth lands on the bloom, not beside it */
            function reachPose(c, f){
                const v = c.v, r = v.svg.getBoundingClientRect(), spread = (f.kind === 'sprig' ? 90 : 40) / v.k; let best = null;
                for (let d = Math.max(0, f.d - spread); d <= Math.min(v.len, f.d + spread); d += 2){
                    if ((d - c.d) * c.dir < -1) continue;   /* only places still ahead of it */
                    const P = pathPose(v, d), ax = r.left + P.x * v.k, ay = r.top + P.y * v.k, hdg = c.dir > 0 ? P.a : P.a + 180;
                    const mx = CAT_MOUTH.x * c.sc, my = (c.dir > 0 ? -CAT_MOUTH.y : CAT_MOUTH.y) * c.sc, vx = f.cx - ax, vy = f.cy - ay;
                    const lean = Math.max(-70, Math.min(70, angDiff(Math.atan2(vy, vx) * 180 / Math.PI - hdg - Math.atan2(my, mx) * 180 / Math.PI)));
                    const cost = Math.abs(Math.hypot(vx, vy) - (Math.hypot(mx, my) + f.fr * 0.4)) + Math.abs(lean) * 0.12;
                    if (!best || cost < best.cost) best = { d, lean, cost };
                }
                return best;
            }
            function catPlace(c){
                const r = c.v.svg.getBoundingClientRect(), P = pathPose(c.v, c.d);
                c.el.style.transform = `translate(${(r.left + P.x * c.v.k).toFixed(1)}px, ${(r.top + P.y * c.v.k).toFixed(1)}px) rotate(${((c.dir > 0 ? P.a : P.a + 180) + c.lean).toFixed(1)}deg)`;
            }
            function catRelease(c){
                if (!c.target) return;
                catClaims.delete(c.target.f.el); c.target.f.el.classList.remove('pecked'); c.target = null;
            }
            function catLeave(c, drop){
                if (c.state === 'gone' || c.state === 'drop') return;
                c.state = drop ? 'drop' : 'gone'; catRelease(c); c.el.classList.remove('eating', 'resting');
                const i = cats.indexOf(c); if (i >= 0) cats.splice(i, 1);
                if (drop) c.el.classList.add('drop'); else c.el.classList.remove('on');
                setTimeout(() => c.el.remove(), drop ? 900 : 700);
            }
            function catTurn(c, now){ catRelease(c); c.dir = -c.dir; c.el.classList.toggle('rev', c.dir < 0); c.restUntil = now + rand(500, 1400); }
            function catStartEat(c, now){
                const f = c.target.f, b = f.el.getBoundingClientRect(); f.cx = b.left + b.width / 2; f.cy = b.top + b.height / 2;
                const again = reachPose(c, f); c.leanTo = again ? again.lean : c.target.pose.lean;
                c.state = 'eat'; c.eatEnd = now + rand(2300, 3500); c.el.classList.add('eating'); f.el.classList.add('pecked');
            }
            function catFinishEat(c, now){
                const f = c.target.f; f.el.classList.remove('pecked'); catClaims.delete(f.el);
                if (f.kind === 'item'){ f.el.classList.add('eaten'); setTimeout(() => f.el.classList.remove('eaten'), rand(45000, 80000)); }
                else { f.el.classList.add('bitten'); setTimeout(() => { if (!f.sp.g.querySelector('.sprout:not(.leafy):not(.bitten)')) fadeSprout(f.sp, true); }, 700); }
                c.target = null; c.leanTo = 0; c.state = 'unlean'; c.el.classList.remove('eating'); c.restUntil = now + rand(900, 1800);
            }
            function stepCat(c, now, dt){
                let v = VINE[c.side];
                if (!v || !v.path.isConnected) return catLeave(c);
                if (v.path !== c.v.path){ c.d *= v.len / c.v.len; catRelease(c); c.v = v; c.sc = c.el.offsetWidth / 34; c.span = null; }   /* the layout changed: stay at the same spot along the vine */
                if (!c.span || now - c.spanAt > 250){ c.span = catSpan(v); c.spanAt = now; }
                const span = c.span;
                if (c.state === 'eat'){
                    c.lean += (c.leanTo - c.lean) * (1 - Math.exp(-dt * 9));
                    const f = c.target.f;
                    if (f.sp && f.sp.gone) { catRelease(c); c.state = 'unlean'; c.leanTo = 0; c.el.classList.remove('eating'); }
                    else if (now >= c.eatEnd) catFinishEat(c, now);
                    return catPlace(c);
                }
                if (c.state === 'unlean'){
                    c.lean += (0 - c.lean) * (1 - Math.exp(-dt * 10));
                    if (Math.abs(c.lean) < 0.5){ c.lean = 0; c.state = 'crawl'; }
                    return catPlace(c);
                }
                if (now > c.dieAt && !c.target) return catLeave(c);
                /* off the drawn / visible part of the vine (scrolled away, or the vine pulled back): head back, or go */
                const inside = c.d >= span.lo - 12 / v.k && c.d <= span.hi + 12 / v.k;
                if (span.hi - span.lo < 40 / v.k || !inside){
                    if (!c.outSince) c.outSince = now;
                    if (now - c.outSince > 2500 || span.hi - span.lo < 40 / v.k) return catLeave(c);
                    if (!c.target){ const want = c.d > span.hi ? -1 : 1; if (c.dir !== want){ c.dir = want; c.el.classList.toggle('rev', want < 0); } }
                } else c.outSince = 0;
                if (c.target){
                    const f = c.target.f;
                    if (!f.el.isConnected || (f.sp && f.sp.gone) || f.el.classList.contains('eaten') || f.el.classList.contains('bitten')) catRelease(c);
                }
                if (now < c.restUntil){ c.el.classList.add('resting'); return catPlace(c); }
                c.el.classList.remove('resting');
                /* sometimes a bloom catches its eye: pick one ahead, close enough to be worth the trip */
                if (!c.target && now >= c.lookAt){
                    c.lookAt = now + rand(900, 1800);
                    if (Math.random() < 0.6){
                        const list = catFlowers(v, span).filter(f => (f.d - c.d) * c.dir > 6 && Math.abs(f.d - c.d) * v.k < 320).sort((a, b) => Math.abs(a.d - c.d) - Math.abs(b.d - c.d));
                        for (const f of list){ const pose = reachPose(c, f); if (pose){ c.target = { f, pose }; catClaims.add(f.el); break; } }
                    }
                }
                /* never crawl into another caterpillar on the same vine: wait, and sometimes turn around */
                for (const o of cats){
                    const gap = (o.d - c.d) * c.dir * v.k;
                    if (o !== c && o.side === c.side && gap > 0 && gap < 46){ c.restUntil = now + rand(1200, 2800); if (Math.random() < 0.5) catTurn(c, now); return catPlace(c); }
                }
                c.d += c.speed * dt / v.k * c.dir; c.stretch -= c.speed * dt;
                if (c.target){
                    if ((c.target.pose.d - c.d) * c.dir <= 0.3){ c.d = c.target.pose.d; catStartEat(c, now); }
                } else {
                    if (c.d >= span.hi - 2 && c.dir > 0) catTurn(c, now);
                    else if (c.d <= span.lo + 2 && c.dir < 0) catTurn(c, now);
                }
                if (c.stretch <= 0){ c.restUntil = now + rand(700, 2200); c.stretch = rand(40, 120); if (!c.target && Math.random() < 0.12) catTurn(c, now); }
                c.d = Math.max(0, Math.min(v.len, c.d));
                catPlace(c);
            }
            function catTick(now){
                catRaf = 0; const dt = Math.min(0.1, (now - catLast) / 1000 || 0.016); catLast = now;
                cats.slice().forEach(c => { if (c.state !== 'gone' && c.state !== 'drop') stepCat(c, now, dt); });
                if (cats.length) catRaf = requestAnimationFrame(catTick);
            }
            function spawnCat(){
                if (document.hidden || cats.length >= CAT_MAX() || (WorldState.get().story || 0) > 0) return false;
                const opts = [];
                ['left', 'right'].forEach(side => { const v = VINE[side]; if (!v) return;
                    const n = cats.filter(c => c.side === side).length, span = catSpan(v);
                    if (n < CAT_PER_VINE() && span.hi - span.lo >= 70 / v.k) opts.push({ v, side, span, n, w: n + Math.random() * 0.9 }); });
                if (!opts.length) return false;
                const o = opts.sort((a, b) => a.w - b.w)[0], v = o.v; let d = -1;
                for (let i = 0; i < 12 && d < 0; i++){
                    const t = rand(o.span.lo + 6 / v.k, o.span.hi - 6 / v.k);
                    if (cats.every(c => c.side !== o.side || Math.abs(c.d - t) * v.k > 110)) d = t;
                }
                if (d < 0) return false;
                const el = document.createElement('div'); el.className = 'vine-cat'; el.setAttribute('role', 'button'); el.setAttribute('aria-label', 'Shoo the caterpillar');
                el.innerHTML = `<div class="vc-flip">${SVG.caterpillar}</div>`; document.body.appendChild(el);
                const dir = Math.random() < 0.5 ? 1 : -1, now = performance.now();
                const c = { el, v, side: o.side, d, dir, speed: rand(10, 19), sc: el.offsetWidth / 34, state: 'crawl', lean: 0, leanTo: 0, target: null, span: o.span, spanAt: now,
                    restUntil: now + rand(0, 1200), lookAt: now + rand(600, 2000), stretch: rand(40, 120), dieAt: now + rand(55000, 100000), outSince: 0 };
                el.classList.toggle('rev', dir < 0); cats.push(c); catPlace(c); requestAnimationFrame(() => el.classList.add('on'));
                el.addEventListener('click', e => {
                    e.stopPropagation(); if (c.state === 'drop') return;
                    if (c.target && c.target.f.el.isConnected){ const h = c.target.f.el; h.classList.add('grow'); setTimeout(() => h.classList.remove('grow'), 650); }
                    catLeave(c, true);
                });
                if (!catRaf){ catLast = performance.now(); catRaf = requestAnimationFrame(catTick); }
                return true;
            }
            const vineCaterpillar = spawnCat;
            (function catScheduler(){ setTimeout(() => { if (!cats.length || Math.random() < 0.7) spawnCat(); catScheduler(); }, rand(3500, 8000)); })();
            if (/[?&]v11debug\b/.test(location.search)) window.__vineDebug = { caterpillar: vineCaterpillar, bird: vineBird, VINE, flyby: () => flyby };

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
            if (window.__vineDebug) window.__vineDebug.flyby = flyby;
        }

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
            let pt = 0; const later = ms => { clearTimeout(pt); pt = setTimeout(place, ms); };
            addEventListener('load', () => later(900)); later(1800);
            let lastW = innerWidth; addEventListener('resize', () => { if (innerWidth !== lastW){ lastW = innerWidth; later(350); } });
            document.addEventListener('click', () => later(800));
            window.__scatterPlace = place;
        })();

        /* =========================================================
           GARDEN GAME
           plants grow in three layered rows (back / middle / front),
           get thirsty (click to water), critters snack on them (click
           to shoo), butterflies pollinate seedlings, the sun and a rain
           cloud take turns, rare starblooms appear, a deer very rarely
           wanders through, badges unlock, and the whole game state is
           saved. "start over" clears every bit of it, storage included.
           ========================================================= */
        const footer = document.querySelector('footer'); if (!footer) return;
        const f1 = v => (+v).toFixed(1);
        const bed = document.createElement('div'); bed.className = 'garden-bed'; bed.dataset.stage = '0';
        bed.setAttribute('role', 'button'); bed.setAttribute('tabindex', '0');
        bed.setAttribute('aria-label', 'Flower garden: ' + act + ' to plant flowers, or press Enter to plant and water');
        let grass = '';
        for (let i = 0; i < 170; i++){ const x = i * 2.36 + rand(-0.8, 0.8), h = rand(5, 13), l = rand(-3, 3); grass += `M${f1(x)} 16 Q${f1(x + l / 2)} ${f1(16 - h * 0.6)} ${f1(x + l)} ${f1(16 - h)} `; }
        /* wildflower dots: tier 0 always, tiers 1 and 2 fade in as the garden fills */
        let meadow = ''; const WC = ['#f4a7bf', '#fbe7a1', '#c9b2ec', '#ffffff', '#f8c9a0', '#e9789f'];
        for (let i = 0; i < 72; i++) meadow += `<i class="t${i < 24 ? 0 : i < 48 ? 1 : 2}" style="left:${f1(rand(2, 98))}%;bottom:${rand(3, 24).toFixed(0)}px;--c:${pick(WC)};--dl:-${f1(rand(0, 3))}s"></i>`;
        /* soft foliage hedge behind the plants, grows with the garden's stage */
        const humps = (min, max, step) => { let d = '', x = -10; while (x < 410){ const w = rand(min, max), h = rand(14, 30); d += `M${f1(x)} 40 Q${f1(x + w / 2)} ${f1(40 - h * 2)} ${f1(x + w)} 40 Z `; x += w * step; } return d; };
        let motes = '';
        for (let i = 0; i < 9; i++) motes += `<i class="mote" style="left:${rand(6, 92).toFixed(0)}%;top:${rand(25, 75).toFixed(0)}%;--md:${f1(rand(7, 12))}s;--mdl:-${f1(rand(0, 10))}s"></i>`;
        let rays = '';
        for (let k = 0; k < 8; k++){ const a = k * Math.PI / 4, c = Math.cos(a), s = Math.sin(a); rays += `<line x1="${f1(c * 18)}" y1="${f1(s * 18)}" x2="${f1(c * (k % 2 ? 23 : 26))}" y2="${f1(s * (k % 2 ? 23 : 26))}"/>`; }
        const SUN_SVG = `<svg viewBox="-32 -32 64 64"><circle class="sun-glow" r="21"/><g class="sun-rays">${rays}</g><circle r="14" fill="#ffd968" stroke="#f2b43a" stroke-width="1.6"/><circle cx="-4.6" cy="-2" r="1.6" fill="#5a4366"/><circle cx="4.6" cy="-2" r="1.6" fill="#5a4366"/><path d="M-3.4 3.4 Q0 6.4 3.4 3.4" stroke="#5a4366" stroke-width="1.4" fill="none" stroke-linecap="round"/><ellipse cx="-8.4" cy="3" rx="2.6" ry="1.8" fill="#f4a7bf" opacity=".75"/><ellipse cx="8.4" cy="3" rx="2.6" ry="1.8" fill="#f4a7bf" opacity=".75"/></svg>`;
        bed.innerHTML = `<div class="g-meadow">${meadow}</div><svg class="g-hedge" viewBox="0 0 400 40" preserveAspectRatio="none" aria-hidden="true"><path class="h1" d="${humps(22, 40, 0.55)}"/><path class="h2" d="${humps(14, 28, 0.62)}"/></svg><div class="g-sun" aria-hidden="true">${SUN_SVG}</div><div class="garden-soil"></div><svg class="garden-grass" viewBox="0 0 400 16" preserveAspectRatio="none" aria-hidden="true"><path d="${grass}"/></svg>${motes}<div class="g-toast" role="status" aria-live="polite"></div>`;
        const toast = bed.querySelector('.g-toast');
        const tip = document.createElement('div'); tip.className = 'garden-tip';
        tip.innerHTML = '<span class="gt-text"></span><span class="garden-meter" aria-hidden="true"><i></i></span>'
            + '<div class="g-hl"><span class="g-stats g-stats-main"></span><button class="g-reset" type="button">start over</button></div>'
            + '<button class="g-notes-btn" type="button" aria-expanded="false" aria-controls="gardenNotes">garden notes</button>'
            + '<div class="g-notes" id="gardenNotes" hidden><span class="g-stats g-stats-more"></span><span class="g-badges" role="list" aria-label="Garden badges"></span></div>';
        /* v10: stats and badges stay one tap away instead of always on screen */
        (() => { const nb = tip.querySelector('.g-notes-btn'), nd = tip.querySelector('.g-notes'); nb.addEventListener('click', e => { e.stopPropagation(); const open = nb.getAttribute('aria-expanded') !== 'true'; nb.setAttribute('aria-expanded', open); nd.hidden = !open; }); })();
        footer.prepend(tip); footer.prepend(bed);
        const txt = tip.querySelector('.gt-text'), meter = tip.querySelector('.garden-meter i'), stats = tip.querySelector('.g-stats-main'), statsMore = tip.querySelector('.g-stats-more'), shelf = tip.querySelector('.g-badges'), resetBtn = tip.querySelector('.g-reset');
        const setHTML = (el, s) => { if (el._h !== s){ el._h = s; el.innerHTML = s; } };

        /* --- species: everything is drawn in the same flat SVG style --- */
        const FLOWER_TYPES = ['bloom', 'daisy', 'forsythia', 'tulip', 'sunflower', 'lavender', 'rose', 'bells', 'poppy', 'foxglove', 'allium', 'cosmos', 'coneflower', 'violet'];
        const GROUND_TYPES = ['fern', 'grass', 'mushroom', 'bush', 'clover'];
        const TALL = ['sunflower', 'foxglove', 'allium', 'lavender', 'cosmos', 'coneflower'], SHORT = ['violet', 'bells', 'daisy', 'bloom', 'poppy', 'tulip'];
        const PAL = {
            bloom: [['#f4a7bf', '#f2c230'], ['#b9a2de', '#f2c230'], ['#e9789f', '#fff1cc'], ['#f8c9a0', '#e07fa3']],
            daisy: [['#ffffff', '#f2c230'], ['#c9b2ec', '#fbe7a1'], ['#fde1ea', '#f2c230']],
            forsythia: [['#f2c230', '#d99a12']],
            tulip: [['#e9789f', '#c2457e'], ['#f2c230', '#d99a12'], ['#b9a2de', '#8a63b8'], ['#f8a07a', '#e0603a']],
            rose: [['#e9789f', '#c2457e'], ['#f9c6d6', '#e07fa3'], ['#fbe7a1', '#e8b923']],
            poppy: [['#f26b5b', '#3a2b33'], ['#f8a07a', '#5a3a2a'], ['#f4a7bf', '#6b3a55'], ['#fbe7a1', '#7a4a1e']],
            foxglove: [['#e9789f', '#fde1ea'], ['#c9b2ec', '#ffffff'], ['#f9c6d6', '#c2457e'], ['#fff7ea', '#e07fa3']],
            allium: [['#b9a2de', '#8a63b8'], ['#e9a3d0', '#c2457e'], ['#d9cbf3', '#9d7fd0']],
            cosmos: [['#f4a7bf', '#f2c230'], ['#ffffff', '#f2c230'], ['#e9789f', '#fbe7a1'], ['#c9b2ec', '#f2c230']],
            coneflower: [['#e9789f'], ['#f8a07a'], ['#c9b2ec'], ['#f2c230']],
            violet: [['#8a63b8', '#c9b2ec'], ['#c2457e', '#f9c6d6'], ['#5e4a8f', '#fbe7a1'], ['#e0a020', '#fbe7a1']]
        };
        const H_RANGE = { sunflower: [92, 124], foxglove: [78, 112], allium: [78, 108], lavender: [58, 96], cosmos: [66, 100], coneflower: [58, 92], bells: [38, 58], violet: [16, 26], tulip: [44, 78], poppy: [46, 88], rose: [46, 84] };
        const SZ_RANGE = { sunflower: [38, 46], violet: [15, 19], allium: [24, 30], cosmos: [26, 32], coneflower: [26, 32], poppy: [24, 30] };
        const GREENS = ['#7fa65c', '#8db36a', '#a3c47f', '#6e9a4c'];
        /* min spacing (px) and height factor per row: back rows are taller but drawn smaller/softer, so the bed reads as a deep meadow */
        const ROWS = { back: { gap: 12, h: 1.1, y: 30 }, mid: { gap: 13, h: 1, y: 20 }, front: { gap: 15, h: 0.86, y: 9 } };
        function pickType(row){
            const r = Math.random();
            if (r < 0.14) return pick(row === 'back' ? ['fern', 'grass', 'bush'] : row === 'front' ? ['clover', 'mushroom', 'grass', 'fern'] : GROUND_TYPES);
            if (row === 'back' && r < 0.62) return pick(TALL);
            if (row === 'front' && r < 0.55) return pick(SHORT);
            return pick(FLOWER_TYPES);
        }
        function leaf(side, y){
            return `<g class="g-leaf"><use href="#fl-leaf" x="20" y="${f1(y - 14)}" width="14" height="14" style="color:#8db36a"${side < 0 ? ' transform="translate(40,0) scale(-1,1)"' : ''}/></g>`;
        }
        function tuft(H){
            let s = '';
            for (let k = 0; k < 3; k++){ const dx = (k - 1) * 4 + rand(-1, 1), hh = rand(6, 11), b = rand(-3, 3); s += `<path d="M${f1(20 + dx)} ${f1(H)} Q${f1(20 + dx + b * 0.4)} ${f1(H - hh * 0.6)} ${f1(20 + dx + b)} ${f1(H - hh)}" stroke="${pick(GREENS)}" stroke-width="2" stroke-linecap="round" fill="none"/>`; }
            return `<g class="g-leaf">${s}</g>`;
        }
        /* returns [markup, petal color] */
        function head(type, cx, top, sz, rare){
            const R = sz / 2, at = s => `<g class="g-head"><g transform="translate(${f1(cx)} ${f1(top)})">${s}</g></g>`;
            const useAt = (id, style) => `<g class="g-head" style="${style}"><use href="#${id}" x="${f1(cx - R)}" y="${f1(top - R)}" width="${f1(sz)}" height="${f1(sz)}"/></g>`;
            if (rare) return [`<g class="g-head"><use href="#fl-bloom" x="${f1(cx - R)}" y="${f1(top - R)}" width="${f1(sz)}" height="${f1(sz)}" style="color:#f79cc0;--center:#ffe27a"/></g>`, '#f79cc0'];
            let c, s = '';
            switch (type){
                case 'bloom': case 'daisy': case 'forsythia': c = pick(PAL[type]); return [useAt('fl-' + type, `color:${c[0]};--center:${c[1]}`), c[0]];
                case 'sunflower': return [useAt('fl-daisy', 'color:#f2c230;--center:#7a4a1e'), '#f2c230'];
                case 'tulip': c = pick(PAL.tulip); return [at(`<path d="M-8 -4 C-9 8 9 8 8 -4 L6 -12 L3 -6 L0 -13 L-3 -6 L-6 -12 Z" fill="${c[0]}"/><path d="M0 -13 L-3 -6 L0 5 L3 -6Z" fill="${c[1]}" opacity=".45"/>`), c[0]];
                case 'rose': c = pick(PAL.rose); return [at(`<circle r="10" fill="${c[0]}"/><path d="M-6 0 a6 6 0 1 1 6 6 a4 4 0 1 1 -4 -4 a2 2 0 1 1 2 2" fill="none" stroke="${c[1]}" stroke-width="1.6" stroke-linecap="round"/>`), c[0]];
                case 'lavender': for (let k = 0; k < 6; k++) s += `<ellipse cx="${k % 2 ? 2.5 : -2.5}" cy="${-6 + k * 5}" rx="3" ry="4" fill="${k % 2 ? '#9d7fd0' : '#b9a2de'}"/>`; return [at(s), '#b9a2de'];
                case 'bells': s = '<path d="M0 0 Q12 -6 16 4" stroke="#7fa65c" stroke-width="1.6" fill="none"/>'; [[4, 3], [10, 2], [15, 8]].forEach(([x, y]) => { s += `<path d="M${x - 3.5} ${y} C${x - 3.5} ${y - 5} ${x + 3.5} ${y - 5} ${x + 3.5} ${y} L${x + 4.5} ${y + 3} L${x - 4.5} ${y + 3} Z" fill="#fff" stroke="#e8dcea"/>`; }); return [at(s), '#ffffff'];
                case 'poppy': { c = pick(PAL.poppy); const r = R * 0.62, o = r * 0.62; [[-1, -0.6], [1, -0.6], [-0.8, 0.7], [0.8, 0.7]].forEach(([a, b]) => { s += `<circle cx="${f1(a * o)}" cy="${f1(b * o)}" r="${f1(r)}" fill="${c[0]}"/>`; }); s += `<circle cx="${f1(-o * 0.8)}" cy="${f1(-o)}" r="${f1(r * 0.35)}" fill="#fff" opacity=".3"/><circle r="${f1(r * 0.42)}" fill="${c[1]}"/>`; return [at(s), c[0]]; }
                case 'foxglove': { c = pick(PAL.foxglove); s = '<ellipse cx="0" cy="-4" rx="2" ry="3.6" fill="#8db36a"/>'; for (let k = 0; k < 6; k++){ const side = k % 2 ? 1 : -1, w = 3 + k * 0.4, y = 2 + k * 7, x = side * (2.5 + w * 0.7); s += `<g transform="rotate(${side * 22} ${f1(x)} ${f1(y)})"><ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(w)}" ry="${f1(w * 0.78)}" fill="${c[0]}"/><ellipse cx="${f1(x + side * w * 0.45)}" cy="${f1(y + w * 0.25)}" rx="${f1(w * 0.4)}" ry="${f1(w * 0.35)}" fill="${c[1]}"/></g>`; } return [at(s), c[0]]; }
                case 'allium': { c = pick(PAL.allium); s = `<circle r="${f1(R * 0.92)}" fill="${c[0]}"/>`; for (let k = 0; k < 16; k++){ const a = rand(0, Math.PI * 2), d = Math.sqrt(Math.random()) * R * 0.78; s += `<circle cx="${f1(Math.cos(a) * d)}" cy="${f1(Math.sin(a) * d)}" r="1.7" fill="${k % 2 ? c[1] : '#fff'}" opacity=".8"/>`; } return [at(s), c[0]]; }
                case 'cosmos': c = pick(PAL.cosmos); for (let k = 0; k < 8; k++) s += `<ellipse cx="0" cy="${f1(-R * 0.55)}" rx="${f1(R * 0.27)}" ry="${f1(R * 0.48)}" fill="${c[0]}" stroke="rgba(194,69,126,.15)" stroke-width=".6" transform="rotate(${k * 45})"/>`; s += `<circle r="${f1(R * 0.22)}" fill="${c[1]}"/>`; return [at(s), c[0]];
                case 'coneflower': c = pick(PAL.coneflower); for (let k = 0; k < 9; k++) s += `<ellipse cx="${f1(R * 0.55)}" cy="0" rx="${f1(R * 0.5)}" ry="${f1(R * 0.16)}" fill="${c[0]}" transform="rotate(${f1(-12 + k * 25.5)})"/>`; s += `<ellipse cy="-1" rx="${f1(R * 0.34)}" ry="${f1(R * 0.3)}" fill="#8a4a2a"/><circle cx="${f1(-R * 0.1)}" cy="${f1(-R * 0.12)}" r="1.4" fill="#d99a12"/><circle cx="${f1(R * 0.12)}" cy="${f1(-R * 0.02)}" r="1.2" fill="#d99a12"/>`; return [at(s), c[0]];
                case 'violet': c = pick(PAL.violet); s = `<ellipse cx="${f1(-R * 0.35)}" cy="${f1(-R * 0.4)}" rx="${f1(R * 0.4)}" ry="${f1(R * 0.5)}" fill="${c[0]}"/><ellipse cx="${f1(R * 0.35)}" cy="${f1(-R * 0.4)}" rx="${f1(R * 0.4)}" ry="${f1(R * 0.5)}" fill="${c[0]}"/><ellipse cx="${f1(-R * 0.5)}" cy="${f1(R * 0.12)}" rx="${f1(R * 0.38)}" ry="${f1(R * 0.32)}" fill="${c[1]}"/><ellipse cx="${f1(R * 0.5)}" cy="${f1(R * 0.12)}" rx="${f1(R * 0.38)}" ry="${f1(R * 0.32)}" fill="${c[1]}"/><ellipse cy="${f1(R * 0.4)}" rx="${f1(R * 0.4)}" ry="${f1(R * 0.34)}" fill="${c[1]}"/><circle r="${f1(R * 0.17)}" fill="#f2c230"/>`; return [at(s), c[0]];
            }
            return ['', '#8db36a'];
        }
        function plantMarkup(type, rare, row){
            const isFlower = rare || FLOWER_TYPES.includes(type), cx = 20, rh = (ROWS[row] || ROWS.front).h;
            let h, H, inner = '', color = '#8db36a';
            if (isFlower){
                const hr = rare ? [72, 108] : H_RANGE[type] || [46, 96], sr = rare ? [38, 44] : SZ_RANGE[type] || [26, 36];
                h = rand(hr[0], hr[1]) * rh; const sz = rand(sr[0], sr[1]);
                const top = !rare && (type === 'lavender' || type === 'foxglove') ? 8 : sz / 2 + 2; H = h + top;
                const bend = rand(-9, 9), side = Math.random() > 0.5 ? 1 : -1;
                inner += `<path class="g-stem" d="M${cx} ${f1(H)} Q ${f1(cx + bend)} ${f1(top + h * 0.5)} ${cx} ${f1(top)}"/>`;
                if (h > 22) inner += leaf(side, top + h * rand(0.45, 0.6));
                if (h > 50 && Math.random() > 0.3) inner += leaf(-side, top + h * rand(0.65, 0.8));
                /* clumps: most flowers send up 1-2 shorter side stems with their own smaller blooms */
                if (!rare && h > 34 && type !== 'bells' && Math.random() < 0.7){
                    const sides = Math.random() < 0.45 ? [-1, 1] : [Math.random() < 0.5 ? -1 : 1];
                    sides.forEach(sd => {
                        const sx = cx + sd * rand(7, 12), sy = top + h * rand(0.25, 0.5), ssz = sz * rand(0.55, 0.72);
                        inner += `<path class="g-stem" d="M${cx} ${f1(H)} Q ${f1(cx + sd * 2)} ${f1(sy + (H - sy) * 0.4)} ${f1(sx)} ${f1(sy)}"/>`;
                        inner += head(type, sx, type === 'lavender' || type === 'foxglove' ? sy - 4 : sy, ssz, false)[0];
                    });
                }
                if (Math.random() < 0.75) inner += tuft(H);
                const hd = head(type, cx, top, sz, rare); inner += hd[0]; color = hd[1];
            } else if (type === 'grass'){
                h = rand(24, 48) * rh; H = h + 4; let s = '';
                for (let k = 0; k < 5; k++){ const dx = (k - 2) * 3.5 + rand(-1, 1), b = rand(-9, 9), hh = h * rand(0.6, 1); s += `<path d="M${f1(cx + dx)} ${f1(H)} Q ${f1(cx + dx + b * 0.4)} ${f1(H - hh * 0.6)} ${f1(cx + dx + b)} ${f1(H - hh)}" stroke="${pick(GREENS)}" stroke-width="2.6" stroke-linecap="round" fill="none"/>`; }
                inner = `<g class="g-pop">${s}</g>`;
            } else if (type === 'fern'){
                h = rand(42, 74) * rh; H = h + 6; const b = rand(-8, 8);
                let s = `<path d="M${cx} ${f1(H)} Q ${f1(cx + b * 0.3)} ${f1(H - h * 0.5)} ${f1(cx + b)} ${f1(H - h)}" stroke="#6e9a4c" stroke-width="2" fill="none" stroke-linecap="round"/>`;
                for (let k = 1; k <= 7; k++){ const t = k / 8, x = cx + b * t * t, y = H - h * t, rx = 8 * (1 - t * 0.7), lx = x - rx * 0.8, rxx = x + rx * 0.8; s += `<ellipse cx="${f1(lx)}" cy="${f1(y)}" rx="${f1(rx)}" ry="2.6" fill="#8db36a" transform="rotate(22 ${f1(lx)} ${f1(y)})"/><ellipse cx="${f1(rxx)}" cy="${f1(y)}" rx="${f1(rx)}" ry="2.6" fill="#7fa65c" transform="rotate(-22 ${f1(rxx)} ${f1(y)})"/>`; }
                inner = `<g class="g-pop">${s}</g>`;
            } else if (type === 'mushroom'){
                h = rand(20, 30); H = h + 2; const capC = pick(['#e0603a', '#c2457e', '#d99a6a', '#b9a2de']), cw = rand(11, 15), capY = H - h + 8; color = capC;
                inner = `<g class="g-pop"><rect x="${cx - 4}" y="${f1(capY - 2)}" width="8" height="${f1(H - capY + 2)}" rx="3" fill="#fff7ea" stroke="#e8dcea"/><path d="M${f1(cx - cw)} ${f1(capY)} Q ${cx} ${f1(capY - cw * 1.3)} ${f1(cx + cw)} ${f1(capY)} Z" fill="${capC}"/><circle cx="${cx - 4}" cy="${f1(capY - 5)}" r="2" fill="#fff" opacity=".85"/><circle cx="${cx + 4}" cy="${f1(capY - 7)}" r="1.6" fill="#fff" opacity=".85"/><circle cx="${cx + 7}" cy="${f1(capY - 2.5)}" r="1.3" fill="#fff" opacity=".85"/></g>`;
            } else if (type === 'bush'){
                h = rand(26, 38) * rh; H = h + 2; let s = '';
                [[-9, 0.55, 10], [9, 0.55, 10], [0, 0.8, 12], [-4, 0.35, 9], [5, 0.38, 9]].forEach(([ox, oy, r]) => { s += `<circle cx="${cx + ox}" cy="${f1(H - h * oy)}" r="${f1(r * h / 34)}" fill="${pick(GREENS)}"/>`; });
                const berry = pick(['#e9789f', '#f2c230', '#b9a2de', '#ffffff']); color = berry;
                for (let k = 0; k < 4; k++) s += `<circle cx="${f1(cx + rand(-12, 12))}" cy="${f1(H - h * rand(0.35, 0.85))}" r="2" fill="${berry}"/>`;
                inner = `<g class="g-pop">${s}</g>`;
            } else { /* clover */
                h = rand(18, 28); H = h + 10; const t2 = H - h;
                let s = `<path d="M${cx} ${f1(H)} Q ${cx + 3} ${f1(H - h * 0.5)} ${cx} ${f1(t2)}" stroke="#6e9a4c" stroke-width="1.8" fill="none"/>`;
                [0, 120, 240].forEach(a => { const rad = (a - 90) * Math.PI / 180; s += `<circle cx="${f1(cx + Math.cos(rad) * 4.5)}" cy="${f1(t2 + Math.sin(rad) * 4.5)}" r="4.6" fill="#8db36a"/>`; });
                if (Math.random() < 0.5) s += `<circle cx="${cx + 9}" cy="${f1(t2 - 4)}" r="3.5" fill="#fff" stroke="#f9c6d6"/>`;
                inner = `<g class="g-pop">${s}</g>`;
            }
            return { isFlower, h, H, inner, color };
        }

        /* --- game state: one place, so loading, saving and "start over" all touch the same things --- */
        const KEY = 'mb-garden-v1';
        const store = {
            get(){ try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch (e){ return null; } },
            set(v){ try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e){} },
            clear(){ try { localStorage.removeItem(KEY); } catch (e){} }
        };
        const freshStats = () => ({ planted: 0, shooed: 0, watered: 0, rare: 0, lost: 0, deer: 0 });
        const P = [], C = [];
        let S = freshStats(), badges = new Set(), fullReached = false, regrowing = false;
        let gen = 0, tick = 0, inView = false, started = false, restoring = false;
        let flashMsg = '', flashT = 0, saveT = 0;
        let cloud = null, deer = null;
        /* "active play" = garden on screen and you interacted with it in the last 90s */
        let play = 0, lastTouch = 0, deerAt = Math.round(rand(8, 14));
        const touched = () => { lastTouch = Date.now(); };
        let nextPest = 9, nextFriend = 7, nextCloud = 25, nextSun = 6, sunUntil = 0;

        const BADGES = {
            sprout: ['first sprout', 'plant your first flower', 'fl-bloom', '#8db36a'],
            thumb: ['green thumb', 'plant 25 flowers by hand', 'fl-leaf', '#6e9a4c'],
            full: ['full bloom', 'grow the garden to full bloom', 'fl-bloom', '#f4a7bf'],
            care: ['caretaker', 'water 5 thirsty plants', 'fl-daisy', '#7fbfdc'],
            rain: ['rainmaker', act + ' a cloud to make it rain', 'fl-daisy', '#9fbde6'],
            guard: ['garden guardian', 'shoo away 5 hungry visitors', 'fl-forsythia', '#f2c230'],
            rare: ['starbloom finder', 'grow a rare starbloom', 'fl-bloom', '#f79cc0'],
            pollen: ['pollinator pal', 'let a butterfly sprout a seedling', 'fl-daisy', '#c9b2ec'],
            deer: ['brave gardener', 'chase a deer out of the garden', 'fl-forsythia', '#d9a877'],
            regrow: ['second spring', 'regrow to full bloom after a deer visit', 'fl-bloom', '#e9789f']
        };
        function loadState(){
            const s = store.get(); if (!s || typeof s !== 'object') return null;
            S = Object.assign(freshStats(), s.stats || {});
            badges = new Set((s.badges || []).filter(k => BADGES[k]));
            fullReached = !!s.full; regrowing = !!s.regrowing;
            return s;
        }
        function snapshot(){
            return { v: 2, plants: P.filter(p => p.state !== 'gone').map(p => ({ x: +p.x.toFixed(2), row: p.row, inner: p.inner, H: +p.H.toFixed(1), h: +p.h.toFixed(1), flower: p.flower, rare: p.rare, color: p.color })),
                stats: S, badges: [...badges], full: fullReached, regrowing };
        }
        function save(){ clearTimeout(saveT); saveT = setTimeout(flushSave, 600); }
        function flushSave(){ clearTimeout(saveT); saveT = 0; if (started) store.set(snapshot()); }
        addEventListener('pagehide', () => { if (saveT) flushSave(); });

        const live = () => P.filter(p => p.state !== 'gone');
        const count = () => live().length;
        const bedW = () => bed.clientWidth || 800;
        const gapOf = row => ROWS[row].gap * (bedW() < 600 ? 1.35 : 1);
        const rowCap = row => Math.max(4, Math.floor(bedW() * 0.94 / gapOf(row)));
        const CAP = () => rowCap('back') + rowCap('mid') + rowCap('front');
        const GOAL = Math.max(24, Math.min(60, Math.round(CAP() * 0.3)));
        /* 0 fresh soil, 1 first sprouts, 2 filling in, 3 lush, 4 full bloom, 5 overflowing */
        const stageOf = n => n === 0 ? 0 : n < 8 ? 1 : n < GOAL * 0.55 ? 2 : n < GOAL ? 3 : n < Math.round(GOAL * 1.35) ? 4 : 5;
        const nameOf = p => p.rare ? 'starbloom' : p.flower ? 'flower' : 'plant';
        const lifeSpan = flower => rand(150, 260) * (flower ? 1 : 1.5);

        /* --- badges --- */
        const toastQ = []; let toasting = false, toastT = 0;
        function award(k){ if (badges.has(k)) return; badges.add(k); toastQ.push(`<span class="g-badge">${FLI}</span><span>badge unlocked: <b>${BADGES[k][0]}</b></span>`); runToast(); save(); }
        function notice(html){ toastQ.unshift(html); runToast(); }
        function runToast(){
            if (toasting || !toastQ.length) return; toasting = true;
            toast.innerHTML = toastQ.shift();
            toast.classList.remove('show'); void toast.offsetWidth; toast.classList.add('show');
            toastT = setTimeout(() => { toast.classList.remove('show'); toastT = setTimeout(() => { toasting = false; runToast(); }, 450); }, 2700);
        }
        function checkBadges(){ if (S.planted >= 1) award('sprout'); if (S.planted >= 25) award('thumb'); if (S.watered >= 5) award('care'); if (S.shooed >= 5) award('guard'); }
        function renderShelf(){
            setHTML(shelf, Object.keys(BADGES).map(k => {
                const b = BADGES[k], on = badges.has(k);
                return `<span class="g-bdg${on ? ' on' : ''}" role="listitem" title="${b[0]}: ${b[1]}" aria-label="${b[0]}, ${on ? 'unlocked' : 'locked'}: ${b[1]}" style="--bc:${b[3]}"><svg viewBox="-50 -50 100 100" aria-hidden="true"><use href="#${b[2]}" x="-50" y="-50" width="100" height="100"/></svg></span>`;
            }).join(''));
        }

        /* layered planting: pick the emptiest row (with a little randomness), then the nearest open gap in it */
        function findSpot(xPct, prefer){
            const W = bedW(), all = live(), fill = r => all.filter(p => p.row === r).length / rowCap(r);
            const order = Object.keys(ROWS).map(r => [r, fill(r) + Math.random() * 0.2 - (r === prefer ? 1 : 0)]).sort((a, b) => a[1] - b[1]).map(a => a[0]);
            for (const row of order){
                const minPct = gapOf(row) / W * 100, taken = all.filter(p => p.row === row).map(p => p.x);
                for (let k = 0; k <= 60; k++){
                    const x = xPct + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.45;
                    if (x < 3 || x > 97) continue;
                    if (taken.every(t => Math.abs(t - x) >= minPct)) return { x, row };
                }
            }
            return null;
        }
        function fxEl(cls, x, y, style){
            const el = document.createElement('span'); el.className = 'g-fx ' + cls;
            el.style.left = f1(x) + 'px'; el.style.top = f1(y) + 'px'; if (style) el.style.cssText += ';' + style;
            bed.appendChild(el); return el;
        }
        function fx(cls, x, y, frames, dur, delay, o){
            if (reduce) return;
            o = o || {};
            const el = fxEl(cls, x, y, o.style);
            el.animate(frames, { duration: dur, delay: delay || 0, easing: o.easing || 'cubic-bezier(0.22,1,0.36,1)', fill: 'backwards' }).onfinish = () => { el.remove(); if (o.done) o.done(); };
        }
        function headOf(p){ const b = bed.getBoundingClientRect(), r = p.el.getBoundingClientRect(); return { x: r.left - b.left + r.width / 2, y: r.top - b.top }; }
        function sparkles(x, y, n){
            if (reduce) return;
            for (let k = 0; k < n; k++){ const sp = document.createElement('span'); sp.className = 'g-sparkle'; sp.style.left = f1(x + rand(-22, 22)) + 'px'; sp.style.top = f1(y + rand(-26, 6)) + 'px'; sp.style.animationDelay = (k * 0.07) + 's'; bed.appendChild(sp); setTimeout(() => sp.remove(), 1700); }
        }
        /* petals tumble off a plant that is being eaten */
        function shedPetals(p, n){
            if (reduce || !p.el.isConnected) return;
            const hd = headOf(p);
            for (let k = 0; k < n; k++){
                const dx = rand(-28, 28), dy = rand(30, 70);
                fx('g-petal', hd.x + rand(-8, 8), hd.y + rand(2, 14), [
                    { transform: 'translate(0,0) rotate(0deg)', opacity: 1 },
                    { transform: `translate(${f1(dx * 0.6)}px,${f1(dy * 0.35)}px) rotate(${f1(rand(-200, 200))}deg)`, opacity: 1, offset: 0.45 },
                    { transform: `translate(${f1(dx)}px,${f1(dy)}px) rotate(${f1(rand(-400, 400))}deg)`, opacity: 0 }
                ], rand(900, 1400), k * 40, { style: '--pc:' + (p.color || '#f4a7bf'), easing: 'ease-in' });
            }
        }
        function minusPop(p){ if (!p.el.isConnected) return; const hd = headOf(p), el = fxEl('g-minus', hd.x, hd.y - 4); el.textContent = '−1'; setTimeout(() => el.remove(), 1200); }

        /* plant something; opts.preset restores a saved plant exactly, opts.quiet skips the HUD refresh */
        function plant(xPct, delay, type, opts){
            opts = opts || {};
            let spot, m, rare = false;
            if (opts.preset){
                const s = opts.preset; spot = { x: +s.x, row: ROWS[s.row] ? s.row : 'front' };
                m = { isFlower: !!s.flower, h: +s.h, H: +s.H, inner: s.inner, color: s.color || '#f4a7bf' }; rare = !!s.rare;
            } else {
                spot = findSpot(xPct, opts.row); if (!spot) return null;
                type = type || pickType(spot.row);
                rare = !opts.noRare && FLOWER_TYPES.includes(type) && Math.random() < 0.05;
                m = plantMarkup(type, rare, spot.row);
            }
            const pl = document.createElement('div');
            pl.className = 'g-plant row-' + spot.row + (rare ? ' rare' : ''); pl.style.left = spot.x + '%';
            pl.style.setProperty('--d', delay + 's'); pl.style.setProperty('--sd', f1(-Math.random() * 4) + 's');
            pl.style.setProperty('--l', (m.h + 24).toFixed(0)); pl.style.setProperty('--droop', f1((Math.random() < 0.5 ? -1 : 1) * rand(7, 12)) + 'deg');
            pl.innerHTML = `<div class="g-life"><div class="g-sway"><svg viewBox="0 0 40 ${f1(m.H)}" width="40" height="${f1(m.H)}" aria-hidden="true">${m.inner}</svg></div></div>`;
            bed.appendChild(pl);
            const p = { el: pl, x: spot.x, row: spot.row, flower: m.isFlower, rare, inner: m.inner, H: +m.H, h: +m.h, color: m.color, state: 'grow', age: 0, life: lifeSpan(m.isFlower), thirst: 0, targeted: false };
            P.push(p);
            requestAnimationFrame(() => pl.classList.add('grow'));
            if (!opts.preset){
                const W = bed.clientWidth, bx = spot.x / 100 * W, by = bed.clientHeight - ROWS[spot.row].y - 3;
                for (let k = 0; k < 6; k++){ const dx = rand(-16, 16), dy = rand(-14, -4); fx('dirt', bx, by, [{ transform: 'translate(0,0) scale(1)', opacity: 1 }, { transform: `translate(${f1(dx)}px,${f1(dy)}px) scale(.4)`, opacity: 0 }], rand(500, 800), delay * 1000); }
            }
            const g = gen;
            setTimeout(() => {
                if (g !== gen || p.state !== 'grow') return;
                p.state = 'bloom'; pl.classList.add('bloomed');
                if (!reduce && p.flower && inView && !opts.preset){ const hd = headOf(p); fx('bloom-ring' + (rare ? ' rare-ring' : ''), hd.x, hd.y + 12, [{ opacity: 1 }, { opacity: 1 }], 950); }
            }, delay * 1000 + 1500);
            if (rare && !opts.preset){ S.rare++; award('rare'); flash(`a rare starbloom sprouted — it shimmers through every color ${FLI}`, 3600); }
            if (!opts.quiet) updateHud();
            save();
            return p;
        }
        /* how: 'eaten' | 'withered' (both count as lost and visibly drop the count right away) */
        function removePlant(p, how){
            if (p.state === 'gone') return;
            if (how === 'eaten') shedPetals(p, p.flower ? 9 : 4);
            minusPop(p);
            p.state = 'gone'; p.targeted = false; S.lost++;
            p.el.classList.remove('thirsty', 'nibbled', 'saved'); p.el.classList.add(how);
            setTimeout(() => { p.el.remove(); const i = P.indexOf(p); if (i > -1) P.splice(i, 1); }, how === 'eaten' ? 1100 : 1550);
            updateHud(); save();
        }
        function refresh(p){ p.state = 'bloom'; p.age = 0; p.thirst = 0; p.life = lifeSpan(p.flower); p.el.classList.remove('thirsty'); }
        function water(p){
            refresh(p); S.watered++;
            if (!reduce){ const hd = headOf(p); for (let k = 0; k < 6; k++){ const ox = rand(-14, 14); fx('drop', hd.x + ox, hd.y - 26, [{ transform: 'translate(0,0)', opacity: 0 }, { transform: 'translate(0,8px)', opacity: 1, offset: 0.3 }, { transform: 'translate(0,34px)', opacity: 0 }], rand(600, 850), k * 60); } }
            flash('watered — it perked right back up ' + FLI, 2200); save();
        }

        /* --- HUD: urgent things (deer, pests, events, thirst) win over the progress story --- */
        function flash(msg, ms){ flashMsg = msg; clearTimeout(flashT); flashT = setTimeout(() => { flashMsg = ''; updateHud(); }, ms || 3000); updateHud(); }
        const PEST_MSG = {
            bunny: `a hungry bunny hopped in — <b>${act} it</b> before it starts nibbling`,
            bird: `a bird swooped down for a snack — <b>${act} it</b> to scare it off`,
            snail: `a snail is creeping toward your flowers — <b>${act} it</b> to shoo it`,
            caterpillar: `a caterpillar is inching in for lunch — <b>${act} it</b> to shoo it`
        };
        const STAGE_MSG = [
            () => `fresh soil ${FLI} ${act} anywhere to plant your first seeds`,
            n => `first sprouts are up — keep planting <b>${n}</b> / ${GOAL}`,
            n => `the garden is filling in <b>${n}</b> / ${GOAL}`,
            n => `it's getting lush — <b>${GOAL - n}</b> more for full bloom`,
            () => `full bloom ${FLI} keep it watered and watch for hungry visitors`,
            () => `overflowing with flowers ${FLI} the butterflies are thrilled`
        ];
        function hudText(n, st){
            if (deer && deer.state !== 'leaving'){
                const t = deer.hp + ' more time' + (deer.hp === 1 ? '' : 's');
                return deer.state === 'coming' || deer.state === 'eyeing' ? `a little visitor is here — a hungry deer! <b>${act} it ${t}</b> to chase it off` : `the deer is nibbling its way through the garden — <b>${act} it ${t}</b>`;
            }
            const pest = C.find(c => c.pest && c.kind !== 'deer' && c.state !== 'leaving');
            if (pest) return PEST_MSG[pest.kind];
            if (flashMsg) return flashMsg;
            const thirsty = P.filter(p => p.state === 'thirsty').length;
            if (thirsty) return `${thirsty === 1 ? 'a plant is' : thirsty + ' plants are'} thirsty — <b>${act} the drooping ${thirsty === 1 ? 'one' : 'ones'}</b> to water`;
            if (cloud) return cloud.raining ? `rain! everything underneath is getting a drink ${FLI}` : `a little cloud is drizzling — <b>${act} it</b> for a proper shower`;
            if (regrowing && n < GOAL) return `the deer left a bare patch — replant to bring it back <b>${n}</b> / ${GOAL}`;
            return STAGE_MSG[st](n);
        }
        function updateHud(){
            checkBadges();
            const n = count(), st = stageOf(n);
            if (bed.dataset.stage !== String(st)) bed.dataset.stage = st;
            if (!fullReached && n >= GOAL && started && !restoring){ fullReached = true; award('full'); const again = regrowing; if (regrowing){ regrowing = false; award('regrow'); } celebrate(again); save(); }
            meter.style.width = Math.min(100, n / GOAL * 100) + '%';
            setHTML(stats, `growing <b>${n}</b> &middot; planted <b>${S.planted}</b>`);
            setHTML(statsMore, `watered <b>${S.watered}</b> &middot; shooed <b>${S.shooed}</b> &middot; starblooms <b>${S.rare}</b> &middot; lost <b>${S.lost}</b>`);
            renderShelf();
            tip.classList.toggle('alert', C.some(c => c.pest && c.state !== 'leaving'));
            setHTML(txt, hudText(n, st));
        }
        function celebrate(again){
            const r = bed.getBoundingClientRect();
            for (let k = 0; k < 5; k++) setTimeout(() => burstAt(r.left + r.width * (0.15 + k * 0.175), r.top + r.height * 0.45, 9), k * 160);
            flash(again ? `second spring ${FLI} the garden is back in full bloom` : `full bloom ${FLI} your garden is complete — keep it safe from hungry visitors`, 5000);
        }

        /* --- input --- */
        bed.addEventListener('click', e => {
            touched();
            const pe = e.target.closest('.g-plant.thirsty');
            if (pe){ const p = P.find(q => q.el === pe); if (p && p.state === 'thirsty') return water(p); }
            const r = bed.getBoundingClientRect(), cx = ((e.clientX - r.left) / r.width) * 100; let got = 0;
            [[0, 0], [-rand(2, 4), 0.14], [rand(2, 4), 0.26], [rand(-7, 7), 0.4]].forEach(([dx, d]) => { if (plant(cx + dx, reduce ? 0 : d, null, { quiet: true })) got++; });
            if (got){ sparkles(e.clientX - r.left, e.clientY - r.top, 6); S.planted += got; updateHud(); save(); }
            else flash('this patch is packed — try a barer spot', 2000);
        });
        bed.addEventListener('keydown', e => {
            if (e.target !== bed || (e.key !== 'Enter' && e.key !== ' ')) return; e.preventDefault(); touched();
            const t = P.find(p => p.state === 'thirsty'); if (t) return water(t);
            let got = 0; for (let k = 0; k < 3; k++) if (plant(rand(5, 95), reduce ? 0 : k * 0.15, null, { quiet: true })) got++;
            if (got){ S.planted += got; updateHud(); save(); }
        });

        /* start over: two-step confirm, then wipe every part of the game (not just the visible plants) */
        let armed = false, armT = 0;
        const disarm = () => { armed = false; clearTimeout(armT); resetBtn.textContent = 'start over'; resetBtn.classList.remove('armed'); };
        resetBtn.addEventListener('click', e => {
            e.stopPropagation();
            if (!armed){ armed = true; resetBtn.textContent = 'erase the whole garden? ' + act + ' again'; resetBtn.classList.add('armed'); armT = setTimeout(disarm, 3500); return; }
            disarm(); resetGame();
        });
        resetBtn.addEventListener('blur', disarm);
        function resetGame(){
            gen++;
            P.forEach(p => { p.state = 'gone'; p.el.remove(); }); P.length = 0;
            S = freshStats(); badges = new Set(); fullReached = false; regrowing = false;
            C.slice().forEach(dropCritter); deer = null; bed.classList.remove('deer-alert');
            if (cloud){ if (cloud.tok) cloud.tok.stop = true; cloud.el.remove(); cloud = null; }
            setSunny(false);
            bed.querySelectorAll('.g-fx, .g-sparkle, .shoo-pop').forEach(el => el.remove());
            toastQ.length = 0; clearTimeout(toastT); toasting = false; toast.classList.remove('show');
            clearTimeout(flashT); flashMsg = '';
            tick = 0; nextPest = 9; nextFriend = 7; nextCloud = 25; nextSun = 6; sunUntil = 0; play = 0; lastTouch = 0; deerAt = Math.round(rand(20, 30));
            started = true; bed.classList.add('grown');
            store.clear(); flushSave();
            flash(`fresh soil ${FLI} a brand-new garden — ${act} anywhere to plant`, 3600);
        }

        /* a breeze follows the cursor: plants lean the way you sweep across them */
        if (!reduce && hoverable){
            let wind = 0, wRun = false, lastX = null;
            const windLoop = () => { wind *= 0.93; bed.style.setProperty('--lean', wind.toFixed(2) + 'deg'); if (Math.abs(wind) > 0.05) requestAnimationFrame(windLoop); else { wRun = false; bed.style.setProperty('--lean', '0deg'); } };
            bed.addEventListener('mousemove', e => {
                if (lastX !== null) wind = Math.max(-14, Math.min(14, wind + (e.clientX - lastX) * 0.12));
                lastX = e.clientX; if (!wRun){ wRun = true; requestAnimationFrame(windLoop); }
            });
            bed.addEventListener('mouseleave', () => { lastX = null; });
        }

        /* first visit only: a small starter patch. A saved garden (even an empty one after "start over") is restored exactly. */
        function seedStarter(){ const n = innerWidth < 700 ? 6 : 10; for (let i = 0; i < n; i++) plant(8 + i * (84 / (n - 1)) + rand(-2, 2), reduce ? 0 : i * 0.08, null, { quiet: true, noRare: true }); }
        const initial = loadState();
        function start(){
            started = true; bed.classList.add('grown'); restoring = true;
            if (initial){
                const keep = (initial.plants || []).filter(s => s && typeof s.inner === 'string' && isFinite(s.x) && isFinite(s.H));
                keep.forEach((s, i) => plant(s.x, reduce ? 0 : Math.min(i * 0.03, 1.4), null, { quiet: true, preset: s }));
                if (keep.length) flash('welcome back — your garden is right where you left it ' + FLI, 3200);
            } else seedStarter();
            restoring = false;
            if (count() >= GOAL) fullReached = true;
            updateHud();
        }
        new IntersectionObserver(es => es.forEach(e => {
            inView = e.isIntersecting; bed.classList.toggle('awake', inView);
            if (inView && !started) start();
        }), { threshold: 0.25 }).observe(bed);
        updateHud();

        /* --- critters --- */
        SVG.caterpillar = '<svg viewBox="0 0 44 22"><g class="cat-segs">' + [6, 12, 18, 24, 30].map((x, k) => `<circle cx="${x}" cy="15" r="5.4" fill="${k % 2 ? '#b6d88f' : '#9cc27a'}"/><circle cx="${x}" cy="20.5" r="1.3" fill="#6e9a4c"/>`).join('') + '</g><path d="M35 5 L33 0.5 M39 5 L41 0.5" stroke="#6e9a4c" stroke-width="1.2" stroke-linecap="round"/><circle cx="33" cy="0.8" r="1.3" fill="#f4a7bf"/><circle cx="41" cy="0.8" r="1.3" fill="#f4a7bf"/><circle cx="37" cy="11" r="7" fill="#8db36a"/><circle cx="39.5" cy="9.5" r="1.4" fill="#5a4366"/><circle cx="40" cy="13.4" r="1.6" fill="#f9c6d6" opacity=".9"/><path d="M41.5 12 Q43 13 41.8 14" stroke="#5a4366" stroke-width=".9" fill="none"/></svg>';
        /* a spotted fawn, side view facing right. Legs and head are their own groups so they can walk and nibble. */
        const leg = (x, top, fill, cls) => `<g class="leg ${cls}" style="transform-origin:${x + 2.5}px ${top}px"><rect x="${x}" y="${top}" width="5" height="${84 - top}" rx="2.5" fill="${fill}"/><rect x="${x - 0.3}" y="80.5" width="5.6" height="5" rx="1.8" fill="#5a3f33"/></g>`;
        SVG.deer = '<svg viewBox="0 0 100 90">'
            + leg(27, 54, '#b47a4c', 'la') + leg(61, 54, '#b47a4c', 'lb')
            + '<path d="M21 45 Q13 41 15 34 Q19 38 24 40Z" fill="#c98f5e"/><path d="M15.5 36.5 Q14 35 15 34 Q17 36.5 18.5 37.5Z" fill="#fff7ec"/>'
            + '<ellipse cx="44" cy="47" rx="25" ry="12.5" fill="#c98f5e"/><ellipse cx="46" cy="54" rx="16" ry="5" fill="#f1dcc2"/>'
            + '<circle cx="30" cy="42" r="2.1" fill="#fff7ec"/><circle cx="37.5" cy="39.5" r="2" fill="#fff7ec"/><circle cx="45.5" cy="41" r="2.2" fill="#fff7ec"/><circle cx="53" cy="39.5" r="1.8" fill="#fff7ec"/><circle cx="35" cy="46" r="1.5" fill="#fff7ec"/><circle cx="49" cy="45.5" r="1.6" fill="#fff7ec"/><circle cx="41" cy="44" r="1.2" fill="#fff7ec"/>'
            + leg(33, 55, '#c98f5e', 'lb') + leg(55, 55, '#c98f5e', 'la')
            + '<g class="deer-head">'
            + '<path d="M57 45 Q61 31 70 22 L78 26 Q71 36 68 50Z" fill="#c98f5e"/><path d="M66 48 Q69 37 75.5 28.5 L77.5 30.5 Q72 39 69.5 49Z" fill="#f1dcc2"/>'
            + '<g class="deer-ear e1"><ellipse cx="70" cy="13" rx="3.8" ry="8.5" transform="rotate(-38 70 13)" fill="#b47a4c"/></g>'
            + '<ellipse cx="79" cy="20" rx="9.5" ry="7.8" fill="#c98f5e"/>'
            + '<path d="M84 15.5 Q93 18 93.5 22.5 Q92.5 27 84 27Z" fill="#c98f5e"/><ellipse cx="89" cy="23.6" rx="4.6" ry="3.4" fill="#f1dcc2"/><ellipse cx="93" cy="21.8" rx="2.1" ry="1.7" fill="#3a2b33"/>'
            + '<g class="deer-ear e2"><ellipse cx="76" cy="9.5" rx="4.2" ry="9" transform="rotate(-16 76 9.5)" fill="#c98f5e"/><ellipse cx="76.2" cy="10" rx="2" ry="6" transform="rotate(-16 76.2 10)" fill="#f9c6d6"/></g>'
            + '<circle cx="81" cy="18" r="2.6" fill="#2e2236"/><circle cx="82" cy="17" r="0.95" fill="#fff"/><path d="M78.6 15.4 L77.6 14.4 M80 14.8 L79.6 13.6" stroke="#2e2236" stroke-width=".7" stroke-linecap="round"/>'
            + '<ellipse cx="82.5" cy="23.5" rx="2.4" ry="1.4" fill="#f4a7bf" opacity=".7"/></g></svg>';
        window.__deerSVG = SVG.deer;
        const SIZES = { bunny: [46, 40], snail: [40, 26], bird: [36, 29], flutter: [26, 22], caterpillar: [44, 22], deer: [108, 97] };
        const SPEED = { bunny: 150, snail: 42, caterpillar: 34 };
        const EAT_MS = { bunny: 2400, bird: 2200, snail: 3800, caterpillar: 3400 };
        const FLEE = { bunny: 'bolted for the hedge', bird: 'flapped away', snail: 'slid off in a huff', caterpillar: 'inched away' };
        function makeCritter(kind){
            const [w, h] = SIZES[kind], el = document.createElement('div');
            el.className = 'critter ' + kind; el.innerHTML = `<div class="c-flip"><div class="c-body">${SVG[kind]}</div></div>`;
            bed.appendChild(el);
            const c = { el, kind, w: el.offsetWidth || w, h: el.offsetHeight || h, x: 0, y: 0, state: 'coming', pest: kind !== 'flutter', tok: null, timer: 0, shed: 0, munch: 0, meals: 0 };
            if (c.pest){
                el.setAttribute('role', 'button'); el.setAttribute('tabindex', '0'); el.setAttribute('aria-label', kind === 'deer' ? 'Chase off the deer' : 'Shoo the ' + kind);
                const hit = e => { e.stopPropagation(); touched(); if (kind === 'deer') hitDeer(c); else leave(c, true); };
                el.addEventListener('click', hit);
                el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); hit(e); } });
            }
            C.push(c); return c;
        }
        const setPos = c => { c.el.style.transform = `translate(${f1(c.x)}px,${f1(c.y)}px)`; };
        const groundY = c => bed.clientHeight - 6 - c.h;
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
            c.el.remove(); const i = C.indexOf(c); if (i > -1) C.splice(i, 1);
            if (deer === c){ deer = null; bed.classList.remove('deer-alert'); }
            updateHud();
        }
        const edible = p => (p.state === 'bloom' || p.state === 'thirsty') && !p.targeted;
        function walkTo(c, hx){ go(c, c.x + c.w / 2 < hx ? hx - c.w + 6 : hx - 6, c.y, SPEED[c.kind], 0, () => arrive(c)); }

        function spawnPest(only){
            const opts = P.filter(edible); if (!opts.length) return;
            const kind = only || pick(['bunny', 'bunny', 'bird', 'bird', 'snail', 'caterpillar']);
            const tasty = opts.filter(p => p.flower), target = pick(tasty.length ? tasty : opts);
            const c = makeCritter(kind), W = bed.clientWidth, hd = headOf(target);
            c.target = target; target.targeted = true;
            if (kind === 'bird'){
                c.fromLeft = Math.random() < 0.5; c.x = c.fromLeft ? -c.w - 10 : W + 10; c.y = rand(-40, -12); setPos(c);
                go(c, c.fromLeft ? hd.x - c.w + 5 : hd.x - 5, Math.max(0, hd.y - c.h + 9), 230, -35, () => arrive(c));
            } else {
                c.fromLeft = kind === 'bunny' ? Math.random() < 0.5 : hd.x < W / 2;
                c.x = c.fromLeft ? -c.w - 10 : W + 10; c.y = groundY(c); setPos(c); walkTo(c, hd.x);
            }
            updateHud();
        }
        /* eating: the plant shakes and sheds petals, then is eaten (visibly disappears, count drops). Bunnies go back for seconds. */
        function arrive(c){
            if (c.state !== 'coming') return;
            const t = c.target;
            if (!t || t.state === 'gone') return leave(c, false);
            c.state = 'eating'; c.el.classList.add('eating'); t.el.classList.add('nibbled'); updateHud();
            if (!reduce) c.shed = setInterval(() => shedPetals(t, 1), 480);
            c.timer = setTimeout(() => {
                if (c.state !== 'eating') return;
                clearInterval(c.shed); c.el.classList.remove('eating');
                if (t.state !== 'gone'){ removePlant(t, 'eaten'); flash(`the ${c.kind} ate a ${nameOf(t)} — ${act} the soil to regrow it`, 3000); }
                c.meals++;
                if (c.kind === 'bunny' && c.meals < 3){
                    const W = bed.clientWidth, cx = c.x + c.w / 2;
                    const next = P.filter(p => edible(p) && Math.abs(p.x / 100 * W - cx) < W * 0.18).sort((a, b) => Math.abs(a.x / 100 * W - cx) - Math.abs(b.x / 100 * W - cx))[0];
                    if (next){ c.target = next; next.targeted = true; c.state = 'coming'; walkTo(c, headOf(next).x); updateHud(); return; }
                }
                leave(c, false);
            }, EAT_MS[c.kind]);
        }
        function shooFx(c, text){
            const pop = document.createElement('span'); pop.className = 'shoo-pop'; pop.innerHTML = text + ' ' + FLI;
            pop.style.left = f1(Math.max(44, Math.min(bed.clientWidth - 44, c.x + c.w / 2))) + 'px'; pop.style.top = f1(Math.max(4, c.y - 22)) + 'px';
            bed.appendChild(pop); setTimeout(() => pop.remove(), 1200);
            for (let k = 0; k < 7; k++){ const a = (k / 7) * Math.PI * 2, d = rand(16, 30); fx('puff', c.x + c.w / 2, c.y + c.h - 4, [{ transform: 'translate(-50%,-50%) scale(.4)', opacity: 0.9 }, { transform: `translate(calc(-50% + ${f1(Math.cos(a) * d)}px), calc(-50% + ${f1(Math.sin(a) * d * 0.5 - 6)}px)) scale(1.3)`, opacity: 0 }], rand(450, 650)); }
        }
        function leave(c, scared){
            if (c.state === 'leaving') return;
            c.state = 'leaving'; clearTimeout(c.timer); clearInterval(c.shed); c.el.classList.remove('eating');
            const t = c.target;
            if (t && t.state !== 'gone'){
                t.targeted = false; t.el.classList.remove('nibbled');
                if (scared){ t.el.classList.add('saved'); setTimeout(() => t.el.classList.remove('saved'), 900); if (inView){ const hd = headOf(t); sparkles(hd.x, hd.y + 8, 5); } }
            }
            if (scared){ S.shooed++; shooFx(c, 'shoo!'); flash(`saved! the ${c.kind} ${FLEE[c.kind]} ${FLI}`, 2400); save(); }
            const W = bed.clientWidth, back = c.x + c.w / 2 < W / 2 ? -c.w - 30 : W + 30;
            const run = () => {
                if (!c.el.isConnected) return; c.el.classList.remove('startled');
                if (c.kind === 'bird') go(c, back, -60, scared ? 520 : 260, 25, () => dropCritter(c));
                else go(c, back, c.y, scared ? { bunny: 430, snail: 150, caterpillar: 130 }[c.kind] : SPEED[c.kind] * 1.1, 0, () => dropCritter(c));
            };
            if (scared && !reduce){ if (c.tok) c.tok.stop = true; c.el.classList.add('startled'); setTimeout(run, 320); } else run();
            updateHud();
        }

        /* friendly butterfly: visits blooms and sometimes pollinates a new seedling nearby */
        function spawnFlutter(){
            const c = makeCritter('flutter'), W = bed.clientWidth;
            c.fromLeft = Math.random() < 0.5; c.x = c.fromLeft ? -30 : W + 10; c.y = rand(70, 110); setPos(c);
            let visits = 0;
            const next = () => {
                if (!c.el.isConnected) return;
                const opts = P.filter(p => p.state === 'bloom' && p.flower);
                if (visits >= 3 || !opts.length){ c.state = 'leaving'; return go(c, c.fromLeft ? W + 40 : -40, 40, 90, 20, () => dropCritter(c), 6); }
                const p = pick(opts), hd = headOf(p);
                go(c, hd.x - c.w / 2, Math.max(0, hd.y - c.h + 6), 85, 30, () => {
                    visits++; c.el.classList.add('perch');
                    setTimeout(() => {
                        if (!c.el.isConnected) return;
                        c.el.classList.remove('perch');
                        if (p.state === 'bloom' && Math.random() < 0.45){
                            const seedling = plant(p.x + (Math.random() < 0.5 ? -1 : 1) * rand(3, 8), 0, null, { quiet: true });
                            if (seedling){ award('pollen'); flash('a butterfly pollinated a flower — a new seedling sprouted ' + FLI, 2800); }
                        }
                        next();
                    }, rand(1400, 2200));
                }, 6);
            };
            next();
        }

        /* --- deer: a gentle but hungry visitor. It walks in, pauses to look around, then works across the bed
               stop by stop: walk to the next plants, lower its head, nibble, and those plants are gone (removed from
               the game state, so the count, stage and full-bloom progress all drop). Then it walks out so you can
               replant. Three clicks/taps chase it off early. Lifetime stats and badges survive a visit.
               Timing: first visit after ~20-30s of active play (needs plants to eat), then every ~45-60s. --- */
        const narrowBed = () => bed.clientWidth < 600;
        const deerReach = () => narrowBed() ? 30 : 44;
        const deerSpeed = () => narrowBed() ? 55 : 72;
        const mouthX = c => c.fromLeft ? c.x + c.w * 0.945 : c.x + c.w * 0.055;
        function spawnDeer(){
            if (deer || !started || !count()) return;
            const c = makeCritter('deer'), W = bed.clientWidth; deer = c;
            c.hp = 3; c.ate = 0; c.stops = 0; c.prey = []; c.startN = count(); c.fromLeft = Math.random() < 0.5;
            c.y = groundY(c);
            /* on phones the whole path stays inside the bed: it fades in at the edge instead of walking in from off-screen */
            const inside = narrowBed();
            c.x = c.fromLeft ? (inside ? 2 : -c.w - 10) : (inside ? W - c.w - 2 : W + 10);
            c.el.classList.toggle('left-facing', !c.fromLeft);
            if (inside){ c.el.classList.add('faded'); requestAnimationFrame(() => requestAnimationFrame(() => c.el.classList.remove('faded'))); }
            setPos(c);
            bed.classList.add('deer-alert');
            notice(`<span class="g-badge">${FLI}</span><span>a little visitor is here</span>`);
            const inX = c.fromLeft ? Math.min(W * 0.06, W - c.w) : Math.max(0, W * 0.94 - c.w);
            go(c, inside ? c.x : inX, c.y, deerSpeed(), 0, () => {
                if (c.state !== 'coming') return;
                c.state = 'eyeing'; c.el.classList.add('sniff'); updateHud();
                c.timer = setTimeout(() => deerNext(c), reduce ? 1200 : 1800);
            });
            updateHud();
        }
        /* The deer's eating anchor: the muzzle tip in the deer art (viewBox 100x90), as an offset from the head's pivot
           (63,47). Lowering the head swings that point about the pivot, so the stopping spot is computed for the pose the
           deer will actually have while it eats, not for the deer's centre. */
        const MOUTH = { px: 63, py: 47, dx: 31.5, dy: -24 };
        const mouthAt = deg => { const a = deg * Math.PI / 180, cs = Math.cos(a), sn = Math.sin(a); return { x: MOUTH.px + MOUTH.dx * cs - MOUTH.dy * sn, y: MOUTH.py + MOUTH.dx * sn + MOUTH.dy * cs }; };
        /* head angle that brings the muzzle to the flower's height (clamped to what a deer can do) and where that puts its nose */
        function deerPose(c, hd){
            const s = c.w / 100, lo0 = -8, hi0 = 62, want = (hd.y + 12 - c.y) / s;
            const y = Math.max(mouthAt(lo0).y, Math.min(mouthAt(hi0).y, want)); let lo = lo0, hi = hi0;
            for (let i = 0; i < 18; i++){ const mid = (lo + hi) / 2; if (mouthAt(mid).y < y) lo = mid; else hi = mid; }
            const deg = (lo + hi) / 2; return { deg, noseX: mouthAt(deg).x / 100 * c.w };
        }
        /* left edge of the deer so its nose sits just beside the flower head: facing right = nose on the flower's left, facing left = on its right.
           Only x changes; y stays on the ground line. */
        function deerStop(c, hd, faceRight){
            const pose = deerPose(c, hd), gap = Math.round(12 * c.w / 100);
            return { x: faceRight ? hd.x - gap - pose.noseX : hd.x + gap - (c.w - pose.noseX), pose };
        }
        const livePlants = c => P.filter(p => p.state !== 'gone' && p.el.isConnected && p.deerSeen !== c);
        /* pick the next flower: nearest one still ahead of the muzzle, otherwise turn round for the nearest remaining one */
        function deerNext(c){
            if (c.state === 'leaving' || !c.el.isConnected) return;
            clearInterval(c.watch); c.el.classList.remove('sniff', 'eating'); c.state = 'grazing';
            if (c.target){ c.target.targeted = false; c.target = null; }
            const W = bed.clientWidth, dir = c.fromLeft ? 1 : -1, m = mouthX(c);
            const cand = livePlants(c).map(p => ({ p, hd: headOf(p) }));
            if (!cand.length || c.stops >= 40) return deerGone(c, false);
            const ahead = cand.filter(o => (o.hd.x - m) * dir > -4).sort((a, b) => (a.hd.x - b.hd.x) * dir);
            const pickd = ahead.length ? ahead[0] : cand.sort((a, b) => Math.abs(a.hd.x - m) - Math.abs(b.hd.x - m))[0];
            const t = pickd.p, hd = pickd.hd, inside = narrowBed();
            /* keep the current facing when the spot is on screen; otherwise approach from the other side */
            const lo = inside ? 2 : -c.w * 0.35, hi = inside ? W - c.w - 2 : W - c.w * 0.65;
            let face = ahead.length ? c.fromLeft : hd.x >= m, st = deerStop(c, hd, face);
            if (st.x < lo || st.x > hi){ const alt = deerStop(c, hd, !face); if (alt.x >= lo && alt.x <= hi) { face = !face; st = alt; } }
            const nx = Math.max(lo, Math.min(hi, st.x));
            c.fromLeft = face; c.target = t; c.pose = st.pose; c.realign = 0; t.targeted = true;
            c.el.style.setProperty('--er', st.pose.deg.toFixed(1) + 'deg');
            deerWalk(c, t, nx);
            updateHud();
        }
        /* walk to the stopping spot; if the flower disappears on the way (eaten by someone else, withered), pick again */
        function deerWalk(c, t, nx){
            clearInterval(c.watch);
            if (Math.abs(nx - c.x) < 1){ c.el.classList.toggle('left-facing', !c.fromLeft); return deerBite(c, t); }
            c.watch = setInterval(() => {
                if (t.state !== 'gone' && t.el.isConnected) return;
                clearInterval(c.watch); if (c.tok) c.tok.stop = true; c.el.classList.remove('moving'); t.targeted = false; deerNext(c);
            }, 120);
            go(c, nx, c.y, deerSpeed(), 0, () => { clearInterval(c.watch); deerBite(c, t); });
            c.el.classList.toggle('left-facing', !c.fromLeft);
        }
        function deerBite(c, t){
            if (c.state === 'leaving') return;
            if (!t || t.state === 'gone' || !t.el.isConnected) return deerNext(c);   /* the flower vanished before we got there */
            const hd = headOf(t), st = deerStop(c, hd, c.fromLeft);
            /* final alignment check against the flower's real position (it may have shifted): one small correction, horizontal only */
            if (Math.abs(st.x - c.x) > 3 && c.realign++ < 2){ c.pose = st.pose; c.el.style.setProperty('--er', st.pose.deg.toFixed(1) + 'deg'); return deerWalk(c, t, st.x); }
            c.state = 'eating'; c.el.classList.add('eating'); c.stops++;
            /* the flower in front of the nose, plus any others growing at the very same spot (other rows): nothing behind the head is touched */
            c.prey = livePlants(c).filter(p => p === t || Math.abs(headOf(p).x - hd.x) <= 14);
            c.prey.forEach(p => { p.deerSeen = c; p.targeted = true; p.el.classList.add('nibbled'); });
            if (!reduce) c.shed = setInterval(() => c.prey.forEach(p => { if (p.state !== 'gone' && Math.random() < 0.45) shedPetals(p, 1); }), 260);
            c.timer = setTimeout(() => {
                clearInterval(c.shed);
                /* the flower it walked to is always eaten; a neighbour at the same spot is now and then spared */
                c.prey.forEach(p => { if (p.state === 'gone') return; if (p === t || Math.random() < 0.92){ removePlant(p, 'eaten'); c.ate++; } else { p.targeted = false; p.el.classList.remove('nibbled'); } });
                c.prey = []; c.target = null;
                if (c.state === 'eating') c.timer = setTimeout(() => deerNext(c), 200);
            }, 1150);
            updateHud();
        }
        function hitDeer(c){
            if (c.state === 'leaving') return;
            c.hp--;
            c.el.classList.remove('startled'); void c.el.offsetWidth; c.el.classList.add('startled');
            if (c.hp <= 0) return deerGone(c, true);
            shooFx(c, c.hp === 1 ? 'one more!' : 'shoo!');
            updateHud();
        }
        function deerGone(c, scared){
            if (c.state === 'leaving') return;
            c.state = 'leaving'; clearTimeout(c.timer); clearInterval(c.shed); clearInterval(c.watch); if (c.target){ c.target.targeted = false; c.target = null; } c.el.classList.remove('eating', 'sniff');
            c.prey.forEach(p => { if (p.state !== 'gone'){ p.targeted = false; p.el.classList.remove('nibbled'); } }); c.prey = [];
            if (deer === c) deer = null; bed.classList.remove('deer-alert');
            S.deer++; deerAt = play + Math.round(rand(45, 60));
            if (scared){ S.shooed++; award('deer'); shooFx(c, 'off you go!'); }
            if (c.ate >= Math.max(4, c.startN * 0.3)){ regrowing = true; fullReached = false; }
            const pl = n => n + ' plant' + (n === 1 ? '' : 's');
            flash(scared ? (c.ate ? `you chased off the deer — it only got ${pl(c.ate)} ${FLI}` : `you chased off the deer before it took a bite ${FLI}`) : (c.ate ? `the deer ate ${pl(c.ate)} and wandered off — ${act} the soil to replant` : `the deer sniffed around and wandered off ${FLI}`), 5200);
            /* walk (or bolt) out the far side; on phones it stays inside the bed and fades away at the edge */
            const W = bed.clientWidth, inside = narrowBed(), fwd = c.fromLeft;
            const out = inside ? (fwd ? W - c.w - 2 : 2) : (fwd ? W + 30 : -c.w - 30);
            const run = () => {
                if (!c.el.isConnected) return; c.el.classList.remove('startled');
                go(c, out, c.y, scared ? deerSpeed() * 3.6 : deerSpeed() * 1.15, 0, () => {
                    if (!inside) return dropCritter(c);
                    c.el.classList.add('faded'); setTimeout(() => dropCritter(c), 650);
                });
                c.el.classList.toggle('left-facing', !fwd);
            };
            if (c.tok) c.tok.stop = true;
            if (reduce || !scared) run(); else setTimeout(run, 380);
            save(); updateHud();
        }

        /* --- weather: a little sun and a rain cloud take turns --- */
        const CLOUD_SVG = window.__cloudSVG = '<svg viewBox="0 0 110 62" aria-hidden="true"><path class="cl-body" d="M26 54 C12 54 7 41 17 35 C13 22 28 13 39 19 C44 7 65 4 73 17 C84 11 99 19 96 32 C107 35 105 54 91 54 Z"/><circle cx="46" cy="36" r="2.3" fill="#5a4366"/><circle cx="64" cy="36" r="2.3" fill="#5a4366"/><path d="M51 42 Q55 45.5 59 42" stroke="#5a4366" stroke-width="1.6" fill="none" stroke-linecap="round"/><ellipse cx="40" cy="41" rx="3.4" ry="2.2" fill="#f9c6d6"/><ellipse cx="70" cy="41" rx="3.4" ry="2.2" fill="#f9c6d6"/><g class="cl-still" fill="#8cc4e6"><rect x="30" y="62" width="2.4" height="8" rx="1.2"/><rect x="46" y="66" width="2.4" height="10" rx="1.2"/><rect x="62" y="63" width="2.4" height="8" rx="1.2"/><rect x="78" y="67" width="2.4" height="10" rx="1.2"/></g></svg>';
        function setSunny(on){ bed.classList.toggle('sunny', !!on); }
        function rainDrop(x, y, ground, W){
            if (reduce || x < 2 || x > W - 2) return;
            const len = rand(7, 13), el = fxEl('raindrop', x, y, `height:${f1(len)}px;width:${f1(len > 10 ? 2.6 : 2.2)}px`);
            const dist = ground - y - rand(0, 26), dx = -dist * 0.06, op = rand(0.6, 0.92);
            el.animate([{ transform: 'translate(0,0) rotate(3deg)', opacity: 0 }, { opacity: op, offset: 0.15 }, { transform: `translate(${f1(dx)}px,${f1(dist)}px) rotate(3deg)`, opacity: op * 0.8 }], { duration: dist / rand(230, 340) * 1000, easing: 'cubic-bezier(0.4, 0, 1, 1)' }).onfinish = () => {
                el.remove();
                if (Math.random() < 0.35) fx('splash', x + dx, y + dist + len, [{ transform: 'translate(-50%,-50%) scale(.3)', opacity: 0.8 }, { transform: 'translate(-50%,-50%) scale(1.3)', opacity: 0 }], 360);
            };
        }
        function spawnCloud(){
            setSunny(false);
            const W = bed.clientWidth, el = document.createElement('div');
            el.className = 'g-cloud'; el.innerHTML = CLOUD_SVG; el.setAttribute('role', 'button'); el.setAttribute('tabindex', '0'); el.setAttribute('aria-label', 'Make it rain');
            bed.appendChild(el);
            const cw = el.offsetWidth || 110, ch = el.offsetHeight || 62;
            /* the cloud's whole path is inside the bed, so it is never cut off; it fades in and out at the ends */
            const ltr = Math.random() < 0.5, x0 = ltr ? 6 : W - cw - 6, x1 = ltr ? W - cw - 6 : 6;
            const c = { el, x: x0, raining: Math.random() < 0.3, revived: 0, tok: null };
            cloud = c; if (c.raining) el.classList.add('raining');
            const makeRain = e => {
                if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
                e.stopPropagation(); e.preventDefault();
                if (!c.raining){ c.raining = true; el.classList.add('raining'); award('rain'); flash('you made it rain ' + FLI, 2200); }
            };
            el.addEventListener('click', makeRain); el.addEventListener('keydown', makeRain);
            let lastDrop = 0, gap = 60, lastWater = 0;
            const ground = bed.clientHeight - 12;
            c.tok = tween(Math.max(13000, W * 15), t => {
                c.x = x0 + (x1 - x0) * t;
                const y = 9 + Math.sin(t * 14) * 3;
                el.style.transform = `translate(${f1(c.x)}px, ${f1(y)}px)`;
                el.style.opacity = Math.min(1, t / 0.07, (1 - t) / 0.07).toFixed(3);
                if (t < 0.04 || t > 0.96) return;
                const now = performance.now();
                /* always a gentle drizzle under the cloud; a click turns it into a proper shower that waters plants */
                if (now - lastDrop > gap){ lastDrop = now; gap = c.raining ? rand(30, 70) : rand(60, 115); rainDrop(c.x + rand(cw * 0.2, cw * 0.8), y + ch * 0.84, ground, W); }
                if (c.raining && now - lastWater > 400){
                    lastWater = now; const lo = c.x / W * 100, hi = (c.x + cw) / W * 100;
                    P.forEach(p => { if (p.state === 'gone' || p.x < lo || p.x > hi) return; if (p.state === 'thirsty'){ refresh(p); c.revived++; } else if (p.state === 'bloom') p.age = 0; });
                }
            }, () => {
                el.remove(); if (cloud === c) cloud = null; nextCloud = tick + Math.round(rand(35, 60));
                if (c.revived) flash(`the rain perked up ${c.revived} thirsty plant${c.revived > 1 ? 's' : ''} ${FLI}`, 2600);
                updateHud(); save();
            });
            updateHud();
        }
        function weatherTick(n){
            if (cloud) return;
            const sunny = bed.classList.contains('sunny');
            if (n >= 4 && tick >= nextCloud){ spawnCloud(); return; }
            if (sunny && tick >= sunUntil){ setSunny(false); nextSun = tick + Math.round(rand(25, 50)); }
            else if (!sunny && n >= 1 && tick >= nextSun){ setSunny(true); sunUntil = tick + Math.round(rand(18, 32)); if (n >= 8) flash('the sun came out — plants get thirsty a little faster', 2600); }
        }

        /* --- one heartbeat drives plant life, visitors, weather and the deer (only while the garden is on screen) --- */
        setInterval(() => {
            if (!inView || document.hidden || !started) return;
            tick++;
            const sunny = bed.classList.contains('sunny');
            P.forEach(p => {
                if (p.state === 'bloom' && !p.targeted){ p.age += sunny ? 1.6 : 1; if (p.age > p.life){ p.state = 'thirsty'; p.thirst = 0; p.el.classList.add('thirsty'); } }
                else if (p.state === 'thirsty' && !p.targeted){ if (++p.thirst > 60) removePlant(p, 'withered'); }
            });
            /* deer: one visit at a time, only during active play, only when there is something to eat */
            /* the deer's clock runs during play, and at half speed while someone is simply watching the garden */
            if (Date.now() - lastTouch < 90000 || tick % 2 === 0) play++;
            if (!deer && play >= deerAt && count() >= 2) spawnDeer();
            if (!reduce){
                const n = count();
                if (!deer){
                    const pests = C.filter(c => c.pest && c.state !== 'leaving').length, maxPests = n < 5 ? 0 : n < 14 ? 1 : n < 32 ? 2 : 3;
                    if (pests < maxPests && tick >= nextPest){ spawnPest(); nextPest = tick + Math.max(5, Math.round(rand(11, 17) - n * 0.12)); }
                }
                if (n >= 3 && !C.some(c => c.kind === 'flutter') && tick >= nextFriend){ spawnFlutter(); nextFriend = tick + Math.round(rand(14, 22)); }
                weatherTick(n);
            }
            updateHud();
        }, 1000);

        /* test hook, only when the page is opened with ?gardendebug */
        if (/[?&]gardendebug\b/.test(location.search)) window.__garden = {
            spawnDeer, spawnPest, touch: touched, play: () => ({ play, deerAt, lastTouch }), spawnCloud: () => { if (!cloud) spawnCloud(); }, sun: setSunny, reset: resetGame,
            thirsty: k => P.filter(p => p.state === 'bloom').slice(0, k).forEach(p => { p.age = p.life + 1; }),
            state: () => ({ count: count(), goal: GOAL, cap: CAP(), stage: bed.dataset.stage, stats: Object.assign({}, S), badges: [...badges], fullReached, regrowing, critters: C.map(c => c.kind + ':' + c.state), cloud: cloud && (cloud.raining ? 'raining' : 'cloud'), deer: deer && deer.state, sunny: bed.classList.contains('sunny'), rows: ['back', 'mid', 'front'].map(r => live().filter(p => p.row === r).length), saved: store.get() })
        };
    })();

