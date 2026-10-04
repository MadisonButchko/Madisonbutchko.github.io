/* =====================================================================
   Botanical interface
   Experience is a living garden: choose a flower, it travels to the
   centre, grows branches, and each bud is one experience.
   Skills is a pressed-specimen collection: choose a specimen, it lifts
   onto the page, separates into pieces, and each piece is one skill.
   Both read their content from <template> blocks in index.html, show one
   note at a time (so every category has the same footprint), remember
   what the visitor explored this session, and feed the discovery bouquet.
   ===================================================================== */
(function () {
    'use strict';
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
    const $ = (sel, root) => (root || document).querySelector(sel);
    const $$ = (sel, root) => [...(root || document).querySelectorAll(sel)];
    const wait = ms => new Promise(r => setTimeout(r, ms));
    /* animation waits never hang: hidden tabs pause frames and animations, so each wait also has a timer */
    const frame = () => Promise.race([new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))), wait(120)]);
    const settle = (anim, ms) => Promise.race([anim.finished.catch(() => { }), wait(ms + 250)]);
    const esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);
    const plain = html => { const d = document.createElement('div'); d.innerHTML = html; return d.textContent.replace(/\s+/g, ' ').trim(); };
    const f1 = v => (+v).toFixed(1);
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const behavior = () => (reduce ? 'auto' : 'smooth');
    const hash = str => { let h = 2166136261; for (const ch of str) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; };
    const rng = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

    const navH = () => { const n = [$('.m-header'), $('.nav')].find(x => x && x.getClientRects().length); return n ? n.getBoundingClientRect().bottom : 0; };
    const focusQuiet = el => { if (!el) return; if (!el.hasAttribute('tabindex') && !/^(A|BUTTON|INPUT|SELECT|TEXTAREA)$/.test(el.tagName)) el.setAttribute('tabindex', '-1'); try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); } };
    /* scroll just enough to show `el` below the nav; if it is taller than the screen, line up its top */
    function bringIntoView(el, pad) {
        if (!el) return;
        pad = pad == null ? 10 : pad;
        const r = el.getBoundingClientRect(), top = navH() + pad, bottom = innerHeight - pad;
        if (r.top < top || r.height > bottom - top) scrollBy({ top: r.top - top, behavior: behavior() });
        else if (r.bottom > bottom) scrollBy({ top: r.bottom - bottom, behavior: behavior() });
    }
    /* session memory: optional, everything works without storage */
    const mem = MB.use('core.state').mem;
    const visitsStore = mem('mb-visits-v1', {});
    const visits = visitsStore.get();
    const visit = id => { visits[id] = (visits[id] || 0) + 1; visitsStore.set(visits); return visits[id]; };

    /* ------------------------------------------------------------------
       Content, read from the templates
       ------------------------------------------------------------------ */
    const EXP = {}, SK = {};
    const xpT = $('#xpData');
    if (xpT) $$('.xp-panel', xpT.content).forEach(panel => {
        const cat = panel.dataset.panel, btn = $('#cat-' + cat); if (!btn) return;
        const items = $$('.xp-card', panel).map(card => {
            const html = sel => { const e = $(sel, card); return e ? e.innerHTML.trim() : ''; };
            return {
                id: card.id, cat, minor: card.classList.contains('xp-card--quiet'),
                date: html('.xp-date'), role: html('.xp-role'), org: html('.xp-org'), lead: html('.xp-lead'),
                notes: $$('.xp-more > ul:not(.xp-chips):not(.xp-samples) > li', card).map(li => li.innerHTML.trim()),
                chips: $$('.xp-chips li', card).map(li => li.innerHTML.trim()),
                links: $$('a[href^="http"]', card).map(a => ({ href: a.getAttribute('href'), text: a.firstChild.textContent.trim() })),
                skills: $$('a[data-skill]', card).map(a => ({ key: a.dataset.skill, text: a.textContent.trim() })),
                related: $$('a[data-goto]', card).map(a => ({ goto: a.dataset.goto, text: a.textContent.trim() }))
            };
        });
        EXP[cat] = { cat, kind: 'exp', btn, name: $('.g-name', btn).textContent.trim(), note: btn.dataset.note || '', items, sym: 'cl-' + cat, box: '0 0 120 110' };
    });
    const skT = $('#skData');
    if (skT) $$('section[data-cat]', skT.content).forEach(sec => {
        const cat = sec.dataset.cat, btn = $('#sk-' + cat); if (!btn) return;
        const intro = $('.sk-intro', sec);
        SK[cat] = {
            cat, kind: 'skill', btn, plant: sec.dataset.plant || 'blossom',
            name: $('.h-name', btn).textContent.trim(), no: $('.h-no', btn).textContent.trim(),
            intro: intro ? intro.innerHTML.trim() : '', sym: 'pf-' + cat, box: '0 0 100 100',
            items: $$('li[data-item]', sec).map(li => ({ id: 'skill:' + cat + ':' + li.dataset.item, name: li.dataset.item, html: li.innerHTML.trim(), minor: li.hasAttribute('data-minor') }))
        };
    });
    const PIECE_WORD = { fern: 'frond', umbel: 'floret', eucalyptus: 'leaf', geometric: 'petal', blossom: 'blossom', frilled: 'petal', wheat: 'stem', wildflower: 'flower' };

    /* ------------------------------------------------------------------
       Discoveries: categories gather in the bouquet, explored pieces add
       small sprays of filler. Marks beside each label say "visited".
       ------------------------------------------------------------------ */
    const CATS = {};
    Object.values(EXP).forEach(d => { CATS['exp:' + d.cat] = { id: 'exp:' + d.cat, kind: 'Experience', name: d.name, sym: d.sym, box: d.box, label: $('.g-label', d.btn) }; });
    Object.values(SK).forEach(d => { CATS['skill:' + d.cat] = { id: 'skill:' + d.cat, kind: 'Skills', name: d.name, sym: d.sym, box: d.box, label: $('.h-label', d.btn) }; });
    const foundStore = mem('mb-discoveries-v2', []), itemStore = mem('mb-found-items-v1', []);
    let found = foundStore.get().filter((id, i, a) => CATS[id] && a.indexOf(id) === i);
    let foundItems = itemStore.get().filter(x => typeof x === 'string');

    function setMark(id, fresh) {
        const c = CATS[id]; if (!c) return;
        const slot = $('.mark-slot', c.label), txt = $('.mark-text', c.label);
        if (slot && !slot.firstChild) {
            slot.innerHTML = '<svg viewBox="-10 -10 20 20" aria-hidden="true"' + (fresh ? ' class="fresh"' : '') + '><use href="#mk" x="-10" y="-10" width="20" height="20"/></svg>';
        }
        if (txt) txt.textContent = ' (visited)';
    }
    function clearMarks() { Object.values(CATS).forEach(c => { const s = $('.mark-slot', c.label), t = $('.mark-text', c.label); if (s) s.innerHTML = ''; if (t) t.textContent = ''; }); }
    function discover(id, fromEl) {
        if (!CATS[id] || found.includes(id)) return;
        found.push(id); foundStore.set(found); setMark(id, true);
        bouquet.collect(id, fromEl);
        /* the garden at the bottom keeps a sprig of every branch the visitor opened */
        if (window.GardenLog) GardenLog.add({ id: 'cat:' + id, kind: 'cluster', sym: CATS[id].sym, box: CATS[id].box });
        if (window.World) World.note(2);
    }
    function discoverItem(id, fromEl) {
        if (foundItems.includes(id)) return;
        foundItems.push(id); itemStore.set(foundItems);
        bouquet.sprinkle(fromEl);
        if (window.World) World.note(1);
    }

    /* ------------------------------------------------------------------
       Small creatures that answer what the visitor does. They go through
       the shared Life director, so they never pile up.
       ------------------------------------------------------------------ */
    const WINGS = (c1, c2) => '<svg viewBox="-24 -20 48 40" aria-hidden="true"><g class="bf-wing-l"><path d="M-1 -2 C-10 -20 -26 -16 -21 -3 C-18 4 -8 3 -1 0Z" fill="' + c1 + '"/><path d="M-1 1 C-9 3 -18 10 -13 16 C-8 19 -3 10 -1 3Z" fill="' + c2 + '"/></g><g class="bf-wing-r"><path d="M1 -2 C10 -20 26 -16 21 -3 C18 4 8 3 1 0Z" fill="' + c1 + '"/><path d="M1 1 C9 3 18 10 13 16 C8 19 3 10 1 3Z" fill="' + c2 + '"/></g><rect x="-1.5" y="-8" width="3" height="20" rx="1.5" fill="#5a4366"/><path d="M-1 -8 Q-5 -15 -7 -16 M1 -8 Q5 -15 7 -16" stroke="#5a4366" stroke-width="1" fill="none"/></svg>';
    const BEE = '<svg viewBox="-16 -14 32 28" aria-hidden="true"><g class="bee-wings"><ellipse cx="-4" cy="-8" rx="5" ry="7" fill="#eaf6ff" stroke="#a9cbe0" stroke-width=".8" transform="rotate(-25 -4 -8)"/><ellipse cx="4" cy="-8" rx="5" ry="7" fill="#eaf6ff" stroke="#a9cbe0" stroke-width=".8" transform="rotate(25 4 -8)"/></g><ellipse rx="10" ry="7.2" fill="#f6cf4a" stroke="#c9961a" stroke-width=".8"/><path d="M-4 -6.6 V6.6 M2 -7 V7" stroke="#4a3a2a" stroke-width="2.6"/><circle cx="10" cy="-1" r="4.4" fill="#4a3a2a"/><circle cx="11.6" cy="-2.2" r="1" fill="#fff"/><path d="M-10 0 L-13.5 0" stroke="#4a3a2a" stroke-width="1.4" stroke-linecap="round"/></svg>';
    const LADYBUG = '<svg viewBox="-10 -9 20 18" aria-hidden="true"><circle cx="7" cy="0" r="3.6" fill="#3a2b33"/><ellipse rx="7.4" ry="6.6" fill="#e2483d"/><path d="M-7.4 0 H7.4" stroke="#3a2b33" stroke-width=".9"/><circle cx="-3" cy="-3" r="1.3" fill="#3a2b33"/><circle cx="2" cy="-3.4" r="1.1" fill="#3a2b33"/><circle cx="-2.4" cy="3.2" r="1.2" fill="#3a2b33"/><circle cx="2.6" cy="3" r="1.3" fill="#3a2b33"/><circle cx="-5" cy="-1.8" r=".9" fill="#fff" opacity=".55"/></svg>';
    let lastVisit = 0;
    window.__visitFlower = (t, k) => visitFlower(t, k);   /* ecosystem.js sends the rare ambient visitor */
    /* a butterfly (or bee) flies to `target`, settles on it for a moment, then leaves */
    function visitFlower(target, kind) {
        if (reduce || document.hidden || !target || performance.now() - lastVisit < 9000) return;
        if (!Life.claim('visitor', 14000, true)) return;
        lastVisit = performance.now();
        const bee = kind === 'bee', el = document.createElement('div');
        el.className = 'visitor ' + (bee ? 'is-bee' : 'is-butterfly'); el.setAttribute('aria-hidden', 'true');
        const pal = [['#c9b2ec', '#f4a7bf'], ['#fbdc84', '#f9b8cf'], ['#a9d8ea', '#c9b2ec']][Math.floor(Math.random() * 3)];
        el.innerHTML = bee ? BEE : WINGS(pal[0], pal[1]);
        document.body.appendChild(el);
        const W = innerWidth, H = innerHeight, fromLeft = Math.random() < 0.5;
        let x = fromLeft ? -40 : W + 40, y = H * (0.2 + Math.random() * 0.4);
        const spot = () => { const r = target.getBoundingClientRect(); return { x: r.left + r.width * (0.4 + Math.random() * 0.2), y: r.top + r.height * 0.3 }; };
        const place = (px, py, rot) => { el.style.transform = 'translate(' + f1(px) + 'px,' + f1(py) + 'px) rotate(' + f1(rot) + 'deg)'; };
        place(x, y, 0);
        const go = (dur, to, wobble, done) => {
            const t0 = performance.now(), x0 = x, y0 = y;
            (function step(now) {
                if (!document.contains(el)) return;
                const t = Math.min(1, (now - t0) / dur), e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2, p = to();
                x = x0 + (p.x - x0) * e + Math.sin(t * Math.PI * 3) * wobble;
                y = y0 + (p.y - y0) * e - Math.sin(t * Math.PI) * 40 + Math.sin(t * 26) * (bee ? 4 : 2);
                place(x, y, Math.cos(t * 20) * (bee ? 8 : 14));
                if (t < 1) requestAnimationFrame(step); else done && done();
            })(t0);
        };
        const finish = () => { el.remove(); Life.release('visitor'); };
        const leave = () => { el.classList.remove('perched'); const ex = Math.random() < 0.5 ? -60 : W + 60; go(1700, () => ({ x: ex, y: -50 }), 30, finish); };
        const land = spot();
        go(2000, () => land, 26, () => {
            if (bee) {   /* a bee investigates: two small loops, then away */
                const c = spot(), t0 = performance.now();
                (function loop(now) {
                    if (!document.contains(el)) return;
                    const t = (now - t0) / 1600, a = t * Math.PI * 2;
                    x = c.x + Math.cos(a) * 18; y = c.y + Math.sin(a) * 9; place(x, y, Math.sin(a) * 10);
                    if (t < 2) requestAnimationFrame(loop); else leave();
                })(t0);
            } else {
                el.classList.add('perched');
                const stay = performance.now() + 2800;
                (function follow() { if (!document.contains(el)) return; const p = spot(); x += (p.x - x) * 0.25; y += (p.y - y) * 0.25; place(x, y, 0); if (performance.now() < stay) requestAnimationFrame(follow); else leave(); })();
                target.classList.add('is-visited-by'); setTimeout(() => target.classList.remove('is-visited-by'), 2800);
            }
        });
    }
    /* Should a creature come to visit the piece the visitor just chose for the first time?
       nthFound: how many pieces they have explored so far this visit (1 on their very first).
       isExp:    true for an Experience bloom (butterfly), false for a Skills piece (ladybug).
       visitFlower/ladybugOn already enforce a cooldown and the one-creature-at-a-time director. */
    function shouldVisit(nthFound, isExp) {
        // TODO(human): return true when a visitor should appear
        return false;
    }
    let lastBug = 0;
    function ladybugOn(piece) {
        if (reduce || !piece || performance.now() - lastBug < 12000) return;
        lastBug = performance.now();
        const bug = document.createElement('span'); bug.className = 'ladybug'; bug.setAttribute('aria-hidden', 'true'); bug.innerHTML = LADYBUG;
        piece.appendChild(bug); setTimeout(() => bug.remove(), 3600);
    }

    /* ------------------------------------------------------------------
       Shared geometry for an open plant (viewBox 400 x 380)
       ------------------------------------------------------------------ */
    const VW = 400, VH = 380, HC = { x: 200, y: 186 };
    function ring(n, seed, organic) {
        const R = rng(seed);
        const span = n <= 1 ? [270, 270] : n === 2 ? [234, 306] : n === 3 ? [214, 326] : n <= 5 ? [198, 342] : n <= 7 ? [186, 354] : [178, 362];
        const r0 = organic ? 148 : 138;
        return Array.from({ length: n }, (_, i) => {
            const t = n === 1 ? 0.5 : i / (n - 1);
            const a = span[0] + (span[1] - span[0]) * t + (organic ? (R() - 0.5) * 7 : 0);
            const r = r0 + (organic ? (R() - 0.5) * 22 : (i % 2 ? 9 : -6));
            const rad = a * Math.PI / 180;
            return { x: HC.x + Math.cos(rad) * r, y: HC.y + Math.sin(rad) * r * (organic ? 0.97 : 1.45) + (organic ? 0 : 55), a, rad };
        });
    }
    const pct = (v, of) => f1(v / of * 100) + '%';

    /* closed bud that opens into a six-petalled flower (Experience) */
    function budArt() {
        let pet = ''; for (let k = 0; k < 6; k++) pet += '<ellipse cx="0" cy="-10" rx="6.4" ry="10.4" transform="rotate(' + k * 60 + ')"/>';
        return '<svg class="gb-art" viewBox="-24 -24 48 48" aria-hidden="true"><g class="b-sepals"><path d="M0 3 C-8 5 -12 12 -11 19 C-6 15 -2 10 0 3Z"/><path d="M0 3 C8 5 12 12 11 19 C6 15 2 10 0 3Z"/></g>'
            + '<g class="b-pet">' + pet + '</g><circle class="b-core" r="4.4"/><path class="b-spark" d="M12 -15 l1.3 3.4 3.4 1.3 -3.4 1.3 -1.3 3.4 -1.3 -3.4 -3.4 -1.3 3.4 -1.3Z"/></svg>';
    }
    /* one piece of a pressed specimen (Skills); drawn pointing up, rotated outward by the caller */
    const PIECE = {
        fern: () => { let s = '<path class="p-rib" d="M0 20 L0 -21"/>'; for (let k = 0; k < 6; k++) { const y = 14 - k * 6.4, r = 6.2 - k * 0.7; s += '<ellipse cx="' + f1(-r * 0.9) + '" cy="' + f1(y) + '" rx="' + f1(r) + '" ry="2.2" transform="rotate(28 ' + f1(-r * 0.9) + ' ' + f1(y) + ')"/><ellipse cx="' + f1(r * 0.9) + '" cy="' + f1(y - 2) + '" rx="' + f1(r) + '" ry="2.2" transform="rotate(-28 ' + f1(r * 0.9) + ' ' + f1(y - 2) + ')"/>'; } return s; },
        umbel: () => { let s = '<path class="p-rib" d="M0 20 L0 -6"/>'; for (let k = 0; k < 7; k++) { const a = -Math.PI / 2 + (k - 3) * 0.42, x = Math.cos(a) * 11, y = -6 + Math.sin(a) * 11; s += '<path class="p-rib thin" d="M0 -6 L' + f1(x) + ' ' + f1(y) + '"/><circle cx="' + f1(x) + '" cy="' + f1(y) + '" r="3.4"/>'; } return s + '<circle class="p-core" cx="0" cy="-6" r="2"/>'; },
        eucalyptus: () => '<path class="p-rib" d="M0 21 L0 -19"/><circle cx="0" cy="-10" r="9.5"/><circle cx="-6" cy="8" r="6"/><circle cx="6" cy="10" r="5"/><path class="p-vein" d="M0 -19 V0 M-6 3 V13 M6 6 V15"/>',
        geometric: () => '<path d="M0 -21 L9 -5 L0 19 L-9 -5Z"/><path class="p-vein" d="M0 -21 V19 M-9 -5 H9"/>',
        blossom: () => { let s = '<path class="p-rib" d="M0 21 L0 -2"/>'; for (let k = 0; k < 5; k++) { const a = k * 72 * Math.PI / 180; s += '<circle cx="' + f1(Math.sin(a) * 6.5) + '" cy="' + f1(-9 - Math.cos(a) * 6.5) + '" r="5.6"/>'; } return s + '<circle class="p-core" cx="0" cy="-9" r="3"/>'; },
        frilled: () => '<path d="M0 19 C-11 8 -11 -12 -5.5 -20 L-2.4 -15.5 L0 -20.5 L2.4 -15.5 L5.5 -20 C11 -12 11 8 0 19Z"/><path class="p-vein" d="M0 17 V-14"/>',
        wheat: () => { let s = '<path class="p-rib" d="M0 21 L0 -20"/>'; for (let k = 0; k < 4; k++) { const y = 8 - k * 7; s += '<ellipse cx="-3.4" cy="' + y + '" rx="2.8" ry="4.8" transform="rotate(-24 -3.4 ' + y + ')"/><ellipse cx="3.4" cy="' + (y - 2) + '" rx="2.8" ry="4.8" transform="rotate(24 3.4 ' + (y - 2) + ')"/>'; } return s + '<ellipse cx="0" cy="-20" rx="2.6" ry="4.2"/>'; },
        wildflower: () => { let s = '<path class="p-rib" d="M0 21 L0 -2"/><ellipse class="p-leaf" cx="-5" cy="11" rx="5" ry="2" transform="rotate(-30 -5 11)"/>'; for (let k = 0; k < 5; k++) { const a = k * 72 * Math.PI / 180; s += '<circle cx="' + f1(Math.sin(a) * 6) + '" cy="' + f1(-9 - Math.cos(a) * 6) + '" r="5.4"/>'; } return s + '<circle class="p-core gold" cx="0" cy="-9" r="3.2"/>'; }
    };
    const pieceArt = (plant, rot) => '<svg class="gb-art" viewBox="-24 -24 48 48" aria-hidden="true"><g transform="rotate(' + f1(rot) + ')">' + (PIECE[plant] || PIECE.blossom)() + '</g></svg>';

    /* ------------------------------------------------------------------
       The stage: one per section. open() -> fly + grow, select() -> one
       note at a time, close() -> everything folds back the way it came.
       ------------------------------------------------------------------ */
    function Stage(cfg) {
        const { kind, garden, row, root, data } = cfg;
        const isExp = kind === 'exp';
        const S = { cat: null, active: -1, busy: false, n: 0 };
        root.innerHTML =
            '<div class="gs-inner">'
            + '<div class="gs-close-wrap"><button type="button" class="gs-close"><span aria-hidden="true">&times;</span><span class="vh gs-close-name">Close</span></button></div>'
            + '<div class="gs-plant">'
            + '<svg class="gs-lines" viewBox="0 0 ' + VW + ' ' + VH + '" preserveAspectRatio="none" aria-hidden="true"></svg>'
            + '<button type="button" class="gs-head"><svg class="gs-head-art" aria-hidden="true"><use/></svg><span class="gs-extra" aria-hidden="true"></span></button>'
            + '<div class="gs-pieces" role="group"></div>'
            + '<div class="gs-tip" aria-hidden="true"></div>'
            + '</div>'
            + '<div class="gs-note"><div class="gn-body" aria-live="polite"></div>'
            + '<div class="gn-nav"><button type="button" class="gn-prev" aria-label="Previous"><span aria-hidden="true">&lsaquo;</span></button><span class="gn-count"></span><button type="button" class="gn-next" aria-label="Next"><span aria-hidden="true">&rsaquo;</span></button></div>'
            + '</div></div>';
        const inner = $('.gs-inner', root), plant = $('.gs-plant', root), lines = $('.gs-lines', root), head = $('.gs-head', root), headArt = $('.gs-head-art', root);
        const piecesEl = $('.gs-pieces', root), tip = $('.gs-tip', root), body = $('.gn-body', root), note = $('.gs-note', root);
        const prevB = $('.gn-prev', root), nextB = $('.gn-next', root), count = $('.gn-count', root), closeB = $('.gs-close', root);
        root.classList.add('gs-' + kind);

        /* head box inside the 400 x 380 plant (percentages so it scales with the plant) */
        const HB = isExp ? { x: 114, y: 112, w: 172, h: 158 } : { x: 110, y: 96, w: 180, h: 180 };
        Object.assign(head.style, { left: pct(HB.x, VW), top: pct(HB.y, VH), width: pct(HB.w, VW), height: pct(HB.h, VH) });

        function build(d) {
            const n = d.items.length, pos = ring(n, hash(d.cat), isExp);
            S.n = n; S.pos = pos;
            root.dataset.cat = d.cat;
            if (!isExp) root.style.cssText = '--sk:' + d.btn.style.getPropertyValue('--sk') + ';--sk-soft:' + d.btn.style.getPropertyValue('--sk-soft');
            headArt.setAttribute('viewBox', d.box); $('use', headArt).setAttribute('href', '#' + d.sym);
            head.setAttribute('aria-label', d.name + ': back to all ' + (isExp ? 'experience' : 'skills'));
            $('.gs-close-name', root).textContent = 'Close ' + d.name;
            piecesEl.setAttribute('aria-label', d.name + (isExp ? ' experiences' : ' skills'));
            /* returning visitors find a new little bud on a plant they have opened before */
            const again = Math.min(3, (visits[(isExp ? 'exp:' : 'skill:') + d.cat] || 0));
            $('.gs-extra', root).innerHTML = Array.from({ length: again }, (_, k) => '<i style="--k:' + k + '"><svg viewBox="-10 -10 20 20"><use href="#mk" x="-10" y="-10" width="20" height="20"/></svg></i>').join('');

            /* stems / pin lines */
            let g = '';
            if (isExp) {
                g += '<path class="gs-stem" pathLength="1" d="M200 380 C196 340 205 300 200 ' + (HB.y + HB.h - 34) + '"/>';
                g += '<g class="gs-leaf" style="--i:0"><use href="#fl-leaf" x="200" y="318" width="22" height="22" transform="rotate(-20 200 340)" style="color:#8db36a"/></g>';
                g += '<g class="gs-leaf" style="--i:1"><use href="#fl-leaf" x="200" y="300" width="20" height="20" transform="rotate(-110 200 320)" style="color:#7fa65c"/></g>';
            } else {
                g += '<rect class="gs-tape" x="186" y="262" width="34" height="11" rx="1.5" transform="rotate(-6 203 268)"/>';
            }
            pos.forEach((p, i) => {
                const dx = p.x - HC.x, dy = p.y - HC.y, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L;
                const sx = HC.x + ux * (isExp ? 44 : 70), sy = HC.y + uy * (isExp ? 40 : 70);
                const ex = p.x - ux * 16, ey = p.y - uy * 16, bend = (i % 2 ? 1 : -1) * (isExp ? 14 : 6);
                const cx = (sx + ex) / 2 - uy * bend, cy = (sy + ey) / 2 + ux * bend;
                g += '<path class="gs-branch" pathLength="1" style="--i:' + i + ';--ri:' + (n - 1 - i) + '" d="M' + f1(sx) + ' ' + f1(sy) + ' Q' + f1(cx) + ' ' + f1(cy) + ' ' + f1(ex) + ' ' + f1(ey) + '"/>';
                if (isExp && !d.items[i].minor) {
                    const mx = (sx + 2 * cx + ex) / 4, my = (sy + 2 * cy + ey) / 4, side = i % 2 ? 1 : -1, ang = Math.atan2(uy, ux) * 180 / Math.PI + 45 + side * 50;
                    g += '<g class="gs-leaf" style="--i:' + (i + 2) + '"><use href="#fl-leaf" x="' + f1(mx) + '" y="' + f1(my - 11) + '" width="11" height="11" transform="rotate(' + f1(ang) + ' ' + f1(mx) + ' ' + f1(my) + ')" style="color:' + (i % 2 ? '#8db36a' : '#a3c47f') + '"/></g>';
                }
            });
            lines.innerHTML = g;

            /* buds / pieces */
            piecesEl.innerHTML = '';
            d.items.forEach((it, i) => {
                const p = pos[i], b = document.createElement('button');
                b.type = 'button'; b.className = 'gs-bud' + (it.minor ? ' is-minor' : '') + ((visits[it.id] || 0) ? ' is-seen' : '');
                b.style.cssText = 'left:' + pct(p.x, VW) + ';top:' + pct(p.y, VH) + ';--i:' + i + ';--ri:' + (n - 1 - i) + ';--tilt0:' + f1(isExp ? (p.a - 270) * 0.18 : 0) + 'deg';
                b.dataset.i = i;
                b.setAttribute('aria-pressed', 'false');
                if (isExp) {
                    b.setAttribute('aria-label', plain(it.role) + ', ' + plain(it.org));
                    b.innerHTML = budArt();
                } else {
                    b.setAttribute('aria-label', it.name);
                    /* labels lean out along the piece's own direction, away from its neighbours */
                    const a = ((p.a % 360) + 360) % 360;
                    const side = a >= 160 && a < 224 ? 'l' : a >= 224 && a < 254 ? 'tl' : a >= 254 && a <= 286 ? 't' : a > 286 && a <= 316 ? 'tr' : 'r';
                    b.innerHTML = pieceArt(d.plant, p.a + 90) + '<span class="gs-lab" data-side="' + side + '">' + esc(it.name) + '</span>';
                }
                piecesEl.appendChild(b);
            });
            showIntro(d);
        }
        /* buds start at the heart of the flower: offsets in px, measured once the plant has a size */
        function measure() {
            const k = plant.clientWidth / VW; if (!k || !S.pos) return;
            $$('.gs-bud', piecesEl).forEach((b, i) => { const p = S.pos[i]; b.style.setProperty('--fx', f1((HC.x - p.x) * k) + 'px'); b.style.setProperty('--fy', f1((HC.y - p.y) * k) + 'px'); });
            fitLabels();
        }
        /* Place labels above their pieces, avoiding every illustration and label.
           Extra headroom grows with the text instead of pushing it onto a petal. */
        function fitLabels() {
            if (isExp || !S.pos) return;
            piecesEl.classList.add('gs-measure');
            const pr = plant.getBoundingClientRect();
            const buds = $$('.gs-bud', piecesEl);
            const box = r => ({ left: r.left - pr.left, right: r.right - pr.left, top: r.top - pr.top, bottom: r.bottom - pr.top });
            const obstacles = buds.map(b => {
                const r = box(b.getBoundingClientRect()), pad = 6;
                return { left: r.left - pad, right: r.right + pad, top: r.top - pad, bottom: r.bottom + pad };
            });
            const placed = [], width = Math.min(140, Math.max(84, pr.width * 0.27));
            const hits = (a, b) => a.left < b.right + 4 && a.right > b.left - 4 && a.top < b.bottom + 4 && a.bottom > b.top - 4;
            const hc = { x: HC.x / VW * pr.width, y: HC.y / VH * pr.height };
            const gap = pr.width < 420 ? 4 : 8;
            let highest = 0;
            buds.forEach((b, i) => {
                const label = $('.gs-lab', b), br = box(b.getBoundingClientRect());
                label.style.setProperty('--label-width', 'max-content');
                label.style.maxWidth = width + 'px';
                const lr = label.getBoundingClientRect(), lw = lr.width, lh = lr.height;
                const cx = (br.left + br.right) / 2, cy = (br.top + br.bottom) / 2;
                /* outward direction from the flower's heart decides which edge of the petal the label hugs */
                const ox = cx - hc.x, oy = cy - hc.y, mostlySide = Math.abs(ox) > Math.abs(oy) * 1.6;
                const clampX = x => Math.max(2, Math.min(pr.width - lw - 2, x));
                const spotsAt = e => {
                    const above = { left: clampX(cx - lw / 2), top: br.top - lh - gap - e };
                    const outer = { left: clampX(ox >= 0 ? br.right + gap + e : br.left - gap - e - lw), top: cy - lh / 2 };
                    const diag = { left: clampX(ox >= 0 ? cx - 4 : cx + 4 - lw), top: br.top - lh - gap - e };
                    const below = { left: clampX(cx - lw / 2), top: br.bottom + gap + e };
                    return mostlySide ? [outer, above, diag, below] : [above, diag, outer, below];
                };
                /* only spots touching the petal's own edge (a few px of slack at most), never a free search;
                   if every one collides, take the one that overlaps least */
                const area = (r, o) => Math.max(0, Math.min(r.right, o.right) - Math.max(r.left, o.left)) * Math.max(0, Math.min(r.bottom, o.bottom) - Math.max(r.top, o.top));
                let pick = null, bestOverlap = Infinity;
                search: for (const e of [0, 8, 18]) {
                    for (const sp of spotsAt(e)) {
                        const rect = { left: sp.left, right: sp.left + lw, top: sp.top, bottom: sp.top + lh };
                        const others = obstacles.filter((_, k) => k !== i).concat(placed).map(r => ({ left: r.left - 4, right: r.right + 4, top: r.top - 4, bottom: r.bottom + 4 }));
                        const overlap = others.concat([obstacles[i]]).reduce((t, r) => t + area(rect, r), 0);
                        if (overlap < bestOverlap) { bestOverlap = overlap; pick = rect; }
                        if (!overlap) break search;
                    }
                }
                label.style.setProperty('--label-x', (pick.left - br.left) + 'px');
                label.style.setProperty('--label-y', (pick.top - br.top) + 'px');
                placed.push(pick); highest = Math.min(highest, pick.top);
            });
            plant.style.setProperty('--label-headroom', Math.max(60, (innerWidth <= 700 ? 56 : 28) - highest) + 'px');
            piecesEl.classList.remove('gs-measure');
        }
        if (document.fonts) document.fonts.ready.then(() => { if (S.cat) measure(); });
        addEventListener('resize', () => { clearTimeout(measure.t); measure.t = setTimeout(measure, 120); });

        /* --- the note beside (or under) the plant: one thing at a time --- */
        function swapNote(html) {
            if (!reduce) { note.classList.remove('swap'); void note.offsetWidth; note.classList.add('swap'); }
            body.innerHTML = html;
        }
        /* Experience: every role and where it was, visible at once (one row per bud); a row or its bud opens
           that item's field note in place, with dates and details */
        function detailHTML(it) {
            let h = (it.date ? '<p class="xl-date">' + it.date + '</p>' : '') + '<p class="gn-text">' + it.lead + '</p>';
            if (it.notes.length) h += '<ul class="gn-notes">' + it.notes.map(x => '<li>' + x + '</li>').join('') + '</ul>';
            if (it.chips.length) h += '<ul class="gn-chips">' + it.chips.map(x => '<li>' + x + '</li>').join('') + '</ul>';
            let acts = '';
            it.links.forEach(l => { acts += '<a class="gn-link" href="' + esc(l.href) + '" target="_blank" rel="noopener">' + esc(l.text) + ' <span aria-hidden="true">&#8599;&#xFE0E;</span><span class="vh"> (opens in a new tab)</span></a>'; });
            it.related.forEach(r => { acts += '<a class="gn-link" href="#' + esc(r.goto.split(':')[1]) + '" data-goto="' + esc(r.goto) + '">' + esc(r.text) + '</a>'; });
            if (it.skills.length) acts += '<span class="gn-sprigs"><span class="vh">Skills used: </span>' + it.skills.map(x => '<a href="#sk-' + esc(x.key) + '" data-skill="' + esc(x.key) + '">' + esc(x.text) + '</a>').join('') + '</span>';
            return h + (acts ? '<div class="gn-acts">' + acts + '</div>' : '');
        }
        function listHTML(d) {
            const row = i => {
                const it = d.items[i];
                return '<li class="xl-item' + (it.minor ? ' is-minor' : '') + '" data-i="' + i + '" style="--i:' + i + '">'
                    + '<button type="button" class="xl-row" aria-expanded="false" aria-controls="xl-' + esc(it.id) + '">'
                    + '<svg class="xl-mark" viewBox="-10 -10 20 20" aria-hidden="true"><use href="#mk" x="-10" y="-10" width="20" height="20"/></svg>'
                    + '<span class="xl-text"><span class="xl-role">' + it.role + '</span><span class="xl-org">' + it.org + '</span></span>'
                    + '<span class="xl-chev" aria-hidden="true"></span></button>'
                    + '<div class="xl-detail" id="xl-' + esc(it.id) + '" hidden>' + detailHTML(it) + '</div></li>';
            };
            const idx = d.items.map((_, i) => i), main = idx.filter(i => !d.items[i].minor), minor = idx.filter(i => d.items[i].minor);
            return '<p class="gn-kicker xl-cat">' + esc(d.name) + '</p><h3 class="gn-title" tabindex="-1">' + esc(d.note) + '</h3>'
                + '<ol class="xl-list">' + main.map(row).join('') + '</ol>'
                + (minor.length ? '<p class="xl-also">also</p><ol class="xl-list xl-list--quiet">' + minor.map(row).join('') + '</ol>' : '');
        }
        function showIntro(d) {
            const word = isExp ? 'bloom' : 'skill';
            if (isExp) {
                swapNote(listHTML(d));
                if (window.__rainbow) window.__rainbow($('.xl-cat', body));
                count.textContent = ''; prevB.disabled = nextB.disabled = true;
                return;
            }
            swapNote(isExp
                ? '<p class="gn-kicker">' + esc(d.name) + '</p><h3 class="gn-title" tabindex="-1">' + esc(d.note) + '</h3><p class="gn-text gn-quiet">' + d.items.length + ' ' + word + 's on this branch. Choose one to read its field note.</p>'
                : '<p class="gn-kicker">' + esc(d.no) + ' &middot; pressed specimen</p><h3 class="gn-title" tabindex="-1">' + esc(d.name) + '</h3>'
                  + (d.intro ? '<p class="gn-text">' + d.intro + '</p>' : '') + '<p class="gn-text gn-quiet">Choose a ' + word + ' to read its label.</p>');
            count.textContent = d.items.length + ' ' + word + 's';
            prevB.disabled = true; nextB.disabled = false;
        }
        function itemNote(d, it, i) {
            if (!isExp) {
                return '<p class="gn-kicker">' + esc(d.name) + ' &middot; ' + esc(PIECE_WORD[d.plant] || 'piece') + ' ' + (i + 1) + '</p><h3 class="gn-title" tabindex="-1">' + esc(it.name) + '</h3>'
                    + (it.html ? '<p class="gn-text">' + it.html + '</p>' : '<p class="gn-text gn-quiet">Part of the ' + esc(d.name) + ' collection.</p>');
            }
            const hasMore = it.notes.length || it.chips.length;
            let h = '<p class="gn-kicker">' + it.date + '</p><h3 class="gn-title" tabindex="-1">' + it.role + '</h3><p class="gn-org">' + it.org + '</p>'
                + '<div class="gn-pages"><div class="gn-page is-on"><p class="gn-text">' + it.lead + '</p></div>';
            if (hasMore) h += '<div class="gn-page" hidden>' + (it.notes.length ? '<ul class="gn-notes">' + it.notes.map(x => '<li>' + x + '</li>').join('') + '</ul>' : '') + (it.chips.length ? '<ul class="gn-chips">' + it.chips.map(x => '<li>' + x + '</li>').join('') + '</ul>' : '') + '</div>';
            h += '</div><div class="gn-acts">';
            if (hasMore) h += '<button type="button" class="gn-more" aria-expanded="false">field notes</button>';
            it.links.forEach(l => { h += '<a class="gn-link" href="' + esc(l.href) + '" target="_blank" rel="noopener">' + esc(l.text) + ' <span aria-hidden="true">&#8599;&#xFE0E;</span><span class="vh"> (opens in a new tab)</span></a>'; });
            it.related.forEach(r => { h += '<a class="gn-link" href="#' + esc(r.goto.split(':')[1]) + '" data-goto="' + esc(r.goto) + '">' + esc(r.text) + '</a>'; });
            if (it.skills.length) h += '<span class="gn-sprigs"><span class="vh">Skills used: </span>' + it.skills.map(s => '<a href="#sk-' + esc(s.key) + '" data-skill="' + esc(s.key) + '">' + esc(s.text) + '</a>').join('') + '</span>';
            return h + '</div>';
        }
        note.addEventListener('click', e => {
            const more = e.target.closest('.gn-more'); if (!more) return;
            const pages = $$('.gn-page', note), open = more.getAttribute('aria-expanded') !== 'true';
            pages[0].hidden = open; pages[1].hidden = !open; pages.forEach((pg, k) => pg.classList.toggle('is-on', open ? k === 1 : k === 0));
            more.setAttribute('aria-expanded', String(open)); more.textContent = open ? 'summary' : 'field notes';
        });

        function setRows(i) {
            $$('.xl-item', body).forEach(li => {
                const on = +li.dataset.i === i, row = $('.xl-row', li), det = $('.xl-detail', li);
                li.classList.toggle('is-open', on); row.setAttribute('aria-expanded', String(on)); det.hidden = !on;
            });
        }
        function select(i, opts) {
            opts = opts || {};
            const d = data[S.cat]; if (!d) return;
            const buds = $$('.gs-bud', piecesEl);
            /* Experience: choosing the open item again folds it back */
            if (isExp && opts.toggle && i === S.active) i = -1;
            if (i == null || i < 0 || i >= buds.length) { S.active = -1; buds.forEach(b => { b.classList.remove('is-active'); b.setAttribute('aria-pressed', 'false'); b.style.removeProperty('--px'); b.style.removeProperty('--py'); }); if (isExp) setRows(-1); else showIntro(d); return; }
            S.active = i;
            buds.forEach((b, k) => {
                const on = k === i; b.classList.toggle('is-active', on); b.setAttribute('aria-pressed', String(on));
                /* neighbours lean out of the way, along the curve of the ring */
                const dk = k - i, push = on ? 0 : Math.sign(dk) * Math.max(0, 10 - (Math.abs(dk) - 1) * 4), p = S.pos[k];
                b.style.setProperty('--px', f1(-Math.sin(p.rad) * push) + 'px'); b.style.setProperty('--py', f1(Math.cos(p.rad) * push) + 'px');
            });
            const it = d.items[i], bud = buds[i];
            if (isExp) {
                setRows(i);
                const li = $('.xl-item[data-i="' + i + '"]', body);
                if (li && (opts.reveal || opts.scroll)) setTimeout(() => bringIntoView(li, 16), 30);
                if (li && opts.focus) focusQuiet($('.xl-row', li));
            } else {
                swapNote(itemNote(d, it, i));
                count.textContent = (i + 1) + ' / ' + buds.length;
                prevB.disabled = false; nextB.disabled = i >= buds.length - 1;
            }
            const first = !visits[it.id]; visit(it.id); bud.classList.add('is-seen');
            discoverItem(it.id, bud);
            if (opts.focus && !isExp) focusQuiet(bud);
            if (opts.scroll && !isExp) bringIntoView(inner);
            /* sometimes a visitor comes to see what you opened (a butterfly on a bloom, a ladybug on a specimen piece) */
            if (first && !opts.quiet && shouldVisit(foundItems.length, isExp)) {
                if (isExp) visitFlower(bud, 'butterfly'); else ladybugOn(bud);
            }
        }
        prevB.addEventListener('click', () => select(S.active - 1));
        nextB.addEventListener('click', () => select(S.active + 1));
        piecesEl.addEventListener('click', e => { const b = e.target.closest('.gs-bud'); if (b) select(+b.dataset.i, { toggle: true, reveal: true }); });
        if (isExp) {
            /* the list and the buds answer each other: hover (or focus) one and its partner lights up */
            const hot = (i, on) => {
                const b = piecesEl.children[i], li = $('.xl-item[data-i="' + i + '"]', body);
                if (b) b.classList.toggle('is-hot', on); if (li) li.classList.toggle('is-hot', on);
                if (b && window.__spin && on && fine) { const art = $('.gb-art', b); if (art) art.animate([{ rotate: '0deg' }, { rotate: '72deg' }], { duration: 700, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)', composite: 'add' }); }
            };
            body.addEventListener('click', e => { const r = e.target.closest('.xl-row'); if (r) select(+r.parentElement.dataset.i, { toggle: true }); });
            body.addEventListener('pointerover', e => { const r = e.target.closest('.xl-item'); if (r && !r.contains(e.relatedTarget)) hot(+r.dataset.i, true); });
            body.addEventListener('pointerout', e => { const r = e.target.closest('.xl-item'); if (r && !r.contains(e.relatedTarget)) hot(+r.dataset.i, false); });
            body.addEventListener('focusin', e => { const r = e.target.closest('.xl-row'); if (r) hot(+r.parentElement.dataset.i, true); });
            body.addEventListener('focusout', e => { const r = e.target.closest('.xl-row'); if (r) hot(+r.parentElement.dataset.i, false); });
            piecesEl.addEventListener('pointerover', e => { const b = e.target.closest('.gs-bud'); if (b && !b.contains(e.relatedTarget)) hot(+b.dataset.i, true); });
            piecesEl.addEventListener('pointerout', e => { const b = e.target.closest('.gs-bud'); if (b && !b.contains(e.relatedTarget)) hot(+b.dataset.i, false); });
        }
        piecesEl.addEventListener('keydown', e => {
            const b = e.target.closest('.gs-bud'); if (!b) return;
            const k = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key], buds = $$('.gs-bud', piecesEl);
            let j = null;
            if (k) j = (+b.dataset.i + k + buds.length) % buds.length; else if (e.key === 'Home') j = 0; else if (e.key === 'End') j = buds.length - 1;
            if (j != null) { e.preventDefault(); focusQuiet(buds[j]); }
        });
        /* swipe the note on touch screens to move between pieces */
        let sx = null;
        note.addEventListener('touchstart', e => { sx = e.touches[0].clientX; }, { passive: true });
        note.addEventListener('touchend', e => { if (sx == null || isExp) return; const dx = e.changedTouches[0].clientX - sx; sx = null; if (Math.abs(dx) > 60) select(clamp(S.active + (dx < 0 ? 1 : -1), 0, S.n - 1)); }, { passive: true });

        /* hover: buds lean toward the cursor, the head follows a little; a short label appears (Experience) */
        if (fine && !reduce) {
            let q = 0, ev = null;
            plant.addEventListener('pointermove', e => { ev = e; if (q) return; q = requestAnimationFrame(() => {
                q = 0;
                $$('.gs-bud', piecesEl).forEach(b => {
                    const r = b.getBoundingClientRect(), dx = ev.clientX - (r.left + r.width / 2), dy = ev.clientY - (r.top + r.height / 2), dist = Math.hypot(dx, dy);
                    b.style.setProperty('--lean', dist < 110 ? f1(clamp(dx / 6, -12, 12) * (1 - dist / 110)) + 'deg' : '0deg');
                });
                const hr = head.getBoundingClientRect();
                head.style.setProperty('--lean', f1(clamp((ev.clientX - (hr.left + hr.width / 2)) / 40, -4, 4)) + 'deg');
            }); });
            plant.addEventListener('pointerleave', () => { $$('.gs-bud', piecesEl).forEach(b => b.style.setProperty('--lean', '0deg')); head.style.setProperty('--lean', '0deg'); tip.classList.remove('on'); });
        }
        /* skills: the specimen can be nudged and tilted very slightly, and springs back */
        if (!isExp) {
            let drag = null;
            head.addEventListener('pointerdown', e => { if (e.button) return; drag = { x: e.clientX, y: e.clientY, moved: false, id: e.pointerId }; });
            addEventListener('pointermove', e => {
                if (!drag || e.pointerId !== drag.id) return;
                const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
                if (!drag.moved && Math.hypot(dx, dy) > 6) { drag.moved = true; head.classList.add('dragging'); try { head.setPointerCapture(drag.id); } catch (_) { } }
                if (drag.moved) { head.style.setProperty('--nx', f1(clamp(dx * 0.25, -14, 14)) + 'px'); head.style.setProperty('--ny', f1(clamp(dy * 0.25, -14, 14)) + 'px'); head.style.setProperty('--nr', f1(clamp(dx * 0.06, -4, 4)) + 'deg'); }
            });
            const end = () => { if (!drag) return; const moved = drag.moved; drag = null; head.classList.remove('dragging'); ['--nx', '--ny', '--nr'].forEach(v => head.style.removeProperty(v)); if (moved) head.dataset.dragged = '1'; };
            addEventListener('pointerup', end); addEventListener('pointercancel', end);
        }
        head.addEventListener('click', e => { if (head.dataset.dragged) { delete head.dataset.dragged; e.preventDefault(); return; } close(); });
        closeB.addEventListener('click', () => close());

        /* --- the selected flower/specimen travels between the row and the stage --- */
        function docRect(el) { const r = el.getBoundingClientRect(); return { x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height }; }
        function flight(from, to, d, back) {
            if (reduce) return Promise.resolve();
            const c = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            c.setAttribute('class', 'gs-fly'); c.setAttribute('viewBox', d.box); c.setAttribute('aria-hidden', 'true');
            c.innerHTML = '<use href="#' + d.sym + '"/>';
            Object.assign(c.style, { left: from.x + 'px', top: from.y + 'px', width: from.w + 'px', height: from.h + 'px' });
            document.body.appendChild(c);
            const sx = to.w / from.w, sy = to.h / from.h, dx = to.x - from.x, dy = to.y - from.y, lift = Math.min(60, Math.abs(dy) * 0.25 + 20);
            const a = c.animate([
                { transform: 'translate(0,0) scale(1,1) rotate(0deg)' },
                { transform: 'translate(' + f1(dx * 0.5) + 'px,' + f1(dy * 0.5 - lift) + 'px) scale(' + f1((1 + sx) / 2) + ',' + f1((1 + sy) / 2) + ') rotate(' + (back ? -6 : 6) + 'deg)', offset: 0.55 },
                { transform: 'translate(' + f1(dx) + 'px,' + f1(dy) + 'px) scale(' + sx.toFixed(3) + ',' + sy.toFixed(3) + ') rotate(0deg)' }
            ], { duration: back ? 560 : 680, easing: 'cubic-bezier(0.45, 0, 0.2, 1)', fill: 'forwards' });
            return settle(a, back ? 560 : 680).then(() => c);
        }

        async function open(cat, opts) {
            opts = opts || {};
            const d = data[cat]; if (!d) return;
            if (S.busy) { S.next = [cat, opts]; return; }   /* chosen mid-flight: open it as soon as this one lands */
            S.busy = true;
            if (S.closing) await S.closing;   /* a fast second click waits for the first plant to fold away */
            if (S.cat === cat) { S.busy = false; if (opts.select != null) select(opts.select, { focus: opts.focus !== false, scroll: true }); else bringIntoView(garden); return; }
            if (S.cat) await close({ quick: true, keepRow: true });
            const srcArt = $('svg', d.btn), from = docRect(srcArt);
            S.cat = cat; S.active = -1;
            build(d);
            row.classList.add('compact'); garden.classList.add('is-open');
            $$('[aria-controls="' + root.id + '"]', row).forEach(b => { const on = b === d.btn; b.setAttribute('aria-expanded', String(on)); b.classList.toggle('is-current', on); });
            root.hidden = false;
            plant.classList.remove('grown', 'folding'); head.classList.add('is-landing');
            await frame();
            measure();
            /* quiet: opened for the visitor before they choose anything (no flight, no scrolling, no focus, not a
               "discovery"); the branch grows the first time it is actually on screen */
            const quiet = !!opts.quiet;
            if (!quiet) bringIntoView(!isExp && innerWidth <= 700 ? inner : garden, 8);
            const n = quiet ? (visits[(isExp ? 'exp:' : 'skill:') + cat] || 0) : visit((isExp ? 'exp:' : 'skill:') + cat);
            const clone = quiet ? null : await flight(from, docRect(headArt), d, false);
            head.classList.remove('is-landing');
            if (clone) clone.remove();
            const grow = () => { if (S.cat !== cat) return; plant.classList.add('grown'); setTimeout(() => { if (S.cat === cat) plant.classList.add('settled'); }, reduce ? 0 : 1100 + S.n * 75); };
            if (quiet && !reduce) { const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); grow(); } }, { threshold: 0.3 }); io.observe(plant); }
            else grow();
            if (n > 1 && !reduce) head.classList.add('regrow');
            if (!quiet) discover((isExp ? 'exp:' : 'skill:') + cat, head);
            S.busy = false;
            if (opts.select != null) select(opts.select, { focus: opts.focus !== false, quiet: true, scroll: true });
            else if (opts.focus !== false && !quiet) focusQuiet($('.gn-title', note));
            /* a visitor comes to the flower you just opened, now and then */
            if (!reduce && !quiet && n === 1 && Math.random() < (isExp ? 0.5 : 0.4)) setTimeout(() => { if (S.cat === cat) visitFlower(headArt, isExp ? 'butterfly' : 'bee'); }, 1400);
            if (S.next) { const [c2, o2] = S.next; S.next = null; if (c2 !== cat || o2.select != null) open(c2, o2); }
        }

        function close(opts) {
            if (S.closing) return S.closing;
            if (!S.cat) return Promise.resolve();
            S.closing = closeNow(opts || {}).finally(() => { S.closing = null; });
            return S.closing;
        }
        async function closeNow(opts) {
            const d = data[S.cat], btn = d.btn, srcArt = $('svg', btn);
            plant.classList.remove('grown', 'settled'); plant.classList.add('folding'); head.classList.remove('regrow');
            tip.classList.remove('on');
            if (!reduce) await wait(opts.quick ? 260 : Math.min(620, 300 + S.n * 40));
            const from = docRect(headArt);
            head.classList.add('is-landing');
            if (!opts.keepRow) {
                /* settle the row instantly so the flower knows where home is */
                row.classList.add('no-anim'); row.classList.remove('compact'); garden.classList.remove('is-open');
            }
            root.hidden = true;
            btn.classList.remove('is-current'); btn.setAttribute('aria-expanded', 'false');
            if (!opts.quick && !reduce) {
                void row.offsetWidth;
                const r = btn.getBoundingClientRect();
                if (r.top < navH() || r.bottom > innerHeight) scrollBy({ top: r.top - navH() - Math.max(16, (innerHeight - navH() - r.height) / 2), behavior: 'auto' });
                srcArt.style.visibility = 'hidden';
                const clone = await flight(from, docRect(srcArt), d, true);
                srcArt.style.visibility = '';
                if (clone) settle(clone.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 120 }), 120).then(() => clone.remove());
                btn.classList.add('just-home'); setTimeout(() => btn.classList.remove('just-home'), 700);
            }
            row.classList.remove('no-anim');
            head.classList.remove('is-landing');
            S.cat = null; S.active = -1;
            if (!opts.quick && opts.restoreFocus !== false) focusQuiet(btn);
            cfg.onClose && cfg.onClose();
        }

        /* the row: choose a flower; the open one has moved up to the stage */
        $$('[aria-controls="' + root.id + '"]', row).forEach(b => b.addEventListener('click', () => {
            const cat = b.dataset.cat;
            if (S.cat === cat) close(); else open(cat);
        }));
        /* click on the empty space around an open plant to put it back */
        garden.closest('section').addEventListener('click', e => {
            if (!S.cat || S.busy || e.target.closest('.gs-inner, .g-row, .h-row, a, button, .seed-wrap')) return;
            close();
        });
        return { open, close, select, get cat() { return S.cat; }, root, garden, indexOf: (cat, id) => data[cat] ? data[cat].items.findIndex(it => it.id === id || it.name === id) : -1 };
    }

    const xpGarden = $('#expGarden'), skGarden = $('#skillGarden');
    const xpStage = xpGarden && Stage({ kind: 'exp', garden: xpGarden, row: $('.g-row', xpGarden), root: $('#xpStage'), data: EXP });
    const skStage = skGarden && Stage({ kind: 'skill', garden: skGarden, row: $('.h-row', skGarden), root: $('#skStage'), data: SK });
    let lastOpened = null;
    if (xpStage) { const o = xpStage.open; xpStage.open = (c, x) => { lastOpened = xpStage; return o(c, x); }; }
    if (skStage) { const o = skStage.open; skStage.open = (c, x) => { lastOpened = skStage; return o(c, x); }; }

    /* Escape closes whichever plant is open (the one with focus first) */
    document.addEventListener('keydown', e => {
        if (e.key !== 'Escape' || document.querySelector('.gallery-modal.active, .lightbox.active')) return;
        if (bouquet.isOpen()) return;
        const inside = [xpStage, skStage].find(s => s && s.cat && s.root.contains(document.activeElement));
        const target = inside || (lastOpened && lastOpened.cat ? lastOpened : [xpStage, skStage].find(s => s && s.cat));
        if (target) { e.preventDefault(); target.close(); }
    });

    /* Easter egg: linger on a flower in the row and a butterfly comes to see it */
    if (fine && !reduce) $$('.g-cat, .h-spec').forEach(b => {
        let t = 0;
        b.addEventListener('pointerenter', () => { t = setTimeout(() => { if (!b.classList.contains('is-current')) visitFlower($('svg', b), b.classList.contains('h-spec') ? 'bee' : 'butterfly'); }, 2600); });
        b.addEventListener('pointerleave', () => clearTimeout(t));
    });

    /* ------------------------------------------------------------------
       The visitor's bouquet: a small, distinct posy in the corner. New
       finds travel to it; tap it to fan out what you have found.
       ------------------------------------------------------------------ */
    const BOW_PATHS = '<path class="bw-tail" d="M29 21 C27.5 28 23 33 19.5 40.5 L24 38.5 L26.5 43 C28.5 36.5 31 29.5 31 22Z M31 21 C32.5 28 37 33 40.5 40.5 L36 38.5 L33.5 43 C31.5 36.5 29 29.5 29 22Z"/>'
        + '<path class="bw-loop" d="M30 20 C26 9 13 5 9 10.5 C6.5 16.5 18 23 30 20Z M30 20 C34 9 47 5 51 10.5 C53.5 16.5 42 23 30 20Z"/>'
        + '<path class="bw-fold" d="M27.5 18 C22 12.5 15.5 11 12 12.5 M32.5 18 C38 12.5 44.5 11 48 12.5"/>'
        + '<ellipse class="bw-knot" cx="30" cy="19.6" rx="4.1" ry="4.8"/>';
    const BOW_SVG = '<svg class="bq-bow" viewBox="0 0 60 46" aria-hidden="true">' + BOW_PATHS + '</svg>';
    const bouquet = (function () {
        const wrap = document.createElement('div'); wrap.className = 'mb-bouquet'; wrap.hidden = true;
        wrap.innerHTML =
            '<button type="button" class="bq-btn" aria-expanded="false" aria-controls="bqFan">'
            + '<span class="bq-disc" aria-hidden="true"></span>'
            + '<svg class="bq-art" viewBox="0 0 80 104" aria-hidden="true"><g class="bq-back"></g><g class="bq-stems"></g><g class="bq-filler"></g>'
            + '<path d="M17 62 L63 62 L45 101 Q40 104 35 101 Z" fill="#f3dcbd" stroke="#c9a06a" stroke-width="1.3" stroke-linejoin="round"/>'
            + '<path d="M17 62 L40 70 L63 62" fill="none" stroke="#c9a06a" stroke-width="1.1" opacity=".7"/>'
            + '<path d="M27 66 L33 92 M53 66 L46 92" stroke="#e8cfa6" stroke-width="1.4" opacity=".8"/>'
            + '<path class="bq-band" d="M29 67.5 Q40 72.5 51 67.5 L51.6 72 Q40 77 28.4 72Z" stroke-width=".8"/></svg>'
            + '<span class="vh">Your discoveries</span></button>'
            + '<button type="button" class="bq-bowbtn" aria-expanded="false" aria-controls="bqPick" aria-label="Change the bow colour">' + BOW_SVG + '</button>'
            + '<div class="bq-pick" id="bqPick" role="radiogroup" aria-label="Bow colour" hidden></div>'
            + '<span class="bq-label" aria-hidden="true"><svg viewBox="0 0 40 24"><path d="M38 4 C26 2 12 6 6 18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M3 12 L6 19 L12 15" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>your discoveries</span>'
            + '<div class="bq-fan" id="bqFan" role="group" aria-label="Your discoveries" hidden><p class="bq-title">your discoveries</p><ol class="bq-list"></ol><button type="button" class="bq-reset">start a fresh bouquet</button></div>';
        document.body.appendChild(wrap);
        /* once the bouquet is full enough, the visitor may tie it with a ribbon of their choosing (remembered) */
        const RIBBONS = [['blush pink', '#f4a7bf', '#d9789e'], ['soft yellow', '#f6d36b', '#c99a1a'], ['sage green', '#b7cfa0', '#7f9f6a'], ['lavender', '#cdb8f2', '#9d7fd0'], ['cream', '#fbf1dc', '#c9a06a']];
        const ribbonBox = $('.bq-pick', wrap), bowBtn = $('.bq-bowbtn', wrap);
        ribbonBox.innerHTML = RIBBONS.map(([n, c, e]) => '<button type="button" role="radio" aria-checked="false" aria-label="' + n + ' bow" title="' + n + '" data-ribbon="' + n + '" style="--rc:' + c + ';--re:' + e + '"><svg viewBox="0 0 60 46" aria-hidden="true">' + BOW_PATHS + '</svg></button>').join('');
        const picking = () => !ribbonBox.hidden;
        function pick(open, restore) {
            if (open === picking()) return;
            ribbonBox.hidden = !open; bowBtn.setAttribute('aria-expanded', String(open)); wrap.classList.toggle('is-picking', open);
            if (open) { const on = $('[aria-checked="true"]', ribbonBox) || $('button', ribbonBox); focusQuiet(on); } else if (restore) focusQuiet(bowBtn);
        }
        function tie(name) {
            const r = RIBBONS.find(x => x[0] === name) || RIBBONS[0];
            wrap.style.setProperty('--ribbon', r[1]); wrap.style.setProperty('--ribbon-edge', r[2]);
            $$('[data-ribbon]', ribbonBox).forEach(b => b.setAttribute('aria-checked', String(b.dataset.ribbon === r[0])));
        }
        tie(WorldState.get().ribbon);
        ribbonBox.addEventListener('click', e => { const b = e.target.closest('[data-ribbon]'); if (!b) return; e.stopPropagation(); WorldState.get().ribbon = b.dataset.ribbon; WorldState.save(); tie(b.dataset.ribbon); bowBtn.classList.remove('wiggle'); void bowBtn.offsetWidth; bowBtn.classList.add('wiggle'); });
        bowBtn.addEventListener('click', e => { e.stopPropagation(); if (!fan.hidden) close(false); pick(!picking(), true); });
        const btn = $('.bq-btn', wrap), back = $('.bq-back', wrap), stems = $('.bq-stems', wrap), filler = $('.bq-filler', wrap), fan = $('.bq-fan', wrap), list = $('.bq-list', wrap), label = $('.bq-label', wrap);

        /* The posy starts as an empty vase. Each flower you collect takes the next place in a domed arrangement
           (centre first, then outward), so adding one never shuffles the others. Stems are gathered into the
           vase neck and curve gently apart; flowers get a little smaller as the bouquet fills so it never crowds. */
        const SLOTS = [[0, 18, 1], [-15, 27, .95], [15, 26, .95], [-27, 39, .85], [27, 38, .85], [0, 38, .9], [-14, 46, .8], [14, 45, .8], [-30, 26, .72], [30, 25, .72], [-7, 28, .74], [7, 52, .7]];
        const NECK = 40, BASE = 66, GREEN = '#8db36a';
        /* mostly-green specimens are drawn smaller, paler and less saturated so they sit quietly among the blooms: [size, opacity, saturation] */
        const SOFT = { 'pf-programming': [0.74, 0.72, 0.6], 'pf-data': [0.88, 0.85, 0.8], 'pf-writing': [0.74, 1, 1] };
        /* Writing: the pressed specimen leans and does not sit on a bouquet stem, so the bouquet gets its own small upright ear of wheat */
        function wheatEar(x, y, s, dx) {
            const u = s / 34; let h = '';
            for (let k = 0; k < 5; k++) {
                const gy = -4.2 * k - 1, w = 1.9 - k * 0.1, fill = k % 2 ? '#c9a032' : '#d8b445';
                h += '<ellipse cx="' + f1(-w) + '" cy="' + f1(gy) + '" rx="1.35" ry="2.7" transform="rotate(-24 ' + f1(-w) + ' ' + f1(gy) + ')" fill="' + fill + '" stroke="#a88524" stroke-width=".3"/>'
                    + '<ellipse cx="' + f1(w) + '" cy="' + f1(gy) + '" rx="1.35" ry="2.7" transform="rotate(24 ' + f1(w) + ' ' + f1(gy) + ')" fill="' + (k % 2 ? '#d8b445' : '#c9a032') + '" stroke="#a88524" stroke-width=".3"/>';
            }
            h += '<ellipse cx="0" cy="-22.5" rx="1.3" ry="2.5" fill="#ecdbb0" stroke="#a88524" stroke-width=".3"/><path d="M0 -24.5 L-1.8 -30 M0 -24.5 L0 -31 M0 -24.5 L1.8 -30" stroke="#b8942f" stroke-width=".4" stroke-linecap="round" fill="none"/>';
            return '<g transform="translate(' + f1(x) + ' ' + f1(y) + ') rotate(' + f1(dx * 0.3) + ') scale(' + f1(u) + ')">' + h + '</g>';
        }
        function draw(newId) {
            stems.innerHTML = ''; back.innerHTML = '';
            const n = found.length, shrink = n <= 5 ? 1 : n <= 8 ? 0.9 : 0.8;
            const slotOf = i => { const b = SLOTS[i % SLOTS.length], r = Math.floor(i / SLOTS.length); return r ? [b[0] + (r % 2 ? 4 : -4), b[1] + 3, b[2]] : b; };
            found.map((id, i) => ({ id, i })).filter(o => CATS[o.id]).sort((a, b) => slotOf(a.i)[1] - slotOf(b.i)[1]).forEach(({ id, i }) => {
                const c = CATS[id], [dx, ty, sc] = slotOf(i), tone = SOFT[c.sym] || [1, 1, 1], s = (c.kind === 'Skills' ? 28 : 32) * 1.2 * sc * shrink * tone[0];
                const wheat = c.sym === 'pf-writing', x0 = NECK + dx * 0.1, tx = NECK + dx, ey = ty + s * (wheat ? 0.42 : 0.25), bow = (i % 2 ? 1 : -1) * 3;
                const g = document.createElementNS('http://www.w3.org/2000/svg', 'g'); g.setAttribute('class', 'bq-stem' + (id === newId && !reduce ? ' new' : ''));
                g.innerHTML = '<path class="bq-s" pathLength="1" d="M' + f1(x0) + ' ' + BASE + ' C' + f1(x0 + dx * 0.05) + ' ' + f1(BASE - (BASE - ey) * 0.5) + ' ' + f1(tx - dx * 0.1 + bow) + ' ' + f1(ey + (BASE - ey) * 0.28) + ' ' + f1(tx) + ' ' + f1(ey) + '" fill="none" stroke="' + (wheat ? '#b9993e' : GREEN) + '" stroke-width="' + (wheat ? 1 : 1.4) + '" stroke-linecap="round"/>'
                    + '<g class="bq-f" style="opacity:' + tone[1] + (tone[2] < 1 ? ';filter:saturate(' + tone[2] + ') brightness(1.08)' : '') + '">' + (wheat ? wheatEar(tx, ey, s, dx) : '<use href="#' + c.sym + '" x="' + f1(tx - s / 2) + '" y="' + f1(ty - s / 2) + '" width="' + f1(s) + '" height="' + f1(s) + '"/>') + '</g>';
                stems.appendChild(g);
            });
            /* baby's breath: a few tiny sprigs that fill in as you explore pieces (never more than six) */
            const R = rng(7), k = Math.min(6, Math.ceil(foundItems.length / 2)), ANG = [-44, 38, -22, 24, -6, 8];
            let h = '';
            for (let i = 0; i < k; i++) {
                const a = ANG[i] * Math.PI / 180, L = 52 + (i % 2) * 4, ex = NECK + Math.sin(a) * L, ey = BASE - Math.cos(a) * L;
                h += '<path d="M' + NECK + ' ' + BASE + ' Q' + f1(NECK + Math.sin(a) * L * 0.3) + ' ' + f1(BASE - L * 0.6) + ' ' + f1(ex) + ' ' + f1(ey) + '" fill="none" stroke="#b7d09c" stroke-width=".7" stroke-linecap="round"/>'
                    + '<circle cx="' + f1(ex) + '" cy="' + f1(ey) + '" r="1.7" fill="#fff" stroke="#e6d5c3" stroke-width=".5"/><circle cx="' + f1(ex + 2.6) + '" cy="' + f1(ey + 2.2) + '" r="1.2" fill="#fde1ea" stroke="#e6d5c3" stroke-width=".5"/>';
            }
            filler.innerHTML = h;
            list.innerHTML = '';
            found.forEach((id, k) => {
                const c = CATS[id]; if (!c) return;
                const li = document.createElement('li'); li.style.setProperty('--n', k);
                li.innerHTML = '<button type="button" data-open="' + id + '"><svg viewBox="' + c.box + '" aria-hidden="true"><use href="#' + c.sym + '"/></svg><span class="bq-name">' + esc(c.name) + '</span><span class="bq-kind">' + c.kind + '</span></button>';
                list.appendChild(li);
            });
            wrap.hidden = !n && !foundItems.length;   /* nothing in the corner until a flower has been opened */
            wrap.classList.toggle('is-full', n >= 6);
        }
        let labelT = 0;
        function nudge(long) {
            if (reduce) return;
            btn.classList.remove('sway'); void btn.offsetWidth; btn.classList.add('sway');
            wrap.classList.add('show-label'); clearTimeout(labelT); labelT = setTimeout(() => wrap.classList.remove('show-label'), long ? 4800 : 2600);
        }
        /* a small copy of what was found drifts to the bouquet along a soft arc */
        function travel(fromEl, html, size) {
            if (reduce || !fromEl || wrap.hidden) return Promise.resolve();
            const a = fromEl.getBoundingClientRect(), b = btn.getBoundingClientRect();
            if (!a.width) return Promise.resolve();
            const el = document.createElement('div'); el.className = 'bq-traveler'; el.setAttribute('aria-hidden', 'true'); el.innerHTML = html;
            el.style.width = el.style.height = size + 'px'; el.style.left = (a.left + a.width / 2 - size / 2) + 'px'; el.style.top = (a.top + a.height / 2 - size / 2) + 'px';
            document.body.appendChild(el);
            const dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height * 0.35 - (a.top + a.height / 2);
            const anim = el.animate([
                { transform: 'translate(0,0) scale(.4) rotate(0deg)', opacity: 0 },
                { transform: 'translate(' + f1(dx * 0.15) + 'px,' + f1(dy * 0.15 - 40) + 'px) scale(1) rotate(40deg)', opacity: 1, offset: 0.2 },
                { transform: 'translate(' + f1(dx * 0.6) + 'px,' + f1(dy * 0.5 - 70) + 'px) scale(.9) rotate(160deg)', opacity: 1, offset: 0.6 },
                { transform: 'translate(' + f1(dx) + 'px,' + f1(dy) + 'px) scale(.5) rotate(300deg)', opacity: 0.2 }
            ], { duration: 1300, easing: 'cubic-bezier(0.4, 0, 0.3, 1)' });
            return settle(anim, 1300).then(() => el.remove());
        }
        function collect(id, fromEl) {
            const c = CATS[id], first = wrap.hidden;
            if (first) { wrap.hidden = false; }
            travel(fromEl, '<svg viewBox="' + c.box + '"><use href="#' + c.sym + '"/></svg>', 40).then(() => { draw(id); nudge(first || found.length === 1); });
        }
        function sprinkle(fromEl) {
            if (wrap.hidden) { draw(); return; }
            travel(fromEl, '<svg viewBox="-10 -10 20 20" style="color:#f4a7bf;--center:#fff6d8"><use href="#mk" x="-10" y="-10" width="20" height="20"/></svg>', 16).then(() => { draw(); if (!reduce) { btn.classList.remove('sway'); void btn.offsetWidth; btn.classList.add('sway'); } });
        }
        const isOpen = () => !fan.hidden;
        function open() { pick(false); fan.hidden = false; btn.setAttribute('aria-expanded', 'true'); wrap.classList.add('is-open'); const f = $('button', list); if (f) focusQuiet(f); }
        function close(restore) { if (fan.hidden) return; fan.hidden = true; btn.setAttribute('aria-expanded', 'false'); wrap.classList.remove('is-open'); if (restore !== false) focusQuiet(btn); }
        btn.addEventListener('click', e => { e.stopPropagation(); isOpen() ? close() : open(); });
        list.addEventListener('click', e => { const b = e.target.closest('[data-open]'); if (!b) return; close(false); openById(b.dataset.open); });
        $('.bq-reset', wrap).addEventListener('click', () => { found = []; foundItems = []; foundStore.clear(); itemStore.clear(); clearMarks(); close(); draw(); wrap.hidden = true; });
        document.addEventListener('keydown', e => { if (e.key === 'Escape' && picking()) { e.stopPropagation(); pick(false, true); } else if (e.key === 'Escape' && isOpen()) { e.stopPropagation(); close(); } });
        document.addEventListener('click', e => { if (wrap.contains(e.target)) return; if (isOpen()) close(false); pick(false); });
        return { collect, sprinkle, draw, isOpen: () => isOpen() || picking() };
    })();
    found.forEach(id => setMark(id, false));
    bouquet.draw();

    /* ------------------------------------------------------------------
       Ways in: links, hero interests, bouquet, cross-links between
       experiences and skills
       ------------------------------------------------------------------ */
    function openById(id) {
        const [kind, cat] = id.split(':');
        if (kind === 'exp' && xpStage) xpStage.open(cat);
        else if (kind === 'skill' && skStage) skStage.open(cat);
    }
    function gotoItem(spec, opts) {
        const [cat, id] = spec.split(':'); if (!xpStage || !EXP[cat]) return false;
        const i = xpStage.indexOf(cat, id);
        xpStage.open(cat, Object.assign({ select: i < 0 ? null : i }, opts));
        return true;
    }
    let galleryOpener = null;
    function openGallery(filter, file) {
        const modal = $('#galleryModal'); if (!modal) return false;
        galleryOpener = document.activeElement;
        modal.classList.add('active'); document.body.style.overflow = 'hidden';
        const tab = filter ? $('.gallery-modal-tab[data-filter="' + filter + '"]') : null;
        if (tab) tab.click(); else if (typeof buildCollage === 'function') buildCollage();
        if (file && typeof openArtwork === 'function') openArtwork(file);
        setTimeout(() => focusQuiet(file ? $('#lightboxClose') : $('#galleryClose')), 50);
        return true;
    }
    const gClose = $('#galleryClose');
    if (gClose) gClose.addEventListener('click', () => { if (galleryOpener && document.contains(galleryOpener)) focusQuiet(galleryOpener); galleryOpener = null; });
    const prevw = $('#galleryPreview');
    if (prevw) {
        prevw.addEventListener('click', () => { galleryOpener = prevw; });
        prevw.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); prevw.click(); setTimeout(() => focusQuiet($('#galleryClose')), 50); } });
    }
    document.addEventListener('click', e => {
        const a = e.target.closest('a[href^="#"], [data-gallery]');
        if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey) return;
        if (a.dataset.gallery) { e.preventDefault(); openGallery(a.dataset.gallery); return; }
        if (a.dataset.open) { e.preventDefault(); openById(a.dataset.open); return; }
        if (a.dataset.goto) { e.preventDefault(); gotoItem(a.dataset.goto); return; }
        if (a.dataset.skill) { e.preventDefault(); if (skStage) skStage.open(a.dataset.skill); return; }
        const id = a.getAttribute('href').slice(1); if (!id) return;
        const t = document.getElementById(id); if (!t) return;
        e.preventDefault();
        if (id === 'home') scrollTo({ top: 0, behavior: behavior() });
        else { const y = t.getBoundingClientRect().top - navH() - (id === 'about' ? 0 : 6); if (Math.abs(y) > 2) scrollBy({ top: y, behavior: behavior() }); }
        const h = t.querySelector('h2, h1'); if (h && !a.closest('.nav, .m-menu')) setTimeout(() => focusQuiet(h), reduce ? 0 : 450);
    });

    /* ------------------------------------------------------------------
       "A seed of curiosity": a surprise piece of work
       ------------------------------------------------------------------ */
    (function () {
        const packet = $('#seedPacket'), status = $('#seedStatus'); if (!packet || !status) return;
        const card = id => { for (const d of Object.values(EXP)) { const it = d.items.find(x => x.id === id); if (it) return it; } return null; };
        const CANDIDATES = [
            ...['xp-pinn', 'xp-energy', 'xp-biophysics', 'xp-tweezers', 'xp-mesophyll', 'xp-materials'].map(id => ({ key: id, type: 'card', cat: 'research', id })),
            { key: 'w-chinahands', type: 'link', cat: 'writing', id: 'xp-chinahands', url: 'https://chinahandsmagazine.org/author/madisonbutchko/', title: 'Articles in China Hands Magazine', source: 'China Hands Magazine', desc: 'Chinese history, technology & social issues.' },
            { key: 'w-hercampus', type: 'link', cat: 'writing', id: 'xp-hercampus', url: 'https://www.hercampus.com/author/maddie-butchko/', title: 'Articles in Her Campus at Yale', source: 'Her Campus at Yale', desc: 'Weekly lifestyle content.' },
            { key: 'w-ydn', type: 'link', cat: 'writing', id: 'xp-ydn', url: 'https://yaledailynews.com/author/madison-butchko', title: 'Columns in the Yale Daily News', source: 'Yale Daily News', desc: 'Personal essays with illustrations.' },
            { key: 'w-herald', type: 'link', cat: 'writing', id: 'xp-herald', url: 'https://yale-herald.com/2025/03/30/a-guide-to-achieving-perfect-skin/', title: 'A Guide to Achieving Perfect Skin', source: 'Yale Herald', desc: 'A personal essay.' },
            { key: 't-classrooms', type: 'link', cat: 'teaching', id: 'xp-gtp', url: 'https://globalteachingproject.com/2024/05/24/from-classrooms-to-change/', title: 'From Classrooms to Change', source: 'Global Teaching Project', desc: 'An article linked from the AP Physics Teaching Assistant role.' },
            { key: 't-beyond', type: 'link', cat: 'teaching', id: 'xp-gtp', url: 'https://globalteachingproject.com/2025/04/18/beyond-physics/', title: 'Beyond Physics', source: 'Global Teaching Project', desc: 'An article linked from the AP Physics Teaching Assistant role.' },
            ...['mandala_passion.png', 'Tulips.jpg', 'calligraphy3.jpg', 'face_full_of_stars.png', 'Little_prince_2.jpg', 'peonies.png', 'Reader.jpg', 'madeinchina.jpg'].map(file => ({ key: 'a-' + file, type: 'art', file }))
        ];
        const ARTS = typeof artworks !== 'undefined' ? artworks : [];
        const POOL = CANDIDATES.filter(it => it.type === 'art' ? ARTS.some(a => a.file === it.file) : !!card(it.id));
        POOL.forEach(it => {
            if (it.type === 'card') { const c = card(it.id); it.title = plain(c.role) + ', ' + plain(c.org).split('·')[0].trim(); }
            if (it.type === 'art') it.title = (ARTS.find(a => a.file === it.file) || {}).title || 'Artwork';
        });
        if (!POOL.length) { packet.closest('.seed-wrap').hidden = true; return; }
        const bagStore = mem('mb-seed-bag-v1', null);
        function draw() {
            const bag = bagStore.get() || { left: [], last: null };
            bag.left = (bag.left || []).filter(k => POOL.some(p => p.key === k));
            if (!bag.left.length) {
                const keys = POOL.map(p => p.key);
                for (let i = keys.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [keys[i], keys[j]] = [keys[j], keys[i]]; }
                if (keys.length > 1 && keys[0] === bag.last) keys.push(keys.shift());
                bag.left = keys;
            }
            const key = bag.left.shift(); bag.last = key; bagStore.set(bag);
            return POOL.find(p => p.key === key);
        }
        let busy = false, noteT = 0;
        function say(text, keep) { clearTimeout(noteT); status.innerHTML = '<p class="seed-note">' + esc(text) + '</p>'; if (!keep) noteT = setTimeout(() => { if (status.querySelector('.seed-note')) status.innerHTML = ''; }, 5000); }
        function preview(it) {
            clearTimeout(noteT);
            status.innerHTML = '<div class="seed-preview"><button type="button" class="sv-close" aria-label="Close preview">&times;</button><p class="sv-kicker">' + esc(it.source) + '</p><p class="sv-title">' + esc(it.title) + '</p><p class="sv-desc">' + esc(it.desc) + '</p>'
                + '<a class="sv-link" href="' + esc(it.url) + '" target="_blank" rel="noopener">Read on ' + esc(it.source) + ' <span aria-hidden="true">&#8599;&#xFE0E;</span><span class="vh"> (opens in a new tab)</span></a></div>';
            $('.sv-close', status).addEventListener('click', () => { status.innerHTML = ''; focusQuiet(packet); });
        }
        packet.addEventListener('click', () => {
            if (busy) return; busy = true;
            const it = draw();
            packet.classList.add('opening'); say('Sprouting: ' + it.title, true);
            const pour = MB.use('plants.seeds').pour(packet);   /* plants/seeds.js (was window.__eco.pour) */
            setTimeout(() => {
                packet.classList.remove('opening'); busy = false;
                if (it.type === 'card') { gotoItem(it.cat + ':' + it.id); say('Planted: ' + it.title); }
                else if (it.type === 'link') { gotoItem(it.cat + ':' + it.id, { focus: false }); preview(it); }
                else { say('Planted: ' + it.title); openGallery(null, it.file); }
            }, reduce ? 350 : Math.max(1300, pour + 250));
        });
    })();

    /* ------------------------------------------------------------------
       Small hidden moments
       ------------------------------------------------------------------ */
    /* tap a scattered leaf and a ladybug walks out across it */
    document.addEventListener('click', e => {
        const leaf = e.target.closest('.sc-leaf'); if (!leaf || reduce) return;
        const bug = document.createElement('span'); bug.className = 'ladybug on-leaf'; bug.setAttribute('aria-hidden', 'true'); bug.innerHTML = LADYBUG;
        leaf.appendChild(bug); setTimeout(() => bug.remove(), 3600);
    });
    /* fireflies glow around the contact section in the evening (local time) */
    (function () {
        const h = new Date().getHours(), sec = $('#contact'); if (!sec || reduce || (h >= 6 && h < 19)) return;
        const box = document.createElement('div'); box.className = 'fireflies'; box.setAttribute('aria-hidden', 'true');
        box.innerHTML = Array.from({ length: 5 }, (_, k) => '<i style="--k:' + k + ';left:' + (8 + k * 19) + '%;top:' + (20 + (k * 37) % 60) + '%"></i>').join('');
        sec.appendChild(box);
        new IntersectionObserver(es => es.forEach(en => box.classList.toggle('on', en.isIntersecting))).observe(sec);
    })();

    /* touch screens have no hover: a tap gives "hello, I'm Madison" the same gentle colour change */
    const hello = $('.about-hello');
    if (hello) hello.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse') return; hello.classList.add('is-tapped'); clearTimeout(hello._t); hello._t = setTimeout(() => hello.classList.remove('is-tapped'), 1600); });

    /* footer year */
    const fy = $('#footerYear'); if (fy) { const y = new Date().getFullYear(); if (y >= 2026) fy.textContent = y; }
})();

