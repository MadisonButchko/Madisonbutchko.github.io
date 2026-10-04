/* js/animals/deer.js
   Purpose : the deer: a gentle but hungry visitor that walks into the garden bed, looks around, works across the plants nibbling them stop by stop, then leaves (three clicks/taps chase it off). Lifetime stats and badges survive a visit; the first visit comes after ~20-30 s of active play.
   Owns    : the deer art (SVG.deer), spawnDeer, deerPose/deerStop/deerNext/deerWalk/deerBite, hitDeer, deerGone, the narrow-bed rules (< 600 px: reach 30, speed 55, stays inside the bed and fades).
   Uses    : core.utils, plants.plants (act, FLI, SVG); the garden-facing API `ga` (bed, P, S, deer, deerAt, play, count, started, fullReached, regrowing, headOf, removePlant, shedPetals, flash, award, notice, save, updateHud) and the critter helpers (makeCritter, go, groundY, setPos, shooFx, dropCritter) through it.
   Used by : garden/garden.js (create, then ga.spawnDeer from the heartbeat).
   Mobile / reduced motion: unchanged; phones keep the whole path inside the bed.
   Moved verbatim from legacy/140-side-vines-and-garden.js (Migration Step 14; only shared-state access was rewritten to go through the garden-facing API object `ga`); behaviour, order and timing unchanged. */
MB.define('animals.deer', ['core.utils', 'plants.plants'], function (utils, plants) {
    'use strict';
    const { rand, reduce } = utils;
    const { act, FLI, SVG } = plants;

    function create(ga) {
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
        /* --- deer: a gentle but hungry visitor. It walks in, pauses to look around, then works across the bed
               stop by stop: walk to the next plants, lower its head, nibble, and those plants are gone (removed from
               the game state, so the count, stage and full-bloom progress all drop). Then it walks out so you can
               replant. Three clicks/taps chase it off early. Lifetime stats and badges survive a visit.
               Timing: first visit after ~20-30s of active play (needs plants to eat), then every ~45-60s. --- */
        const narrowBed = () => ga.bed.clientWidth < 600;
        const deerReach = () => narrowBed() ? 30 : 44;
        const deerSpeed = () => narrowBed() ? 55 : 72;
        const mouthX = c => c.fromLeft ? c.x + c.w * 0.945 : c.x + c.w * 0.055;
        function spawnDeer(){
            if (ga.deer || !ga.started || !ga.count()) return;
            const c = ga.makeCritter('deer'), W = ga.bed.clientWidth; ga.deer = c;
            c.hp = 3; c.ate = 0; c.stops = 0; c.prey = []; c.startN = ga.count(); c.fromLeft = Math.random() < 0.5;
            c.y = ga.groundY(c);
            /* on phones the whole path stays inside the bed: it fades in at the edge instead of walking in from off-screen */
            const inside = narrowBed();
            c.x = c.fromLeft ? (inside ? 2 : -c.w - 10) : (inside ? W - c.w - 2 : W + 10);
            c.el.classList.toggle('left-facing', !c.fromLeft);
            if (inside){ c.el.classList.add('faded'); requestAnimationFrame(() => requestAnimationFrame(() => c.el.classList.remove('faded'))); }
            ga.setPos(c);
            ga.bed.classList.add('deer-alert');
            ga.notice(`<span class="g-badge">${FLI}</span><span>a little visitor is here</span>`);
            const inX = c.fromLeft ? Math.min(W * 0.06, W - c.w) : Math.max(0, W * 0.94 - c.w);
            ga.go(c, inside ? c.x : inX, c.y, deerSpeed(), 0, () => {
                if (c.state !== 'coming') return;
                c.state = 'eyeing'; c.el.classList.add('sniff'); ga.updateHud();
                c.timer = setTimeout(() => deerNext(c), reduce ? 1200 : 1800);
            });
            ga.updateHud();
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
        const livePlants = c => ga.P.filter(p => p.state !== 'gone' && p.el.isConnected && p.deerSeen !== c);
        /* pick the next flower: nearest one still ahead of the muzzle, otherwise turn round for the nearest remaining one */
        function deerNext(c){
            if (c.state === 'leaving' || !c.el.isConnected) return;
            clearInterval(c.watch); c.el.classList.remove('sniff', 'eating'); c.state = 'grazing';
            if (c.target){ c.target.targeted = false; c.target = null; }
            const W = ga.bed.clientWidth, dir = c.fromLeft ? 1 : -1, m = mouthX(c);
            const cand = livePlants(c).map(p => ({ p, hd: ga.headOf(p) }));
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
            ga.updateHud();
        }
        /* walk to the stopping spot; if the flower disappears on the way (eaten by someone else, withered), pick again */
        function deerWalk(c, t, nx){
            clearInterval(c.watch);
            if (Math.abs(nx - c.x) < 1){ c.el.classList.toggle('left-facing', !c.fromLeft); return deerBite(c, t); }
            c.watch = setInterval(() => {
                if (t.state !== 'gone' && t.el.isConnected) return;
                clearInterval(c.watch); if (c.tok) c.tok.stop = true; c.el.classList.remove('moving'); t.targeted = false; deerNext(c);
            }, 120);
            ga.go(c, nx, c.y, deerSpeed(), 0, () => { clearInterval(c.watch); deerBite(c, t); });
            c.el.classList.toggle('left-facing', !c.fromLeft);
        }
        function deerBite(c, t){
            if (c.state === 'leaving') return;
            if (!t || t.state === 'gone' || !t.el.isConnected) return deerNext(c);   /* the flower vanished before we got there */
            const hd = ga.headOf(t), st = deerStop(c, hd, c.fromLeft);
            /* final alignment check against the flower's real position (it may have shifted): one small correction, horizontal only */
            if (Math.abs(st.x - c.x) > 3 && c.realign++ < 2){ c.pose = st.pose; c.el.style.setProperty('--er', st.pose.deg.toFixed(1) + 'deg'); return deerWalk(c, t, st.x); }
            c.state = 'eating'; c.el.classList.add('eating'); c.stops++;
            /* the flower in front of the nose, plus any others growing at the very same spot (other rows): nothing behind the head is touched */
            c.prey = livePlants(c).filter(p => p === t || Math.abs(ga.headOf(p).x - hd.x) <= 14);
            c.prey.forEach(p => { p.deerSeen = c; p.targeted = true; p.el.classList.add('nibbled'); });
            if (!reduce) c.shed = setInterval(() => c.prey.forEach(p => { if (p.state !== 'gone' && Math.random() < 0.45) ga.shedPetals(p, 1); }), 260);
            c.timer = setTimeout(() => {
                clearInterval(c.shed);
                /* the flower it walked to is always eaten; a neighbour at the same spot is now and then spared */
                c.prey.forEach(p => { if (p.state === 'gone') return; if (p === t || Math.random() < 0.92){ ga.removePlant(p, 'eaten'); c.ate++; } else { p.targeted = false; p.el.classList.remove('nibbled'); } });
                c.prey = []; c.target = null;
                if (c.state === 'eating') c.timer = setTimeout(() => deerNext(c), 200);
            }, 1150);
            ga.updateHud();
        }
        function hitDeer(c){
            if (c.state === 'leaving') return;
            c.hp--;
            c.el.classList.remove('startled'); void c.el.offsetWidth; c.el.classList.add('startled');
            if (c.hp <= 0) return deerGone(c, true);
            ga.shooFx(c, c.hp === 1 ? 'one more!' : 'shoo!');
            ga.updateHud();
        }
        function deerGone(c, scared){
            if (c.state === 'leaving') return;
            c.state = 'leaving'; clearTimeout(c.timer); clearInterval(c.shed); clearInterval(c.watch); if (c.target){ c.target.targeted = false; c.target = null; } c.el.classList.remove('eating', 'sniff');
            c.prey.forEach(p => { if (p.state !== 'gone'){ p.targeted = false; p.el.classList.remove('nibbled'); } }); c.prey = [];
            if (ga.deer === c) ga.deer = null; ga.bed.classList.remove('deer-alert');
            ga.S.deer++; ga.deerAt = ga.play + Math.round(rand(45, 60));
            if (scared){ ga.S.shooed++; ga.award('deer'); ga.shooFx(c, 'off you go!'); }
            if (c.ate >= Math.max(4, c.startN * 0.3)){ ga.regrowing = true; ga.fullReached = false; }
            const pl = n => n + ' plant' + (n === 1 ? '' : 's');
            ga.flash(scared ? (c.ate ? `you chased off the deer — it only got ${pl(c.ate)} ${FLI}` : `you chased off the deer before it took a bite ${FLI}`) : (c.ate ? `the deer ate ${pl(c.ate)} and wandered off — ${act} the soil to replant` : `the deer sniffed around and wandered off ${FLI}`), 5200);
            /* walk (or bolt) out the far side; on phones it stays inside the bed and fades away at the edge */
            const W = ga.bed.clientWidth, inside = narrowBed(), fwd = c.fromLeft;
            const out = inside ? (fwd ? W - c.w - 2 : 2) : (fwd ? W + 30 : -c.w - 30);
            const run = () => {
                if (!c.el.isConnected) return; c.el.classList.remove('startled');
                ga.go(c, out, c.y, scared ? deerSpeed() * 3.6 : deerSpeed() * 1.15, 0, () => {
                    if (!inside) return ga.dropCritter(c);
                    c.el.classList.add('faded'); setTimeout(() => ga.dropCritter(c), 650);
                });
                c.el.classList.toggle('left-facing', !fwd);
            };
            if (c.tok) c.tok.stop = true;
            if (reduce || !scared) run(); else setTimeout(run, 380);
            ga.save(); ga.updateHud();
        }
        Object.assign(ga, { hitDeer, spawnDeer });
    }

    return { create };
});
