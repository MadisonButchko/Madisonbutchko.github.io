/* js/environment/weather.js
   Purpose : the page's small rain cloud: rarely appears over a row of flowers; tap it for a gentle local shower (flowers bow and lift, sometimes a faint rainbow).
   Owns    : rainCloud() and its 5-minute cooldown. (`window.__cloudSVG`, shared with the garden cloud, stays where it is: debt.)
   Uses    : core.utils ($, $$, rand, clamp, f1, reduce), core.scheduler (Life), core.safe-zones (inView, navBottom); reads window.__cloudSVG and window.__spin at call time.
   Used by : legacy/200-little-world.js (heartbeat's rare roll, ?worlddebug hook).
   Mobile / reduced motion: nothing under prefers-reduced-motion (no cloud at all); the cloud is a click/Enter button, so touch works.
   Moved verbatim from legacy/200 (Migration Step 10c); behaviour, order and timing unchanged. */
MB.define('environment.weather', ['core.utils', 'core.scheduler', 'core.safe-zones'], function (utils, scheduler, zones) {
    'use strict';
    const { $, $$, rand, clamp, f1, reduce } = utils, { Life } = scheduler, { inView, navBottom } = zones;

    /* ------------------------------------------------------------------
       A small rain cloud, rarely, over a row of flowers. Tap it: a gentle,
       local shower, the flowers bow and lift; sometimes a faint rainbow.
       ------------------------------------------------------------------ */
    let lastCloud = -1e9;
    function rainCloud() {
        if (reduce || !window.__cloudSVG || performance.now() - lastCloud < 300000) return false;
        const row = [$('.g-row'), $('.h-row')].find(r => r && inView(r) && r.getBoundingClientRect().top > navBottom() + 60 && !r.classList.contains('compact'));
        if (!row || !Life.claim('cloud', 45000)) return false;
        lastCloud = performance.now();
        const sec = row.closest('section'), sr = sec.getBoundingClientRect(), rr = row.getBoundingClientRect();
        const cloud = document.createElement('div'); cloud.className = 'w-cloud'; cloud.innerHTML = window.__cloudSVG;
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
            swayers.forEach(el => { if (window.__spin) (el.classList.contains('page-posy') ? $$('.pp-stem', el) : [el]).forEach(x => window.__spin.set(x, true, 6200)); });
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
    return { rainCloud };
});
