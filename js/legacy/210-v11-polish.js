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

    /* The chrysalis on the left vine (js/animals/caterpillar.js) */
    MB.use('animals.caterpillar').vineChrysalis();

    /* the dandelions (js/plants/dandelions.js): `seeded` and `REACT` are still private to this file, so they are handed over */
    MB.use('plants.dandelions').start({ seeded, REACT });

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

