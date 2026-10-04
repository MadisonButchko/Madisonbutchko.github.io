    /* a little red bird that flutters around the empty spaces and points visitors down to the garden */
    (function(){
        const bed = document.querySelector('.garden-bed'); if (!bed) return;
        const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
        const BIRD = '<svg viewBox="0 0 40 34" aria-hidden="true">'
            + '<path d="M9 18 L0 13 L1.5 23 Z" fill="#a51d2d"/>'
            + '<ellipse cx="18" cy="20" rx="12" ry="9" fill="#d7263d"/>'
            + '<ellipse cx="21" cy="23.5" rx="7" ry="4.8" fill="#e8505b"/>'
            + '<path d="M23.5 9 L24.5 0.5 L30.5 7.5 Z" fill="#d7263d"/>'
            + '<circle cx="28" cy="13" r="7" fill="#d7263d"/>'
            + '<path d="M30 10.5 L36 11.5 L35.5 17.5 L30 16.5 Q28.5 13.5 30 10.5Z" fill="#2e2236"/>'
            + '<circle cx="31.2" cy="12.4" r="1.25" fill="#fff"/><circle cx="31.4" cy="12.5" r="0.7" fill="#2e2236"/>'
            + '<path d="M35 12 L40 14.5 L35 17 Z" fill="#f2a33a"/>'
            + '<g class="gb-wing"><path d="M10.5 16 C15 6.5 25.5 9 24 18 C21 22.5 13 22 10.5 16Z" fill="#a51d2d"/></g>'
            + '<path d="M15 28.5 L14 33 M21 28.5 L22 33" stroke="#8a5a2b" stroke-width="1.3" stroke-linecap="round"/></svg>';
        const el = document.createElement('button'); el.type = 'button'; el.className = 'guide-bird';
        el.setAttribute('aria-label', 'Go down to the garden and grow some flowers');
        el.innerHTML = '<span class="gb-body"><span class="gb-flip">' + BIRD + '</span></span><span class="gb-bubble">grow your garden below<span class="gb-arrow">&darr;</span></span>';
        document.body.appendChild(el);
        const bubble = el.querySelector('.gb-bubble');
        const BW = 26, BH = 22;

        /* anything a reader is looking at or clicking: the bird never settles on top of these */
        const BLOCK = 'p,h1,h2,h3,h4,li,a,button,img,input,label,.nav,.hero-text,.collage,.about-body,.about-photo-wrap,.section-head,.section-hint,.xp-head,.garden,.herbarium,.mb-bouquet,.seed-wrap,.vine-tip,.gallery-frame,.gallery-deviant,.contact-inner,.garden-bed,.garden-tip,.to-top,.critter,.page-posy,footer';
        let x = innerWidth + 40, y = innerHeight * 0.5, side = 'right', shown = false, flying = false, hovering = false, tok = null, nextWander = 0, gardenVisible = false;

        const bubbleW = () => (bubble.offsetWidth || 140) + 8;
        function boxFor(px, py, sd){ const bw = bubbleW(); return sd === 'right' ? { l: px, r: px + 32 + bw, t: py - 4, b: py + BH + 2 } : { l: px - 6 - bw, r: px + BW, t: py - 4, b: py + BH + 2 }; }
        function blockedCount(b){
            if (b.l < 6 || b.r > innerWidth - 6 || b.t < 6 || b.b > innerHeight - 6) return 99;
            let n = 0; const m = 10, xs = [b.l - m, (b.l + b.r) / 2, b.r + m], ys = [b.t - m, (b.t + b.b) / 2, b.b + m];
            for (const px of xs) for (const py of ys){
                const hits = document.elementsFromPoint(Math.max(0, Math.min(innerWidth - 1, px)), Math.max(0, Math.min(innerHeight - 1, py)));
                const top = hits.find(h => !el.contains(h));
                if (top && top.closest(BLOCK)) n++;
            }
            return n;
        }
        /* look for an open patch of page: try many spots, prefer clear ones near where the bird already is */
        function findSpot(minMove){
            const W = innerWidth, H = innerHeight, cands = [];
            for (let k = 0; k < 34; k++){
                const edge = k % 3 === 0, px = edge ? (Math.random() < 0.5 ? 14 + Math.random() * 120 : W - 40 - Math.random() * 120) : 14 + Math.random() * (W - 60);
                const py = 80 + Math.random() * Math.max(40, H - 160);
                cands.push([px, py]);
            }
            let best = null, bs = Infinity;
            for (const [px, py] of cands){
                const sd = px > W / 2 ? 'left' : 'right', d = Math.hypot(px - x, py - y);
                if (minMove && d < minMove && shown) continue;
                const score = blockedCount(boxFor(px, py, sd)) * 1000 + Math.min(d, 900) * 0.35 + Math.random() * 60;
                if (score < bs){ bs = score; best = { x: px, y: py, side: sd }; }
            }
            /* v10: only perch on genuinely open space; if none is free (common on phones) the bird stays away */
            return bs < 1000 ? best : null;
        }
        const ease = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        const set = () => { el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`; };
        function setSide(sd){ side = sd; el.classList.toggle('bubble-left', sd === 'left'); }
        function flyTo(tx, ty, done){
            if (tok) tok.stop = true;
            const x0 = x, y0 = y, dist = Math.hypot(tx - x0, ty - y0);
            if (reduce){ x = tx; y = ty; set(); done && done(); return; }
            const dur = Math.max(1100, Math.min(3200, dist * 3.6)), arc = Math.min(60, dist * 0.18), t0 = performance.now(), me = tok = { stop: false };
            flying = true; el.classList.add('flying');
            if (Math.abs(tx - x0) > 4) el.classList.toggle('face-left', tx < x0);
            (function step(now){
                if (me.stop) return;
                const t = Math.min(1, (now - t0) / dur), e = ease(t);
                x = x0 + (tx - x0) * e; y = y0 + (ty - y0) * e - Math.sin(Math.PI * t) * arc + Math.sin(t * 18) * 2.5; set();
                if (t < 1) requestAnimationFrame(step);
                else { flying = false; el.classList.remove('flying'); done && done(); }
            })(t0);
        }
        function settle(spot){ flyTo(spot.x, spot.y, () => {
            setSide(spot.side); el.classList.toggle('face-left', spot.side === 'left'); nextWander = performance.now() + 16000 + Math.random() * 12000;
            /* the page may have moved while it flew: never stay perched on text */
            if (blockedCount(boxFor(x, y, side)) > 0){ const s2 = findSpot(0); if (s2 && (Math.abs(s2.x - x) > 4 || Math.abs(s2.y - y) > 4)) settle(s2); else if (!s2) exit(); }
        }); }
        window.__guideBird = {
            el, visible: () => shown && !flying && el.classList.contains('on'),
            at: () => ({ x: x + BW / 2, y: y + BH / 2 }),
            visit(tx, ty, done){ hovering = false; flyTo(tx - BW / 2, ty - BH + 4, () => { nextWander = performance.now() + 4000; done && done(); }); }
        };
        let retryAt = 0;
        function enter(){
            if (performance.now() < retryAt) return;
            const spot = findSpot(0); if (!spot){ retryAt = performance.now() + 6000; return; }
            shown = true; el.classList.add('on');
            x = innerWidth + 40; y = Math.max(20, spot.y - 70); set(); settle(spot);
        }
        function exit(){
            if (!shown) return; shown = false;
            const off = x < innerWidth / 2 ? -60 : innerWidth + 60;
            flyTo(off, Math.max(-60, y - 120), () => { if (!shown) el.classList.remove('on'); });
        }
        const wanted = () => !gardenVisible && !document.hidden && !document.querySelector('.gallery-modal.active, .lightbox.active');

        new IntersectionObserver(es => es.forEach(e => { gardenVisible = e.isIntersecting; if (gardenVisible) exit(); }), { threshold: 0.15 }).observe(bed);
        el.addEventListener('mouseenter', () => { hovering = true; });
        el.addEventListener('mouseleave', () => { hovering = false; nextWander = performance.now() + 4000; });
        /* the bird and its label are one button: click, tap, Enter and Space all glide to the garden */
        el.addEventListener('click', e => {
            e.stopPropagation(); e.preventDefault();
            bed.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
            if (!bed.hasAttribute('tabindex')) bed.setAttribute('tabindex', '-1');
            setTimeout(() => { try { bed.focus({ preventScroll: true }); } catch (_) {} }, reduce ? 0 : 700);
        });

        /* heartbeat: show/hide, and drift to a new open spot every so often */
        let started = false; setTimeout(() => { started = true; }, 2500);
        setInterval(() => {
            if (!started) return;
            if (wanted() && !shown) return enter();
            if (!wanted() && shown) return exit();
            if (shown && !flying && !hovering && !reduce && !Life.busy() && performance.now() > nextWander){ const s = findSpot(90); if (s) settle(s); else nextWander = performance.now() + 4000; }
        }, 700);

        /* when the page scrolls, text moves under the bird: if it's now covering something, hop out of the way */
        let tk = false, lastCheck = 0;
        const recheck = () => {
            tk = false; if (!shown || flying || hovering) return;
            const now = performance.now(); if (now - lastCheck < 180) return; lastCheck = now;
            if (blockedCount(boxFor(x, y, side)) > 0){ const s = findSpot(0); if (!s) exit(); else if (Math.abs(s.x - x) > 4 || Math.abs(s.y - y) > 4) settle(s); }
        };
        addEventListener('scroll', () => { if (!tk){ tk = true; requestAnimationFrame(recheck); } }, { passive: true });
        addEventListener('resize', () => { if (shown && !flying){ const s = findSpot(0); if (s) settle(s); else exit(); } });
        /* clicking an experience/skill circle can open a panel under the bird, so check after clicks too */
        document.addEventListener('click', () => setTimeout(() => { lastCheck = 0; recheck(); }, 450));
    })();

