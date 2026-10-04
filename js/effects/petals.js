/* js/effects/petals.js
   Purpose : drifting spring petals (two canvases) and the click-burst petals.
   Owns    : the #petalsBack / #petalsFront canvases, their animation loop, resize handling and click bursts.
   Uses    : nothing.   Used by: nothing (self-contained; loaded at the position the old petals block ran).
   Mobile / reduced motion: returns immediately under prefers-reduced-motion (no canvas drawing, no listeners); DPR capped at 1 on phones (< 700 px) and 1.5 otherwise.
   Moved verbatim from the legacy files (Migration Step 6); behaviour, order and timing unchanged. */
MB.define('effects.petals', [], function () {
    'use strict';

        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const COLORS = ['#f2c230','#f7d65e','#f4a7bf','#f9c6d6','#b9a2de','#d6c7f0','#fff4f7','#f8c9a0'];
        const back = document.getElementById('petalsBack'), front = document.getElementById('petalsFront');
        const bctx = back.getContext('2d'), fctx = front.getContext('2d');
        let W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, innerWidth < 700 ? 1 : 1.5);
        function resize(){ W = innerWidth; H = innerHeight; [back, front].forEach(c => { c.width = W * dpr; c.height = H * dpr; c.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0); }); }
        resize(); addEventListener('resize', () => { const ow = W; resize(); if (ow) for (const p of ambient) p.x = Math.min(p.x * W / ow, W); });
        const rand = (a, b) => a + Math.random() * (b - a);
        function makePetal(y){
            return { x: rand(0, W), y: y ?? rand(-H, 0), r: rand(5, 11), c: COLORS[Math.floor(Math.random() * COLORS.length)],
                vy: rand(6, 11), sway: rand(0.4, 0.9), phase: rand(0, Math.PI * 2), rot: rand(0, Math.PI * 2), vr: rand(-0.25, 0.25),
                flip: rand(0, Math.PI * 2), vf: rand(0.25, 0.55), a: rand(0.45, 0.8) };
        }
        /* v10: fewer, slower petals so the page feels calm */
        const count = W < 700 ? 10 : 18;
        const ambient = Array.from({ length: count }, () => makePetal(rand(-H, H)));
        let burst = [];
        function drawPetal(ctx, p){
            ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.scale(1, Math.cos(p.flip) * 0.8 + 0.2);
            ctx.globalAlpha = p.a; ctx.fillStyle = p.c;
            ctx.beginPath(); ctx.moveTo(0, -p.r);
            ctx.bezierCurveTo(p.r * 0.9, -p.r * 0.6, p.r * 0.7, p.r * 0.8, 0, p.r);
            ctx.bezierCurveTo(-p.r * 0.7, p.r * 0.8, -p.r * 0.9, -p.r * 0.6, 0, -p.r);
            ctx.fill();
            ctx.globalAlpha = p.a * 0.35; ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.ellipse(-p.r * 0.2, -p.r * 0.25, p.r * 0.18, p.r * 0.45, 0.3, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        }
        /* everything moves in px per SECOND (not per frame) so speed never depends on window width or refresh rate */
        let t = 0, running = true, last = 0, frontDirty = false;
        function frame(now){
            if (!running) return;
            const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016; last = now; t += dt;
            bctx.clearRect(0, 0, W, H);
            /* the front canvas only holds click bursts: leave it alone while it is empty */
            if (burst.length || frontDirty){ fctx.clearRect(0, 0, W, H); frontDirty = burst.length > 0; }
            for (const p of ambient){
                p.y += p.vy * dt; p.x += (Math.sin(t * 0.45 + p.phase) * p.sway * 9 + 4) * dt; p.rot += p.vr * dt; p.flip += p.vf * dt;
                if (p.y > H + 20 || p.x > W + 30) Object.assign(p, makePetal(-20));
                drawPetal(bctx, p);
            }
            const k = dt * 60;
            burst = burst.filter(p => p.life > 0);
            for (const p of burst){
                p.vy += 0.06 * k; p.vx *= Math.pow(0.985, k); p.x += p.vx * k; p.y += p.vy * k; p.rot += p.vr * k; p.flip += p.vf * k; p.life -= k;
                p.a = Math.min(0.95, p.life / 40);
                drawPetal(fctx, p);
            }
            requestAnimationFrame(frame);
        }
        requestAnimationFrame(frame);
        document.addEventListener('visibilitychange', () => { running = !document.hidden; last = 0; if (running) requestAnimationFrame(frame); });
        addEventListener('click', e => {
            /* v10: only celebrate clicks on open page space, never on buttons, links or panels */
            if (e.target.closest && e.target.closest('a, button, input, [role="button"], .g-stage, .g-row, .h-row, .mb-bouquet, .gallery-modal, .lightbox, .garden-bed, .nav, .fl-int, .w-piece')) return;
            for (let i = 0; i < 5; i++){
                const ang = rand(0, Math.PI * 2), sp = rand(1.5, 4.5), p = makePetal(e.clientY);
                Object.assign(p, { x: e.clientX, y: e.clientY, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 2, r: rand(4, 8), life: rand(55, 90), vr: rand(-0.15, 0.15), vf: rand(0.08, 0.16) });
                burst.push(p);
            }
            if (burst.length > 60) burst.splice(0, burst.length - 60);   /* fast clicking never piles up petals */
        });
});
