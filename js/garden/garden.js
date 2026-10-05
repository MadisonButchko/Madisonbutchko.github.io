/* js/garden/garden.js
   Purpose : the footer garden game's core: the bed's DOM, saved state (localStorage "mb-garden-v1": plants, stats, badges, full/regrowing), planting and watering, plant life (growth, thirst, withering), input (click/tap/Enter, "start over" two-step wipe, cursor breeze), the starter patch, the one-second heartbeat that drives plants, visitors, weather and the deer (only while on screen), and the ?gardendebug hook window.__garden.
   Owns    : the garden-facing API object `ga` (state S, badges, P/C lists, deer, cloud, play, tick ... and the functions modules call on each other); everything not in the modules below.
   Uses    : garden.species (drawing), garden.hud (badges, HUD), garden.critters (pests, butterfly), animals.deer, environment.weather (garden sun/rain), core.utils, plants.plants.
   Used by : legacy/140-side-vines-and-garden.js calls start() at the spot the garden used to run.
   Mobile / reduced motion: unchanged (starter patch 6 vs 10, narrow-bed rules in the deer, no pests/butterflies/weather under reduced motion, tab hidden pauses the heartbeat).
   Moved verbatim from legacy/140 (Migration Step 14); only shared-state access was rewritten to go through `ga`; behaviour, order and timing unchanged. */
MB.define('garden.garden', ['core.utils', 'plants.plants', 'garden.species', 'garden.hud', 'garden.critters', 'animals.deer', 'environment.weather'], function (utils, plants, species, Hud, Critters, Deer, Weather) {
    'use strict';
    const { rand, pick, reduce } = utils;
    const { hoverable, act, FLI } = plants;
    const { FLOWER_TYPES, ROWS, pickType, plantMarkup } = species;

    function start() {
        const footer = document.querySelector('footer'); if (!footer) return;
        const ga = {};   /* the garden-facing API: shared state and the functions the garden's modules call on each other */
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

        /* --- game state: one place, so loading, saving and "start over" all touch the same things --- */
        const KEY = 'mb-garden-v1';
        const store = {
            get(){ try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch (e){ return null; } },
            set(v){ try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e){} },
            clear(){ try { localStorage.removeItem(KEY); } catch (e){} }
        };
        const freshStats = () => ({ planted: 0, shooed: 0, watered: 0, rare: 0, lost: 0, deer: 0 });
        const P = [], C = [];
        Object.assign(ga, { S: freshStats(), badges: new Set(), fullReached: false, regrowing: false });
        let gen = 0; Object.assign(ga, { tick: 0, inView: false, started: false, restoring: false });
        let saveT = 0; Object.assign(ga, { flashMsg: '', flashT: 0 });
        Object.assign(ga, { cloud: null, deer: null });
        /* "active play" = garden on screen and you interacted with it in the last 90s */
        let lastTouch = 0; Object.assign(ga, { play: 0, deerAt: Math.round(rand(8, 14)) });
        const touched = () => { lastTouch = Date.now(); };
        let nextPest = 9, nextFriend = 7; Object.assign(ga, { nextCloud: 25, nextSun: 6, sunUntil: 0 });

        function loadState(){
            const s = store.get(); if (!s || typeof s !== 'object') return null;
            ga.S = Object.assign(freshStats(), s.stats || {});
            ga.badges = new Set((s.badges || []).filter(k => ga.BADGES[k]));
            ga.fullReached = !!s.full; ga.regrowing = !!s.regrowing;
            return s;
        }
        function snapshot(){
            return { v: 2, plants: P.filter(p => p.state !== 'gone').map(p => ({ x: +p.x.toFixed(2), row: p.row, inner: p.inner, H: +p.H.toFixed(1), h: +p.h.toFixed(1), flower: p.flower, rare: p.rare, color: p.color })),
                stats: ga.S, badges: [...ga.badges], full: ga.fullReached, regrowing: ga.regrowing };
        }
        function save(){ clearTimeout(saveT); saveT = setTimeout(flushSave, 600); }
        function flushSave(){ clearTimeout(saveT); saveT = 0; if (ga.started) store.set(snapshot()); }
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
                if (!reduce && p.flower && ga.inView && !opts.preset){ const hd = headOf(p); fx('bloom-ring' + (rare ? ' rare-ring' : ''), hd.x, hd.y + 12, [{ opacity: 1 }, { opacity: 1 }], 950); }
            }, delay * 1000 + 1500);
            if (rare && !opts.preset){ ga.S.rare++; ga.award('rare'); ga.flash(`a rare starbloom sprouted — it shimmers through every color ${FLI}`, 3600); }
            if (!opts.quiet) ga.updateHud();
            save();
            return p;
        }
        /* how: 'eaten' | 'withered' (both count as lost and visibly drop the count right away) */
        function removePlant(p, how){
            if (p.state === 'gone') return;
            if (how === 'eaten') shedPetals(p, p.flower ? 9 : 4);
            minusPop(p);
            p.state = 'gone'; p.targeted = false; ga.S.lost++;
            p.el.classList.remove('thirsty', 'nibbled', 'saved'); p.el.classList.add(how);
            setTimeout(() => { p.el.remove(); const i = P.indexOf(p); if (i > -1) P.splice(i, 1); }, how === 'eaten' ? 1100 : 1550);
            ga.updateHud(); save();
        }
        function refresh(p){ p.state = 'bloom'; p.age = 0; p.thirst = 0; p.life = lifeSpan(p.flower); p.el.classList.remove('thirsty'); }
        function water(p){
            refresh(p); ga.S.watered++;
            if (!reduce){ const hd = headOf(p); for (let k = 0; k < 6; k++){ const ox = rand(-14, 14); fx('drop', hd.x + ox, hd.y - 26, [{ transform: 'translate(0,0)', opacity: 0 }, { transform: 'translate(0,8px)', opacity: 1, offset: 0.3 }, { transform: 'translate(0,34px)', opacity: 0 }], rand(600, 850), k * 60); } }
            ga.flash('watered — it perked right back up ' + FLI, 2200); save();
        }

        /* the garden's modules get the API (state + functions) and add their own exports to it */
        Object.assign(ga, { C, GOAL, P, bed, count, fx, fxEl, headOf, meter, nameOf, plant, refresh, removePlant, save, setHTML, shedPetals, shelf, sparkles, stageOf, stats, statsMore, tip, toast, touched, txt });
        Hud.create(ga); Critters.create(ga); Deer.create(ga); Weather.createGarden(ga);

        /* --- input --- */
        bed.addEventListener('click', e => {
            touched();
            const pe = e.target.closest('.g-plant.thirsty');
            if (pe){ const p = P.find(q => q.el === pe); if (p && p.state === 'thirsty') return water(p); }
            const r = bed.getBoundingClientRect(), cx = ((e.clientX - r.left) / r.width) * 100; let got = 0;
            [[0, 0], [-rand(2, 4), 0.14], [rand(2, 4), 0.26], [rand(-7, 7), 0.4]].forEach(([dx, d]) => { if (plant(cx + dx, reduce ? 0 : d, null, { quiet: true })) got++; });
            if (got){ sparkles(e.clientX - r.left, e.clientY - r.top, 6); ga.S.planted += got; ga.updateHud(); save(); }
            else ga.flash('this patch is packed — try a barer spot', 2000);
        });
        bed.addEventListener('keydown', e => {
            if (e.target !== bed || (e.key !== 'Enter' && e.key !== ' ')) return; e.preventDefault(); touched();
            const t = P.find(p => p.state === 'thirsty'); if (t) return water(t);
            let got = 0; for (let k = 0; k < 3; k++) if (plant(rand(5, 95), reduce ? 0 : k * 0.15, null, { quiet: true })) got++;
            if (got){ ga.S.planted += got; ga.updateHud(); save(); }
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
            ga.S = freshStats(); ga.badges = new Set(); ga.fullReached = false; ga.regrowing = false;
            C.slice().forEach(ga.dropCritter); ga.deer = null; bed.classList.remove('deer-alert');
            if (ga.cloud){ if (ga.cloud.tok) ga.cloud.tok.stop = true; if (ga.cloud.shTok) ga.cloud.shTok.stop = true; ga.cloud.el.remove(); ga.cloud = null; }
            ga.setSunny(false);
            bed.querySelectorAll('.g-fx, .g-sparkle, .g-rainbow, .shoo-pop').forEach(el => el.remove());
            ga.toastQ.length = 0; clearTimeout(ga.toastT); ga.toasting = false; toast.classList.remove('show');
            clearTimeout(ga.flashT); ga.flashMsg = '';
            ga.tick = 0; nextPest = 9; nextFriend = 7; ga.nextCloud = 25; ga.nextSun = 6; ga.sunUntil = 0; ga.play = 0; lastTouch = 0; ga.deerAt = Math.round(rand(20, 30));
            ga.started = true; bed.classList.add('grown');
            store.clear(); flushSave();
            ga.flash(`fresh soil ${FLI} a brand-new garden — ${act} anywhere to plant`, 3600);
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
            ga.started = true; bed.classList.add('grown'); ga.restoring = true;
            if (initial){
                const keep = (initial.plants || []).filter(s => s && typeof s.inner === 'string' && isFinite(s.x) && isFinite(s.H));
                keep.forEach((s, i) => plant(s.x, reduce ? 0 : Math.min(i * 0.03, 1.4), null, { quiet: true, preset: s }));
                if (keep.length) ga.flash('welcome back — your garden is right where you left it ' + FLI, 3200);
            } else seedStarter();
            ga.restoring = false;
            if (count() >= GOAL) ga.fullReached = true;
            ga.updateHud();
        }
        new IntersectionObserver(es => es.forEach(e => {
            ga.inView = e.isIntersecting; bed.classList.toggle('awake', ga.inView);
            if (ga.inView && !ga.started) start();
        }), { threshold: 0.25 }).observe(bed);
        ga.updateHud();

        /* --- one heartbeat drives plant life, visitors, weather and the deer (only while the garden is on screen) --- */
        setInterval(() => {
            if (!ga.inView || document.hidden || !ga.started) return;
            ga.tick++;
            const sunny = bed.classList.contains('sunny');
            P.forEach(p => {
                if (p.state === 'bloom' && !p.targeted){ p.age += sunny ? 1.6 : 1; if (p.age > p.life){ p.state = 'thirsty'; p.thirst = 0; p.el.classList.add('thirsty'); } }
                else if (p.state === 'thirsty' && !p.targeted){ if (++p.thirst > 60) removePlant(p, 'withered'); }
            });
            /* deer: one visit at a time, only during active play, only when there is something to eat */
            /* the deer's clock runs during play, and at half speed while someone is simply watching the garden */
            if (Date.now() - lastTouch < 90000 || ga.tick % 2 === 0) ga.play++;
            if (!ga.deer && ga.play >= ga.deerAt && count() >= 2) ga.spawnDeer();
            if (!reduce){
                const n = count();
                if (!ga.deer){
                    const pests = C.filter(c => c.pest && c.state !== 'leaving').length, maxPests = n < 5 ? 0 : n < 14 ? 1 : n < 32 ? 2 : 3;
                    if (pests < maxPests && ga.tick >= nextPest){ ga.spawnPest(); nextPest = ga.tick + Math.max(5, Math.round(rand(11, 17) - n * 0.12)); }
                }
                if (n >= 3 && !C.some(c => c.kind === 'flutter') && ga.tick >= nextFriend){ ga.spawnFlutter(); nextFriend = ga.tick + Math.round(rand(14, 22)); }
                ga.weatherTick(n);
            }
            ga.updateHud();
        }, 1000);

        /* test hook, only when the page is opened with ?gardendebug */
        if (/[?&]gardendebug\b/.test(location.search)) window.__garden = {
            spawnDeer: ga.spawnDeer, spawnPest: ga.spawnPest, touch: touched, play: () => ({ play: ga.play, deerAt: ga.deerAt, lastTouch }), spawnCloud: () => { if (!ga.cloud) ga.spawnCloud(); }, sun: ga.setSunny, reset: resetGame,
            thirsty: k => P.filter(p => p.state === 'bloom').slice(0, k).forEach(p => { p.age = p.life + 1; }),
            state: () => ({ count: count(), goal: GOAL, cap: CAP(), stage: bed.dataset.stage, stats: Object.assign({}, ga.S), badges: [...ga.badges], fullReached: ga.fullReached, regrowing: ga.regrowing, critters: C.map(c => c.kind + ':' + c.state), cloud: ga.cloud && (ga.cloud.raining ? 'raining' : 'cloud'), deer: ga.deer && ga.deer.state, sunny: bed.classList.contains('sunny'), rows: ['back', 'mid', 'front'].map(r => live().filter(p => p.row === r).length), saved: store.get() })
        };
    }

    return { start };
});
