/* =====================================================================
   v11 polish pass. Runs last, so it can reuse everything above: the Life
   director, WorldState and the World helpers.
   ===================================================================== */
(function () {
    'use strict';
    /* sections far off screen pause their CSS animations (see .is-off in style.css): js/effects/scroll-effects.js */
    MB.use('effects.scroll-effects').offscreen();

    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
    const $ = (sel, root) => (root || document).querySelector(sel);
    const $$ = (sel, root) => [...(root || document).querySelectorAll(sel)];

    /* Rainbow letters (js/effects/text-effects.js); it also publishes window.__rainbow */
    MB.use('effects.text-effects').rainbowLetters();
    /* ------------------------------------------------------------------
       Turning flowers. Each decorative flower turns slowly on its own
       (a CSS animation, so it costs nothing while left alone). Hover
       ramps that animation's playback rate up, and leaving lets it ease
       back down: the angle never jumps because the rate, not the
       duration, changes. One small rAF loop runs only while some flower
       is still changing speed.
       ------------------------------------------------------------------ */
    const Spin = (() => {
        const st = new WeakMap(), active = new Set();
        const NAMES = ['flSpin', 'flSpinRev', 'ppSway', 'leafSway', 'dandSway'];
        let raf = 0, last = 0;
        const find = el => el.getAnimations ? el.getAnimations().find(a => NAMES.includes(a.animationName)) : null;
        function set(el, boost, hold) {
            if (reduce || !el) return;
            const a = find(el); if (!a) return;
            let s = st.get(el); if (!s) { s = { rate: 1, target: 1 }; st.set(el, s); }
            s.a = a;
            const dur = a.effect && a.effect.getTiming().duration, sway = a.animationName === 'ppSway' || a.animationName === 'leafSway' || a.animationName === 'dandSway';
            /* hovered: about 280 degrees a second whatever the flower's resting pace (sways just quicken 3x) */
            s.target = boost ? (sway ? 3 : Math.max(2, 280 / (360000 / (dur || 40000)))) : 1;
            if (typeof boost === 'number') s.target *= boost;
            clearTimeout(s.hold); if (hold) s.hold = setTimeout(() => set(el, false), hold);
            active.add(el);
            if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); }
        }
        function tick(now) {
            const dt = Math.min(0.05, (now - last) / 1000); last = now;
            active.forEach(el => {
                const s = st.get(el);
                if (!s || !s.a || !el.isConnected) { active.delete(el); return; }
                /* speeds up briskly, settles back gently */
                s.rate += (s.target - s.rate) * (1 - Math.exp(-dt * (s.target > s.rate ? 2.6 : 1.3)));
                if (Math.abs(s.target - s.rate) < 0.03) { s.rate = s.target; if (s.target === 1) active.delete(el); }
                try { s.a.playbackRate = s.rate; } catch (e) { active.delete(el); }
            });
            raf = active.size ? requestAnimationFrame(tick) : 0;
        }
        return { set, spinning: el => { const s = st.get(el); return !!s && s.rate > 1.5; } };
    })();
    window.__spin = Spin;

    /* ------------------------------------------------------------------
       Small shared pieces: a particle budget (petals, seeds, sparkles and
       raindrops all draw from it, so repeated clicking can never pile up
       hundreds of them) and the session log of what the visitor touched,
       found and grew, which the garden at the bottom is made from.
       ------------------------------------------------------------------ */
    const FX = MB.use('core.particles').FX;
    window.__fx = FX;
    const GardenLog = MB.use('core.state').GardenLog;
    window.GardenLog = GardenLog;

    /* ------------------------------------------------------------------
       Touching a flower. Each decorative flower has its own little
       response (a quick spin, a bloom, a few petals, a hop, a blush of
       colour, a sparkle, a nod toward you), and now and then a small
       discovery: a ladybug, a tiny butterfly, a seed for the birds, or a
       bud that opens beside it. One response at a time per flower, so
       fast clicking never stacks animations.
       ------------------------------------------------------------------ */
    const rnd = (a, b) => a + Math.random() * (b - a);
    const strHash = str => { let h = 2166136261; for (const ch of str) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; };
    const centre = el => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height }; };
    const colourOf = el => { const c = getComputedStyle(el).color; return c && c !== 'rgba(0, 0, 0, 0)' ? c : '#f4a7bf'; };
    function petals(el, n) {
        const c = centre(el), col = colourOf(el); n = FX.room(n);
        for (let k = 0; k < n; k++) {
            const p = document.createElement('i'); p.className = 'v11-petal'; p.style.background = col;
            p.style.left = c.x + 'px'; p.style.top = c.y + 'px'; document.body.appendChild(p);
            const dx = rnd(-40, 40), dy = rnd(40, 90), rot = rnd(-260, 260);
            FX.track(p, p.animate([
                { transform: 'translate(-50%,-50%) rotate(0deg) scale(.6)', opacity: 0 },
                { transform: `translate(calc(-50% + ${(dx * 0.3).toFixed(0)}px), calc(-50% + ${(dy * 0.2).toFixed(0)}px)) rotate(${(rot * 0.3).toFixed(0)}deg) scale(1)`, opacity: 0.95, offset: 0.18 },
                { transform: `translate(calc(-50% + ${dx.toFixed(0)}px), calc(-50% + ${dy.toFixed(0)}px)) rotate(${rot.toFixed(0)}deg) scale(.8)`, opacity: 0 }
            ], { duration: rnd(1500, 2300), delay: k * 90, easing: 'cubic-bezier(.3,.1,.5,1)', fill: 'backwards' }), 3000);
        }
    }
    const SPRING = 'cubic-bezier(0.34, 1.56, 0.64, 1)';
    const REACT = {
        spin: el => { if (Spin.spinning(el)) return 500; Spin.set(el, 1.4, 700); return 1600; },
        bloom: el => { el.animate([{ scale: 1 }, { scale: 1.32, offset: 0.35 }, { scale: 0.96, offset: 0.7 }, { scale: 1 }], { duration: 950, easing: 'ease-out' }); return 950; },
        petals: el => { petals(el, 1 + Math.floor(Math.random() * 3)); el.animate([{ scale: 1 }, { scale: 1.08 }, { scale: 1 }], { duration: 500 }); return 900; },
        bounce: el => { el.animate([{ translate: '0 0' }, { translate: '0 -9px', offset: 0.3 }, { translate: '0 0', offset: 0.6 }, { translate: '0 -3px', offset: 0.8 }, { translate: '0 0' }], { duration: 800, easing: 'ease-in-out', composite: 'add' }); return 800; },
        blush: el => { el.animate([{ filter: 'none' }, { filter: 'hue-rotate(' + (Math.random() < 0.5 ? 38 : -42) + 'deg) saturate(1.25)', offset: 0.25 }, { filter: 'hue-rotate(0deg)', offset: 0.85 }, { filter: 'none' }], { duration: 2200, easing: 'ease-in-out' }); return 1400; },
        sparkle: el => { const c = centre(el); if (World.sparkle && FX.room(4) >= 4) World.sparkle(c.x, c.y - c.h * 0.3); el.animate([{ scale: 1 }, { scale: 1.12 }, { scale: 1 }], { duration: 600 }); return 900; },
        nod: (el, e) => { const c = centre(el), dir = e && e.clientX < c.x ? -1 : 1; el.animate([{ rotate: '0deg' }, { rotate: (14 * dir) + 'deg', offset: 0.3 }, { rotate: (-6 * dir) + 'deg', offset: 0.65 }, { rotate: '0deg' }], { duration: 1100, easing: 'ease-in-out', composite: 'add' }); return 1100; },
        wiggle: el => { el.animate([{ rotate: '0deg' }, { rotate: '-14deg', offset: 0.25 }, { rotate: '10deg', offset: 0.5 }, { rotate: '-5deg', offset: 0.75 }, { rotate: '0deg' }], { duration: 900, easing: 'ease-in-out', composite: 'add' }); return 900; }
    };
    const ORDER = ['spin', 'bloom', 'petals', 'bounce', 'blush', 'sparkle', 'nod'];
    const LADY = '<svg viewBox="-10 -9 20 18" aria-hidden="true"><circle cx="7" cy="0" r="3.6" fill="#3a2b33"/><ellipse rx="7.4" ry="6.6" fill="#e2483d"/><path d="M-7.4 0 H7.4" stroke="#3a2b33" stroke-width=".9"/><circle cx="-3" cy="-3" r="1.3" fill="#3a2b33"/><circle cx="2" cy="-3.4" r="1.1" fill="#3a2b33"/><circle cx="-2.4" cy="3.2" r="1.2" fill="#3a2b33"/><circle cx="2.6" cy="3" r="1.3" fill="#3a2b33"/></svg>';
    const TINY_BF = '<svg viewBox="-24 -20 48 40" aria-hidden="true"><g class="bf-wing-l"><path d="M-1 -2 C-10 -20 -26 -16 -21 -3 C-18 4 -8 3 -1 0Z" fill="#cdb8f2"/><path d="M-1 1 C-9 3 -18 10 -13 16 C-8 19 -3 10 -1 3Z" fill="#fbdc84"/></g><g class="bf-wing-r"><path d="M1 -2 C10 -20 26 -16 21 -3 C18 4 8 3 1 0Z" fill="#cdb8f2"/><path d="M1 1 C9 3 18 10 13 16 C8 19 3 10 1 3Z" fill="#fbdc84"/></g><rect x="-1.5" y="-8" width="3" height="20" rx="1.5" fill="#5a4366"/></svg>';
    let lastFind = 0;
    const FINDS = {
        ladybug: el => {
            const c = centre(el), b = document.createElement('span'); b.className = 'v11-ladybug'; b.innerHTML = LADY; b.setAttribute('aria-hidden', 'true');
            b.style.left = (c.x - c.w * 0.3) + 'px'; b.style.top = (c.y - 4) + 'px'; document.body.appendChild(b);
            FX.track(b, b.animate([{ transform: 'translate(0,0) rotate(-10deg)', opacity: 0 }, { opacity: 1, offset: 0.1 }, { transform: `translate(${(c.w * 0.3).toFixed(0)}px,-6px) rotate(8deg)`, offset: 0.5 }, { transform: `translate(${(c.w * 0.6).toFixed(0)}px,2px) rotate(-4deg)`, opacity: 1, offset: 0.9 }, { transform: `translate(${(c.w * 0.65).toFixed(0)}px,2px)`, opacity: 0 }], { duration: 4200, easing: 'ease-in-out' }), 4500);
            return true;
        },
        butterfly: el => {
            if (!Life.claim('tiny-butterfly', 3500)) return false;
            const c = centre(el), b = document.createElement('span'); b.className = 'v11-tinybf'; b.innerHTML = TINY_BF; b.setAttribute('aria-hidden', 'true');
            b.style.left = c.x + 'px'; b.style.top = c.y + 'px'; document.body.appendChild(b);
            const dir = c.x > innerWidth / 2 ? -1 : 1;
            const a = b.animate([{ transform: 'translate(-50%,-50%) scale(.2)', opacity: 0 }, { transform: 'translate(-50%,-50%) scale(1)', opacity: 1, offset: 0.12 }, { transform: `translate(calc(-50% + ${dir * 30}px), calc(-50% - 40px)) rotate(${dir * 10}deg)`, offset: 0.4 }, { transform: `translate(calc(-50% + ${dir * 10}px), calc(-50% - 85px)) rotate(${-dir * 8}deg)`, offset: 0.7 }, { transform: `translate(calc(-50% + ${dir * 70}px), calc(-50% - 150px))`, opacity: 0 }], { duration: 3200, easing: 'ease-in-out' });
            FX.track(b, a, 3600); a.addEventListener('finish', () => Life.release('tiny-butterfly'));
            return true;
        },
        seed: el => { if (!World.seedAt || World.hasSeed()) return false; const c = centre(el); return World.seedAt({ x: c.x + (c.x > innerWidth / 2 ? -34 : 34), y: c.y + 20 }); },
        bud: el => {
            const host = el.closest('section') || el.closest('footer'); if (!host || $$('.v11-bud', host).length >= 2) return false;
            const c = centre(el), hr = host.getBoundingClientRect(), side = c.x > hr.left + hr.width / 2 ? -1 : 1;
            const x = c.x + side * (c.w * 0.5 + 12), y = c.y + c.h * 0.35;
            if (World.clearAt && !World.clearAt(x, y, 10)) return false;
            const b = document.createElement('span'); b.className = 'v11-bud'; b.setAttribute('aria-hidden', 'true');
            b.innerHTML = '<svg viewBox="-12 -12 24 30"><path d="M0 18 C-1 12 1 6 0 2" stroke="#8db36a" stroke-width="1.4" fill="none"/><g class="vb-head" style="color:' + colourOf(el) + '"><use href="#fl-bloom" x="-9" y="-9" width="18" height="18"/></g><g class="vb-cap"><path d="M0 4 C-6 2 -5 -7 0 -9 C5 -7 6 2 0 4Z" fill="#8db36a"/></g></svg>';
            b.style.left = (x - hr.left) + 'px'; b.style.top = (y - hr.top) + 'px'; host.appendChild(b);
            requestAnimationFrame(() => requestAnimationFrame(() => b.classList.add('open')));
            GardenLog.add({ id: 'bud:' + (el.dataset.gk || Math.random()), kind: 'bud', sym: 'fl-bloom', color: colourOf(el), center: '#f2c230' });
            return true;
        }
    };
    function react(el, e) {
        if (el.__busy && performance.now() < el.__busy) return;
        const key = el.dataset.gk || '';
        /* a flower usually answers the same way (its own personality), sometimes differently */
        const own = el.__own || ORDER[strHash(key) % ORDER.length];
        let name = el.dataset.react || (Math.random() < 0.7 ? own : ORDER[Math.floor(Math.random() * ORDER.length)]);
        if (reduce) name = name === 'spin' || name === 'bounce' || name === 'nod' ? 'blush' : name;
        let ms = (REACT[name] || REACT.bloom)(el, e) || 800;
        /* leaves sometimes have a ladybug living on them */
        if (el.dataset.find && !reduce && Math.random() < 0.3 && FINDS[el.dataset.find](el)) ms = Math.max(ms, 1500);
        /* a small discovery now and then: rare, and never twice in quick succession */
        if (!reduce && performance.now() - lastFind > 20000 && Math.random() < 0.14) {
            const opts = Object.keys(FINDS).sort(() => Math.random() - 0.5);
            for (const f of opts) if (FINDS[f](el)) { lastFind = performance.now(); ms = Math.max(ms, 1200); break; }
        }
        el.__busy = performance.now() + ms;
        /* everything touched leaves something for the garden at the bottom */
        if (!el.__logged) {
            el.__logged = true;
            const use = el.querySelector && el.querySelector('use'), sym = use ? (use.getAttribute('href') || '').slice(1) : 'fl-bloom';
            if (sym !== 'fl-leaf' && GardenLog.add({ id: 'fl:' + key, kind: 'flower', sym: sym || 'fl-bloom', color: colourOf(el), center: getComputedStyle(el).getPropertyValue('--center').trim() || '#f2c230' })) { if (window.World) World.note(1); }
        }
    }
    if (/[?&]v11debug\b/.test(location.search)) window.__v11 = { REACT, FINDS, react, Spin, FX, GardenLog };
    let gkN = 0;
    function interactive(el, opts) {
        if (!el || el.__int) return; el.__int = true;
        opts = opts || {};
        el.classList.add('fl-int'); el.dataset.gk = el.dataset.gk || (opts.key || 'f' + (gkN++));
        if (opts.react) el.dataset.react = opts.react;
        const target = opts.target || el;
        target.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); react(el, e); });
    }

    /* which flowers turn, how fast (seconds per turn, from the original site) and which element hovering speeds them up */
    const seeded = (k => () => (k = (k * 16807) % 2147483647) / 2147483647)(7);
    function turning(el, spd, opts) {
        opts = opts || {};
        el.classList.add('fl-spin'); if (opts.rev) el.classList.add('fl-rev');
        el.style.setProperty('--spd', spd + 's');
        el.style.setProperty('--sdl', '-' + (seeded() * spd).toFixed(1) + 's');
        el.style.setProperty('--fl', (5 + seeded() * 3).toFixed(1) + 's');
        el.style.setProperty('--fdl', '-' + (seeded() * 6).toFixed(1) + 's');
        if (opts.bdl != null) el.style.setProperty('--bdl', opts.bdl + 's');
        const host = opts.host || el;
        if (!opts.noHover) {
            host.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') Spin.set(el, true); });
            host.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') Spin.set(el, false); });
        }
        return el;
    }
    const HERO = { f1: [40, 0.4], f2: [30, 0.7], f3: [40, 1], f4: [50, 1.2], f6: [34, 1.4], f7: [40, 1.6] };
    $$('.hero-flowers .bloom').forEach((b, i) => {
        const k = Object.keys(HERO).find(c => b.classList.contains(c));
        if (k) turning(b, HERO[k][0], { bdl: HERO[k][1], rev: k === 'f3' });
        interactive(b, { key: 'hero' + i, react: k ? null : 'wiggle' });   /* f5 and f8 are leaves: they wiggle */
    });
    $$('.about-bloom').forEach((b, i) => { turning(b, b.classList.contains('ab2') ? 22 : 30, { rev: b.classList.contains('ab3') }); interactive(b, { key: 'about' + i }); });
    $$('.title-bloom').forEach((b, i) => { turning(b, 24, { host: b.closest('.section-head') || b }); interactive(b, { key: 'title' + i }); });
    const hf = $('.hello-flower'); if (hf) { turning(hf, 12, { host: $('.about-hello') }); interactive(hf, { key: 'hello', react: 'spin' }); }
    $$('.nav a').forEach(a => { const f = $('.nav-fl', a); if (f) turning(f, 8, { host: a }); });
    /* scattered blooms and posies are placed by earlier scripts after layout settles: pick them up as they appear */
    function adoptLate() {
        $$('.sc-bloom svg:not(.fl-spin)').forEach(sv => { const s = parseFloat(sv.parentElement.style.getPropertyValue('--spin')) || 40; turning(sv, Math.round(s), { host: sv.parentElement, rev: seeded() < 0.4 }); });
        $$('.scatter').forEach((sc, i) => { const sv = $('svg', sc); if (sv) interactive(sv, { key: 'sc' + (sc.style.left + sc.style.top), target: sc, react: sc.classList.contains('sc-leaf') ? 'wiggle' : null }); if (sc.classList.contains('sc-leaf') && sv) sv.dataset.find = 'ladybug'; });
        $$('.page-posy:not(.fl-adopted)').forEach(p => {
            p.classList.add('fl-adopted');
            /* a posy already bounces when touched (its own script); it also goes in the visitor's garden */
            p.addEventListener('click', () => { const f = $('.pp-pop', p); if (f && GardenLog.add({ id: 'posy:' + p.style.left + p.style.top, kind: 'posy', sym: ($('use', f).getAttribute('href') || '#fl-bloom').slice(1), color: getComputedStyle(f).color, center: f.style.getPropertyValue('--center') || '#f2c230' })) World.note(1); });
            $$('.pp-pop > use', p).forEach(u => { const spd = 18 + seeded() * 14; u.style.setProperty('--spd', spd.toFixed(1) + 's'); u.style.setProperty('--sdl', '-' + (seeded() * spd).toFixed(1) + 's'); });
            p.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') { $$('.pp-pop > use, .pp-stem', p).forEach(u => Spin.set(u, true)); } });
            p.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') { $$('.pp-pop > use, .pp-stem', p).forEach(u => Spin.set(u, false)); } });
        });
    }
    adoptLate(); setTimeout(adoptLate, 2500); addEventListener('load', () => setTimeout(adoptLate, 1500));
    document.addEventListener('click', () => setTimeout(adoptLate, 1000));
    window.__adoptFlowers = adoptLate;

    /* ------------------------------------------------------------------
       The chrysalis hangs on the left vine (the caterpillar's own vine)
       rather than on the twig by the photo, whenever vines are showing.
       It appears only once that stretch of vine has grown in, so it is
       found, not announced. Same jade and gold as the butterfly later.
       ------------------------------------------------------------------ */
    (function () {
        const story = $('.w-story'); if (!story) return;
        const NSV = 'http://www.w3.org/2000/svg';
        let g = null, at = 0, path = null;
        function draw() {
            if (g) { g.remove(); g = null; }
            const svg = $('.vine-left'); path = svg && $('.vine-path', svg);
            story.classList.toggle('on-vine', !!path);
            if (!path || (WorldState.get().story || 0) !== 1) return;
            const len = path.getTotalLength(), k = (svg.clientWidth || 90) / 90;
            at = len * 0.38; const p = path.getPointAtLength(at), z = 1 / Math.max(0.5, k);
            g = document.createElementNS(NSV, 'g'); g.setAttribute('class', 'v11-chrys'); g.setAttribute('transform', 'translate(' + p.x.toFixed(1) + ' ' + p.y.toFixed(1) + ') scale(' + z.toFixed(2) + ')');
            g.innerHTML = '<g class="vc-hang"><path d="M0 0 V5" stroke="#8a6a3a" stroke-width="1.2"/><path d="M0 5 C6 9 6 23 0 29 C-6 23 -6 9 0 5Z" fill="#a8d5a2" stroke="#6f9f6a" stroke-width=".8"/><path d="M-3.5 13 H3.5" stroke="#e8b923" stroke-width="1" stroke-dasharray="1 1.6"/><circle cx="-2" cy="18" r=".9" fill="#e8b923"/><circle cx="2" cy="18" r=".9" fill="#e8b923"/></g>';
            svg.appendChild(g); update();
        }
        function update() { if (!g || !path) return; const shown = path.getTotalLength() - (parseFloat(path.style.strokeDashoffset) || 0); g.classList.toggle('on', shown > at + 10); }
        window.__onVineTick = update;
        const prev = window.__onVineLayout; window.__onVineLayout = () => { if (prev) prev(); draw(); };
        new MutationObserver(draw).observe(story, { attributes: true, attributeFilter: ['data-stage'] });
        let q = 0; addEventListener('scroll', () => { if (!q) q = requestAnimationFrame(() => { q = 0; update(); }); }, { passive: true });
        draw();
    })();

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

    /* touch screens have no hover: a tap on a garden flower or specimen gives the same little lift for a moment */
    document.addEventListener('pointerdown', e => {
        if (e.pointerType === 'mouse') return;
        const h = e.target.closest && e.target.closest('.g-cat, .h-spec'); if (!h) return;
        h.classList.add('is-tapped'); clearTimeout(h.__tapF); h.__tapF = setTimeout(() => h.classList.remove('is-tapped'), 900);
    }, { passive: true });

    /* touch screens have no hover: a tap on a heading gives the same colour change for a moment */
    document.addEventListener('pointerdown', e => {
        if (e.pointerType === 'mouse') return;
        const h = e.target.closest && e.target.closest('.rb-host'); if (!h) return;
        h.classList.add('is-tapped'); clearTimeout(h.__tap); h.__tap = setTimeout(() => h.classList.remove('is-tapped'), 1600);
    }, { passive: true });
})();

