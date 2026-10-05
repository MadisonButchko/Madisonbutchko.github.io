/* js/environment/weather.js
   Purpose : the page's small rain cloud: rarely appears over a row of flowers; tap it for a gentle local shower (flowers bow and lift, sometimes a faint rainbow).
   Owns    : rainCloud() and its 5-minute cooldown; createGarden(ga): the garden bed's sun/rain cycle (spawnCloud, setSunny, weatherTick, CLOUD_SVG). (the cloud art is shared with the garden cloud through animals/art.js.)
   Uses    : plants.plants (FLI, tween: garden weather), core.utils ($, $$, rand, clamp, f1, reduce), core.scheduler (Life), core.safe-zones (inView, navBottom)
   Used by : legacy/200-little-world.js (heartbeat's rare roll, ?worlddebug hook).
   Mobile / reduced motion: nothing under prefers-reduced-motion (no cloud at all); the cloud is a click/Enter button, so touch works.
   Moved verbatim from legacy/200 (Migration Step 10c); behaviour, order and timing unchanged. */
MB.define('environment.weather', ['core.utils', 'core.scheduler', 'core.safe-zones', 'plants.plants', 'animals.art'], function (utils, scheduler, zones, plants, art) {
    'use strict';
    const CLOUD_SVG = art.CLOUD_SVG;
    const flowersSpin = () => MB.has('plants.flowers') ? MB.use('plants.flowers').Spin : null;   /* the turning-flower speed controller, once it exists */
    const { $, $$, rand, clamp, f1, reduce } = utils, { Life } = scheduler, { inView, navBottom } = zones;

    /* ------------------------------------------------------------------
       A small rain cloud, rarely, over a row of flowers. Tap it: a gentle,
       local shower, the flowers bow and lift; sometimes a faint rainbow.
       ------------------------------------------------------------------ */
    let lastCloud = -1e9;
    function rainCloud() {
        if (reduce || !CLOUD_SVG || performance.now() - lastCloud < 300000) return false;
        const row = [$('.g-row'), $('.h-row')].find(r => r && inView(r) && r.getBoundingClientRect().top > navBottom() + 60 && !r.classList.contains('compact'));
        if (!row || !Life.claim('cloud', 45000)) return false;
        lastCloud = performance.now();
        const sec = row.closest('section'), sr = sec.getBoundingClientRect(), rr = row.getBoundingClientRect();
        const cloud = document.createElement('div'); cloud.className = 'w-cloud'; cloud.innerHTML = CLOUD_SVG;
        cloud.setAttribute('role', 'button'); cloud.setAttribute('tabindex', '0'); cloud.setAttribute('aria-label', 'A small rain cloud. Press to make it rain');
        /* over one end of the row, never over the centred section title */
        const cx = (Math.random() < 0.5 ? rand(rr.left + 60, rr.left + rr.width * 0.3) : rand(rr.right - rr.width * 0.3, rr.right - 60)) - sr.left, top = rr.top - sr.top - 90;
        cloud.style.left = f1(cx - 55) + 'px'; cloud.style.top = f1(Math.max(10, top)) + 'px';
        sec.appendChild(cloud);
        requestAnimationFrame(() => cloud.classList.add('on'));
        let raining = false;
        const leave = () => { cloud.classList.remove('on'); cloud.classList.add('away'); setTimeout(() => { cloud.remove(); Life.release('cloud'); }, 1600); };
        const idle = setTimeout(() => { if (!raining) leave(); }, 30000);
        const rain = () => {
            if (raining) return; raining = true; clearTimeout(idle);
            const cr = cloud.getBoundingClientRect(), fall = Math.max(80, rr.bottom - cr.bottom - 30);
            const sheet = document.createElement('div'); sheet.className = 'w-rain'; sheet.style.height = f1(fall) + 'px';
            sheet.innerHTML = Array.from({ length: 14 }, (_, k) => '<i style="left:' + f1(8 + k * 6.2) + '%;--d:' + f1(rand(0, 0.9)) + 's;--s:' + f1(rand(0.7, 1)) + 's"></i>').join('');
            cloud.appendChild(sheet); cloud.classList.add('raining');
            const wet = $$('.g-cat, .h-spec', row).filter(c => { const r = c.getBoundingClientRect(); return r.right > cr.left - 20 && r.left < cr.right + 20; });
            wet.forEach(c => c.classList.add('w-rained'));
            /* dandelions and posies under the shower sway harder while it rains, and the posies perk up after */
            const under = el => { const r = el.getBoundingClientRect(); return r.width && r.right > cr.left - 30 && r.left < cr.right + 30 && r.top > cr.top && r.top < cr.bottom + fall + 40; };
            const swayers = $$('.v11-dand:not([hidden]), .page-posy', sec).filter(under);
            swayers.forEach(el => { if (flowersSpin()) (el.classList.contains('page-posy') ? $$('.pp-stem', el) : [el]).forEach(x => flowersSpin().set(x, true, 6200)); });
            setTimeout(() => swayers.forEach(el => { if (el.classList.contains('page-posy')) { el.classList.remove('boing'); void el.offsetWidth; el.classList.add('boing'); } }), 6700);
            setTimeout(() => {
                sheet.classList.add('stop'); cloud.classList.remove('raining');
                wet.forEach(c => { c.classList.remove('w-rained'); c.classList.add('w-refreshed'); setTimeout(() => c.classList.remove('w-refreshed'), 1500); });
                setTimeout(() => { sheet.remove(); leave(); }, 900);
                if (Math.random() < 0.4) {
                    const bow = document.createElement('div'); bow.className = 'w-rainbow'; bow.setAttribute('aria-hidden', 'true');
                    const w = Math.min(320, rr.width * 0.5);
                    bow.style.width = f1(w) + 'px'; bow.style.height = f1(w / 2) + 'px';
                    bow.style.left = f1(clamp(cx - w / 2 + rand(-60, 60), 0, sr.width - w)) + 'px'; bow.style.top = f1(Math.max(0, rr.top - sr.top - w / 2 + 30)) + 'px';
                    sec.insertBefore(bow, sec.firstChild); setTimeout(() => bow.remove(), 10000);
                }
            }, 6500);
        };
        cloud.addEventListener('click', rain);
        cloud.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); rain(); } });
        return true;
    }
    /* ---- the garden's own weather (Migration Step 14c, moved verbatim from legacy/140): a little sun and a rain cloud take turns inside the garden bed. It shares the cloud art (window.__cloudSVG) with the page rain cloud above. ---- */
    function createGarden(ga) {
        const { FLI, tween } = plants;
        /* --- weather: a little sun and a rain cloud take turns --- */
        function setSunny(on){ ga.bed.classList.toggle('sunny', !!on); }
        function rainDrop(x, y, ground, W){
            if (reduce || x < 2 || x > W - 2) return;
            const len = rand(7, 13), el = ga.fxEl('raindrop', x, y, `height:${f1(len)}px;width:${f1(len > 10 ? 2.6 : 2.2)}px`);
            const dist = ground - y - rand(0, 26), dx = -dist * 0.06, op = rand(0.6, 0.92);
            el.animate([{ transform: 'translate(0,0) rotate(3deg)', opacity: 0 }, { opacity: op, offset: 0.15 }, { transform: `translate(${f1(dx)}px,${f1(dist)}px) rotate(3deg)`, opacity: op * 0.8 }], { duration: dist / rand(230, 340) * 1000, easing: 'cubic-bezier(0.4, 0, 1, 1)' }).onfinish = () => {
                el.remove();
                if (Math.random() < 0.35) ga.fx('splash', x + dx, y + dist + len, [{ transform: 'translate(-50%,-50%) scale(.3)', opacity: 0.8 }, { transform: 'translate(-50%,-50%) scale(1.3)', opacity: 0 }], 360);
            };
        }
        function spawnCloud(){
            setSunny(false);
            const W = ga.bed.clientWidth, el = document.createElement('div');
            el.className = 'g-cloud'; el.innerHTML = CLOUD_SVG; el.setAttribute('role', 'button'); el.setAttribute('tabindex', '0'); el.setAttribute('aria-label', 'Make it rain');
            ga.bed.appendChild(el);
            const cw = el.offsetWidth || 110, ch = el.offsetHeight || 62;
            /* the cloud's whole path is inside the bed, so it is never cut off; it fades in and out at the ends */
            const ltr = Math.random() < 0.5, x0 = ltr ? 6 : W - cw - 6, x1 = ltr ? W - cw - 6 : 6;
            const c = { el, x: x0, y: 9, raining: Math.random() < 0.3, shower: false, busy: false, shown: false, revived: 0, tok: null, shTok: null };
            ga.cloud = c; if (c.raining) el.classList.add('raining');
            const W2 = W, ground = ga.bed.clientHeight - 12, bob = () => Math.asin(clamp((c.y - 9) / 3, -1, 1));
            let lastDrop = 0, gap = 60, lastWater = 0, ph = 0;
            /* one frame of the cloud's life: position, fade, drizzle, and (while raining) watering the plants underneath */
            const frame = (x, y, op, now, edge) => {
                c.x = x; c.y = y;
                el.style.transform = `translate(${f1(x)}px, ${f1(y)}px)`; el.style.opacity = op.toFixed(3);
                if (edge || (c.busy && !c.shower)) return;   /* no drizzle while a click cycle is flashing, drifting off or showing the rainbow */
                /* always a gentle drizzle under the cloud; while it is raining it becomes a proper shower that waters plants */
                if (now - lastDrop > gap){ lastDrop = now; gap = c.shower ? rand(45, 90) : c.raining ? rand(30, 70) : rand(60, 115); rainDrop(x + rand(cw * 0.2, cw * 0.8), y + ch * 0.84, ground, W2); }
                if (c.raining && now - lastWater > 400){
                    lastWater = now; const lo = x / W2 * 100, hi = (x + cw) / W2 * 100;
                    ga.P.forEach(p => { if (p.state === 'gone' || p.x < lo || p.x > hi) return; if (p.state === 'thirsty'){ ga.refresh(p); c.revived++; } else if (p.state === 'bloom') p.age = 0; });
                }
            };
            /* the drift across the bed; resumed after every shower from wherever the cloud stopped */
            const drift = (xa, dur, fadeIn) => {
                c.tok = tween(dur, t => {
                    const edge = fadeIn ? (t < 0.04 || t > 0.96) : t > 0.96;
                    frame(xa + (x1 - xa) * t, 9 + Math.sin(t * 14 + ph) * 3, Math.min(fadeIn ? t / 0.07 : 1, (1 - t) / 0.07), performance.now(), edge);
                }, () => {
                    el.remove(); if (ga.cloud === c) ga.cloud = null; ga.nextCloud = ga.tick + Math.round(rand(35, 60));
                    if (c.revived) ga.flash(`the rain perked up ${c.revived} thirsty plant${c.revived > 1 ? 's' : ''} ${FLI}`, 2600);
                    ga.updateHud(); ga.save();
                });
            };
            /* plants under the cloud lift and open a little; some leaves and petals sparkle, and a few keep a droplet for a while */
            const refreshArea = () => {
                const lo = (c.x - cw * 0.5) / W * 100, hi = (c.x + cw * 1.5) / W * 100;
                ga.P.forEach(p => {
                    if (p.state === 'gone' || p.x < lo || p.x > hi || !p.el.isConnected) return;
                    const hd = ga.headOf(p);
                    if (p.flower && p.state !== 'grow' && !p.el.classList.contains('g-perk')){ p.el.classList.add('g-perk'); setTimeout(() => p.el.classList.remove('g-perk'), 2800); }
                    if (Math.random() < 0.55) ga.sparkles(hd.x, hd.y + rand(2, Math.max(8, p.H * 0.55)), 1 + (Math.random() < 0.4 ? 1 : 0));
                    if (Math.random() < 0.4){ const d = ga.fxEl('g-dew', hd.x + rand(-9, 9), hd.y + rand(4, Math.max(10, p.H * 0.5))); setTimeout(() => d.remove(), 6300); }
                });
            };
            /* a soft, pale arch behind the plants that fades in and out (see .g-rainbow) */
            const rainbow = done => {
                const w = Math.min(W * 0.8, 520), bow = document.createElement('div');
                bow.className = 'g-rainbow'; bow.setAttribute('aria-hidden', 'true');
                bow.style.width = f1(w) + 'px'; bow.style.height = f1(w / 2) + 'px'; bow.style.left = f1(clamp(c.x + cw / 2 - w / 2, 0, W - w)) + 'px';
                ga.bed.insertBefore(bow, ga.bed.firstChild);
                setTimeout(() => { bow.remove(); done(); }, 7600);
            };
            /* click -> soft flash -> gentle rain -> plants perk up -> rain stops -> rainbow -> everything fades. c.busy keeps cycles from overlapping. */
            const makeRain = e => {
                if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
                e.stopPropagation(); e.preventDefault();
                if (c.busy) return; c.busy = true;
                const first = !c.shown; c.shown = true;
                if (c.tok) c.tok.stop = true;
                ph = bob();
                el.classList.remove('g-flash'); void el.offsetWidth; el.classList.add('g-flash');
                ga.award('rain'); if (first) ga.flash('you made it rain ' + FLI, 2200);
                const x0s = c.x, y0 = c.y, DUR = 5800; let perked = 0, started = false;
                const shower = tween(DUR, t => {
                    const now = performance.now();
                    if (!started && t > 0.1){ started = true; c.shower = true; c.raining = true; el.classList.add('raining'); }
                    if (perked === 0 && t > 0.3){ perked = 1; refreshArea(); }
                    if (perked === 1 && t > 0.6){ perked = 2; refreshArea(); }
                    if (t >= 0.9 && c.raining){ c.raining = false; c.shower = false; el.classList.remove('raining'); }
                    frame(x0s, y0 + Math.sin(t * 6) * 1.5, 1, now, t >= 0.9);
                }, () => {
                    c.raining = false; c.shower = false; el.classList.remove('raining');
                    rainbow(() => { c.busy = false; });
                    const left = Math.abs(x1 - c.x), full = Math.abs(x1 - x0) || 1;
                    drift(c.x, Math.max(4000, Math.max(13000, W * 15) * left / full), false);
                });
                c.shTok = shower;
            };
            el.addEventListener('click', makeRain); el.addEventListener('keydown', makeRain);
            drift(x0, Math.max(13000, W * 15), true);
            ga.updateHud();
        }
        function weatherTick(n){
            if (ga.cloud) return;
            const sunny = ga.bed.classList.contains('sunny');
            if (n >= 4 && ga.tick >= ga.nextCloud){ spawnCloud(); return; }
            if (sunny && ga.tick >= ga.sunUntil){ setSunny(false); ga.nextSun = ga.tick + Math.round(rand(25, 50)); }
            else if (!sunny && n >= 1 && ga.tick >= ga.nextSun){ setSunny(true); ga.sunUntil = ga.tick + Math.round(rand(18, 32)); if (n >= 8) ga.flash('the sun came out — plants get thirsty a little faster', 2600); }
        }
        Object.assign(ga, { setSunny, spawnCloud, weatherTick });
    }

    return { rainCloud, createGarden };
});
