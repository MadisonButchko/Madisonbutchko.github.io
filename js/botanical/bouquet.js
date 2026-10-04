/* js/botanical/bouquet.js
   Purpose : the discovery memory and the visitor's bouquet (a small posy in the corner that collects what was opened; ribbon colour; fan of finds; reset).
   Owns    : CATS, found / foundItems (sessionStorage "mb-discoveries-v2", "mb-found-items-v1"), setMark/clearMarks ("visited" marks), discover/discoverItem (feed GardenLog and World.note), the bouquet UI (create()), isOpen.
   Uses    : botanical.content, core.state (WorldState); window.GardenLog / window.World read at call time; ctx.openById (set by botanical/links.js).
   Used by : botanical/stage.js (discover, discoverItem, itemCount, isOpen), legacy/190 orchestrator (create, markAll, draw).
   Mobile / reduced motion: unchanged (travelling flowers and the nudge are skipped under prefers-reduced-motion).
   Moved verbatim from legacy/190-botanical.js (Migration Step 13); behaviour, order and timing unchanged. */
MB.define('botanical.bouquet', ['core.state', 'botanical.content'], function (state, content) {
    'use strict';
    const { WorldState, mem } = state;
    const { $, $$, wait, f1, clamp, reduce, fine, frame, settle, esc, plain, behavior, hash, rng, navH, focusQuiet, bringIntoView, visits, visit, EXP, SK, PIECE_WORD, ctx } = content;
    let bouquet = null;   /* set by create() */
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
       The visitor's bouquet: a small, distinct posy in the corner. New
       finds travel to it; tap it to fan out what you have found.
       ------------------------------------------------------------------ */
    const BOW_PATHS = '<path class="bw-tail" d="M29 21 C27.5 28 23 33 19.5 40.5 L24 38.5 L26.5 43 C28.5 36.5 31 29.5 31 22Z M31 21 C32.5 28 37 33 40.5 40.5 L36 38.5 L33.5 43 C31.5 36.5 29 29.5 29 22Z"/>'
        + '<path class="bw-loop" d="M30 20 C26 9 13 5 9 10.5 C6.5 16.5 18 23 30 20Z M30 20 C34 9 47 5 51 10.5 C53.5 16.5 42 23 30 20Z"/>'
        + '<path class="bw-fold" d="M27.5 18 C22 12.5 15.5 11 12 12.5 M32.5 18 C38 12.5 44.5 11 48 12.5"/>'
        + '<ellipse class="bw-knot" cx="30" cy="19.6" rx="4.1" ry="4.8"/>';
    const BOW_SVG = '<svg class="bq-bow" viewBox="0 0 60 46" aria-hidden="true">' + BOW_PATHS + '</svg>';
    function create() { bouquet = (function () {
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
        list.addEventListener('click', e => { const b = e.target.closest('[data-open]'); if (!b) return; close(false); ctx.openById(b.dataset.open); });
        $('.bq-reset', wrap).addEventListener('click', () => { found = []; foundItems = []; foundStore.clear(); itemStore.clear(); clearMarks(); close(); draw(); wrap.hidden = true; });
        document.addEventListener('keydown', e => { if (e.key === 'Escape' && picking()) { e.stopPropagation(); pick(false, true); } else if (e.key === 'Escape' && isOpen()) { e.stopPropagation(); close(); } });
        document.addEventListener('click', e => { if (wrap.contains(e.target)) return; if (isOpen()) close(false); pick(false); });
        return { collect, sprinkle, draw, isOpen: () => isOpen() || picking() };
    })(); return bouquet; }

    return { create, discover, discoverItem, itemCount: () => foundItems.length, markAll: () => found.forEach(id => setMark(id, false)), draw: () => bouquet.draw(), isOpen: () => bouquet ? bouquet.isOpen() : false, CATS };
});
