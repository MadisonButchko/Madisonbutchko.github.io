/* js/plants/vine-sprigs.js
   Purpose : click-grown sprigs on the side vines: slots along the vine path, sprig drawing and growth stages, "click (or tap) the vine to grow it", the hint tip, the click strips, pollen puffs for clicks it cannot grow from, eaten/wilted sprigs.
   Owns    : VINE, GROWN (slot index -> sprig spec, survives re-layout), buildSlots, renderSprig/updateSprig, fadeSprout, growVine (limit 24 / 14 on phones), start() (strips, tip, phone hint).
   Hooks   : registers into plants.vines (onLayout: buildSlots; onRender: update sprigs) instead of the old window.__onVineLayout / window.__vineSprigs globals.
   Uses    : core.utils (rand, reduce), core.state (GardenLog), plants.vines, plants.plants (NS, hoverable, FLI, BLOOMS).
   Used by : legacy/140 calls start() (only when motion is allowed) at the spot the block ran; animals/birds.js and animals/vine-caterpillar.js use VINE, vineShown, fadeSprout.
   Mobile / reduced motion: unchanged: taps grow the vine on phones (slimmer vine, 14 blooms, brief hint once), nothing at all under reduced motion.
   Moved verbatim from legacy/140 (Migration Step 12d); only the hook plumbing changed. */
MB.define('plants.vine-sprigs', ['core.utils', 'core.state', 'plants.vines', 'plants.plants'], function (utils, state, vines, plants) {
    'use strict';
    const { rand, reduce } = utils, GardenLog = state.GardenLog;
    const { NS, hoverable, FLI, BLOOMS } = plants;

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
            updateSprig(s.sp, vines.vineQ(v.side), performance.now());   /* painted at its true growth before the next frame: no blink */
        }
        /* a sprig's three stages (stem, leaf, bloom) follow the vine's visible growth at its own slot, and a
           short clock for the moment a level was earned. Whichever is behind wins, so a new bloom still
           opens bud -> stem -> petals, and a bloom can never outrun the vine carrying it. */
        function updateSprig(sp, q, now){
            const { range, clamp01 } = vines.gm; let anim = false;
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
        const sprigsRender = (side, q, now) => {
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
        function extendVine(v, side, d){ vines.bonus(side, d); }
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

        function start(){
            vines.onRender(sprigsRender); vines.onLayout(buildSlots);   /* hooks into the vine growth system (were window.__vineSprigs / __onVineLayout) */
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
            vines.update();   /* size the click strips to the drawn vine right away */
            /* phones have no hover, so show the hint once, next to the vine, a few seconds in */
            /* (the vine stays hidden until the visitor scrolls past the hero, so wait until there is a vine to tap) */
            if (!hoverable) (function hint(tries){ setTimeout(() => {
                if (vineClicks || !VINE.left) return;
                const hit = document.querySelector('.vine-hit.left');
                if (!hit || hit.style.display === 'none' || (hit._h || 0) < innerHeight * 0.5){ if (tries < 12) hint(tries + 1); return; }
                tip.innerHTML = TIP; tip.style.transform = `translate(24px, ${Math.round(innerHeight - 70)}px)`; tip.classList.add('show');
                setTimeout(() => tip.classList.remove('show'), 3800);
            }, 6000); })(0);
        }

        return { VINE, GROWN, vineShown, fadeSprout, start };
});
