    /* Flower FX (d): a butterfly drifts across now and then */
    (function(){
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduce) return;
        const rand = (a, b) => a + Math.random() * (b - a);
        const bf = document.createElement('div'); bf.className = 'butterfly'; bf.setAttribute('aria-hidden', 'true');
        bf.innerHTML = '<svg viewBox="-24 -20 48 40"><g class="bf-wing-l"><path d="M-1 -2 C-10 -20 -26 -16 -21 -3 C-18 4 -8 3 -1 0Z" fill="#b9a2de"/><path d="M-1 1 C-9 3 -18 10 -13 16 C-8 19 -3 10 -1 3Z" fill="#f4a7bf"/><circle cx="-14" cy="-7" r="3" fill="#fff" opacity=".7"/></g><g class="bf-wing-r"><path d="M1 -2 C10 -20 26 -16 21 -3 C18 4 8 3 1 0Z" fill="#b9a2de"/><path d="M1 1 C9 3 18 10 13 16 C8 19 3 10 1 3Z" fill="#f4a7bf"/><circle cx="14" cy="-7" r="3" fill="#fff" opacity=".7"/></g><rect x="-1.5" y="-8" width="3" height="20" rx="1.5" fill="#5a4366"/><path d="M-1 -8 Q-5 -15 -7 -16 M1 -8 Q5 -15 7 -16" stroke="#5a4366" stroke-width="1" fill="none"/></svg>';
        document.body.appendChild(bf);
        function fly(){
            let yielded = false;
            if (!Life.claim('butterfly', (innerWidth + 120) / 38 * 1000 + 500, false, () => { yielded = true; bf.style.opacity = 0; setTimeout(fly, rand(28000, 48000)); })) { setTimeout(fly, rand(8000, 14000)); return; }
            const ltr = Math.random() > 0.5, W = innerWidth, H = innerHeight;
            const x0 = ltr ? -60 : W + 60, x1 = ltr ? W + 60 : -60, y0 = rand(H * 0.15, H * 0.7), y1 = rand(H * 0.1, H * 0.75);
            const dur = (W + 120) / rand(38, 48) * 1000, start = performance.now(), amp = rand(24, 50), waves = rand(1.5, 3);
            bf.style.opacity = 1;
            (function step(now){
                if (yielded) return;
                const t = Math.min(1, (now - start) / dur);
                const x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t + Math.sin(t * Math.PI * 2 * waves) * amp + Math.sin(t * 40) * 4;
                const tilt = Math.cos(t * Math.PI * 2 * waves) * 18 * (ltr ? 1 : -1);
                bf.style.transform = `translate(${x}px,${y}px) rotate(${(ltr ? 70 : -70) + tilt}deg)`;
                if (t < 1) requestAnimationFrame(step); else { bf.style.opacity = 0; Life.release('butterfly'); setTimeout(fly, rand(28000, 48000)); }
            })(start);
        }
        setTimeout(fly, 9000);
    })();

