/* =====================================================================
   The garden ecosystem. Loaded after script.js (deferred), self-contained.
   - seed packet: seeds pour out of it (window.__eco.pour, called by script.js)
   - the yard (#yardScene): a nest with eggs, a caterpillar on its plant,
     three flowers, and a watering can. The illustrations are the controls.
   - the watering can waters the yard's flowers and any flower on the page
   - the caterpillar feeds on its plant, becomes a chrysalis, then a
     butterfly that goes on living in the page (lands on flowers, leaves,
     comes back)
   - Experience and Skills flowers get their own ambient breeze
   Animation is CSS transforms / opacity and short WAAPI bursts. The only
   rAF loop is the butterfly while it is actually in flight. Everything
   idles when the yard is off screen or the tab is hidden.
   ===================================================================== */
(function () {
    'use strict';
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const $ = (s, r) => (r || document).querySelector(s);
    const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
    const rnd = (a, b) => a + Math.random() * (b - a);
    const f1 = n => Math.round(n * 10) / 10;
    const NS = 'http://www.w3.org/2000/svg';
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const settle = (anim, ms) => new Promise(res => { let d = false; const f = () => { if (!d) { d = true; res(); } }; try { anim.onfinish = f; anim.oncancel = f; } catch (e) { } setTimeout(f, ms + 80); });

    /* ---- the little memory: one visit (sessionStorage), in memory if storage is blocked ---- */
    const KEY = 'mb-eco-v1';
    let S = { nest: 0, fed: 0, cat: 0, bites: 0, lv: {} };
    try { Object.assign(S, JSON.parse(sessionStorage.getItem(KEY)) || {}); } catch (e) { }
    const save = () => { try { sessionStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { } };

    /* one polite live region for the things that happen without words */
    const live = document.createElement('div'); live.className = 'vh'; live.setAttribute('role', 'status'); live.setAttribute('aria-live', 'polite');
    document.body.appendChild(live);
    const say = t => { live.textContent = ''; setTimeout(() => { live.textContent = t; }, 30); };

    /* ================================================================
       1. Seeds pour out of the packet
       ================================================================ */
    function arc(dx, dy, n, bounce) {
        /* gravity-like fall: x drifts, y accelerates; optional small bounce at the end. Returns translate keyframes. */
        const out = [];
        for (let i = 0; i <= n; i++) { const t = i / n; out.push({ x: dx * t, y: dy * t * t, t }); }
        if (bounce) {
            const h = bounce, steps = 6;
            for (let i = 1; i <= steps; i++) { const u = i / steps; out.push({ x: dx + bounce * 0.8 * u * (Math.random() < 0.5 ? -1 : 1) * 0.6 + bounce * 0.5 * u, y: dy - 4 * h * u * (1 - u), t: 1 + u * 0.35 }); }
        }
        return out;
    }
    function pour(packet) {
        if (reduce || !packet) return 0;
        const art = $('.seed-art', packet), host = packet.closest('.seed-wrap'); if (!art || !host) return 0;
        const hr = host.getBoundingClientRect(), ar = art.getBoundingClientRect();
        const gardenTop = (() => { const g = $('#expGarden .g-row'); return g ? g.getBoundingClientRect().top : ar.bottom + 180; })();
        /* the packet tilts toward its left: its mouth swings out to the left and a little below its centre */
        art.animate([{ rotate: '-6deg' }, { rotate: '-14deg', offset: 0.16 }, { rotate: '-112deg', offset: 0.45 }, { rotate: '-112deg', offset: 0.85 }, { rotate: '-6deg' }],
            { duration: 1650, easing: 'cubic-bezier(.3,.7,.3,1)' });
        const cx = ar.left + ar.width / 2 - hr.left, cy = ar.top + ar.height / 2 - hr.top;
        const mouthX = cx - 17, mouthY = cy + 8;
        const ground = Math.max(110, Math.min(250, gardenTop - (ar.top + ar.height / 2) + 6));
        const N = 11, nodes = [];
        for (let i = 0; i < N; i++) {
            const s = document.createElement('i'); s.className = 'pour-seed'; s.setAttribute('aria-hidden', 'true');
            const w = rnd(5, 9); s.style.cssText = 'width:' + f1(w) + 'px;height:' + f1(w * rnd(1.25, 1.7)) + 'px;left:' + f1(mouthX - w / 2) + 'px;top:' + f1(mouthY) + 'px;opacity:0';
            host.appendChild(s); nodes.push(s);
            const dx = -rnd(10, 80), dy = ground + rnd(-24, 22), fall = rnd(560, 820), delay = 420 + i * rnd(45, 85), spin = rnd(-300, 300);
            const ks = arc(dx, dy, 10, rnd(7, 15)).map(p => ({
                transform: 'translate(' + f1(p.x) + 'px,' + f1(p.y) + 'px) rotate(' + f1(spin * Math.min(1, p.t)) + 'deg)',
                opacity: p.t > 1.2 ? 0.95 : 1, offset: Math.min(1, p.t / 1.35)
            }));
            ks.unshift({ transform: 'translate(0,0) rotate(0deg) scale(.6)', opacity: 0, offset: 0 });
            ks[1].offset = Math.max(ks[1].offset, 0.02);
            const a = s.animate(ks, { duration: fall + 380, delay, easing: 'linear', fill: 'both' });
            settle(a, fall + 380 + delay).then(() => s.animate([{ opacity: 0.95 }, { opacity: 0 }], { duration: 380, fill: 'forwards' }).finished.then(() => s.remove(), () => s.remove()));
        }
        setTimeout(() => nodes.forEach(n => n.remove()), 3200);
        return 1500;
    }

    /* ================================================================
       2. Experience / Skills flowers: every one breathes at its own pace
       ================================================================ */
    (function ambient() {
        const seeded = (k => () => (k = (k * 16807) % 2147483647) / 2147483647)(11);
        $$('.g-art, .h-art').forEach((art, i) => {
            const r = seeded();
            art.style.setProperty('--amp', f1(0.7 + seeded() * 0.9));
            art.style.setProperty('--dir', seeded() < 0.5 ? -1 : 1);
            art.style.animationDuration = f1(5.2 + seeded() * 4.6) + 's';
            art.style.animationDelay = '-' + f1(seeded() * 9) + 's';
            const u = art.firstElementChild; if (u) { u.style.setProperty('--bd', f1(4.5 + seeded() * 4) + 's'); u.style.setProperty('--bl', '-' + f1(seeded() * 8) + 's'); u.style.setProperty('--bs', f1(1.8 + seeded() * 2.2)); }
        });
    })();

    /* ================================================================
       3. The yard
       ================================================================ */
    const scene = $('#yardScene'), wrap = $('#yardWrap');
    if (!scene) { window.__eco = { pour }; return; }

    const LEAF = (x, y, s, r, c) => '<use href="#fl-leaf" x="' + x + '" y="' + y + '" width="' + s + '" height="' + s + '" transform="rotate(' + r + ' ' + (x + s / 2) + ' ' + (y + s / 2) + ')" style="color:' + c + '"/>';
    let grass = ''; for (let i = 0; i < 70; i++) { const x = i * 8 + rnd(-3, 3), h = rnd(6, 15), l = rnd(-3, 3); grass += 'M' + f1(x) + ' 60 Q' + f1(x + l / 2) + ' ' + f1(60 - h * 0.6) + ' ' + f1(x + l) + ' ' + f1(60 - h) + ' '; }
    const EGG_X = [30, 50, 70];
    const eggSVG = i => '<g class="egg e' + i + '" transform="translate(' + EGG_X[i] + ' 38)"><g class="eg-in">'
        + '<g class="chick"><ellipse cx="0" cy="3" rx="7.5" ry="6.5" fill="#ffdf70"/><circle cx="0" cy="-5" r="6.2" fill="#ffe58a"/><circle cx="-2.4" cy="-6.4" r="1" fill="#5a4366"/><circle cx="2.4" cy="-6.4" r="1" fill="#5a4366"/><ellipse cx="-4" cy="-3.6" rx="1.5" ry="1" fill="#f4a7bf" opacity=".8"/><ellipse cx="4" cy="-3.6" rx="1.5" ry="1" fill="#f4a7bf" opacity=".8"/>'
        + '<path class="mouth" d="M-3.6 -8 Q0 -17 3.6 -8Z" fill="#e8627f"/><path class="beak-t" d="M-2.6 -8.6 L0 -12.2 L2.6 -8.6Z" fill="#f2a23a"/><path class="beak-b" d="M-2.2 -8 L0 -6 L2.2 -8Z" fill="#e58f2a"/></g>'
        + '<path class="eg-bot" d="M-8 0 L-5 -3 L-2 0 L1 -3 L4 0 L6 -2 L8 0 A8 10 0 0 1 -8 0Z" fill="#fbf2df" stroke="#d9c6a5" stroke-width=".8" stroke-linejoin="round"/>'
        + '<g class="eg-cap"><path d="M-8 0 A8 10 0 0 1 8 0 L6 -2 L4 0 L1 -3 L-2 0 L-5 -3 Z" fill="#fbf2df" stroke="#d9c6a5" stroke-width=".8" stroke-linejoin="round"/><circle cx="-3" cy="-5" r=".8" fill="#e3cfae"/><circle cx="2.5" cy="-7" r=".7" fill="#e3cfae"/><path class="eg-crack" d="M-7 -1.5 L-4 1 L-1 -2.5 L2 1 L5 -2 L7.5 .5" stroke="#9c8460" stroke-width=".9" fill="none" stroke-linecap="round" stroke-linejoin="round" pathLength="20"/></g>'
        + '<path class="eg-low" d="M-7 1.5 Q0 10 7 1.5" fill="none" stroke="#e7d7b8" stroke-width=".8"/></g></g>';
    const CAT_PATH = 'M214 322 C208 270 228 215 220 166 C250 146 284 124 310 108 C284 140 250 172 224 172 C231 215 211 270 218 322 Z';
    const YF = [['fl-bloom', '#f4a7bf', '#fff1cc', 330, 150, 126], ['fl-daisy', '#ffffff', '#f2c230', 396, 128, 150], ['fl-bloom', '#c9b2ec', '#fbe7a1', 462, 154, 122]];
    const ygrow = (i, n) => 1 + 0.11 * n;

    scene.innerHTML =
        '<svg class="yd-art" viewBox="0 0 560 330" aria-hidden="true">'
        + '<path d="M-6 150 C34 142 92 128 156 106" stroke="#8a6a3a" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M80 130 C96 118 108 114 120 116" stroke="#8a6a3a" stroke-width="3" fill="none" stroke-linecap="round"/>'
        + LEAF(122, 82, 30, -30, '#8db36a') + LEAF(150, 94, 24, 20, '#7fa65c') + LEAF(24, 120, 26, 160, '#8db36a') + LEAF(100, 96, 22, -80, '#a3c47f')
        + '<path d="M212 330 C206 270 226 215 218 160 C214 130 226 100 222 70" stroke="#7fa65c" stroke-width="5" fill="none" stroke-linecap="round"/>'
        + '<path d="M219 160 C250 130 290 112 312 104 C300 135 260 160 221 166Z" fill="#8db36a" stroke="#6f9f6a" stroke-width="1.2"/><path d="M222 162 C250 140 280 122 306 108" stroke="#6f9f6a" stroke-width="1" fill="none" opacity=".7"/>'
        + '<path d="M216 208 C190 190 160 188 140 196 C150 222 185 226 214 214Z" fill="#9cc27a" stroke="#6f9f6a" stroke-width="1.2"/><path d="M214 208 C190 200 162 196 144 198" stroke="#6f9f6a" stroke-width="1" fill="none" opacity=".7"/>'
        + '<path d="M222 74 C212 52 222 34 240 26 C246 46 240 64 224 78Z" fill="#a3c47f" stroke="#6f9f6a" stroke-width="1.2"/>'
        + '<path id="yd-catpath" d="' + CAT_PATH + '" fill="none" stroke="none"/>'
        + '</svg>'
        /* the nest sits on the branch */
        + '<button type="button" class="yd-nest" aria-label="A bird\'s nest with eggs. Press to see what happens."><svg viewBox="0 0 100 70" aria-hidden="true">'
        + '<ellipse cx="50" cy="42" rx="43" ry="12" fill="#8a5a2a"/><path d="M12 38 L40 34 M60 33 L92 38 M20 44 L80 43" stroke="#a7b86a" stroke-width="1.6" stroke-linecap="round" fill="none"/>'
        + [0, 1, 2].map(eggSVG).join('')
        + '<path d="M6 40 Q50 80 94 40 Q90 58 50 66 Q10 58 6 40Z" fill="#b8865a" stroke="#8a5a2a" stroke-width="1.2"/><path d="M14 44 Q50 62 86 44" fill="none" stroke="#d9b07a" stroke-width="1.3"/><path d="M20 50 L78 50 M26 55 L72 55 M12 41 L30 47 M88 41 L70 47" stroke="#9a6b3a" stroke-width=".9" stroke-linecap="round"/>'
        + '</svg></button>'
        + '<button type="button" class="yd-food" hidden aria-label="A few seeds on a leaf. Press to feed the chicks."><svg viewBox="0 0 44 30" aria-hidden="true"><path d="M2 22 C8 8 28 4 42 12 C34 26 14 30 2 22Z" fill="#8db36a" stroke="#6f9f6a" stroke-width="1"/><ellipse cx="16" cy="15" rx="3" ry="4.4" fill="#c98a4c" transform="rotate(-20 16 15)"/><ellipse cx="25" cy="14" rx="3" ry="4.4" fill="#b9793e" transform="rotate(15 25 14)"/><ellipse cx="21" cy="19" rx="2.8" ry="4" fill="#d9a066" transform="rotate(60 21 19)"/></svg></button>'
        /* the caterpillar and what it becomes */
        + '<button type="button" class="yd-plant-hit" aria-label="The caterpillar\'s plant. Water it, or feed the caterpillar by pressing it." tabindex="-1"></button>'
        + '<button type="button" class="yd-cat" aria-label="A caterpillar. Press to let it nibble."><svg viewBox="0 0 38 16" aria-hidden="true"><g class="cat-segs">' + [5, 11, 17, 23, 29].map((x, k) => '<circle cx="' + x + '" cy="10" r="4.6" fill="' + (k % 2 ? '#b6d88f' : '#9cc27a') + '" stroke="#6f9f6a" stroke-width=".5"/>').join('') + '</g><circle cx="34" cy="8" r="5" fill="#8db36a" stroke="#6f9f6a" stroke-width=".5"/><circle cx="35.6" cy="6.8" r="1.1" fill="#3f3148"/><path d="M36 3 Q38 0 40 1 M33 3 Q33 0 31 0" stroke="#6f9f6a" stroke-width=".8" fill="none" stroke-linecap="round"/><path d="M6 14.5 h2 M12 14.5 h2 M18 14.5 h2 M24 14.5 h2" stroke="#6f9f6a" stroke-width="1.2" stroke-linecap="round"/></svg></button>'
        + '<button type="button" class="yd-chrys" hidden aria-label="A chrysalis hanging from a leaf. Press to wake it."><svg viewBox="0 0 24 44" aria-hidden="true"><path class="ch-thread" d="M12 0 V9" stroke="#8a6a3a" stroke-width="1.3" pathLength="10"/>'
        + '<g class="ch-body"><path d="M12 8 C21 13 21 33 12 41 C3 33 3 13 12 8Z" fill="#a8d5a2" stroke="#6f9f6a" stroke-width="1"/><path d="M6.5 19 H17.5 M7 25 H17 M8.5 31 H15.5" stroke="#e8b923" stroke-width="1.2" stroke-dasharray="1.4 2" fill="none"/><path class="ch-crack" d="M7 14 L12 20 L9 26 L14 32" stroke="#e8b923" stroke-width="1.2" fill="none" stroke-linecap="round" pathLength="30"/></g>'
        + '<g class="ch-husk"><path d="M12 8 C21 13 21 33 12 41 C3 33 3 13 12 8Z" fill="#e8f1dd" stroke="#b5c9a3" stroke-width="1" stroke-dasharray="3 2"/></g></svg></button>'
        /* flowers to water */
        + YF.map((f, i) => '<button type="button" class="yd-flower" data-i="' + i + '" data-lv="0" aria-label="A flower. Water it with the can." style="left:' + f[3] + 'px;top:' + f[4] + 'px;height:' + (330 - f[4]) + 'px;--sd:' + f1(5 + i * 1.3) + 's;--dl:-' + f1(i * 1.7) + 's">'
            + '<svg viewBox="0 0 80 ' + (330 - f[4]) + '" aria-hidden="true"><path class="yf-stem" d="M40 ' + (330 - f[4]) + ' C36 ' + ((330 - f[4]) * 0.65) + ' 46 ' + ((330 - f[4]) * 0.4) + ' 40 44" stroke="#7fa65c" stroke-width="3.2" fill="none" stroke-linecap="round"/>' + LEAF(42, (330 - f[4]) * 0.52, 20, 20, '#8db36a') + LEAF(16, (330 - f[4]) * 0.62, 20, 160, '#7fa65c')
            + '<g class="yf-bud" style="color:' + f[1] + ';--center:' + f[2] + '"><use href="#' + f[0] + '" x="46" y="' + ((330 - f[4]) * 0.3) + '" width="24" height="24"/></g>'
            + '<g class="yf-head" style="color:' + f[1] + ';--center:' + f[2] + '"><use href="#' + f[0] + '" x="12" y="12" width="56" height="56"/></g></svg></button>').join('')
        /* the watering can */
        + '<button type="button" class="yd-can" aria-label="A watering can. Press, then tap a flower to water it." aria-pressed="false"><svg viewBox="0 0 96 74" aria-hidden="true">'
        + '<path d="M20 30 C2 30 2 60 19 60" stroke="#6f9db3" stroke-width="4.5" fill="none" stroke-linecap="round"/>'
        + '<path d="M60 48 L86 22 L92 27 L64 60Z" fill="#a9d4e6" stroke="#6f9db3" stroke-width="1.6" stroke-linejoin="round"/><ellipse cx="89" cy="23" rx="3.6" ry="7.5" transform="rotate(42 89 23)" fill="#8fc0d6" stroke="#6f9db3" stroke-width="1.4"/>'
        + '<path d="M18 26 L62 26 L66 66 Q66 70 62 70 L22 70 Q18 70 18 66 Z" fill="#b9dcec" stroke="#6f9db3" stroke-width="1.8" stroke-linejoin="round"/><ellipse cx="40" cy="26" rx="22" ry="5" fill="#d7edf6" stroke="#6f9db3" stroke-width="1.6"/><path d="M26 36 L28 62" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".55"/><path d="M22 46 H62" stroke="#8fc0d6" stroke-width="1.4"/>'
        + '</svg></button>'
        + '<svg class="yd-ground" viewBox="0 0 560 60" preserveAspectRatio="none" aria-hidden="true"><path d="M0 22 C90 10 190 20 280 14 C380 8 470 20 560 12 L560 60 L0 60Z" fill="#cfe3b4"/><path d="M0 34 C110 26 200 36 300 30 C400 24 480 34 560 28 L560 60 L0 60Z" fill="#b9d696"/><path d="' + grass + '" stroke="#8db36a" stroke-width="1.6" stroke-linecap="round" fill="none" transform="translate(0 2)"/></svg>';

    const nestBtn = $('.yd-nest', scene), foodBtn = $('.yd-food', scene), catBtn = $('.yd-cat', scene), chrysBtn = $('.yd-chrys', scene), canBtn = $('.yd-can', scene), plantHit = $('.yd-plant-hit', scene);
    const flowers = $$('.yd-flower', scene), eggs = $$('.egg', nestBtn), catPathEl = $('#yd-catpath', scene);
    const inView = el => { const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth; };

    /* the yard sleeps while off screen (CSS paused animations, no timers) */
    let yardLive = false;
    new IntersectionObserver(es => { yardLive = es[0].isIntersecting; wrap.classList.toggle('yd-live', yardLive); if (yardLive) hintOnce(); }, { threshold: 0.12 }).observe(wrap);
    addEventListener('resize', () => { wrap.style.setProperty('--ys', Math.max(0.6, Math.min(1.25, (innerWidth - 24) / 560)).toFixed(3)); });
    let hinted = false;
    function hintOnce() { if (hinted) return; hinted = true; setTimeout(() => { if (!reduce && !wateringOn) { canBtn.classList.add('rock'); setTimeout(() => canBtn.classList.remove('rock'), 1500); } }, 900); }

    /* ---------------- bird's nest: eggs -> hatching -> chicks -> feeding ---------------- */
    let hatching = false;
    const chicks = () => $$('.chick', nestBtn);
    function renderNest() {
        nestBtn.classList.toggle('hatched', S.nest >= 1);
        if (S.nest >= 1) { eggs.forEach(e => e.classList.add('open')); foodBtn.hidden = false; nestBtn.setAttribute('aria-label', 'A nest with three baby birds. Press to hear them.'); }
    }
    async function hatch() {
        if (hatching || S.nest >= 1) return; hatching = true; say('The eggs are hatching.');
        for (let i = 0; i < eggs.length; i++) {
            const e = eggs[i];
            if (reduce) { e.classList.add('open'); continue; }
            setTimeout(async () => {
                e.classList.add('wig'); await wait(650);
                e.classList.remove('wig'); e.classList.add('crack'); await wait(450);
                e.classList.add('open');
            }, i * 700 + rnd(0, 140));
        }
        await wait(reduce ? 200 : 2 * 700 + 650 + 450 + 900);
        S.nest = 1; save(); hatching = false; renderNest();
        foodBtn.classList.add('arrive'); setTimeout(() => foodBtn.classList.remove('arrive'), 900);
        say('Three baby birds. A few seeds on a leaf appeared beside the nest.');
        chirp(true);
    }
    function chirp(all) {
        if (S.nest < 1) return;
        const cs = chicks(); (all ? cs : [cs[Math.floor(Math.random() * cs.length)]]).forEach((c, k) => {
            setTimeout(() => { c.classList.add('open'); setTimeout(() => c.classList.remove('open'), reduce ? 400 : 900); }, k * 160);
        });
    }
    let feeding = false;
    async function feed() {
        if (feeding || S.nest < 1) return; feeding = true; foodBtn.classList.add('used');
        const sr = scene.getBoundingClientRect(), k = sr.width / 560 || 1;
        const fb = foodBtn.getBoundingClientRect(), nb = nestBtn.getBoundingClientRect();
        const m = document.createElement('i'); m.className = 'yd-morsel'; m.setAttribute('aria-hidden', 'true'); scene.appendChild(m);
        const x0 = (fb.left + fb.width * 0.4 - sr.left) / k, y0 = (fb.top + fb.height * 0.35 - sr.top) / k, x1 = (nb.left + nb.width * 0.5 - sr.left) / k, y1 = (nb.top + nb.height * 0.3 - sr.top) / k;
        m.style.left = f1(x0) + 'px'; m.style.top = f1(y0) + 'px';
        chicks().forEach((c, i) => setTimeout(() => c.classList.add('open', 'look'), i * 120));
        if (!reduce) { const a = m.animate([{ transform: 'translate(0,0) scale(.8)' }, { transform: 'translate(' + f1((x1 - x0) * 0.5) + 'px,' + f1((y1 - y0) * 0.5 - 34) + 'px) scale(1.15) rotate(180deg)', offset: 0.5 }, { transform: 'translate(' + f1(x1 - x0) + 'px,' + f1(y1 - y0) + 'px) scale(.9) rotate(340deg)' }], { duration: 800, easing: 'ease-in-out', fill: 'forwards' }); await settle(a, 800); } else await wait(250);
        m.remove();
        const chosen = chicks()[S.fed % 3]; S.fed++; save();
        chicks().forEach(c => { c.classList.add('gulp'); });
        hearts(nb, sr, k);
        await wait(reduce ? 300 : 650);
        chicks().forEach(c => c.classList.remove('open', 'look', 'gulp')); nestBtn.classList.add('happy'); setTimeout(() => nestBtn.classList.remove('happy'), 1100);
        say('The chicks are fed and happy.');
        await wait(reduce ? 400 : 1900);
        foodBtn.classList.remove('used'); feeding = false;
    }
    function hearts(nb, sr, k) {
        if (reduce) return;
        for (let i = 0; i < 4; i++) {
            const s = document.createElementNS(NS, 'svg'); s.setAttribute('viewBox', '-10 -10 20 20'); s.setAttribute('class', 'yd-heart'); s.setAttribute('aria-hidden', 'true');
            s.style.cssText = 'left:' + f1((nb.left + nb.width * (0.25 + i * 0.17) - sr.left) / k) + 'px;top:' + f1((nb.top + nb.height * 0.1 - sr.top) / k) + 'px;color:' + ['#f4a7bf', '#fff', '#f2c230', '#c9b2ec'][i % 4];
            s.innerHTML = '<use href="#mf" x="-10" y="-10" width="20" height="20"/>'; scene.appendChild(s);
            const a = s.animate([{ transform: 'translate(0,0) scale(.4) rotate(0)', opacity: 0 }, { opacity: 1, offset: 0.25 }, { transform: 'translate(' + f1(rnd(-14, 14)) + 'px,' + f1(-rnd(34, 58)) + 'px) scale(1) rotate(' + f1(rnd(-60, 60)) + 'deg)', opacity: 0 }], { duration: rnd(900, 1300), delay: i * 110, easing: 'ease-out', fill: 'both' });
            settle(a, 1500).then(() => s.remove());
        }
    }
    nestBtn.addEventListener('click', () => { if (S.nest < 1) hatch(); else { chirp(true); say('The chicks chirp.'); } });
    foodBtn.addEventListener('click', feed);
    /* hint: an egg wiggles now and then, a chick looks around now and then (only while the yard is on screen) */
    setInterval(() => {
        if (!yardLive || document.hidden || reduce || wateringOn) return;
        if (S.nest < 1 && !hatching) { const e = eggs[Math.floor(Math.random() * eggs.length)]; e.classList.add('tick'); setTimeout(() => e.classList.remove('tick'), 900); }
        else if (S.nest >= 1 && !feeding) chirp(false);
    }, 4200);

    /* ---------------- caterpillar -> chrysalis -> butterfly ---------------- */
    const catLen = catPathEl.getTotalLength ? catPathEl.getTotalLength() : 0;
    catBtn.style.offsetPath = "path('" + CAT_PATH + "')";
    const catUnit = () => (parseFloat(getComputedStyle(catBtn).offsetDistance) || 0);
    function crumbs() {
        if (reduce) return;
        const sr = scene.getBoundingClientRect(), k = sr.width / 560 || 1, r = catBtn.getBoundingClientRect();
        for (let i = 0; i < 3; i++) {
            const c = document.createElement('i'); c.className = 'yd-crumb'; c.setAttribute('aria-hidden', 'true');
            c.style.left = f1((r.left + r.width * 0.85 - sr.left) / k) + 'px'; c.style.top = f1((r.top + r.height * 0.4 - sr.top) / k) + 'px'; scene.appendChild(c);
            const a = c.animate([{ transform: 'translate(0,0)', opacity: 1 }, { transform: 'translate(' + f1(rnd(-6, 10)) + 'px,' + f1(rnd(18, 36)) + 'px) rotate(' + f1(rnd(-90, 90)) + 'deg)', opacity: 0 }], { duration: rnd(600, 900), delay: i * 90, easing: 'ease-in', fill: 'both' });
            settle(a, 1100).then(() => c.remove());
        }
    }
    function bite(n) {
        if (S.cat !== 0) return;
        S.bites += n || 1; save();
        catBtn.classList.remove('nibble'); void catBtn.offsetWidth; catBtn.classList.add('nibble'); crumbs();
        if (S.bites >= 3) pupate();
    }
    let pupating = false;
    async function pupate() {
        if (pupating || S.cat !== 0) return; pupating = true;
        say('The caterpillar is making a chrysalis.');
        /* crawl along its own loop to the leaf underside, then hang */
        const target = { x: 268, y: 150 };
        let best = 0, bd = 1e9;
        if (catLen) for (let d = 0; d < catLen; d += 4) { const p = catPathEl.getPointAtLength(d); const dd = (p.x - target.x) ** 2 + (p.y - target.y) ** 2; if (dd < bd) { bd = dd; best = d; } }
        const now = catUnit(), goal = best / (catLen || 1) * 100;
        catBtn.style.animation = 'none'; catBtn.style.offsetDistance = now + '%';
        if (!reduce && catLen) {
            const dist = ((goal - now) + 100) % 100;
            const a = catBtn.animate([{ offsetDistance: now + '%' }, { offsetDistance: (now + dist) + '%' }], { duration: 400 + dist * 70, easing: 'ease-in-out', fill: 'forwards' });
            await settle(a, 400 + dist * 70 + 100);
        }
        catBtn.style.offsetDistance = goal + '%';
        const p = catPathEl.getPointAtLength(best);
        chrysBtn.style.left = f1(p.x - 12) + 'px'; chrysBtn.style.top = f1(p.y + 1) + 'px'; chrysBtn.hidden = false; chrysBtn.classList.add('forming');
        if (!reduce) { catBtn.classList.add('curl'); await wait(900); }
        catBtn.hidden = true; await wait(reduce ? 50 : 1500);
        chrysBtn.classList.remove('forming'); S.cat = 1; save(); pupating = false; plantHit.hidden = true;
        say('A chrysalis hangs from the leaf.');
        scheduleEmerge();
    }
    function renderCat() {
        if (S.cat >= 1) {
            catBtn.hidden = true; plantHit.hidden = true;
            const best = 0; const p = catLen ? (function () { let b = 0, bd = 1e9; for (let d = 0; d < catLen; d += 4) { const q = catPathEl.getPointAtLength(d); const dd = (q.x - 268) ** 2 + (q.y - 150) ** 2; if (dd < bd) { bd = dd; b = d; } } return catPathEl.getPointAtLength(b); })() : { x: 268, y: 150 };
            chrysBtn.style.left = f1(p.x - 12) + 'px'; chrysBtn.style.top = f1(p.y + 1) + 'px'; chrysBtn.hidden = false;
            if (S.cat >= 2) { chrysBtn.classList.add('empty'); chrysBtn.setAttribute('aria-label', 'An empty chrysalis. The butterfly has flown.'); chrysBtn.disabled = true; }
        }
    }
    catBtn.addEventListener('click', () => bite(1));
    let emergeT = 0, taps = 0;
    function scheduleEmerge() { clearTimeout(emergeT); if (S.cat !== 1) return; emergeT = setTimeout(function tick() { if (S.cat !== 1) return; if (yardLive && !document.hidden) emerge(); else emergeT = setTimeout(tick, 4000); }, 14000); }
    chrysBtn.addEventListener('click', () => {
        if (S.cat !== 1 || emerging) return;
        chrysBtn.classList.remove('shake'); void chrysBtn.offsetWidth; chrysBtn.classList.add('shake');
        if (++taps >= 2) emerge();
    });
    setInterval(() => { if (S.cat === 1 && yardLive && !emerging && !reduce && !document.hidden) { chrysBtn.classList.remove('shake'); void chrysBtn.offsetWidth; chrysBtn.classList.add('shake'); } }, 6500);
    let emerging = false;
    async function emerge() {
        if (emerging || S.cat !== 1) return; emerging = true; clearTimeout(emergeT);
        say('The chrysalis is opening.');
        chrysBtn.classList.add('opening');
        await wait(reduce ? 100 : 1400);                       /* shakes, then the shell cracks along its gold line */
        chrysBtn.classList.add('split');                         /* the husk lets go */
        const r0 = chrysBtn.getBoundingClientRect();
        const bf = makeButterfly(); bf.el.classList.add('fold', 'hang');
        bf.set(r0.left + r0.width / 2, r0.top + r0.height * 0.62); document.body.appendChild(bf.el);
        bf.el.animate([{ scale: 0.35, opacity: 0 }, { scale: 0.7, opacity: 1 }], { duration: reduce ? 1 : 900, fill: 'forwards', easing: 'ease-out' });
        await wait(reduce ? 100 : 1500);
        bf.el.classList.remove('fold');                           /* the wings unfold */
        bf.el.animate([{ scale: 0.7 }, { scale: 1 }], { duration: reduce ? 1 : 1700, fill: 'forwards', easing: 'ease-in-out' });
        await wait(reduce ? 100 : 2000);
        S.cat = 2; save(); chrysBtn.classList.add('empty'); chrysBtn.disabled = true; chrysBtn.setAttribute('aria-label', 'An empty chrysalis. The butterfly has flown.');
        say('A butterfly flies out into the garden.');
        bf.el.classList.remove('hang');
        emerging = false;
        Butterfly.adopt(bf);
    }

    /* ---------------- the butterfly: part of the page from now on ---------------- */
    function makeButterfly() {
        const el = document.createElement('div'); el.className = 'eco-bf'; el.setAttribute('aria-hidden', 'true');
        const W = '<path d="M-1 -2 C-10 -20 -26 -16 -21 -3 C-18 4 -8 3 -1 0Z" fill="#9fd3b4" stroke="#6fa98a" stroke-width=".6"/><path d="M-1 1 C-9 3 -18 10 -13 16 C-8 19 -3 10 -1 3Z" fill="#f6d36b" stroke="#c99a1a" stroke-width=".6"/><circle cx="-13" cy="-8" r="1.4" fill="#e8b923"/><circle cx="-16.5" cy="-5" r="1" fill="#fff" opacity=".8"/>';
        el.innerHTML = '<svg viewBox="-24 -20 48 40"><g class="eb-wl">' + W + '</g><g transform="scale(-1 1)"><g class="eb-wr">' + W + '</g></g><ellipse cx="0" cy="0" rx="1.8" ry="8" fill="#5a4366"/><path d="M-.6 -7 Q-4 -13 -7 -13 M.6 -7 Q4 -13 7 -13" stroke="#5a4366" stroke-width=".9" fill="none" stroke-linecap="round"/></svg>';
        const o = { el, x: 0, y: 0, set(x, y) { o.x = x; o.y = y; el.style.transform = 'translate(' + f1(x - 17) + 'px,' + f1(y - 14) + 'px)'; } };
        return o;
    }
    const Butterfly = (function () {
        let bf = null, state = 'away', timer = 0, raf = 0, perch = null, tilt = 0;
        const SEL = '.yd-flower, .fl-int, .page-posy, .title-bloom, .about-bloom, .hero-flowers .bloom';
        function targets() {
            const out = [];
            $$(SEL).forEach(e => { if (e.closest('.nav, .mb-bouquet')) return; const r = e.getBoundingClientRect(); if (r.width < 6 || r.left < 30 || r.right > innerWidth - 30 || r.top < 90 || r.bottom > innerHeight - 90) return; out.push(e); });
            return out;
        }
        function anchor(e) { const r = e.getBoundingClientRect(); const yd = e.classList.contains('yd-flower'); return { x: r.left + r.width / 2, y: r.top + r.height * (yd ? 0.28 : 0.4) }; }
        function adopt(b) { bf = b; document.body.appendChild(bf.el); bf.el.classList.add('flap'); state = 'fly'; flyTo(null, 'out'); }
        function schedule(ms) { clearTimeout(timer); timer = setTimeout(visit, ms); }
        function visit() {
            if (document.hidden) return schedule(8000);
            const t = targets(); if (!t.length) return schedule(9000);
            const e = t[Math.floor(Math.random() * t.length)];
            const edge = Math.random() < 0.5 ? -40 : innerWidth + 40;
            bf.set(edge, rnd(120, innerHeight - 120)); bf.el.style.display = ''; bf.el.classList.add('flap'); bf.el.classList.remove('rest');
            flyTo(e, 'land');
        }
        function flyTo(target, mode) {
            cancelAnimationFrame(raf); state = 'fly';
            const x0 = bf.x, y0 = bf.y;
            const end = target ? anchor(target) : { x: Math.random() < 0.5 ? -60 : innerWidth + 60, y: rnd(60, innerHeight * 0.6) };
            const dur = target ? rnd(2800, 4200) : rnd(2400, 3200);
            const cx = (x0 + end.x) / 2 + rnd(-120, 120), cy = Math.min(y0, end.y) - rnd(40, 130);
            const t0 = performance.now(); let lx = x0;
            if (reduce) { bf.set(end.x, end.y); return finish(target, mode); }
            (function step(now) {
                if (document.hidden) { raf = requestAnimationFrame(step); return; }
                let t = Math.min(1, (now - t0) / dur); const u = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
                const ex = target ? anchor(target) : end;        /* a landing follows the flower if the page scrolls */
                let x = (1 - u) * (1 - u) * x0 + 2 * (1 - u) * u * cx + u * u * ex.x, y = (1 - u) * (1 - u) * y0 + 2 * (1 - u) * u * cy + u * u * ex.y;
                x += Math.sin(now / 130) * 5 * (1 - u * 0.8); y += Math.cos(now / 170) * 6 * (1 - u * 0.8);
                bf.set(x, y); bf.el.style.rotate = f1(Math.max(-25, Math.min(25, (x - lx) * 5))) + 'deg'; lx = x;
                if (t < 1) raf = requestAnimationFrame(step); else finish(target, mode);
            })(t0);
        }
        function finish(target, mode) {
            bf.el.style.rotate = '0deg';
            if (mode === 'out') { bf.el.style.display = 'none'; state = 'away'; return schedule(reduce ? 12000 : rnd(12000, 26000)); }
            /* landed: wings close slowly, the flower nods, then it rests and follows the flower while the page scrolls */
            state = 'perch'; perch = target; bf.el.classList.remove('flap'); bf.el.classList.add('rest');
            if (!reduce) target.animate([{ rotate: '0deg' }, { rotate: '-7deg' }, { rotate: '4deg' }, { rotate: '0deg' }], { duration: 900, easing: 'ease-in-out' });
            const follow = () => { if (state !== 'perch' || !perch) return; const a = anchor(perch); bf.set(a.x, a.y); };
            addEventListener('scroll', follow, { passive: true }); addEventListener('resize', follow);
            setTimeout(() => {
                removeEventListener('scroll', follow); removeEventListener('resize', follow); perch = null;
                if (reduce) { schedule(30000); return; }       /* with reduced motion it simply rests, then shows up elsewhere later */
                bf.el.classList.remove('rest'); bf.el.classList.add('flap'); flyTo(null, 'out');
            }, rnd(5000, 9000));
        }
        function resume() { if (S.cat >= 2 && !bf) { bf = makeButterfly(); document.body.appendChild(bf.el); bf.el.style.display = 'none'; schedule(reduce ? 3000 : 5000); } }
        return { adopt, resume };
    })();

    /* ---------------- the watering can ---------------- */
    let wateringOn = false, fixedCan = null, restPos = null, idleT = 0, canPos = { x: 0, y: 0, a: 0, f: 1 };
    const CAN_W = 84, CAN_H = 65;
    const TARGETS = '.yd-flower, .yd-plant-hit, .yd-cat, .fl-int, .page-posy, .w-dandelion:not([hidden])';
    const lvOf = new WeakMap();
    function setCan(x, y, a, f) { canPos = { x, y, a: a || 0, f: f || 1 }; fixedCan.style.transform = 'translate(' + f1(x) + 'px,' + f1(y) + 'px) scaleX(' + (f || 1) + ') rotate(' + f1(a || 0) + 'deg)'; }
    function moveCan(x, y, a, f, ms, ease) {
        const from = fixedCan.style.transform || 'translate(0,0)';
        const to = 'translate(' + f1(x) + 'px,' + f1(y) + 'px) scaleX(' + (f || 1) + ') rotate(' + f1(a || 0) + 'deg)';
        const an = reduce ? null : fixedCan.animate([{ transform: from }, { transform: to }], { duration: ms, easing: ease || 'cubic-bezier(.3,.7,.3,1)', fill: 'forwards' });
        canPos = { x, y, a: a || 0, f: f || 1 };
        if (!an) { fixedCan.style.transform = to; return Promise.resolve(); }
        return settle(an, ms).then(() => { try { an.commitStyles(); an.cancel(); } catch (e) { } fixedCan.style.transform = to; });
    }
    const restSpot = () => ({ x: innerWidth - CAN_W - 14, y: innerHeight - CAN_H - 100 });
    function startWatering() {
        if (wateringOn) return; wateringOn = true;
        document.body.classList.add('is-watering'); canBtn.setAttribute('aria-pressed', 'true'); canBtn.classList.add('away');
        const r = canBtn.getBoundingClientRect(), rs = restSpot();
        fixedCan = document.createElement('div'); fixedCan.className = 'eco-can'; fixedCan.setAttribute('aria-hidden', 'true');
        fixedCan.innerHTML = canBtn.innerHTML; document.body.appendChild(fixedCan);
        const onScreen = r.width && inView(canBtn);
        setCan(onScreen ? r.left + (r.width - CAN_W) / 2 : rs.x, onScreen ? r.top + (r.height - CAN_H) / 2 : rs.y + 40, 0, 1);
        moveCan(rs.x, rs.y, -8, 1, 650);
        say('Watering can ready. Tap a flower to water it.');
        document.addEventListener('click', onWaterClick, true); document.addEventListener('keydown', onWaterKey);
        bumpIdle();
    }
    function bumpIdle() { clearTimeout(idleT); idleT = setTimeout(stopWatering, 14000); }
    async function stopWatering() {
        if (!wateringOn) return; wateringOn = false; clearTimeout(idleT);
        document.removeEventListener('click', onWaterClick, true); document.removeEventListener('keydown', onWaterKey);
        document.body.classList.remove('is-watering');
        const fc = fixedCan; fixedCan = null;
        if (fc) {
            const r = canBtn.getBoundingClientRect();
            if (!reduce && inView(canBtn)) { fixedCan = fc; await moveCan(r.left + (r.width - CAN_W) / 2, r.top + (r.height - CAN_H) / 2, 0, 1, 600); fixedCan = null; }
            else if (!reduce) { await fc.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 350, fill: 'forwards' }).finished.catch(() => { }); }
            fc.remove();
        }
        canBtn.classList.remove('away'); canBtn.setAttribute('aria-pressed', 'false');
    }
    function onWaterKey(e) { if (e.key === 'Escape') stopWatering(); }
    function onWaterClick(e) {
        if (!wateringOn) return;
        if (e.target.closest('.yd-can')) { e.preventDefault(); e.stopPropagation(); stopWatering(); return; }
        const t = e.target.closest(TARGETS);
        if (t && !t.closest('.nav, .mb-bouquet, .gs-inner, .g-row, .h-row')) { e.preventDefault(); e.stopPropagation(); water(t); return; }
        if (e.target.closest('button, a, input')) return;      /* ordinary controls keep working; the can stays ready */
        stopWatering();
    }
    let pouring = false;
    async function water(t) {
        if (pouring || !fixedCan) return; pouring = true; bumpIdle();
        const r = t.getBoundingClientRect(); let tx = r.left + r.width / 2, ty = r.top + r.height * (t.classList.contains('yd-flower') ? 0.28 : 0.5);
        if (t.classList.contains('yd-plant-hit') || t.classList.contains('yd-cat')) { const pr = $('.yd-art', scene).getBoundingClientRect(), k = pr.width / 560; tx = pr.left + 290 * k; ty = pr.top + 150 * k; }
        const flip = tx < 120 ? -1 : 1;
        const hoverX = Math.max(8, Math.min(innerWidth - CAN_W - 8, tx - flip * 39 - CAN_W / 2));
        const hoverY = Math.max(70, ty - 62 - 9 - CAN_H / 2);
        const cxNow = hoverX + CAN_W / 2, cyNow = hoverY + CAN_H / 2;
        await moveCan(hoverX, hoverY, 0, flip, 620);
        await moveCan(hoverX, hoverY, 30, flip, 380, 'ease-in-out');
        const tipX = cxNow + flip * 39, tipY = cyNow + 9;
        sprinkle(tipX, tipY, tx, ty);
        await wait(reduce ? 200 : 1050);
        react(t, tx, ty);
        await moveCan(hoverX, hoverY, 0, flip, 380, 'ease-in-out');
        const rs = restSpot(); await moveCan(rs.x, rs.y, -8, 1, 650);
        pouring = false; bumpIdle();
    }
    function sprinkle(sx, sy, tx, ty) {
        if (reduce) return;
        for (let i = 0; i < 14; i++) {
            const d = document.createElement('i'); d.className = 'eco-drop'; d.setAttribute('aria-hidden', 'true');
            d.style.left = f1(sx + rnd(-3, 3)) + 'px'; d.style.top = f1(sy) + 'px'; document.body.appendChild(d);
            const dx = tx - sx + rnd(-12, 12), dy = ty - sy + rnd(-4, 10), dur = rnd(520, 760);
            const ks = arc(dx, dy, 6).map(p => ({ transform: 'translate(' + f1(p.x) + 'px,' + f1(p.y) + 'px)', opacity: p.t > 0.92 ? 0 : 1, offset: p.t }));
            const a = d.animate(ks, { duration: dur, delay: i * 62, easing: 'linear', fill: 'both' });
            settle(a, dur + i * 62 + 60).then(() => d.remove());
        }
    }
    function react(t, tx, ty) {
        /* every flower perks up, a little sparkle rises, and each watering leaves it a touch bigger (up to three times) */
        const lv = Math.min(3, (lvOf.get(t) || (t.dataset && +t.dataset.lv) || 0) + 1); lvOf.set(t, lv);
        if (t.classList.contains('yd-flower')) { S.lv[t.dataset.i] = lv; save(); setLevel(t, lv); say('The flower perks up.'); }
        else if (t.classList.contains('yd-plant-hit') || t.classList.contains('yd-cat')) { say('The plant drinks. The caterpillar looks pleased.'); bite(2); }
        else {
            const to = 1 + 0.1 * lv;
            if (!reduce) { try { t.getAnimations().filter(a => a.id === 'eco-water').forEach(a => a.cancel()); const a = t.animate([{ scale: 1 + 0.1 * (lv - 1), rotate: '0deg' }, { scale: to + 0.2, rotate: '-9deg', offset: 0.35 }, { scale: to, rotate: '4deg', offset: 0.7 }, { scale: to, rotate: '0deg' }], { duration: 1100, easing: 'cubic-bezier(.3,1.5,.5,1)', fill: 'forwards' }); a.id = 'eco-water'; } catch (e) { } }
            else try { t.style.scale = to; } catch (e) { }
            if (t.classList.contains('page-posy')) { t.classList.remove('boing'); void t.offsetWidth; t.classList.add('boing'); }
            say('The flower perks up.');
        }
        sparkles(tx, ty);
    }
    function sparkles(x, y) {
        if (reduce) return;
        for (let i = 0; i < 7; i++) {
            const s = document.createElement('i'); s.className = 'eco-spark'; s.setAttribute('aria-hidden', 'true'); s.style.left = f1(x) + 'px'; s.style.top = f1(y) + 'px'; s.style.background = ['#fff', '#f9d3e1', '#fbe7a1', '#d9e9f7'][i % 4];
            document.body.appendChild(s);
            const a = s.animate([{ transform: 'translate(0,0) scale(.3)', opacity: 0 }, { opacity: 1, offset: 0.2 }, { transform: 'translate(' + f1(rnd(-26, 26)) + 'px,' + f1(-rnd(16, 44)) + 'px) scale(1)', opacity: 0 }], { duration: rnd(700, 1100), delay: i * 50, easing: 'ease-out', fill: 'both' });
            settle(a, 1300).then(() => s.remove());
        }
    }
    function setLevel(fl, lv) { fl.dataset.lv = lv; fl.setAttribute('aria-label', 'A flower, watered ' + lv + (lv === 1 ? ' time.' : ' times.') + ' Water it with the can.'); }
    flowers.forEach(f => { const lv = S.lv[f.dataset.i] || 0; if (lv) { setLevel(f, lv); lvOf.set(f, lv); } });
    canBtn.addEventListener('click', e => { e.stopPropagation(); if (wateringOn) stopWatering(); else startWatering(); });
    /* the yard's own flowers and plant can also be watered with the keyboard once the can is ready */
    scene.addEventListener('click', e => { /* flowers outside watering mode just sway a little */
        if (wateringOn) return;
        const f = e.target.closest('.yd-flower'); if (f && !reduce) { f.classList.remove('sway-hit'); void f.offsetWidth; f.classList.add('sway-hit'); }
    });

    renderNest(); renderCat(); if (S.cat === 1) scheduleEmerge(); Butterfly.resume();
    window.__eco = { pour, state: () => S, water: t => { if (!wateringOn) startWatering(); return water(t); }, hatch, bite, emerge };
})();
