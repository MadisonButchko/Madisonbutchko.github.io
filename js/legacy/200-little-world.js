/* =====================================================================
   The little world: things that quietly happen as someone explores.
   Flowers lean toward the cursor like sunlight, a caterpillar becomes a
   chrysalis and later a butterfly, birds take seeds and petals and slowly
   build a nest, a dandelion scatters seeds that may take root further
   down, and now and then a small cloud brings rain (and maybe a rainbow).
   Everything shares WorldState (memory) and Life (one creature at a time,
   and bigger events only after a quiet stretch), driven by one heartbeat.
   ===================================================================== */
(function () {
    'use strict';
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
    const $ = (sel, root) => (root || document).querySelector(sel);
    const $$ = (sel, root) => [...(root || document).querySelectorAll(sel)];
    const rand = (a, b) => a + Math.random() * (b - a);
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const f1 = v => (+v).toFixed(1);
    const W = WorldState.get();
    const save = () => WorldState.save();
    const NS = 'http://www.w3.org/2000/svg';
    /* safe-zone helpers (js/core/safe-zones.js): is anything the visitor reads or clicks at (x, y)? */
    const { clearAt, navBottom, openSpot, whenUnseen, checkWaiting, inView, contentRects } = MB.use('core.safe-zones');

    /* ------------------------------------------------------------------
       Sunlight: flowers near the cursor lean toward it by a few degrees;
       the sunflower in the corner turns its face to follow, slowly.
       ------------------------------------------------------------------ */
    if (fine && !reduce) {
        const SEL = '.g-art, .h-art, .hello-flower, .w-dandelion:not([hidden]), .page-posy, .w-sprout, .v11-bud';   /* flowers with stems: a tilt reads on them (on a turning bloom it would not) */
        let items = [], dirty = true, q = 0, px = -1e4, py = -1e4;
        const sun = $('.to-top .sf-sway'), sunHost = $('.to-top');
        const refresh = () => { items = $$(SEL).map(el => ({ el, r: el.getBoundingClientRect() })).filter(o => o.r.width && o.r.bottom > -50 && o.r.top < innerHeight + 50); dirty = false; };
        addEventListener('scroll', () => { dirty = true; }, { passive: true });
        addEventListener('resize', () => { dirty = true; });
        addEventListener('pointermove', e => {
            px = e.clientX; py = e.clientY; if (q) return;
            q = requestAnimationFrame(() => {
                q = 0; if (dirty) refresh();
                const R = 240;
                items.forEach(o => {
                    const cx = o.r.left + o.r.width / 2, cy = o.r.top + o.r.height * 0.45, dx = px - cx, dy = py - cy, d = Math.hypot(dx, dy);
                    const tilt = d < R ? clamp(dx / (d || 1) * 7 * (1 - d / R) * (dy < 0 ? 1 : 0.6), -6, 6) : 0;
                    if (Math.abs((o.t || 0) - tilt) > 0.15) { o.t = tilt; o.el.style.setProperty('--sun', f1(tilt) + 'deg'); }
                });
                if (sun) {
                    const r = sunHost.getBoundingClientRect(), dx = px - (r.left + r.width / 2), d = Math.hypot(dx, py - r.top);
                    sun.style.setProperty('--face', f1(d < 1100 ? clamp(dx / 22, -24, 24) : 0) + 'deg');   /* the one flower that follows noticeably, still within a gentle range */
                }
            });
        }, { passive: true });
        document.addEventListener('mouseleave', () => { items.forEach(o => { o.t = 0; o.el.style.setProperty('--sun', '0deg'); }); if (sun) sun.style.setProperty('--face', '0deg'); });
    }

    /* ------------------------------------------------------------------
       A small bird that comes in for something (a seed, a petal), shared
       by feeding and stealing. Uses the vine-bird look and states.
       ------------------------------------------------------------------ */
    function visitingBird(getTarget, opts) {
        opts = opts || {};
        const el = document.createElement('div'); el.className = 'vine-bird flying w-bird'; el.setAttribute('aria-hidden', 'true');
        el.innerHTML = '<div class="c-flip"><div class="c-body">' + (window.__birdSVG || '') + '</div></div>';
        document.body.appendChild(el);
        const t0 = getTarget(), fromLeft = t0.x > innerWidth / 2 ? false : true;
        let x = fromLeft ? -50 : innerWidth + 50, y = rand(-40, innerHeight * 0.25);
        el.classList.toggle('left-facing', !fromLeft);
        const set = () => { el.style.transform = 'translate(' + f1(x - 18) + 'px,' + f1(y - 26) + 'px)'; }; set();
        const go = (to, dur, arc, done) => {
            const s0 = performance.now(), x0 = x, y0 = y;
            (function step(now) {
                if (!document.contains(el)) return;
                const t = Math.min(1, (now - s0) / dur), e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2, p = to();
                x = x0 + (p.x - x0) * e; y = y0 + (p.y - y0) * e - Math.sin(Math.PI * t) * arc; set();
                if (t < 1) requestAnimationFrame(step); else done && done();
            })(s0);
        };
        const away = () => {
            el.classList.remove('eating'); el.classList.add('flying'); el.classList.toggle('left-facing', fromLeft);
            const ex = fromLeft ? innerWidth + 60 : -60, ey = rand(-60, innerHeight * 0.2);
            go(() => ({ x: ex, y: ey }), 1500, 30, () => { el.remove(); opts.done && opts.done(); });
        };
        go(getTarget, opts.swoop ? 1100 : 1700, opts.swoop ? -30 : -50, () => {
            if (opts.swoop) { opts.arrive && opts.arrive(el); away(); return; }
            el.classList.remove('flying'); el.classList.add('eating');
            opts.arrive && opts.arrive(el);
            setTimeout(away, opts.stay || 1500);
        });
        return el;
    }
    /* birds keep what they find: every few pieces of material, the nest grows by one stage */
    function gather() { W.nestBits = (W.nestBits || 0) + 1; if (W.nestBits >= 2 && W.nest < 5) { W.nestBits = 0; W.nest++; } save(); nest.render(); }

    /* ------------------------------------------------------------------
       A seed to feed a bird: drag it near a bird (or anywhere, if no bird
       is around, and one will come). Keyboard: Enter scatters it.
       ------------------------------------------------------------------ */
    const seed = (function () {
        let el = null, timer = 0, shownThisVisit = 0;
        const SVG = '<svg viewBox="-8 -11 16 22" aria-hidden="true"><path d="M0 -10 C6 -6 6 6 0 10 C-6 6 -6 -6 0 -10Z" fill="#c9a06a" stroke="#8a5a2a" stroke-width="1"/><path d="M0 -8 C3 -4 3 4 0 8" stroke="#f3dcbd" stroke-width="1.4" fill="none" stroke-linecap="round"/></svg>';
        function remove(fade) { if (!el) return; const e = el; el = null; clearTimeout(timer); if (fade) { e.classList.add('gone'); setTimeout(() => e.remove(), 900); } else e.remove(); }
        function docPos() { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
        function feed(near) {
            const s = el; if (!s || s.classList.contains('taken')) return; s.classList.add('taken'); s.setAttribute('aria-disabled', 'true');
            const gb = window.__guideBird, pos = docPos();
            const eat = bird => { s.classList.add('eaten'); if (bird) { bird.classList.add('fed'); setTimeout(() => bird.classList.remove('fed'), 1400); } sparkle(pos.x, pos.y); setTimeout(() => remove(false), 500); gather(); };
            if (near && gb && gb.visible()) { gb.visit(pos.x, pos.y, () => eat(gb.el)); return; }
            if (reduce) { eat(null); return; }
            Life.claim('fed-bird', 9000, true);
            visitingBird(() => docPos(), { stay: 1300, arrive: b => eat(b), done: () => Life.release('fed-bird') });
        }
        function spawn(at) {
            if (el || shownThisVisit >= 3 || reduce) return false;
            const spot = at && clearAt(at.x, at.y, 14) ? at : openSpot(18); if (!spot) return false;
            shownThisVisit++;
            el = document.createElement('div'); el.className = 'w-seed w-piece'; el.innerHTML = SVG;
            el.setAttribute('role', 'button'); el.setAttribute('tabindex', '0'); el.setAttribute('aria-label', 'A seed. Drag it to a bird, or press Enter to scatter it for the birds');
            el.style.left = f1(spot.x + scrollX) + 'px'; el.style.top = f1(spot.y + scrollY) + 'px';
            document.body.appendChild(el);
            let drag = null;
            el.addEventListener('pointerdown', e => { if (el.classList.contains('taken')) return; e.preventDefault(); drag = { id: e.pointerId, dx: e.pageX - parseFloat(el.style.left), dy: e.pageY - parseFloat(el.style.top), moved: 0, sx: e.pageX, sy: e.pageY }; try { el.setPointerCapture(e.pointerId); } catch (_) { } el.classList.add('held'); });
            el.addEventListener('pointermove', e => {
                if (!drag || e.pointerId !== drag.id) return;
                el.style.left = f1(e.pageX - drag.dx) + 'px'; el.style.top = f1(e.pageY - drag.dy) + 'px';
                drag.moved = Math.max(drag.moved, Math.hypot(e.pageX - drag.sx, e.pageY - drag.sy));
                const gb = window.__guideBird;
                if (gb && gb.visible()) { const p = gb.at(); gb.el.classList.toggle('curious', Math.hypot(p.x - e.clientX, p.y - e.clientY) < 220); }
            });
            const drop = e => {
                if (!drag || e.pointerId !== drag.id) return;
                const moved = drag.moved; drag = null; el.classList.remove('held');
                const gb = window.__guideBird; if (gb) gb.el.classList.remove('curious');
                if (moved < 24) { el.classList.remove('wiggle'); void el.offsetWidth; el.classList.add('wiggle'); return; }
                const p = docPos(), near = gb && gb.visible() && Math.hypot(gb.at().x - p.x, gb.at().y - p.y) < 220;
                feed(near || !(gb && gb.visible()));
            };
            el.addEventListener('pointerup', drop); el.addEventListener('pointercancel', drop);
            el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); feed(true); } });
            /* unclaimed seeds blow away after a while */
            timer = setTimeout(() => remove(true), 75000);
            return true;
        }
        return { spawn, get el() { return el; }, take: () => { const e = el; el = null; clearTimeout(timer); return e; } };
    })();
    function sparkle(x, y) {
        if (reduce) return;
        for (let k = 0; k < 4; k++) {
            const s = document.createElement('i'); s.className = 'w-spark'; s.style.left = f1(x) + 'px'; s.style.top = f1(y) + 'px';
            document.body.appendChild(s);
            const a = k / 4 * Math.PI * 2 + 0.4;
            s.animate([{ transform: 'translate(0,0) scale(.3)', opacity: 1 }, { transform: 'translate(' + f1(Math.cos(a) * 18) + 'px,' + f1(Math.sin(a) * 18 - 8) + 'px) scale(1)', opacity: 0 }], { duration: 700, easing: 'ease-out' }).onfinish = () => s.remove();
        }
    }

    /* uncommon: a bird swoops for a loose seed, or snatches a petal out of the air, and carries it off */
    function steal() {
        if (reduce || !Life.claim('thief', 9000)) return false;
        let carried = seed.el && !seed.el.classList.contains('held') && !seed.el.classList.contains('taken') && inView(seed.el) ? seed.take() : null;
        let x, y;
        if (carried) { const r = carried.getBoundingClientRect(); x = r.left + r.width / 2; y = r.top + r.height / 2; }
        else {
            const spot = openSpot(14); if (!spot) { Life.release('thief'); return false; }
            carried = document.createElement('div'); carried.className = 'w-petal'; carried.setAttribute('aria-hidden', 'true');
            document.body.appendChild(carried);
            x = spot.x; y = navBottom() + 20;
        }
        carried.classList.add('w-loose');
        const t0 = performance.now(), driftTo = y + rand(120, 200);
        const pos = () => { const t = (performance.now() - t0) / 1000; return { x: x + Math.sin(t * 1.6) * 16, y: Math.min(driftTo, y + t * 34) }; };
        carried.style.position = 'fixed';
        const place = () => { const p = pos(); carried.style.left = f1(p.x) + 'px'; carried.style.top = f1(p.y) + 'px'; };
        let falling = true;
        (function fall() { if (!falling) return; place(); requestAnimationFrame(fall); })();
        setTimeout(() => visitingBird(pos, {
            swoop: true,
            arrive: b => { falling = false; carried.style.cssText = ''; carried.className = 'w-carried ' + (carried.classList.contains('w-seed') ? 'is-seed' : 'is-petal'); b.querySelector('.c-body').appendChild(carried); },
            done: () => { Life.release('thief'); gather(); }
        }), 1600);
        return true;
    }

    /* ------------------------------------------------------------------
       The nest: tucked at a corner of the contact photo. It only changes
       while out of sight, a twig at a time, and birds visit it later.
       ------------------------------------------------------------------ */
    const nest = (function () {
        const host = $('.contact-photo'); if (!host) return { render() { }, visit() { return false; } };
        const el = document.createElement('div'); el.className = 'w-nest'; el.setAttribute('aria-hidden', 'true');
        el.innerHTML = '<svg viewBox="0 0 80 46">'
            + '<g class="n1"><path d="M8 34 L58 26" stroke="#9a6b3a" stroke-width="2.2" stroke-linecap="round"/><path d="M40 29 L48 21" stroke="#9a6b3a" stroke-width="1.4" stroke-linecap="round"/></g>'
            + '<g class="n2"><path d="M18 38 L70 33" stroke="#b07f4a" stroke-width="2" stroke-linecap="round"/><path d="M26 37 L20 31" stroke="#b07f4a" stroke-width="1.3" stroke-linecap="round"/></g>'
            + '<g class="n3" fill="none" stroke="#a7b86a" stroke-width="1.3" stroke-linecap="round"><path d="M14 33 Q30 28 44 33"/><path d="M36 36 Q50 30 66 34"/><path d="M22 30 Q28 24 34 30"/></g>'
            + '<g class="n4"><path d="M14 30 Q40 50 66 30 Q60 40 40 42 Q20 40 14 30Z" fill="#b8865a" stroke="#8a5a2a" stroke-width="1.2"/><path d="M18 32 Q40 44 62 32" fill="none" stroke="#d9b07a" stroke-width="1.2"/><path d="M22 35 L58 35 M26 38 L54 38" stroke="#9a6b3a" stroke-width=".8"/></g>'
            + '<g class="n5"><ellipse cx="34" cy="30" rx="4.2" ry="5" fill="#cfe5f2" stroke="#9ab8cc" stroke-width=".7"/><ellipse cx="44" cy="31" rx="4" ry="4.8" fill="#dbeef8" stroke="#9ab8cc" stroke-width=".7"/><path d="M58 24 q6 -4 9 2" stroke="#f4a7bf" stroke-width="1.6" fill="none" stroke-linecap="round"/></g></svg>';
        host.appendChild(el);
        function render() {
            if (W.nestShown === W.nest) { el.dataset.stage = W.nestShown; return; }
            /* the next twig appears while nobody is looking */
            whenUnseen(el, () => { W.nestShown = W.nest; save(); el.dataset.stage = W.nestShown; });
        }
        el.dataset.stage = W.nestShown || 0;
        render();
        let lastVisit = 0;
        function visit() {
            if (reduce || W.nestShown < 4 || !inView(el) || performance.now() - lastVisit < 180000 || !Life.claim('nest-bird', 9000)) return false;
            lastVisit = performance.now();
            visitingBird(() => { const r = el.getBoundingClientRect(); return { x: r.left + r.width * 0.5, y: r.top + r.height * 0.45 }; }, { stay: 3200, done: () => Life.release('nest-bird') });
            return true;
        }
        return { render, visit };
    })();

    /* ------------------------------------------------------------------
       The caterpillar's story: it lives on a twig by the About photo.
       With enough exploring it becomes a chrysalis (while out of sight),
       later the chrysalis is gone, and a butterfly with the same jade and
       gold appears down by the contact section. Nothing announces it.
       ------------------------------------------------------------------ */
    (function () {
        const host = $('.about-photo-wrap'); if (!host) return;
        const el = document.createElement('div'); el.className = 'w-story'; el.setAttribute('aria-hidden', 'true');
        el.innerHTML = '<svg viewBox="0 0 120 50" class="ws-twig"><path d="M2 22 C30 18 62 26 118 16" stroke="#8a6a3a" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M78 21 C84 12 96 10 104 12 C98 20 88 24 78 21Z" fill="#8db36a"/><path d="M30 20 C26 30 30 38 38 42 C40 34 38 26 30 20Z" fill="#7fa65c"/></svg>'
            + '<div class="ws-cat"><svg viewBox="0 0 34 14"><g class="ws-segs">' + [4, 9, 14, 19, 24].map((x, k) => '<circle cx="' + x + '" cy="9" r="4.2" fill="' + (k % 2 ? '#b6d88f' : '#9cc27a') + '"/>').join('') + '</g><circle cx="29" cy="7" r="4.6" fill="#8db36a"/><circle cx="30.6" cy="6" r="1" fill="#5a4366"/><path d="M28 2.6 L27 0.4 M31 2.6 L32.4 0.6" stroke="#6e9a4c" stroke-width=".9" stroke-linecap="round"/></svg></div>'
            + '<div class="ws-chrysalis"><svg viewBox="0 0 16 30"><path d="M8 0 V4" stroke="#8a6a3a" stroke-width="1.2"/><path d="M8 4 C14 8 14 22 8 28 C2 22 2 8 8 4Z" fill="#a8d5a2" stroke="#6f9f6a" stroke-width=".8"/><path d="M4.5 12 H11.5" stroke="#e8b923" stroke-width="1" stroke-dasharray="1 1.6"/><circle cx="6" cy="17" r=".9" fill="#e8b923"/><circle cx="10" cy="17" r=".9" fill="#e8b923"/></svg></div>';
        host.appendChild(el);
        const show = () => { el.dataset.stage = W.story; };
        show();
        let seen = false;
        new IntersectionObserver(es => { if (es[0].isIntersecting) seen = true; }, { threshold: 0.5 }).observe(el);
        function advance() {
            const now = Date.now();
            if (inView(el)) seen = true;
            if (W.story === 0 && W.explored >= 8 && seen) { whenUnseen(el, () => { W.story = 1; W.storyAt = now; save(); show(); }); seen = false; }
            else if (W.story === 1 && W.explored >= 16 && seen && now - W.storyAt > 90000) { whenUnseen(el, () => { W.story = 2; W.storyAt = Date.now(); save(); show(); }); seen = false; }
        }
        /* the butterfly finds the visitor further down the page, once */
        const contact = $('#contact');
        let jadeT = 0;
        function jade() {
            if (W.story !== 2 || reduce || jadeT || !inView(contact)) return;
            jadeT = setTimeout(() => { jadeT = 0;
                if (W.story !== 2 || !inView(contact) || !Life.claim('jade-butterfly', 12000, true)) return;
                W.story = 3; save();
                const photo = $('.contact-photo') || contact;
                const b = document.createElement('div'); b.className = 'visitor is-butterfly w-jade'; b.setAttribute('aria-hidden', 'true');
                b.innerHTML = '<svg viewBox="-24 -20 48 40"><g class="bf-wing-l"><path d="M-1 -2 C-10 -20 -26 -16 -21 -3 C-18 4 -8 3 -1 0Z" fill="#9fd3b4"/><path d="M-1 1 C-9 3 -18 10 -13 16 C-8 19 -3 10 -1 3Z" fill="#f6d36b"/><circle cx="-13" cy="-8" r="1.3" fill="#e8b923"/><circle cx="-17" cy="-5" r="1" fill="#e8b923"/></g><g class="bf-wing-r"><path d="M1 -2 C10 -20 26 -16 21 -3 C18 4 8 3 1 0Z" fill="#9fd3b4"/><path d="M1 1 C9 3 18 10 13 16 C8 19 3 10 1 3Z" fill="#f6d36b"/><circle cx="13" cy="-8" r="1.3" fill="#e8b923"/><circle cx="17" cy="-5" r="1" fill="#e8b923"/></g><rect x="-1.5" y="-8" width="3" height="20" rx="1.5" fill="#4f6b45"/></svg>';
                document.body.appendChild(b);
                let x = -40, y = innerHeight * 0.35; const t0 = performance.now();
                const spot = () => { const r = photo.getBoundingClientRect(); return { x: r.left + r.width * 0.82, y: r.top + 10 }; };
                (function fly(now) {
                    if (!document.contains(b)) return;
                    const t = (now - t0) / 1000, p = spot();
                    if (t < 3) { x += (p.x - x) * 0.05; y += (p.y - y) * 0.05 + Math.sin(t * 6) * 1.5; }
                    else if (t < 7) { b.classList.add('perched'); x += (p.x - x) * 0.2; y += (p.y - y) * 0.2; }
                    else { b.classList.remove('perched'); x += 3.2; y -= 1.8 + Math.sin(t * 5); }
                    b.style.transform = 'translate(' + f1(x) + 'px,' + f1(y) + 'px)';
                    if (t < 11 && x < innerWidth + 50 && y > -50) requestAnimationFrame(fly); else { b.remove(); Life.release('jade-butterfly'); }
                })(t0);
            }, 2200);
        }
        if (contact) new IntersectionObserver(es => { if (es[0].isIntersecting) jade(); }, { threshold: 0.4 }).observe(contact);
        window.__story = { advance: () => { advance(); if (contact) jade(); } };
    })();

    /* ------------------------------------------------------------------
       The dandelion: tap it or brush across it and its seeds float off on
       the breeze. A few may take root further down the page, later.
       ------------------------------------------------------------------ */
    const SECTIONS = ['home', 'about', 'experience', 'skills', 'gallery', 'contact'];
    function placeIn(sec, w, h, extra = []) {
        const sr = sec.getBoundingClientRect(), blocks = contentRects(sec).concat(extra), W2 = document.documentElement.clientWidth, m = 12;
        for (const fy of [0.995, 0.97, 0.9, 0.8, 0.68, 0.55, 0.4]) for (const fx of [0.025, 0.975, 0.06, 0.94, 0.12, 0.88, 0.2, 0.8]) {
            const cx = sr.left + sr.width * fx, by = sr.top + sr.height * fy, box = { l: cx - w / 2, r: cx + w / 2, t: by - h, b: by };
            if (box.l < 6 || box.r > W2 - 6 || box.t < sr.top + 4 || box.b > sr.bottom - 2) continue;
            if (blocks.some(r => r.left < box.r + m && r.right > box.l - m && r.top < box.b + m && r.bottom > box.t - m)) continue;
            return { left: cx - sr.left - w / 2, top: by - sr.top - h };
        }
        return null;
    }
    /* (the dandelions themselves live in the v11 pass below: several of them, sharing one drift loop) */
    /* seeds that took root: small flowers along the bottom of a later section */
    function sprouts() {
        W.sprouts.forEach((sp, k) => {
            const sec = document.getElementById(sp.sec); if (!sec) return;
            let f = sec.querySelector('.w-sprout[data-k="' + k + '"]');
            const reveal = () => {
                if (f) return;
                f = document.createElement('div'); f.className = 'w-sprout'; f.dataset.k = k; f.setAttribute('aria-hidden', 'true');
                const col = ['#fbe7a1', '#f9c6d6', '#d9cbf3'][k % 3], kind = sp.type || 'daisy';
                const stem = '<path d="M12 40 C11 32 13 24 12 14" stroke="#8db36a" stroke-width="1.4" fill="none"/><path d="M12 30 C7 28 5 24 5 21 C9 23 11 26 12 30Z" fill="#9fbe88"/>';
                f.innerHTML = '<svg viewBox="0 0 24 40">' + (kind === 'sprout' ? '<path d="M12 40 C11 34 13 30 12 26" stroke="#8db36a" stroke-width="1.4" fill="none"/><path d="M12 27 C6 26 3 21 4 17 C9 18 12 22 12 27Z" fill="#9fbe88"/><path d="M12 28 C17 26 20 22 20 18 C15 19 12 23 12 28Z" fill="#8db36a"/>'
                    : kind === 'dandelion' ? stem + '<use href="#fl-daisy" x="4" y="6" width="16" height="16" style="color:#f6cf3a;--center:#e0a020"/>'
                    : stem + '<use href="#fl-daisy" x="2" y="4" width="20" height="20" style="color:' + col + ';--center:#f2c230"/>') + '</svg>';
                if (window.GardenLog) GardenLog.add({ id: 'sprout:' + k + ':' + sp.sec, kind: 'sprout', sym: kind === 'sprout' ? 'fl-leaf' : 'fl-daisy', color: kind === 'dandelion' ? '#f6cf3a' : kind === 'sprout' ? '#8db36a' : col, center: '#f2c230' });
                f.style.left = (sp.fx * 100).toFixed(1) + '%';
                sec.appendChild(f); sp.shown = true; save();
            };
            if (sp.shown) reveal(); else if (!f) whenUnseen(sec, reveal);
        });
    }
    setTimeout(sprouts, 1500);
    /* a dandelion seed that took root: it shows up later, further down, while that spot is out of sight */
    function plantSeed(fromId) {
        if (W.sprouts.length >= 4) return false;
        const here = SECTIONS.indexOf(fromId), next = SECTIONS[Math.min(SECTIONS.length - 1, Math.max(1, here + 1 + (Math.random() < 0.5 ? 1 : 0)))];
        W.sprouts.push({ sec: next, fx: rand(0.06, 0.94), shown: false, type: ['daisy', 'sprout', 'dandelion'][Math.floor(Math.random() * 3)] });
        save(); sprouts(); return true;
    }
    const beatFns = [];

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

    /* ------------------------------------------------------------------
       One heartbeat for all of it. Small things are occasional; bigger
       ones wait for a quiet stretch, so the page keeps returning to calm.
       ------------------------------------------------------------------ */
    let beats = 0;
    setInterval(() => {
        if (document.hidden) return;
        beats++;
        checkWaiting();
        if (window.__story) window.__story.advance();
        nest.render();
        beatFns.forEach(fn => { try { fn(beats); } catch (e) { } });
        if (beats > 6 && !seed.el && W.explored >= 2 && Math.random() < 0.06) seed.spawn();
        if (!Life.calm(40000)) return;                  /* quiet stretch first */
        const r = Math.random();
        if (r < 0.03) rainCloud();
        else if (r < 0.06) steal();
        else if (r < 0.12) nest.visit();
    }, 6000);

    window.World = {
        note(n) { W.explored += n || 1; save(); if (window.__story) window.__story.advance(); },
        /* shared with the v11 pass below, so it reuses these instead of making its own */
        sparkle, gather, placeIn, openSpot, clearAt, inView, whenUnseen, contentRects,
        seedAt: at => seed.spawn(at), hasSeed: () => !!seed.el, nestStage: () => W.nest,
        plantSeed, onBeat: fn => beatFns.push(fn), calm: ms => Life.calm(ms)
    };
    /* test hook, only when the page is opened with ?worlddebug */
    if (/[?&]worlddebug\b/.test(location.search)) window.__world = { seed: () => seed.spawn(), steal, rain: rainCloud, nestVisit: () => nest.visit(), state: W, sprouts };
})();

