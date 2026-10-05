/* js/easter-eggs/envelope.js
   Purpose : the secret envelope: after three taps within two seconds on quiet background a small bird flies in and drops an envelope; tap it and the flap hinges open, a folded letter slides out and unfolds onto light pink graph paper while a few hearts drift up. Closed, it can be dragged (or moved with the arrow keys) to another quiet spot.
   Owns    : the tap counter, the delivery (spot choice, bird, drift, one bounded retry timer when the stage is busy), the envelope + letter markup, the closed/opening/open/closing state machine, the hearts and sparkles, dragging and keyboard repositioning (element-scoped pointer handlers only), one resize recheck. Nothing is saved: nothing opens on its own, and the gesture works on every page load (the envelope stays once it has arrived).
   Uses    : core.utils (rand, reduce), core.scheduler (Life), core.safe-zones (navBottom), core.particles (FX: heart budget), animals.birds (visitingBird: the flight + carried item).   Used by: main.js (start()).
   Mobile / reduced motion: taps work on touch; the envelope is a focusable button (Enter/Space opens, arrow keys move it when closed); the letter has a close button and Escape closes it (focus returns to the envelope). Reduced motion: no bird, drift, folding, particles, rays or animated repositioning; the letter fades in with a brief static glow.
   Cleanup : the one tap listener is added once; the envelope stays after the note is closed; the Escape listener exists only while the letter is open; opening/closing are Web Animations that are reversed (never stacked) and rebuilt on each fresh opening; decorative effects are removed immediately (and particle slots returned) when interrupted; the one resize listener lives with the envelope. */
MB.define('easter-eggs.envelope', ['core.utils', 'core.scheduler', 'core.safe-zones', 'core.particles', 'animals.birds'], function (utils, scheduler, zones, particles, birds) {
    'use strict';
    const { rand, reduce } = utils, { Life } = scheduler, { navBottom } = zones, { FX } = particles;
    const TAPS = 3, WINDOW = 2000;      /* three quiet taps within two seconds */
    /* Protect controls and photos as whole boxes, but only the actual lines of text.
       Container boxes such as .hero-text include empty background on narrow screens. */
    const SOLID = 'a,button,[role="button"],[tabindex]:not([tabindex="-1"]),summary,input,label,select,textarea,img,.collage,.nav,.m-header,.m-menu,.garden,.herbarium,.mb-bouquet,.seed-wrap,.gallery-frame,.guide-bird,.page-posy,.w-piece,#galleryModal,#lightbox';
    const IGNORE = SOLID + ',.w-envelope';
    function spaceCheck() {
        const visible = el => !el.closest('.w-ignore,.w-envelope,script,style,template,.vh,[hidden]') && getComputedStyle(el).visibility !== 'hidden';
        const rects = Array.from(document.querySelectorAll(SOLID)).filter(visible).map(el => el.getBoundingClientRect());
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
            acceptNode: n => n.textContent.trim() && visible(n.parentElement) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT
        });
        const range = document.createRange();
        for (let n = walker.nextNode(); n; n = walker.nextNode()) {
            range.selectNodeContents(n); rects.push(...range.getClientRects());
        }
        const blocks = rects.filter(r => r.width && r.height && r.bottom > 0 && r.top < innerHeight);
        const top = navBottom();
        return (x, y, r) => x - r >= 8 && x + r <= innerWidth - 8 && y - r >= top + 6 && y + r <= innerHeight - 8 &&
            !blocks.some(b => x + r > b.left && x - r < b.right && y + r > b.top && y - r < b.bottom);
    }
    const clearAt = (x, y, r) => spaceCheck()(x, y, r);

    /* ---- art (viewBox "0 -14 64 60": one unit = one pixel of the 64 x 60 envelope) ---- */
    const S = 'stroke="#b9708a" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"';
    const BODY = '<path d="M3 9.5 Q2 9 2.6 8.5 L61 8.2 Q62.4 8.6 62 10 L62.4 43 Q62 45 60.5 44.6 L3.5 44.8 Q2 44.6 2.3 43 Z" fill="#fff4e2" ' + S + '/>';
    const PANELS = '<path d="M2.6 9.5 L31 31 L2.4 43.6 Z" fill="#fffaf0" ' + S + '/><path d="M61.6 9.5 L33 31 L61.8 43.6 Z" fill="#fffaf0" ' + S + '/><path d="M2.6 44 L32 24.5 L61.6 44 Z" fill="#fff0f4" ' + S + '/>';
    const FLAP = '<path d="M2.4 9 Q32 8.6 61.6 9 L32 32.5 Z" fill="#f9d6e1" ' + S + '/>';
    const FLAP_OPEN = '<path d="M3 9 L31.5 -11 Q32 -11.5 32.5 -11 L61 9 Z" fill="#f8c9d8" ' + S + '/>';
    const SEAL = '<path d="M32 38.2 C25.5 33 24.4 27.6 28.2 26.2 C30.4 25.4 31.8 27 32 28 C32.2 27 33.6 25.4 35.8 26.2 C39.6 27.6 38.5 33 32 38.2Z" fill="#e9789f" stroke="#c2457e" stroke-width="1.2" stroke-linejoin="round"/><path d="M29.2 28.4 Q30 27.6 30.9 28.3" stroke="#fff" opacity=".7" stroke-width="1" fill="none" stroke-linecap="round"/>';
    const HEART = '<svg viewBox="0 0 16 15" aria-hidden="true"><path d="M8 14 C2.1 10.2 .8 5.7 3.1 3.5 C4.8 1.9 7 2.8 8 4.5 C9.1 2.7 11.5 1.9 13 3.7 C15.2 6.2 13.6 10.4 8 14Z" fill="FILL" stroke="STROKE" stroke-width=".8" stroke-linejoin="round"/></svg>';
    const HEARTS = [
        ['#f7a9c4', '#d9789f'], ['#ffc5aa', '#e59a82'], ['#f9e6a4', '#d7b95e'], ['#bfe7cf', '#7fbd9b'],
        ['#bdddf5', '#7fb1d5'], ['#d7c6f2', '#a18acb'], ['#efb2be', '#ce7f91']
    ];
    const SPARKS = [
        ['star', '#f9dfa0', '#d6ab4f'], ['glint', '#d8c9f1', '#9d85c9'], ['dot', '#c9e4f6', '#82b5d5'],
        ['star', '#f7bfd4', '#d985aa'], ['glint', '#f9dfa0', '#d6ab4f'], ['dot', '#e0d4f5', '#a18acb'],
        ['star', '#cbe8f6', '#82b5d5'], ['glint', '#f8c4d5', '#d985aa']
    ];
    const spark = (kind, fill, stroke) => kind === 'dot'
        ? '<svg viewBox="0 0 12 12" aria-hidden="true"><circle cx="6" cy="6" r="3.2" fill="' + fill + '" stroke="' + stroke + '" stroke-width=".7"/></svg>'
        : kind === 'glint'
            ? '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M6 .7 L6.7 5.3 L11.3 6 L6.7 6.7 L6 11.3 L5.3 6.7 L.7 6 L5.3 5.3Z" fill="' + fill + '" stroke="' + stroke + '" stroke-width=".55"/></svg>'
            : '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M6 .9 L7.5 4.5 L11.1 6 L7.5 7.5 L6 11.1 L4.5 7.5 L.9 6 L4.5 4.5Z" fill="' + fill + '" stroke="' + stroke + '" stroke-width=".55" stroke-linejoin="round"/></svg>';
    const svg = (cls, inner, vb) => '<svg class="' + cls + '" viewBox="' + (vb || '0 -14 64 60') + '" aria-hidden="true">' + inner + '</svg>';
    const COPY = '<span class="env-hello">hello, curious soul</span><span>the garden has secrets</span><span>come explore <b class="env-copy-heart" aria-label="heart">♡</b></span>';
    const LABEL = 'A tiny envelope with a heart seal. Press to open it; arrow keys move it';
    /* the letter is one sheet of four panels (folded in quarters), so the folds are real: the top row hinges up, then the left panels swing open */
    const SHEET = '<div class="env-sheet" aria-hidden="true">' +
        '<div class="env-row b"><i class="env-panel br"></i><i class="env-panel bl"><b class="shade"></b></i></div>' +
        '<div class="env-row t"><i class="env-panel tr"></i><i class="env-panel tl"><b class="shade"></b></i><b class="shade"></b></div></div>';
    const MARKUP =
        svg('env-back', BODY) +
        '<svg class="env-flap-open" viewBox="0 -12 64 21" aria-hidden="true">' + FLAP_OPEN + '</svg>' +
        '<div class="env-magic" aria-hidden="true"><span class="env-glow"></span><span class="env-ring"></span><span class="env-ray r1"></span><span class="env-ray r2"></span><span class="env-ray r3"></span><span class="env-ray r4"></span></div>' +
        '<div class="env-hearts" aria-hidden="true"></div>' +
        '<div class="env-letter-box"><div class="env-letter" role="region" aria-label="A handwritten note" aria-hidden="true">' + SHEET +
            '<div class="env-paper-shimmer" aria-hidden="true"></div><div class="env-text"><div class="env-copy">' + COPY + '</div></div>' +
            '<button type="button" class="env-close" aria-label="Close the note"><svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 2.5 L9.5 9.5 M9.5 2.5 L2.5 9.5" stroke="#8c5a73" stroke-width="1.6" stroke-linecap="round" fill="none"/></svg></button>' +
        '</div></div>' +
        svg('env-front', PANELS) +
        '<svg class="env-flap" viewBox="0 9 64 24" aria-hidden="true">' + FLAP + '</svg>' +
        svg('env-seal', SEAL) +
        '<button type="button" class="env-hit" aria-expanded="false" aria-label="' + LABEL + '"></button>';

    /* ---- opening / closing: one timeline of D ms; closing plays it backwards, faster, so the stages undo in reverse order ---- */
    /* how far the opened sheet reaches above the envelope's pocket, and how far fit() may push it down; delivery uses the same numbers to keep the note on screen */
    const LETTER_UP = 152, MAX_PUSH = 44;
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
        const letter = q('.env-letter'), hit = q('.env-hit'), close = q('.env-close'), magic = q('.env-magic'), heartBox = q('.env-hearts');
        let st = 'closed', anims = [], hearts = new Set(), token = 0, timer = 0, settleT = 0, rzT = 0;
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
        const safe = (x, y) => clearAt(x, y, 34);
        function nearest(x, y) {
            const clear = spaceCheck();
            for (let r = 18; r <= 162; r += 18) for (let k = 0; k < 12; k++) {
                const a = k * Math.PI / 6, cx = x + Math.cos(a) * r, cy = y + Math.sin(a) * r;
                if (clear(cx, cy, 34)) return { x: cx, y: cy };
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
            return Math.max(0, Math.min(MAX_PUSH, navBottom() + 8 - (r.top + 24 - LETTER_UP)));
        }

        function illuminate() {
            magic.hidden = false;
            if (reduce) {
                magic.classList.add('is-still');
                let t = 0;
                const clean = () => { clearTimeout(t); magic.hidden = true; magic.classList.remove('is-still'); hearts.delete(clean); };
                t = setTimeout(clean, 1300); hearts.add(clean);
                return;
            }
            const glow = q('.env-glow'), ring = q('.env-ring'), shimmer = q('.env-paper-shimmer');
            const rays = Array.from(magic.querySelectorAll('.env-ray'));
            const animations = [glow.animate([
                { opacity: 0, transform: 'translate(-50%, 10px) scale(.58)' },
                { opacity: .88, transform: 'translate(-50%, 0) scale(1)', offset: .32 },
                { opacity: .54, transform: 'translate(-50%, -7px) scale(1.14)', offset: .68 },
                { opacity: 0, transform: 'translate(-50%, -12px) scale(1.22)' }
            ], { duration: 1550, delay: 70, easing: 'ease-out', fill: 'both' }), ring.animate([
                { opacity: 0, transform: 'translate(-50%, -50%) scale(.46)' },
                { opacity: .62, transform: 'translate(-50%, -50%) scale(.76)', offset: .28 },
                { opacity: .28, transform: 'translate(-50%, -50%) scale(1)', offset: .66 },
                { opacity: 0, transform: 'translate(-50%, -50%) scale(1.16)' }
            ], { duration: 1550, delay: 130, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'both' }), shimmer.animate([
                { opacity: 0, backgroundPosition: '135% 0' },
                { opacity: .72, backgroundPosition: '80% 0', offset: .28 },
                { opacity: .5, backgroundPosition: '15% 0', offset: .68 },
                { opacity: 0, backgroundPosition: '-35% 0' }
            ], { duration: 1050, delay: 760, easing: 'ease-in-out', fill: 'both' }), q('.env-front').animate([
                { filter: 'drop-shadow(0 0 0 rgba(255,225,154,0))' },
                { filter: 'drop-shadow(0 0 10px rgba(255,225,154,.82))', offset: .42 },
                { filter: 'drop-shadow(0 0 0 rgba(255,225,154,0))' }
            ], { duration: 1100, delay: 90, easing: 'ease-out', fill: 'both' })];
            rays.forEach((ray, i) => animations.push(ray.animate([
                { opacity: 0, transform: 'translateX(-50%) rotate(var(--ray-angle)) scaleY(.3)' },
                { opacity: .48, transform: 'translateX(-50%) rotate(var(--ray-angle)) scaleY(1)', offset: .38 },
                { opacity: 0, transform: 'translateX(-50%) rotate(var(--ray-angle)) scaleY(1.18)' }
            ], { duration: 1250 + i * 55, delay: 210 + i * 35, easing: 'ease-out', fill: 'both' })));
            let left = animations.length;
            const clean = () => { if (!hearts.has(clean)) return; animations.forEach(a => a.cancel()); magic.hidden = true; hearts.delete(clean); };
            hearts.add(clean);
            animations.forEach(a => a.addEventListener('finish', () => { if (!--left) clean(); }, { once: true }));
        }

        /* One bounded burst per closed → opening cycle; reversing a partial close
           continues that cycle without spawning a second burst. Paths use the same
           protected-content checks as placement, with room for the whole particle. */
        function hearten() {
            if (reduce || !FX.room(1)) return;
            const clear = spaceCheck(), style = getComputedStyle(el);
            const matrix = new DOMMatrix(style.transform === 'none' ? undefined : style.transform);
            const scale = parseFloat(style.scale) || 1;
            const pieces = HEARTS.map((colors, i) => ({ heart: true, i, colors })).concat(SPARKS.map((spec, i) => ({ heart: false, i, spec })));
            for (let k = 0; k < pieces.length && FX.room(1); k++) {
                const piece = pieces[k], h = document.createElement('span'), size = piece.heart ? rand(21, 30) : rand(8, 14);
                h.className = piece.heart ? 'env-heart' : 'env-heart env-spark env-' + piece.spec[0];
                h.style.width = size.toFixed(1) + 'px'; h.style.height = (size * (piece.heart ? .94 : 1)).toFixed(1) + 'px';
                h.style.left = (32 - size / 2 + rand(-7, 7)).toFixed(1) + 'px'; h.style.top = (12 + rand(-3, 5)).toFixed(1) + 'px';
                h.innerHTML = piece.heart
                    ? HEART.replace('FILL', piece.colors[0]).replace('STROKE', piece.colors[1])
                    : spark(piece.spec[0], piece.spec[1], piece.spec[2]);
                heartBox.appendChild(h);
                const box = h.getBoundingClientRect(), cx = box.left + box.width / 2, cy = box.top + box.height / 2;
                const side = piece.i % 2 ? 1 : -1, lane = piece.heart ? Math.floor(piece.i / 2) : piece.i % 3;
                const dx = side * rand(116 + lane * 8, 136 + lane * 10), rise = rand(piece.heart ? 82 : 62, piece.heart ? 134 : 110);
                const turn = rand(-34, 34), startTurn = rand(-24, 24);
                /* Sample the entire rise with overlapping padded footprints, including
                   the envelope's tilt/hover scale. Try a shorter path in tight spaces. */
                const pathClear = factor => {
                    for (let j = 0; j <= 24; j++) {
                        const t = j / 24, x = dx * factor * t, y = 6 - (rise * factor + 6) * t;
                        if (!clear(cx + scale * (matrix.a * x + matrix.c * y), cy + scale * (matrix.b * x + matrix.d * y), size / 2 + 4)) return false;
                    }
                    return true;
                };
                const factor = [1, 0.82, 0.64, 0.5].find(pathClear);
                if (!factor) { h.remove(); continue; }
                const a = h.animate([
                    { transform: 'translate(0, 7px) rotate(' + startTurn.toFixed(1) + 'deg) scale(.3)', opacity: 0 },
                    { transform: 'translate(' + (dx * factor * .58).toFixed(1) + 'px, ' + (3 - rise * factor * .58).toFixed(1) + 'px) rotate(' + (startTurn + turn * .55).toFixed(1) + 'deg) scale(1.14)', opacity: piece.heart ? .98 : 1, offset: .4 },
                    { transform: 'translate(' + (dx * factor).toFixed(1) + 'px, ' + (-rise * factor).toFixed(1) + 'px) rotate(' + (startTurn + turn).toFixed(1) + 'deg) scale(.82)', opacity: 0 }
                ], { duration: rand(1400, 1750), delay: 270 + k * 16, easing: 'cubic-bezier(.2,.7,.25,1)', fill: 'both' });
                const release = FX.track(h, a, 2250);
                const clean = () => { release(); hearts.delete(clean); a.cancel(); };
                hearts.add(clean);
                a.addEventListener('finish', clean, { once: true });
            }
        }
        const clearHearts = () => { hearts.forEach(clean => clean()); hearts.clear(); };

        function unfold() {
            if (st === 'opening' || st === 'open') return;
            if (st === 'closing') { st = 'opening'; paint(); run(1); return; }       /* turn the closing around from where it is */
            clearHearts();
            const extra = fit(); st = 'opening'; paint();
            illuminate();
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
    /* a gesture that could not be served at once (another creature has the stage, or no quiet spot this second) is retried for a short while, from one timer */
    const RETRY_MS = 1000, RETRY_SPAN = 60000;
    let retryT = 0, retryUntil = 0;
    const cancelRetry = () => { clearTimeout(retryT); retryT = 0; };
    function retry() {
        retryT = 0;
        if (placed || busy || deliver()) return;
        if (performance.now() < retryUntil) retryT = setTimeout(retry, RETRY_MS);
    }
    function queueRetry() { retryUntil = performance.now() + RETRY_SPAN; if (!retryT) retryT = setTimeout(retry, RETRY_MS); }

    /* somewhere quiet, in two separate parts.
       The closed envelope needs a clear spot of its own (hard rule: never over text or controls) and must sit low enough for the opened letter to stay on screen (hard rule: fit() can only push it so far).
       Clear space for the letter and for the fall is only a preference, so a crowded page still gets an envelope: the best-ranked spot wins (3 = both clear, 2 = fall clear, 1 = envelope clear only) */
    const letterMinY = () => navBottom() + LETTER_UP - 24 + 8 - MAX_PUSH + 30;
    function rankSpot(x, y, top, fit, clearAt) {
        if (!clearAt(x, y, fit)) return 0;
        return 1 + (innerWidth < 700 || clearAt(x, (top + y) / 2, 20) ? 1 : 0) + (clearAt(x, y - 80, 110) ? 1 : 0);
    }
    const pickSpot = () => search(34);
    function search(fit) {
        const m = innerWidth < 700 ? 44 : 60, minY = letterMinY(), maxY = innerHeight - 60, up = innerWidth < 700 ? 100 : 190;
        if (maxY <= minY) return null;
        const clear = spaceCheck();
        let best = null, bestRank = 0;
        const consider = (x, y) => {
            const top = Math.max(navBottom() + 30, y - up), r = y - top < 80 ? 0 : rankSpot(x, y, top, fit, clear);
            if (r > bestRank) { bestRank = r; best = { x, y, top, docY: y + scrollY }; }
            return r === 3;
        };
        for (let k = 0; k < 60; k++) if (consider(rand(m, innerWidth - m), rand(minY, maxY))) return best;
        if (best) return best;
        /* nothing by luck: look everywhere once, in random order and within a small time budget */
        const grid = [], t0 = performance.now();
        for (let y = minY; y <= maxY; y += 36) for (let x = m; x <= innerWidth - m; x += 36) grid.push([x, y]);
        grid.sort(() => Math.random() - 0.5);
        for (const p of grid) { if (performance.now() - t0 > 80) break; if (consider(p[0], p[1])) break; }
        return best;
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
        if (placed || busy || document.hidden || !Life.claim('envelope', 14000, 'preempt')) return false;
        const spot = pickSpot(); if (!spot) { Life.release('envelope'); return false; }
        busy = true; cancelRetry();
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
                if (y < letterMinY() || y > innerHeight - 20) land = pickSpot() || { x: drop.x, y: drop.y, top: drop.y, docY: drop.y + scrollY };
                place(land, drop);
            },
            done: finish
        });
        bird.querySelector('.c-body').appendChild(carry);
        return true;
    }

    function onTap(e) {
        if (placed || busy) { taps = 0; cancelRetry(); return; }                     /* already here (or on its way): never a duplicate */
        if (e.target.closest && e.target.closest(IGNORE)) return;
        if (!clearAt(e.clientX, e.clientY, 0)) return;
        const now = performance.now();
        if (!taps || now - firstAt > WINDOW) { taps = 0; firstAt = now; }
        if (++taps < TAPS) return;
        if (deliver()) taps = 0;            /* if the stage is busy or there is no quiet spot, the gesture stays armed (the next quiet tap tries again) and a bounded retry runs meanwhile */
        else { firstAt = now; queueRetry(); }
    }

    function start() { if (started) return; started = true; document.addEventListener('click', onTap, true); }

    return { start };
});
