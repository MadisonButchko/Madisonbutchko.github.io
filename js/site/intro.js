/* js/site/intro.js
   Purpose : the ~12s cinematic opening: over a soft gradient backdrop a golden sparkle appears, lingers and swells while spinning (smaller sparkles orbit with it), then bursts into a huge explosion that shifts gold → pale iridescent → pastel → vivid, and drifts down as sparkles and petals that fade as the backdrop dissolves to reveal the site.
   Owns    : the overlay DOM (backdrop div + one canvas), one rAF loop, one fallback timer. Layout lives in css/15-intro.css.
   Uses    : core.utils (rand, pick, clamp, reduce).
   Gate    : the inline script in <head> adds `intro-on` to <html>; this module only plays when that class is set, and removes it as soon as the canvas exists. Plays on every page load (no storage flag). Dev: ?nointro skips.
   Mobile / reduced motion: roughly half the particles and a lower pixel ratio on phones; reduced motion = no animation at all.
   Cleanup : the rAF loop, resize listener, timer and overlay are all removed at the end. The overlay never catches pointer events, so the page is usable underneath from the first frame. */
MB.define('site.intro', ['core.utils'], function (utils) {
    'use strict';
    const { rand, pick, clamp, reduce } = utils;
    const root = document.documentElement;

    const SPD = 1;                                /* simulation speed multiplier for the motion (1 = base pace) */
    const T_BURST = 2800;                         /* ms: the central sparkle has grown and spun up; the explosion fires */
    const T_DONE = 10500;                         /* ms: everything removed */
    const T_FADE = 2800;                          /* ms before T_DONE over which the falling sparkles/petals fade out */
    const BG_MAX = .5, BG_IN = 700, BG_OUT = [5600, 8400];    /* ms: backdrop gradient fades in; then fades out between these times to reveal the site */
    const RAIN_MS = 3400;                         /* sim-ms over which the sparkle/petal shower keeps spawning */
    const GOLD = '#ffb81f', GOLD_SOFT = '#ffe08a', GOLD_HOT = '#fff4b8';
    const IRID = ['#fff1f6', '#f3f0ff', '#eaf6ff', '#eafff6', '#fff6e6', '#f8ecff'];            /* pale iridescent mid-tones */
    const PASTEL = ['#ff7ab8', '#ff9a63', '#b48cff', '#d37dff', '#5cbcff', '#52e6b4', '#ffd84a', '#ff7f98', '#8a9cff', '#6edcff'];   /* pink / peach / lavender / lilac / pale blue / mint / buttery yellow */
    const VIVID = ['#ff1f8f', '#ff5a00', '#9a2bff', '#1f5bff', '#00b8ff', '#00e08a', '#ffd000', '#ff2a3a'];   /* saturated finale colours */
    const PETALS = ['#ffc2da', '#ffd2bd', '#e2cfff', '#f0d4ff', '#cfe6ff', '#d6f5e8', '#fff0b8', '#ffe3ec'];
    const RGB = {};
    const SPRITES = {};

    function rgb(hex) {
        return RGB[hex] || (RGB[hex] = [parseInt(hex.substr(1, 2), 16), parseInt(hex.substr(3, 2), 16), parseInt(hex.substr(5, 2), 16)]);
    }

    /* A soft glowing dot (optionally with a four-point sparkle across it), pre-drawn once per colour. */
    function sprite(hex, star) {
        const key = hex + (star ? 's' : 'o');
        if (SPRITES[key]) return SPRITES[key];
        const c = document.createElement('canvas'), g = c.getContext('2d'), k = rgb(hex);
        c.width = c.height = 64;
        const a = function (o) { return 'rgba(' + k[0] + ',' + k[1] + ',' + k[2] + ',' + o + ')'; };
        const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
        gr.addColorStop(0, 'rgba(255,255,255,.95)'); gr.addColorStop(.18, a(.95)); gr.addColorStop(.5, a(.3)); gr.addColorStop(1, a(0));
        g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
        if (star) {
            g.fillStyle = 'rgba(255,255,255,.92)';
            g.beginPath(); g.moveTo(32, 3); g.quadraticCurveTo(34, 30, 61, 32); g.quadraticCurveTo(34, 34, 32, 61); g.quadraticCurveTo(30, 34, 3, 32); g.quadraticCurveTo(30, 30, 32, 3); g.fill();
        }
        return (SPRITES[key] = c);
    }

    let el = null, bg = null, cv = null, ctx = null, raf = 0, tFallback = 0, done = false;

    function finish() {
        if (done) return;
        done = true;
        cancelAnimationFrame(raf); clearTimeout(tFallback);
        removeEventListener('resize', fit);
        if (el) el.remove();
        el = bg = cv = ctx = null; root.classList.remove('intro-on');
    }

    let W = 0, H = 0, DPR = 1;
    function fit() {
        if (!cv) return;
        W = innerWidth; H = innerHeight;
        DPR = Math.min(window.devicePixelRatio || 1, W < 700 ? 1.5 : 2);
        cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }

    function play() {
        const small = innerWidth < 700;
        const NB = small ? 620 : 1500, IG = small ? 40 : 90, DUST = small ? 150 : 340, PET = small ? 30 : 64, sc = small ? .85 : 1.1;
        const t0 = performance.now(), parts = [];
        const ox = function () { return W / 2; }, oy = function () { return H * .45; };
        let last = t0, burst = false, dustLeft = DUST, dustT = 0, petLeft = PET, petT = 0;
        const knot = [];                                                    /* small golden sparkles pulled into orbit around the central sparkle */
        for (let i = 0; i < IG; i++) knot.push({ a: rand(0, 6.283), r: rand(.25, 1) * (small ? 150 : 300), ph: rand(0, 6.283), s: rand(.5, 1.5), st: Math.random() < .5, d: rand(.12, .7), w: rand(.5, 1.1) });

        function particle(o) {
            o.age = 0;
            o.ph = rand(0, 6.283); o.tf = rand(9, 24);                       /* twinkle phase / speed */
            o.sf = rand(.8, 2); o.sp = rand(0, 6.283);                       /* sway speed / phase */
            o.rot = rand(0, 6.283);
            parts.push(o);
        }

        function explode(n) {                                               /* one huge burst: distances reach (and overshoot) the corners; depth and speed vary per particle */
            const diag = Math.hypot(W, H), ax = W / diag * 1.45, ay = H / diag * 1.45;
            for (let i = 0; i < n; i++) {
                const ang = rand(0, 6.283), f = Math.pow(Math.random(), .55), z = rand(.55, 1.35), kind = Math.random();
                const D = diag * .5 * (.2 + 1.1 * f) * (.7 + .3 * z), k = rand(1.1, 1.9), sp = D * k;
                const big = Math.random() < .12;
                particle({
                    x: ox() + rand(-10, 10), y: oy() + rand(-10, 10),
                    vx: Math.cos(ang) * sp * ax, vy: Math.sin(ang) * sp * ay,
                    r: (big ? rand(4.5, 8) : rand(1, 4)) * sc * z, z: z,
                    c0: pick([GOLD, GOLD_SOFT, GOLD_HOT]), c1: pick(IRID), c2: pick(PASTEL), c3: pick(VIVID), cp: 0,
                    star: kind < .42, petal: kind > .965, bs: Math.random() < .14, trail: Math.random() < .25,
                    spin: rand(-4, 4), flip: rand(1.5, 4),
                    L: rand(4.4, 7), fall: H * rand(.05, .14) * z, sway: rand(14, 50) * sc, fin: .05, k: k
                });
                if (parts[parts.length - 1].petal) parts[parts.length - 1].c2 = pick(PETALS);
            }
        }

        function dust() {                                                   /* a twinkling sparkle drifting down from above */
            const z = rand(.55, 1.3), c = pick(PASTEL);
            particle({
                x: rand(-.02, 1.02) * W, y: rand(-.25, .05) * H, vx: 0, vy: 0,
                r: rand(.9, 3.6) * sc * z, z: z, c0: pick(IRID), c1: c, c2: c, c3: pick(VIVID), cp: 1,
                star: Math.random() < .5, bs: Math.random() < .12, spin: rand(-3, 3), flip: 1,
                L: rand(3.4, 5.2), fall: H * rand(.09, .2) * z, sway: rand(10, 34) * sc, fin: .25, k: 1.5, dust: true
            });
        }

        function petal() {                                                  /* a soft petal that flutters rather than falling straight */
            particle({
                x: rand(-.02, 1.02) * W, y: rand(-.28, .05) * H, vx: 0, vy: 0,
                r: rand(3.4, 6.4) * sc * rand(.8, 1.2), z: 1, c2: pick(PETALS), petal: true, spin: rand(-2.4, 2.4), flip: rand(1.4, 3),
                L: rand(3.8, 5.6), fall: H * rand(.07, .14), sway: rand(40, 90) * sc, fin: .3, k: 1.1, dust: true
            });
        }

        function blit(img, x, y, size, al, rot) {
            if (al <= .01) return;
            ctx.globalAlpha = al;
            if (rot) {
                const c = Math.cos(rot) * DPR, s = Math.sin(rot) * DPR;
                ctx.setTransform(c, s, -s, c, x * DPR, y * DPR);
                ctx.drawImage(img, -size / 2, -size / 2, size, size);
                ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
            } else ctx.drawImage(img, x - size / 2, y - size / 2, size, size);
        }

        function drawPetal(p, al) {                                         /* teardrop petal with a lighter heart, flipping as it tumbles */
            const a = rgb(p.c2), s = p.r * 3;
            ctx.save(); ctx.globalAlpha = al * .92;
            ctx.translate(p.x, p.y); ctx.rotate(Math.sin(p.age * p.flip * .8 + p.ph) * .9 + p.age * p.spin * .5); ctx.scale(Math.cos(p.age * p.flip), 1);
            ctx.fillStyle = 'rgb(' + a[0] + ',' + a[1] + ',' + a[2] + ')';
            ctx.beginPath(); ctx.moveTo(0, -s); ctx.bezierCurveTo(s * .95, -s * .5, s * .7, s * .75, 0, s); ctx.bezierCurveTo(-s * .7, s * .75, -s * .95, -s * .5, 0, -s); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,.4)';
            ctx.beginPath(); ctx.ellipse(0, -s * .1, s * .2, s * .55, 0, 0, 6.283); ctx.fill();
            ctx.restore();
        }

        function ignite(t, gf) {                                            /* the central sparkle: appears, lingers, swells and spins up while the small ones orbit with it */
            if (t >= T_BURST) return;
            const q = t / T_BURST, fadeIn = clamp(t / 700, 0, 1), spin = 5 * Math.pow(q, 2);   /* slow at first, dramatic near the burst */
            const swell = 1 - Math.pow(1 - q, 2), climax = Math.pow(clamp((q - .86) / .14, 0, 1), 2);
            const pulse = .94 + .06 * Math.sin(t * .004 + q * 12), base = (60 + 230 * swell + 330 * climax) * sc * pulse;
            const g = sprite(GOLD, false), s = sprite(GOLD_SOFT, true);
            for (let i = 0; i < knot.length; i++) {
                const n = knot[i], k = clamp((q - n.d * .5) / .25, 0, 1);
                if (k <= 0) continue;
                const r = n.r * sc * (1 - .6 * Math.pow(q, 1.6)) * (.85 + .15 * Math.sin(t * .002 + n.ph)), ang = n.a + spin * n.w * .8 + q;   /* pulled in and swept round by the main spin */
                const tw = .6 + .4 * Math.sin(t * .006 + n.ph);
                blit(n.st ? s : g, ox() + Math.cos(ang) * r, oy() + Math.sin(ang) * r * .8, (9 + 12 * n.s) * sc * (.8 + .5 * q) * tw, k * fadeIn * (.5 + .5 * tw) * gf, n.st ? ang * 2 : 0);
            }
            blit(sprite(GOLD, false), ox(), oy(), base * 3.2, fadeIn * (.6 + .3 * climax), 0);          /* soft golden halo */
            blit(sprite(GOLD_HOT, true), ox(), oy(), base * fadeIn, fadeIn, spin);
            blit(sprite(GOLD_SOFT, true), ox(), oy(), base * .62 * fadeIn, fadeIn * .85, -spin * .7 + .785);   /* counter-spinning inner star */
        }

        function frame(now) {
            if (done) return;
            const t = now - t0, dt = Math.min((now - last) / 1000, .05) * SPD;
            last = now;
            ctx.clearRect(0, 0, W, H);
            const gf = clamp((T_DONE - t) / T_FADE, 0, 1);
            if (bg) bg.style.opacity = BG_MAX * clamp(t / BG_IN, 0, 1) * (1 - clamp((t - BG_OUT[0]) / (BG_OUT[1] - BG_OUT[0]), 0, 1));
            if (!burst && t >= T_BURST) { burst = true; explode(NB); }
            if (burst) {                                                    /* sparkles + petals showering across the whole screen after the explosion */
                dustT += dt * 1000; petT += dt * 1000;
                const dd = Math.min(dustLeft, Math.floor(dustT / (RAIN_MS / DUST))), pd = Math.min(petLeft, Math.floor(petT / (RAIN_MS / PET)));
                for (let i = 0; i < dd; i++) { dust(); dustLeft--; dustT -= RAIN_MS / DUST; }
                for (let i = 0; i < pd; i++) { petal(); petLeft--; petT -= RAIN_MS / PET; }
            }
            ignite(t, gf);
            if (burst && t - T_BURST < 700) {                               /* detonation flash: a big golden four-point star */
                const f = (t - T_BURST) / 700;
                blit(sprite(GOLD_HOT, true), ox(), oy(), (500 + Math.max(W, H) * 1.1 * f) * sc, 1 - f, f * 1.5);
                const rg = sprite(GOLD_SOFT, false), sz = Math.max(W, H) * 1.5 * Math.pow(f, .6);   /* expanding shockwave halos */
                blit(rg, ox(), oy(), sz, (1 - f) * .8, 0); blit(sprite(PASTEL[0], false), ox(), oy(), sz * .7, (1 - f) * .5, 0);
            }
            for (let i = parts.length - 1; i >= 0; i--) {
                const p = parts[i];
                p.age += dt;
                if (p.age >= p.L || p.y > H + 80 || p.x < -140 || p.x > W + 140 || p.y < -260) { parts.splice(i, 1); continue; }
                const ramp = clamp((p.age - .5) / .9, 0, 1), decay = 1 - Math.exp(-p.k * dt);
                p.vx += (Math.sin(p.age * p.sf + p.sp) * p.sway - p.vx) * decay;     /* velocity relaxes from the burst into a slow sway-and-fall */
                p.vy += (p.fall * ramp - p.vy) * decay;
                p.x += p.vx * dt; p.y += p.vy * dt; p.rot += (p.spin || 0) * dt;
                const fs = p.L * .55;
                const env = Math.min(p.age / p.fin, 1) * (p.age < fs ? 1 : 1 - (p.age - fs) / (p.L - fs));
                const tw = .5 + .5 * Math.sin(t * .001 * p.tf + p.ph);              /* twinkle */
                const depth = .55 + .45 * Math.min(p.z, 1);
                const al = env * (.35 + .65 * tw) * depth * gf;
                if (p.petal) { drawPetal(p, env * depth * gf); continue; }
                const flare = p.bs ? Math.pow(Math.max(0, Math.sin(p.age * p.tf * .35 + p.ph)), 12) * 3 : 0;   /* some sparkles briefly bloom into a larger starburst */
                const size = p.r * 7 * (.7 + .3 * tw) * (1 + flare), star = p.star || flare > .3;
                const prog = clamp(p.cp + p.age / (p.L * .65), 0, 1) * 3, seg = Math.min(Math.floor(prog), 2);   /* gold → iridescent → pastel → vivid */
                const cols = [p.c0, p.c1, p.c2, p.c3], w = prog - seg, from = cols[seg], to = cols[seg + 1];
                if (p.trail && p.age < .7 && !p.dust) {                             /* sparkle trail while it's still flying out */
                    const trc = sprite(from, false), tx = p.vx * .03, ty = p.vy * .03;
                    for (let j = 1; j <= 3; j++) blit(trc, p.x - tx * j, p.y - ty * j, size * (.8 - j * .15), al * (.6 - j * .15));
                }
                if (w < .98) blit(sprite(from, star), p.x, p.y, size, al * (1 - w), star ? p.rot : 0);
                if (w > .02) blit(sprite(to, star), p.x, p.y, size, al * w, star ? p.rot : 0);
            }
            ctx.globalAlpha = 1;
            if (t >= T_DONE) { finish(); return; }
            raf = requestAnimationFrame(frame);
        }
        raf = requestAnimationFrame(frame);
    }

    function start() {
        if (!root.classList.contains('intro-on') || el) { return; }
        if (reduce || !innerWidth || !innerHeight) { root.classList.remove('intro-on'); return; }   /* reduced motion / hidden viewport: no intro */
        el = document.createElement('div');
        el.className = 'intro';
        el.setAttribute('aria-hidden', 'true');
        el.innerHTML = '<div class="in-bg"></div><canvas class="in-canvas"></canvas>';
        document.body.appendChild(el);
        root.classList.remove('intro-on');
        tFallback = setTimeout(finish, T_DONE + 1500);   /* safety net if rAF is throttled (background tab) */
        bg = el.querySelector('.in-bg'); cv = el.querySelector('.in-canvas'); ctx = cv.getContext('2d');
        fit(); addEventListener('resize', fit);
        play();
    }

    return { start };
});
