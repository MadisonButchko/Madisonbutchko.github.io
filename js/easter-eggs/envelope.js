/* js/easter-eggs/envelope.js
   Purpose : the secret envelope: after three taps within two seconds on quiet background a small bird flies in and drops an envelope; tap it and the flap hinges open, a folded letter slides out and unfolds onto light pink graph paper while a few hearts drift up. Closed, it can be dragged (or moved with the arrow keys) to another quiet spot.
   Owns    : the tap counter, the delivery (spot choice, bird, drift), the envelope + letter markup, the closed/opening/open/closing state machine, the hearts and sparkles, dragging and keyboard repositioning (element-scoped pointer handlers only), one resize recheck. Nothing is saved: nothing opens on its own, and the gesture works on every page load (the envelope stays once it has arrived).
   Uses    : core.utils (rand, reduce), core.scheduler (Life), core.safe-zones (BLOCK, clearAt, navBottom), core.particles (FX: heart budget), animals.birds (visitingBird: the flight + carried item).   Used by: main.js (start()).
   Mobile / reduced motion: taps work on touch; the envelope is a focusable button (Enter/Space opens, arrow keys move it when closed); the letter has a close button and Escape closes it (focus returns to the envelope). Reduced motion: no bird, drift, folding, hearts or animated repositioning; the letter just fades in/out.
   Cleanup : the one tap listener is added once; the envelope stays after the note is closed; the Escape listener exists only while the letter is open; opening/closing are Web Animations that are reversed (never stacked) and rebuilt on each fresh opening; hearts are finished (and their FX slots returned) when interrupted; the one resize listener lives with the envelope. */
MB.define('easter-eggs.envelope', ['core.utils', 'core.scheduler', 'core.safe-zones', 'core.particles', 'animals.birds'], function (utils, scheduler, zones, particles, birds) {
    'use strict';
    const { rand, reduce } = utils, { Life } = scheduler, { BLOCK, clearAt, navBottom } = zones, { FX } = particles;
    const TAPS = 3, WINDOW = 2000;      /* three quiet taps within two seconds */
    /* taps on text, photos, links, buttons, cards, navigation or dialogs never count */
    const IGNORE = BLOCK + ',button,[role="button"],[tabindex],summary,select,textarea,#galleryModal,#lightbox,.w-envelope';

    /* ---- art (viewBox "0 -14 64 60": one unit = one pixel of the 64 x 60 envelope) ---- */
    const S = 'stroke="#b9708a" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"';
    const BODY = '<path d="M3 9.5 Q2 9 2.6 8.5 L61 8.2 Q62.4 8.6 62 10 L62.4 43 Q62 45 60.5 44.6 L3.5 44.8 Q2 44.6 2.3 43 Z" fill="#fff4e2" ' + S + '/>';
    const PANELS = '<path d="M2.6 9.5 L31 31 L2.4 43.6 Z" fill="#fffaf0" ' + S + '/><path d="M61.6 9.5 L33 31 L61.8 43.6 Z" fill="#fffaf0" ' + S + '/><path d="M2.6 44 L32 24.5 L61.6 44 Z" fill="#fff0f4" ' + S + '/>';
    const FLAP = '<path d="M2.4 9 Q32 8.6 61.6 9 L32 32.5 Z" fill="#f9d6e1" ' + S + '/>';
    const FLAP_OPEN = '<path d="M3 9 L31.5 -11 Q32 -11.5 32.5 -11 L61 9 Z" fill="#f8c9d8" ' + S + '/>';
    const SEAL = '<path d="M32 38.2 C25.5 33 24.4 27.6 28.2 26.2 C30.4 25.4 31.8 27 32 28 C32.2 27 33.6 25.4 35.8 26.2 C39.6 27.6 38.5 33 32 38.2Z" fill="#e9789f" stroke="#c2457e" stroke-width="1.2" stroke-linejoin="round"/><path d="M29.2 28.4 Q30 27.6 30.9 28.3" stroke="#fff" opacity=".7" stroke-width="1" fill="none" stroke-linecap="round"/>';
    const HEART = '<svg viewBox="0 0 12 11" aria-hidden="true"><path d="M6 10.4 C1.2 7 .6 3.6 2.6 2.2 C4 1.3 5.4 2 6 3.2 C6.6 2 8 1.3 9.4 2.2 C11.4 3.6 10.8 7 6 10.4Z" fill="#f8bdd3" stroke="#e58cb0" stroke-width=".7"/></svg>';
    const SPARK = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M6 .8 Q6.5 5.5 11.2 6 Q6.5 6.5 6 11.2 Q5.5 6.5 .8 6 Q5.5 5.5 6 .8Z" fill="FILL" stroke="STROKE" stroke-width=".6" stroke-linejoin="round"/></svg>';
    const SPARKS = [['#fbe3a0', '#d9aa4a'], ['#d9ccf3', '#9a84cf'], ['#fbe3a0', '#d9aa4a']];
    const svg = (cls, inner, vb) => '<svg class="' + cls + '" viewBox="' + (vb || '0 -14 64 60') + '" aria-hidden="true">' + inner + '</svg>';
    const COPY = '<span class="env-hello">hello, curious soul &nbsp;♡</span><span>the garden has secrets.</span><span>look closely, explore, and see what comes to life.</span>';
    const LABEL = 'A tiny envelope with a heart seal. Press to open it; arrow keys move it';
    /* the letter is one sheet of four panels (folded in quarters), so the folds are real: the top row hinges up, then the left panels swing open */
    const SHEET = '<div class="env-sheet" aria-hidden="true">' +
        '<div class="env-row b"><i class="env-panel br"></i><i class="env-panel bl"><b class="shade"></b></i></div>' +
        '<div class="env-row t"><i class="env-panel tr"></i><i class="env-panel tl"><b class="shade"></b></i><b class="shade"></b></div></div>';
    const MARKUP =
        svg('env-back', BODY) +
        '<svg class="env-flap-open" viewBox="0 -12 64 21" aria-hidden="true">' + FLAP_OPEN + '</svg>' +
        '<div class="env-hearts" aria-hidden="true"></div>' +
        '<div class="env-letter-box"><div class="env-letter" role="region" aria-label="A handwritten note" aria-hidden="true">' + SHEET +
            '<div class="env-text"><div class="env-copy">' + COPY + '</div></div>' +
            '<button type="button" class="env-close" aria-label="Close the note"><svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 2.5 L9.5 9.5 M9.5 2.5 L2.5 9.5" stroke="#8c5a73" stroke-width="1.6" stroke-linecap="round" fill="none"/></svg></button>' +
        '</div></div>' +
        svg('env-front', PANELS) +
        '<svg class="env-flap" viewBox="0 9 64 24" aria-hidden="true">' + FLAP + '</svg>' +
        svg('env-seal', SEAL) +
        '<button type="button" class="env-hit" aria-expanded="false" aria-label="' + LABEL + '"></button>';

    /* ---- opening / closing: one timeline of D ms; closing plays it backwards, faster, so the stages undo in reverse order ---- */
    const D = 1300, CLOSE_RATE = 1.8, P = 'perspective(700px) ', PF = 'perspective(260px) ';
    const OUT = 'cubic-bezier(0.25, 0.8, 0.3, 1)', IO = 'cubic-bezier(0.4, 0, 0.2, 1)';
    const K = (ms, props, easing) => Object.assign({ offset: ms / D }, props, easing ? { easing } : {});
    /* `extra` pushes the final letter down when the envelope sits too near the top of the screen for the sheet to fit above it */
    function timeline(el, extra) {
        const q = s => el.querySelector(s);
        /* every animation ends at D (endDelay pads it) so one currentTime means the same moment for all of them, in either direction */
        const A = (node, kf, delay, dur, easing) => node.animate(kf, { delay, duration: dur, endDelay: D - delay - dur, fill: 'both', easing: easing || 'linear' });
        const rest = -16 + extra, peak = -42 + extra, shade = (n, a, b, from, to) => A(n, [K(0, { opacity: a }), K(from, { opacity: a }), K(to, { opacity: b }), K(D, { opacity: b })], 0, D);
        return [
            /* the letter rises out of the pocket (behind the envelope front), then eases down into its resting place and settles with a tiny rock */
            A(q('.env-letter'), [
                K(0, { opacity: 0, translate: '0 46px', rotate: '0deg' }), K(90, { opacity: 0, translate: '0 46px', rotate: '0deg' }),
                K(110, { opacity: 1, translate: '0 46px', rotate: '0deg' }, OUT), K(640, { opacity: 1, translate: '0 ' + peak + 'px', rotate: '0deg' }, IO),
                K(1130, { opacity: 1, translate: '0 ' + rest + 'px', rotate: '0deg' }, IO), K(1210, { opacity: 1, translate: '0 ' + rest + 'px', rotate: '-1.1deg' }, IO),
                K(D, { opacity: 1, translate: '0 ' + rest + 'px', rotate: '-0.6deg' })
            ], 0, D),
            /* the folded stack is small and sits right of centre; it grows to full size and slides to centre as the left panels open */
            A(q('.env-sheet'), [K(0, { translate: '-34px 0' }), K(760, { translate: '-34px 0' }, IO), K(1130, { translate: '0 0' }), K(D, { translate: '0 0' })], 0, D),
            A(q('.env-sheet'), [K(0, { scale: '0.72' }), K(420, { scale: '0.72' }, IO), K(1130, { scale: '1' }), K(D, { scale: '1' })], 0, D),
            /* fold 1: the top row hinges up around the middle line */
            A(q('.env-row.t'), [K(0, { transform: P + 'rotateX(180deg)' }), K(540, { transform: P + 'rotateX(180deg)' }, IO), K(900, { transform: P + 'rotateX(0deg)' }), K(D, { transform: P + 'rotateX(0deg)' })], 0, D),
            shade(q('.env-row.t > .shade'), 0.34, 0, 540, 900),
            /* fold 2: the left panels swing open around the middle line */
            A(q('.env-panel.tl'), [K(0, { transform: P + 'rotateY(-180deg)' }), K(780, { transform: P + 'rotateY(-180deg)' }, IO), K(1130, { transform: P + 'rotateY(0deg)' }), K(D, { transform: P + 'rotateY(0deg)' })], 0, D),
            A(q('.env-panel.bl'), [K(0, { transform: P + 'rotateY(-180deg)' }), K(780, { transform: P + 'rotateY(-180deg)' }, IO), K(1130, { transform: P + 'rotateY(0deg)' }), K(D, { transform: P + 'rotateY(0deg)' })], 0, D),
            shade(q('.env-panel.tl .shade'), 0.3, 0, 780, 1130),
            shade(q('.env-panel.bl .shade'), 0.3, 0, 780, 1130),
            A(q('.env-text'), [K(0, { opacity: 0 }), K(1050, { opacity: 0 }), K(D, { opacity: 1 })], 0, D),
            /* the flap hinges up around its fold (edge-on at the top), then reappears above it, behind the letter */
            A(q('.env-flap'), [
                { transform: PF + 'rotateX(0deg)', opacity: 1 }, { transform: PF + 'rotateX(86deg)', opacity: 1, offset: 0.9 }, { transform: PF + 'rotateX(90deg)', opacity: 0 }
            ], 0, 300, 'cubic-bezier(0.45, 0, 0.6, 1)'),
            A(q('.env-flap-open'), [
                { transform: PF + 'rotateX(-90deg)', opacity: 0 }, { transform: PF + 'rotateX(-86deg)', opacity: 1, offset: 0.1 }, { transform: PF + 'rotateX(0deg)', opacity: 1 }
            ], 230, 290, 'cubic-bezier(0.3, 0.6, 0.4, 1)'),
            A(q('.env-seal'), [{ opacity: 1, transform: 'translateY(0) scale(1)' }, { opacity: 0, transform: 'translateY(-7px) scale(1.25)' }], 0, 180, 'ease-out')
        ];
    }

    /* ---- the envelope's own controller: states closed | opening | open | closing ---- */
    function envelope(el) {
        const q = s => el.querySelector(s);
        const letter = q('.env-letter'), hit = q('.env-hit'), close = q('.env-close'), heartBox = q('.env-hearts');
        let st = 'closed', anims = [], hearts = [], token = 0, timer = 0, settleT = 0, rzT = 0;
        let drag = null, handledAt = 0, lastW = innerWidth, home = null;     /* home = last valid position, in document coordinates (memory only) */

        /* geometry: the envelope's centre in viewport coordinates, moving it there, and "is that spot free?" */
        const center = () => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
        /* from the placement coordinates, not the on-screen rectangle: that still carries the drop-in animation's transform at first */
        const note = () => { home = { x: parseFloat(el.style.left) + 2, y: parseFloat(el.style.top) - 2 }; };
        function moveTo(x, y) {
            const m = 30; x = Math.max(m, Math.min(innerWidth - m, x)); y = Math.max(navBottom() + m, Math.min(innerHeight - m, y));
            const c = center();
            el.style.left = (parseFloat(el.style.left) + x - c.x).toFixed(1) + 'px'; el.style.top = (parseFloat(el.style.top) + y - c.y).toFixed(1) + 'px';
        }
        function safe(x, y) { el.classList.add('w-ignore'); const ok = clearAt(x, y, 34); el.classList.remove('w-ignore'); return ok; }
        function nearest(x, y) {
            for (let r = 18; r <= 162; r += 18) for (let k = 0; k < 12; k++) {
                const a = k * Math.PI / 6, cx = x + Math.cos(a) * r, cy = y + Math.sin(a) * r;
                if (safe(cx, cy)) return { x: cx, y: cy };
            }
            return null;
        }
        /* settle at the current spot if it is free, else at the nearest free one, else back where it last was */
        function land() {
            if (!reduce) { el.classList.add('settling'); clearTimeout(settleT); settleT = setTimeout(() => el.classList.remove('settling'), 360); }
            const c = center();
            if (safe(c.x, c.y)) { note(); return; }
            const n = nearest(c.x, c.y);
            if (n) { moveTo(n.x, n.y); note(); } else if (home) moveTo(home.x - scrollX, home.y - scrollY);
        }

        /* state */
        function onKey(e) { if (e.key === 'Escape') { e.stopPropagation(); shut(true); } }
        function paint() {
            el.dataset.state = st;
            const shown = st === 'open', active = st === 'open' || st === 'opening';
            letter.inert = !shown; letter.setAttribute('aria-hidden', shown ? 'false' : 'true');
            hit.setAttribute('aria-expanded', active ? 'true' : 'false');
            hit.setAttribute('aria-label', active ? 'The opened envelope. Press to close the note' : LABEL);
            document.removeEventListener('keydown', onKey, true);
            if (active) document.addEventListener('keydown', onKey, true);
        }
        function settle(dir, mine) {
            if (mine !== token) return;                             /* interrupted by a newer open/close */
            clearTimeout(timer); if (anims[0]) anims[0].onfinish = null;
            st = dir > 0 ? 'open' : 'closed'; paint();
        }
        /* play the one timeline forwards (open) or backwards (close) from wherever it is now */
        function run(dir) {
            const mine = ++token, rate = dir > 0 ? 1 : -CLOSE_RATE, master = anims[0];
            anims.forEach(a => { a.playbackRate = rate; a.play(); });
            const left = dir > 0 ? D - master.currentTime : master.currentTime;
            clearTimeout(timer); timer = setTimeout(() => settle(dir, mine), left / Math.abs(rate) + 120);   /* never depend on finish alone */
            master.onfinish = () => settle(dir, mine);
        }
        /* keep the letter inside the screen: slide it sideways near an edge, and down when the envelope is too close to the top */
        function fit() {
            const r = el.getBoundingClientRect(), cx = r.left + r.width / 2, half = Math.min(190, innerWidth - 16) / 2 + 8;
            el.style.setProperty('--nx', (Math.max(half, Math.min(innerWidth - half, cx)) - cx).toFixed(1) + 'px');
            return Math.max(0, Math.min(44, navBottom() + 8 - (r.top + 24 - 152)));
        }

        /* three small hearts and three faint sparkles rise from the pocket, drift apart and fade; they live behind the letter and never take input.
           They draw on the shared FX budget: with room for fewer than 3 nothing is released, with less than 6 the sparkles are the ones dropped */
        function hearten() {
            if (reduce || el.getBoundingClientRect().top < navBottom() + 110) return;
            const n = FX.room(6); if (n < 3) return;
            const hearts3 = 3, total = Math.min(6, n);
            for (let k = 0; k < total; k++) {
                const spark = k >= hearts3, i = spark ? k - hearts3 : k, h = document.createElement('span');
                h.className = spark ? 'env-heart env-spark' : 'env-heart';
                h.innerHTML = spark ? SPARK.replace('FILL', SPARKS[i][0]).replace('STROKE', SPARKS[i][1]) : HEART; heartBox.appendChild(h);
                const dx = (i - 1) * rand(15, 24) * (spark ? 1.25 : 1) + rand(-5, 5), rise = rand(46, 78) * (spark ? 0.9 : 1);
                const a = h.animate([
                    { transform: 'translate(0, 6px) scale(0.4)', opacity: 0 },
                    { transform: 'translate(' + (dx * 0.5).toFixed(1) + 'px, ' + (-rise * 0.5).toFixed(1) + 'px) scale(1)', opacity: spark ? 0.85 : 0.95, offset: 0.3 },
                    { transform: 'translate(' + dx.toFixed(1) + 'px, ' + (-rise).toFixed(1) + 'px) scale(0.85)', opacity: 0 }
                ], { duration: rand(1000, 1400), delay: 250 + i * 70 + (spark ? 40 : 0), easing: 'ease-out', fill: 'backwards' });
                FX.track(h, a, 2200); hearts.push(a);
            }
        }
        const clearHearts = () => { hearts.forEach(a => { try { a.finish(); } catch (_) { } }); hearts = []; };

        function unfold() {
            if (st === 'opening' || st === 'open') return;
            if (st === 'closing') { st = 'opening'; paint(); run(1); return; }       /* turn the closing around from where it is */
            clearHearts();
            const extra = fit(); st = 'opening'; paint();
            if (reduce) { st = 'open'; paint(); return; }
            anims.forEach(a => a.cancel()); anims = timeline(el, extra);             /* fresh timeline: every deliberate opening replays from the start */
            run(1); hearten();
        }
        function shut(refocus) {
            if (st === 'closed' || st === 'closing') return;
            st = 'closing'; paint(); clearHearts();
            if (reduce) { st = 'closed'; paint(); } else run(-1);
            if (refocus) hit.focus();
        }

        /* a press on the closed envelope is either a tap (opens it) or a drag (moves it): 8 px tells them apart */
        hit.addEventListener('pointerdown', e => {
            if (st !== 'closed' || drag || (e.pointerType === 'mouse' && e.button !== 0)) return;
            const c = center(); drag = { id: e.pointerId, sx: e.clientX, sy: e.clientY, cx: c.x, cy: c.y, l: parseFloat(el.style.left), t: parseFloat(el.style.top), moved: false };
            try { hit.setPointerCapture(e.pointerId); } catch (_) { }
        });
        hit.addEventListener('pointermove', e => {
            if (!drag || e.pointerId !== drag.id) return;
            const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
            if (!drag.moved) { if (Math.hypot(dx, dy) <= 8) return; drag.moved = true; el.classList.remove('settling'); el.classList.add('is-dragging'); }
            /* straight from the press point: clamp to the screen, write left/top, no layout reads while moving */
            const m = 30, x = Math.max(m, Math.min(innerWidth - m, drag.cx + dx)), y = Math.max(navBottom() + m, Math.min(innerHeight - m, drag.cy + dy));
            el.style.left = (drag.l + x - drag.cx).toFixed(1) + 'px'; el.style.top = (drag.t + y - drag.cy).toFixed(1) + 'px';
        });
        function endPress(e, cancelled) {
            if (!drag || (e && e.pointerId !== drag.id)) return;
            const d = drag; drag = null;
            try { hit.releasePointerCapture(d.id); } catch (_) { }
            el.classList.remove('is-dragging'); handledAt = performance.now();
            if (d.moved) land();                                    /* a real drag never opens the letter */
            else if (!cancelled) unfold();
        }
        hit.addEventListener('pointerup', e => endPress(e, false));
        hit.addEventListener('pointercancel', e => endPress(e, true));
        hit.addEventListener('lostpointercapture', e => endPress(e, true));
        /* keyboard / assistive tech (and the close tap when open): a click that the pointer path has not just handled */
        hit.addEventListener('click', () => { if (performance.now() - handledAt < 700) return; if (st === 'open' || st === 'opening') shut(false); else unfold(); });
        hit.addEventListener('keydown', e => {
            const dir = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
            if (!dir || st !== 'closed') return;
            e.preventDefault();
            const c = center(), step = e.shiftKey ? 60 : 24;
            for (let m = 1; m <= 6; m++) {                          /* hop over anything in the way */
                const x = c.x + dir[0] * step * m, y = c.y + dir[1] * step * m;
                if (safe(x, y)) { moveTo(x, y); note(); return; }
            }
        });
        close.addEventListener('click', () => shut(true));

        /* layout changes: keep a closed envelope on a free spot; an open letter just re-fits */
        function recheck() {
            if (drag) return;
            if (st !== 'closed') { fit(); return; }
            const c = center(); if (safe(c.x, c.y)) { note(); return; }
            const n = nearest(c.x, c.y);
            if (n) { moveTo(n.x, n.y); note(); } else if (home) moveTo(home.x - scrollX, home.y - scrollY);
        }
        function onResize() { if (innerWidth === lastW) return; lastW = innerWidth; clearTimeout(rzT); rzT = setTimeout(recheck, 300); }
        addEventListener('resize', onResize);

        paint(); note();
    }

    /* ---- delivery ---- */
    let taps = 0, firstAt = 0, busy = false, placed = false, started = false;

    /* somewhere quiet: room for the opened letter above the envelope (strict), and a clear path for it to drift down.
       Phones are too full for that much room, so there only the envelope itself needs a clear spot (and its fall may cross a little text) */
    const pickAny = () => pickSpot(true) || (innerWidth < 700 ? pickSpot(false) : null);
    function pickSpot(strict) {
        for (let k = 0; k < 80; k++) {
            const m = innerWidth < 700 ? 44 : 120, x = rand(m, innerWidth - m), y = rand(navBottom() + 110, innerHeight - 60), top = Math.max(navBottom() + 30, y - (innerWidth < 700 ? 100 : 190));
            if (y - top < 80) continue;
            if (clearAt(x, y, 34) && (!strict || clearAt(x, y - 80, 110)) && (innerWidth < 700 || clearAt(x, (top + y) / 2, 20))) return { x, y, top, docY: y + scrollY };
        }
        return null;
    }

    /* the envelope itself, standing at `spot` (viewport spot, document-anchored); `from` = where it was dropped (viewport), or null to rise in gently */
    function place(spot, from) {
        const el = document.createElement('div'); el.className = 'w-envelope'; el.innerHTML = MARKUP;
        el.style.left = (spot.x + scrollX).toFixed(1) + 'px'; el.style.top = spot.docY.toFixed(1) + 'px';
        if (from) {
            el.style.setProperty('--dx', (from.x - spot.x).toFixed(1) + 'px'); el.style.setProperty('--dy', (from.y - (spot.docY - scrollY)).toFixed(1) + 'px');
            /* usable the moment it has landed (not after a fixed delay); the timer is only a fallback */
            el.classList.add('drifting');
            const landed = () => { el.removeEventListener('animationend', landed); clearTimeout(t); el.classList.remove('drifting'); };
            const t = setTimeout(landed, 3800); el.addEventListener('animationend', landed);
        } else el.classList.add('fade-in');
        document.body.appendChild(el);
        placed = true;
        envelope(el);
    }

    function deliver() {
        if (placed || busy || document.hidden || !Life.claim('envelope', 14000)) return false;
        const spot = pickAny(); if (!spot) { Life.release('envelope'); return false; }
        busy = true;
        /* the flight is the only thing that can hang (rAF stalls in a hidden tab): never leave the feature stuck "busy" */
        const guard = setTimeout(() => finish(), 15000);
        const finish = () => { clearTimeout(guard); busy = false; Life.release('envelope'); };
        if (reduce) { place(spot, null); finish(); return true; }
        const drop = { x: spot.x, y: spot.top };
        const carry = document.createElement('span'); carry.className = 'env-carry'; carry.innerHTML = svg('', BODY + PANELS + FLAP, '0 6 64 42');
        const bird = birds.visitingBird(() => drop, {
            swoop: true,
            arrive: () => {
                carry.remove();
                /* the page may have scrolled during the flight: if the landing is no longer in view, choose again (or land where it was dropped) */
                const y = spot.docY - scrollY;
                let land = spot;
                if (y < navBottom() + 60 || y > innerHeight - 20) land = pickAny() || { x: drop.x, y: drop.y, top: drop.y, docY: drop.y + scrollY };
                place(land, drop);
            },
            done: finish
        });
        bird.querySelector('.c-body').appendChild(carry);
        return true;
    }

    function onTap(e) {
        if (placed || busy) { taps = 0; return; }                     /* already here (or on its way): never a duplicate */
        if (e.target.closest && e.target.closest(IGNORE)) return;
        const now = performance.now();
        if (!taps || now - firstAt > WINDOW) { taps = 0; firstAt = now; }
        if (++taps < TAPS) return;
        if (deliver()) taps = 0;            /* if the stage is busy or there is no quiet spot, the gesture stays armed: the next quiet tap tries again */
        else firstAt = now;
    }

    function start() { if (started) return; started = true; document.addEventListener('click', onTap, true); }

    return { start };
});
