    /* FX v3a: text hover settle (js/effects/text-effects.js) */
    MB.use('effects.text-effects').hoverSettle();

    /* FX v3b: rainbow glow that follows the cursor everywhere (moved with transforms = smooth) */
    (function(){
        const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduce) return;
        const glow = document.createElement('div'); glow.className = 'rainbow-glow'; glow.innerHTML = '<i></i>'; document.body.insertBefore(glow, document.body.firstChild);
        let gx = innerWidth / 2, gy = innerHeight / 2, tgx = gx, tgy = gy, gRun = false;
        function gLoop(){ gx += (tgx - gx) * 0.18; gy += (tgy - gy) * 0.18; glow.style.transform = `translate3d(${gx - 300}px, ${gy - 300}px, 0)`; if (Math.abs(tgx - gx) + Math.abs(tgy - gy) > 0.5) requestAnimationFrame(gLoop); else gRun = false; }
        addEventListener('pointermove', e => { tgx = e.clientX; tgy = e.clientY; glow.classList.add('on'); if (!gRun){ gRun = true; requestAnimationFrame(gLoop); } }, { passive: true });
        document.addEventListener('mouseleave', () => glow.classList.remove('on'));
    })();

    /* FX v3c: butterfly cursor (mouse / trackpad only) */
    (function(){
        const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduce) return;
        if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
        document.documentElement.classList.add('bf-cursor');
        const bf = document.createElement('div'); bf.className = 'bf-pointer';
        bf.innerHTML = '<div class="bf-inner"><svg viewBox="-24 -20 48 40"><g class="bf-wing-l"><path d="M-1 -2 C-10 -20 -26 -16 -21 -3 C-18 4 -8 3 -1 0Z" fill="#c9b2ec"/><path d="M-1 1 C-9 3 -18 10 -13 16 C-8 19 -3 10 -1 3Z" fill="#f4a7bf"/><circle cx="-14" cy="-7" r="3" fill="#fff" opacity=".75"/><circle cx="-10" cy="9" r="1.8" fill="#fbdc84"/></g><g class="bf-wing-r"><path d="M1 -2 C10 -20 26 -16 21 -3 C18 4 8 3 1 0Z" fill="#c9b2ec"/><path d="M1 1 C9 3 18 10 13 16 C8 19 3 10 1 3Z" fill="#f4a7bf"/><circle cx="14" cy="-7" r="3" fill="#fff" opacity=".75"/><circle cx="10" cy="9" r="1.8" fill="#fbdc84"/></g><rect x="-1.5" y="-8" width="3" height="20" rx="1.5" fill="#5a4366"/><path d="M-1 -8 Q-5 -15 -7 -16 M1 -8 Q5 -15 7 -16" stroke="#5a4366" stroke-width="1" fill="none"/></svg></div>';
        document.body.appendChild(bf);
        const cv = document.createElement('canvas'); cv.className = 'bf-trail'; document.body.appendChild(cv);
        const ctx = cv.getContext('2d'); let dpr = Math.min(devicePixelRatio || 1, 2);
        const size = () => { cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }; size(); addEventListener('resize', size);
        let mx = innerWidth / 2, my = innerHeight / 2, x = mx, y = my, ang = 0, t = 0; const pts = [];
        addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; bf.classList.add('on'); }, { passive: true });
        document.addEventListener('mouseleave', () => bf.classList.remove('on'));
        document.addEventListener('mouseover', e => bf.classList.toggle('big', !!e.target.closest('a, button, .profile-photo, .contact-photo, .about-photo, .g-cat, .h-spec, .gs-bud, .gs-head, .bq-btn, .preview-item, .collage-item, .gallery-preview, .fan-dots button, .critter, .vine-hit')));
        let lastX = mx, bfRun = false, idleSince = 0;
        function wake(){ if (!bfRun){ bfRun = true; requestAnimationFrame(loop); } }
        addEventListener('pointermove', wake, { passive: true });
        function loop(now){
            x = mx; y = my;
            const vx = x - lastX; lastX = x;
            const target = Math.max(-22, Math.min(22, vx * 1.4));
            ang += (target - ang) * 0.12;
            bf.style.transform = `translate(${x}px, ${y}px) rotate(${ang.toFixed(2)}deg)`;
            const lp = pts[pts.length - 1];
            if (!lp || Math.hypot(x - lp.x, y - lp.y) > 6) pts.push({ x, y, t: now });
            while (pts.length && now - pts[0].t > 700) pts.shift();
            ctx.clearRect(0, 0, innerWidth, innerHeight);
            if (pts.length > 2){
                ctx.setLineDash([2, 7]); ctx.lineWidth = 1.5; ctx.lineCap = 'round';
                ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
                for (let i = 1; i < pts.length - 1; i++){ const mx2 = (pts[i].x + pts[i + 1].x) / 2, my2 = (pts[i].y + pts[i + 1].y) / 2; ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx2, my2); }
                const g = ctx.createLinearGradient(pts[0].x, pts[0].y, x, y); g.addColorStop(0, 'rgba(194,69,126,0)'); g.addColorStop(1, 'rgba(194,69,126,0.55)');
                ctx.strokeStyle = g; ctx.stroke();
            }
            if (pts.length < 2 && Math.abs(ang) < 0.2){ bfRun = false; return; }
            requestAnimationFrame(loop);
        }
        wake();
    })();

    /* Gallery v3: rainbow frame around the preview (js/gallery/gallery.js) */
    MB.use('gallery.gallery').frame();

