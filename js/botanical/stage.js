/* js/botanical/stage.js
   Purpose : the "stage" of the Experience garden and the Skills specimens: one per section; open() flies the chosen plant to the stage and grows it, select() shows one note at a time, close() folds everything back; labels, notes, keyboard, swipe, hover lean, specimen nudge; plus Escape-to-close and the linger-for-a-butterfly easter egg.
   Owns    : Stage(cfg) (build, measure/fitLabels, notes, select, flight, open/close), create() (makes the two stages from #expGarden / #skillGarden, registers them in ctx, Escape handler, linger handler).
   Uses    : botanical.content, botanical.plant-art, botanical.bouquet (discover, discoverItem, itemCount, isOpen), animals.butterflies; effects.text-effects (rainbow) read at call time.
   Used by : legacy/190 orchestrator (create()), botanical/links.js (through ctx.xpStage / ctx.skStage).
   Mobile / reduced motion: unchanged: phone layout (<= 700 px) scrolls to the plant, swipe moves between Skills pieces, hover lean only with fine pointers, no flight under reduced motion.
   Moved verbatim from legacy/190-botanical.js (Migration Step 13); behaviour, order and timing unchanged. */
MB.define('botanical.stage', ['botanical.content', 'botanical.plant-art', 'botanical.bouquet', 'animals.butterflies', 'effects.text-effects'], function (content, art, bouq, creatures, textFx) {
    'use strict';
    const { $, $$, wait, f1, clamp, reduce, fine, frame, settle, esc, plain, behavior, hash, rng, navH, focusQuiet, bringIntoView, visits, visit, EXP, SK, PIECE_WORD, ctx } = content;
    const { VW, VH, HC, ring, pct, budArt, pieceArt } = art, { visitFlower, shouldVisit, ladybugOn } = creatures;
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
                textFx.rainbow($('.xl-cat', body));
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
            bouq.discoverItem(it.id, bud);
            if (opts.focus && !isExp) focusQuiet(bud);
            if (opts.scroll && !isExp) bringIntoView(inner);
            /* sometimes a visitor comes to see what you opened (a butterfly on a bloom, a ladybug on a specimen piece) */
            if (first && !opts.quiet && shouldVisit(bouq.itemCount(), isExp)) {
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
                if (b && on && fine) { const art = $('.gb-art', b); if (art) art.animate([{ rotate: '0deg' }, { rotate: '72deg' }], { duration: 700, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)', composite: 'add' }); }
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
            if (!quiet) bouq.discover((isExp ? 'exp:' : 'skill:') + cat, head);
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

    function create() {
    const xpGarden = $('#expGarden'), skGarden = $('#skillGarden');
    const xpStage = xpGarden && Stage({ kind: 'exp', garden: xpGarden, row: $('.g-row', xpGarden), root: $('#xpStage'), data: EXP });
    const skStage = skGarden && Stage({ kind: 'skill', garden: skGarden, row: $('.h-row', skGarden), root: $('#skStage'), data: SK });
    let lastOpened = null;
    if (xpStage) { const o = xpStage.open; xpStage.open = (c, x) => { lastOpened = xpStage; return o(c, x); }; }
    if (skStage) { const o = skStage.open; skStage.open = (c, x) => { lastOpened = skStage; return o(c, x); }; }

    /* Escape closes whichever plant is open (the one with focus first) */
    document.addEventListener('keydown', e => {
        if (e.key !== 'Escape' || document.querySelector('.gallery-modal.active, .lightbox.active')) return;
        if (bouq.isOpen()) return;
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
        ctx.xpStage = xpStage; ctx.skStage = skStage;
    }

    return { create, Stage };
});
