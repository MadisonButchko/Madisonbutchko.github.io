/* js/plants/dandelions.js
   Purpose : the page's dandelions (fluffy clocks, half-blown ones, yellow flowers): tap or brush a clock and its seeds drift off on a shared breeze; a few land and bloom briefly.
   Owns    : the Dandelions controller (placement per section, wish text, shared seed-drift loop, regrow, landing flowers), the ?v11debug hook window.__dand.
   Uses    : core.utils ($, $$, rand), core.particles (FX), core.state (GardenLog); window.World (placeIn, contentRects, inView, onBeat, note) and, passed in by legacy/210 because they are still private there, `seeded` (the shared seeded PRNG: dandelion shapes depend on its sequence) and `REACT` (nod).
   Used by : legacy/210-v11-polish.js calls start() at the spot the block used to run.
   Mobile / reduced motion: unchanged: tap/keyboard release, mouse-only brush, no seeds or landing flowers under prefers-reduced-motion.
   Moved verbatim from legacy/210 (Migration Step 10a); behaviour, order and timing unchanged. */
MB.define('plants.dandelions', ['core.utils', 'core.particles', 'core.state'], function (utils, particles, state) {
    'use strict';
    const { $, $$, reduce, fine } = utils;
    const rnd = (a, b) => a + Math.random() * (b - a);
    const FX = particles.FX, GardenLog = state.GardenLog;

    function start(deps) {
        const { seeded, REACT } = deps;
    /* ------------------------------------------------------------------
       Dandelions, here and there down the page: fluffy clocks, half-blown
       ones and a few yellow flowers. Tap a clock and a few seeds let go;
       tap again and more do; brush or swipe across it and many go at once.
       The head loses the seeds that flew, then slowly replenishes its fluff.
       Seeds drift slowly, each on its own path, on a shared breeze; now and
       then one leaves on its own. A few land in clear spaces and bloom briefly.
       ------------------------------------------------------------------ */
    const Dandelions = (() => {
        const NSV = 'http://www.w3.org/2000/svg';
        const narrow = () => innerWidth < 700;
        const PLAN = [['home', 'puff'], ['about', 'yellow'], ['experience', 'partial'], ['skills', 'puff'], ['gallery', 'yellow'], ['contact', 'puff']];
        const list = [];
        const motion = matchMedia('(prefers-reduced-motion: reduce)');
        const MAX_AIR = 24, MAX_FLOWERS = 4, flowers = new Set();
        let pending = 0, wish = null, wishTimer = 0;
        const BLOCKERS = 'p,h1,h2,h3,h4,h5,h6,li,label,a,button,input,textarea,select,[tabindex],[role="button"],nav,header,footer,img,.gs-note,.gs-inner,.garden,.herbarium,[class*="card"],dialog,.lightbox,.gallery-modal,.gallery-frame,.contact-inner,.about-body,.collage,.mb-bouquet,.to-top,.wish-grown';
        const intersects = (a, b, pad = 10) => a.left < b.right + pad && a.right > b.left - pad && a.top < b.bottom + pad && a.bottom > b.top - pad;
        function obstacles(sec, ignore) {
            return World.contentRects(sec).concat($$(BLOCKERS).filter(e => e !== ignore && !ignore?.contains(e)).map(e => e.getBoundingClientRect())).filter(r => r.width && r.height);
        }
        function landingBox(spot) {
            const r = spot.sec.getBoundingClientRect();
            return { left: r.left + spot.left, right: r.left + spot.left + 32, top: r.top + spot.top, bottom: r.top + spot.top + 58 };
        }
        function safe(spot, blocks) {
            const r = landingBox(spot), sec = spot.sec.getBoundingClientRect();
            return r.left >= 8 && r.right <= innerWidth - 8 && r.top >= sec.top + 8 && r.bottom <= sec.bottom - 8 && !blocks.some(b => intersects(r, b));
        }
        function landing() {
            if (flowers.size + air.filter(p => p.target).length >= MAX_FLOWERS) return null;
            const top = Math.max(90, $('.m-header')?.getBoundingClientRect().bottom || 0);
            for (const sec of $$('main > section')) {
                const sr = sec.getBoundingClientRect(), lo = Math.max(top, sr.top + 12), hi = Math.min(innerHeight - 24, sr.bottom - 12) - 58;
                if (hi <= lo) continue;
                const blocks = obstacles(sec);
                for (let k = 0; k < 36; k++) {
                    const spot = { sec, left: rnd(Math.max(8, sr.left), Math.min(innerWidth - 40, sr.right - 40)) - sr.left, top: rnd(lo, hi) - sr.top };
                    if (safe(spot, blocks)) return spot;
                }
            }
            return null;
        }
        function grow(spot) {
            if (motion.matches || flowers.size >= MAX_FLOWERS || !safe(spot, obstacles(spot.sec))) return;
            const choices = [['fl-daisy', '#fffdf6'], ['fl-bloom', '#f4a7bf'], ['fl-daisy', '#f6d36b'], ['fl-bloom', '#b9a2de'], ['fl-forsythia', '#f2c230']];
            const [sym, color] = choices[Math.floor(Math.random() * choices.length)];
            const el = document.createElement('span'); el.className = 'wish-grown'; el.setAttribute('aria-hidden', 'true');
            el.style.left = spot.left + 'px'; el.style.top = spot.top + 'px';
            el.innerHTML = '<svg viewBox="0 0 32 58"><g class="wish-spark"><path d="M16 43v10M11 48h10M12 44l8 8M12 52l8-8" stroke="#d8b65b" stroke-width="1"/></g><g class="wish-sprout"><path d="M16 55C5 52 7 45 8 44C14 46 16 50 16 55M16 55C25 50 26 44 25 43C18 46 16 51 16 55" fill="#9fbe88"/></g><g class="wish-stem"><path d="M16 56Q12 38 16 18" fill="none" stroke="#8db36a" stroke-width="1.6" stroke-linecap="round"/><path d="M15 40Q25 38 24 30Q16 32 15 40" fill="#a7c48d"/></g><g class="wish-bloom" style="color:' + color + ';--center:#f2c230"><use href="#' + sym + '" x="3" y="3" width="26" height="26"/></g></svg>';
            spot.sec.appendChild(el); const entry = { el, spot }; flowers.add(entry);
            setTimeout(() => { if (!el.isConnected) return; el.classList.add('fading'); setTimeout(() => { el.remove(); flowers.delete(entry); }, 1500); }, 45000);
        }
        function validateFlowers() {
            for (const entry of flowers) if (!safe(entry.spot, obstacles(entry.spot.sec, entry.el))) { entry.el.remove(); flowers.delete(entry); }
        }
        let validation = 0;
        const validateSoon = () => { if (flowers.size && !validation) validation = setTimeout(() => { validation = 0; validateFlowers(); }, 100); };
        addEventListener('resize', () => { air.forEach(p => { p.target = null; }); validateSoon(); });
        addEventListener('scroll', validateSoon, { passive: true });
        document.addEventListener('click', validateSoon);
        const layoutObserver = new ResizeObserver(validateSoon);
        $$('main > section').forEach(sec => layoutObserver.observe(sec));
        new MutationObserver(validateSoon).observe(document.querySelector('main'), { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'aria-expanded'] });
        /* The wish can be offered again after a short quiet spell: one text at a time, then WISH_COOLDOWN before the next. */
        const WISH_COOLDOWN = 4000;
        let wishReadyAt = 0;
        const endWish = () => { clearTimeout(wishTimer); wish?.remove(); wish = null; wishReadyAt = performance.now() + WISH_COOLDOWN; };
        function makeWish(d) {
            // While the words are showing, taps leave them be so they can be read in full.
            if (wish) return;
            if (performance.now() < wishReadyAt) return;
            const r = d.el.getBoundingClientRect();
            wish = document.createElement('span'); wish.className = 'dandelion-wish'; wish.setAttribute('role', 'status'); wish.dataset.sec = d.sec; wish.innerHTML = '<span class="wish-words">make a wish</span>';
            wish.style.left = Math.max(8, Math.min(innerWidth - 156, r.left + r.width / 2 - 74)) + 'px';
            wish.style.top = Math.max(72, r.top - 34) + 'px';
            document.body.appendChild(wish);
            wishTimer = setTimeout(endWish, 4800);
        }
        function regrow(d) {
            if (d.regrowTimer) return;
            const replenish = () => {
                const seed = $('.wd-seed.gone', d.el);
                if (!seed) { d.regrowTimer = 0; return; }
                seed.classList.remove('gone'); d.el.classList.remove('bare');
                d.regrowTimer = setTimeout(replenish, 650);
            };
            d.regrowTimer = setTimeout(replenish, 18000);
        }
        /* one loop moves every loose seed; it only runs while seeds are in the air */
        const air = []; let raf = 0, last = 0;
        function fly(now) {
            const dt = Math.min(0.05, (now - last) / 1000); last = now;
            const wind = 12 + Math.sin(now / 2600) * 8 + Math.sin(now / 900) * 3;
            for (let i = air.length - 1; i >= 0; i--) {
                const p = air[i]; p.age += dt;
                p.vx += (p.dir * wind * p.catch - p.vx) * 0.35 * dt; p.vy += (p.sink - p.vy) * 0.18 * dt;
                p.x += (p.vx + Math.sin(p.age * p.wf + p.ph) * p.sway) * dt; p.y += (p.vy + Math.cos(p.age * p.wf * 0.7 + p.ph) * 4) * dt;
                if (p.target) {
                    const t = Math.min(1, p.age / p.life), ease = t * t * (3 - 2 * t), end = landingBox(p.target);
                    p.x = p.startX - scrollX + (end.left + 16 - (p.startX - scrollX)) * ease + Math.sin(t * Math.PI * 2) * 18;
                    p.y = p.startY - scrollY + (end.bottom - 5 - (p.startY - scrollY)) * ease - Math.sin(t * Math.PI) * 38;
                }
                const o = Math.min(1, p.age * 2.5, (p.life - p.age) / (p.target ? 0.5 : 1.8));
                p.d.style.transform = 'translate(' + p.x.toFixed(1) + 'px,' + p.y.toFixed(1) + 'px) rotate(' + (Math.sin(p.age * 1.9 + p.ph) * 28).toFixed(0) + 'deg)';
                p.d.style.opacity = Math.max(0, o).toFixed(2);
                if (p.age > p.life || p.x < -30 || p.x > innerWidth + 30 || p.y < -40 || p.y > innerHeight + 60) { if (p.target && p.age >= p.life) grow(p.target); p.d.remove(); air.splice(i, 1); FX.free(1); }
            }
            raf = air.length ? requestAnimationFrame(fly) : 0;
        }
        function launch(x, y, dir, strength, target = null) {
            if (motion.matches || document.hidden || air.length >= MAX_AIR || !FX.claim(1)) return false;
            const d = document.createElement('i'); d.className = 'w-fluff'; d.setAttribute('aria-hidden', 'true'); d.style.setProperty('--fluff-size', rnd(0.85, 1.2).toFixed(2)); document.body.appendChild(d);
            d.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)'; d.style.opacity = '0';
            air.push({ d, x, y, dir, target, startX: x + scrollX, startY: y + scrollY, age: 0, life: target ? rnd(4, 6) : rnd(7, 11), ph: rnd(0, 6.3), wf: rnd(1.2, 2.2), sway: rnd(6, 15), catch: rnd(0.55, 1.15),
                vx: dir * rnd(6, 16) * (0.6 + strength * 0.6), vy: rnd(-26, -8) * (0.7 + strength * 0.4), sink: rnd(2, 8) });
            if (!raf) { last = performance.now(); raf = requestAnimationFrame(fly); }
            return true;
        }
        function build(kind, i) {
            const el = document.createElement('div');
            el.className = 'w-dandelion w-piece v11-dand is-' + kind; el.setAttribute('tabindex', '0');
            el.dataset.sec = PLAN[i][0];
            const stemBend = (seeded() - 0.5) * 6, leafSide = seeded() < 0.5 ? -1 : 1;
            let h = '<svg viewBox="0 0 44 84" aria-hidden="true"><path d="M22 84 C' + (21 + stemBend).toFixed(1) + ' 66 ' + (24 - stemBend).toFixed(1) + ' 46 22 22" stroke="#8db36a" stroke-width="1.8" fill="none" stroke-linecap="round"/>'
                + '<path d="M22 70 C' + (22 - 8 * leafSide) + ' 66 ' + (22 - 12 * leafSide) + ' 58 ' + (22 - 13 * leafSide) + ' 52 C' + (22 - 6 * leafSide) + ' 56 ' + (22 - 2 * leafSide) + ' 62 22 70Z" fill="#9fbe88"/>';
            if (kind === 'yellow') {
                el.setAttribute('aria-label', 'A yellow dandelion');
                h += '<g class="wd-flower"><use href="#fl-daisy" x="9" y="8" width="26" height="26" style="color:#f6cf3a;--center:#e0a020"/><circle cx="22" cy="21" r="3.2" fill="#e8a91a"/></g>';
            } else {
                el.setAttribute('role', 'button'); el.setAttribute('aria-label', 'Make a wish: release a few dandelion seeds');
                const n = 42;
                h += '<g class="wd-puff">';
                for (let k = 0; k < n; k++) {
                    const a = (k / n) * Math.PI * 2 + seeded() * 0.25, r = (k % 3 === 0 ? 9 : 14) + seeded() * 3, x = 22 + Math.cos(a) * r, y = 21 + Math.sin(a) * r;
                    const tx = Math.cos(a), ty = Math.sin(a), px = -ty, py = tx;
                    h += '<g class="wd-seed" data-k="' + k + '"><path d="M22 21 L' + x.toFixed(1) + ' ' + y.toFixed(1) + '" stroke="#d8d2c4" stroke-width=".55"/>'
                        + '<path d="M' + (x + px * 2.6).toFixed(1) + ' ' + (y + py * 2.6).toFixed(1) + ' Q' + (x + tx * 2.4).toFixed(1) + ' ' + (y + ty * 2.4).toFixed(1) + ' ' + (x - px * 2.6).toFixed(1) + ' ' + (y - py * 2.6).toFixed(1) + '" stroke="#fffdf6" stroke-width="1.1" fill="none"/>'
                        + '<path d="M' + x.toFixed(1) + ' ' + y.toFixed(1) + ' l' + (tx * 3.5).toFixed(1) + ' ' + (ty * 3.5).toFixed(1) + ' M' + (x + px * 3.2).toFixed(1) + ' ' + (y + py * 3.2).toFixed(1) + ' L' + (x - px * 3.2).toFixed(1) + ' ' + (y - py * 3.2).toFixed(1) + '" stroke="#fffdf6" stroke-width=".75" stroke-linecap="round"/>'
                        + '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="1.5" fill="#fffdf6" stroke="#e4ddcd" stroke-width=".4"/></g>';
                }
                h += '</g><g class="wd-bare"><circle cx="22" cy="21" r="3.4" fill="#c9b98a"/><circle cx="21" cy="20" r=".6" fill="#a8956a"/><circle cx="23.2" cy="21.6" r=".6" fill="#a8956a"/><circle cx="21.6" cy="22.4" r=".5" fill="#a8956a"/></g>'
                    + '<circle class="wd-core" cx="22" cy="21" r="2.4" fill="#c9b98a"/>';
            }
            el.innerHTML = h + '</svg>';
            el.style.setProperty('--sw', (4.5 + seeded() * 3).toFixed(1) + 's'); el.style.setProperty('--swd', '-' + (seeded() * 5).toFixed(1) + 's');
            const d = { el, kind, i, sec: PLAN[i][0], taps: 0, lastRelease: 0, logged: false };
            if (kind === 'partial') $$('.wd-seed', el).forEach((sd, k) => { if (k % 2 === 0 || seeded() < 0.25) sd.classList.add('gone'); });
            wire(d); list.push(d);
            return d;
        }
        /* let `n` seeds go, from the side the push comes from; returns how many went */
        function release(d, n, dir, strength) {
            const now = performance.now();
            if (now - d.lastRelease < 900) return 0; d.lastRelease = now;
            const left = $$('.wd-seed:not(.gone):not(.leaving)', d.el);
            if (!left.length) { regrow(d); return 0; }
            const count = Math.min(n, left.length, motion.matches ? 5 : MAX_AIR - air.length - pending);
            if (count <= 0) return 0;
            // Reserve staggered particles so repeated taps cannot overfill the shared loop.
            let went = 0;
            left.sort(() => Math.random() - 0.5);
            left.slice(0, count).forEach((sd, k) => {
                sd.classList.add('leaving'); pending++; went++;
                setTimeout(() => {
                    pending--; sd.classList.remove('leaving');
                    if (d.el.hidden || !World.inView(d.el)) return;
                    const c = $('circle', sd).getBoundingClientRect();
                    const target = k < 2 && Math.random() < 0.18 ? landing() : null;
                    if (motion.matches || launch(c.left + c.width / 2, c.top + c.height / 2, k % 3 === 0 ? -dir : dir, strength, target)) sd.classList.add('gone');
                    if (!$$('.wd-seed:not(.gone)', d.el).length) d.el.classList.add('bare');
                }, motion.matches ? 0 : k * 140 + rnd(0, 80));
            });
            if (!motion.matches) { d.el.classList.remove('puffed'); void d.el.offsetWidth; d.el.classList.add('puffed'); }
            regrow(d);
            if (!d.logged) { d.logged = true; GardenLog.add({ id: 'dand:' + d.sec, kind: 'dandelion', sym: 'dandelion', color: '#fffdf6', center: '#c9b98a' }); if (window.World) World.note(1); }
            return went;
        }
        function wire(d) {
            const el = d.el;
            if (d.kind === 'yellow') {
                el.classList.add('fl-int');
                el.addEventListener('click', e => { e.stopPropagation(); REACT.nod(el, e); if (!d.logged) { d.logged = true; GardenLog.add({ id: 'dand:y:' + d.sec, kind: 'flower', sym: 'fl-daisy', color: '#f6cf3a', center: '#e0a020' }); } });
                return;
            }
            const tapCount = () => (d.taps++ === 0 ? 8 + Math.floor(Math.random() * 3) : 9 + Math.floor(Math.random() * 4));
            el.addEventListener('click', e => {
                e.stopPropagation();
                makeWish(d);
                const r = el.getBoundingClientRect();
                release(d, tapCount(), e.clientX < r.left + r.width / 2 ? 1 : -1, 0.6);
            });
            el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!e.repeat) { makeWish(d); release(d, tapCount(), 1, 0.6); } } });
            /* brushing or swiping across it: the faster the stroke, the more seeds go */
            let lx = null, lt = 0;
            el.addEventListener('pointermove', e => {
                if (e.pointerType !== 'mouse' || motion.matches) return;
                const now = performance.now();
                if (lx != null && now - lt < 80) {
                    const v = (e.clientX - lx) / Math.max(1, now - lt);
                    if (Math.abs(v) > 0.7) release(d, Math.round(Math.min(12, 3 + Math.abs(v) * 5)), Math.sign(v), Math.min(1.6, Math.abs(v)));
                }
                lx = e.clientX; lt = now;
            });
            el.addEventListener('pointerleave', () => { lx = null; });
            el.addEventListener('pointercancel', () => { lx = null; });
        }
        function place() {
            const small = narrow(), w = small ? 32 : 44, h = small ? 61 : 84, max = small ? 4 : PLAN.length;
            let shown = 0;
            PLAN.forEach(([id, kind], i) => {
                const sec = document.getElementById(id);
                let d = list.find(x => x.i === i);
                if (!sec || shown >= max || (small && kind === 'yellow' && i > 2)) { if (d) d.el.hidden = true; return; }
                if (!d) { d = build(kind, i); sec.appendChild(d.el); }
                d.el.hidden = true;   /* measure the section without this one */
                d.el.classList.toggle('small', small);
                // Fixed vine hover strips sit above main; reserve their columns even off screen.
                const vineWidth = innerWidth >= 1240 ? 92 : 20;
                const vineColumns = fine && !motion.matches ? [
                    { left: 0, right: vineWidth, top: -Infinity, bottom: Infinity },
                    { left: innerWidth - vineWidth, right: innerWidth, top: -Infinity, bottom: Infinity }
                ] : [];
                const p = World.placeIn && World.placeIn(sec, w, h, vineColumns);
                if (!p) return;
                d.el.style.left = p.left.toFixed(1) + 'px'; d.el.style.top = p.top.toFixed(1) + 'px'; d.el.hidden = false; shown++;
            });
        }
        let pt = 0; const later = ms => { clearTimeout(pt); pt = setTimeout(place, ms); };
        later(2200); addEventListener('load', () => later(700));
        let lw = innerWidth; addEventListener('resize', () => { if (innerWidth !== lw) { lw = innerWidth; later(400); } });
        document.addEventListener('click', e => { if (!e.target.closest('.v11-dand')) later(900); });
        /* now and then, in a breeze, a single seed lets go by itself (only from a dandelion someone can see) */
        if (World.onBeat && !reduce) World.onBeat(() => {
            if (Math.random() > 0.22 || FX.live > 10) return;
            const seen = list.filter(d => d.kind !== 'yellow' && !d.el.hidden && World.inView(d.el) && $$('.wd-seed:not(.gone)', d.el).length > 6);
            if (!seen.length) return;
            const d = seen[Math.floor(Math.random() * seen.length)], left = $$('.wd-seed:not(.gone)', d.el), sd = left[Math.floor(Math.random() * left.length)];
            const c = $('circle', sd).getBoundingClientRect(); if (launch(c.left + 1, c.top + 1, 1, 0.3)) { sd.classList.add('gone'); regrow(d); }
        });
        const clearAir = () => { cancelAnimationFrame(raf); raf = 0; air.forEach(p => { p.d.remove(); FX.free(1); }); air.length = 0; };
        motion.addEventListener('change', () => { if (motion.matches) clearAir(); });
        document.addEventListener('visibilitychange', () => { if (document.hidden) clearAir(); });
        return { place, list, release, landing, launch, stats: () => ({ particles: air.length, pending, flowers: flowers.size }) };
    })();
        if (/[?&]v11debug\b/.test(location.search)) window.__dand = Dandelions;

        if (Dandelions) setTimeout(() => Dandelions.place(), 2400);
    }
    return { start };
});
