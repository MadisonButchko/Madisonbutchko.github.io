/* js/garden/species.js
   Purpose : the garden's plant species, all drawn in one flat SVG style: palettes, height/size ranges, row spacing (ROWS), pickType (what to plant in a row), leaf/tuft/head drawing and plantMarkup (the whole plant as SVG markup + petal colour).
   Owns    : FLOWER_TYPES, GROUND_TYPES, TALL, SHORT, PAL, H_RANGE, SZ_RANGE, GREENS, ROWS, pickType, leaf, tuft, head, plantMarkup (pure functions; randomness only through Math.random / rand / pick, as before).
   Uses    : core.utils (f1, rand, pick).   Used by: garden/garden.js.
   Mobile / reduced motion: pure drawing; no motion.
   Moved verbatim from legacy/140-side-vines-and-garden.js (Migration Step 14; only shared-state access was rewritten to go through the garden-facing API object `ga`); behaviour, order and timing unchanged. */
MB.define('garden.species', ['core.utils'], function (utils) {
    'use strict';
    const { f1, rand, pick } = utils;
        /* --- species: everything is drawn in the same flat SVG style --- */
        const FLOWER_TYPES = ['bloom', 'daisy', 'forsythia', 'tulip', 'sunflower', 'lavender', 'rose', 'bells', 'poppy', 'foxglove', 'allium', 'cosmos', 'coneflower', 'violet'];
        const GROUND_TYPES = ['fern', 'grass', 'mushroom', 'bush', 'clover'];
        const TALL = ['sunflower', 'foxglove', 'allium', 'lavender', 'cosmos', 'coneflower'], SHORT = ['violet', 'bells', 'daisy', 'bloom', 'poppy', 'tulip'];
        const PAL = {
            bloom: [['#f4a7bf', '#f2c230'], ['#b9a2de', '#f2c230'], ['#e9789f', '#fff1cc'], ['#f8c9a0', '#e07fa3']],
            daisy: [['#ffffff', '#f2c230'], ['#c9b2ec', '#fbe7a1'], ['#fde1ea', '#f2c230']],
            forsythia: [['#f2c230', '#d99a12']],
            tulip: [['#e9789f', '#c2457e'], ['#f2c230', '#d99a12'], ['#b9a2de', '#8a63b8'], ['#f8a07a', '#e0603a']],
            rose: [['#e9789f', '#c2457e'], ['#f9c6d6', '#e07fa3'], ['#fbe7a1', '#e8b923']],
            poppy: [['#f26b5b', '#3a2b33'], ['#f8a07a', '#5a3a2a'], ['#f4a7bf', '#6b3a55'], ['#fbe7a1', '#7a4a1e']],
            foxglove: [['#e9789f', '#fde1ea'], ['#c9b2ec', '#ffffff'], ['#f9c6d6', '#c2457e'], ['#fff7ea', '#e07fa3']],
            allium: [['#b9a2de', '#8a63b8'], ['#e9a3d0', '#c2457e'], ['#d9cbf3', '#9d7fd0']],
            cosmos: [['#f4a7bf', '#f2c230'], ['#ffffff', '#f2c230'], ['#e9789f', '#fbe7a1'], ['#c9b2ec', '#f2c230']],
            coneflower: [['#e9789f'], ['#f8a07a'], ['#c9b2ec'], ['#f2c230']],
            violet: [['#8a63b8', '#c9b2ec'], ['#c2457e', '#f9c6d6'], ['#5e4a8f', '#fbe7a1'], ['#e0a020', '#fbe7a1']]
        };
        const H_RANGE = { sunflower: [92, 124], foxglove: [78, 112], allium: [78, 108], lavender: [58, 96], cosmos: [66, 100], coneflower: [58, 92], bells: [38, 58], violet: [16, 26], tulip: [44, 78], poppy: [46, 88], rose: [46, 84] };
        const SZ_RANGE = { sunflower: [38, 46], violet: [15, 19], allium: [24, 30], cosmos: [26, 32], coneflower: [26, 32], poppy: [24, 30] };
        const GREENS = ['#7fa65c', '#8db36a', '#a3c47f', '#6e9a4c'];
        /* min spacing (px) and height factor per row: back rows are taller but drawn smaller/softer, so the bed reads as a deep meadow */
        const ROWS = { back: { gap: 12, h: 1.1, y: 30 }, mid: { gap: 13, h: 1, y: 20 }, front: { gap: 15, h: 0.86, y: 9 } };
        function pickType(row){
            const r = Math.random();
            if (r < 0.14) return pick(row === 'back' ? ['fern', 'grass', 'bush'] : row === 'front' ? ['clover', 'mushroom', 'grass', 'fern'] : GROUND_TYPES);
            if (row === 'back' && r < 0.62) return pick(TALL);
            if (row === 'front' && r < 0.55) return pick(SHORT);
            return pick(FLOWER_TYPES);
        }
        function leaf(side, y){
            return `<g class="g-leaf"><use href="#fl-leaf" x="20" y="${f1(y - 14)}" width="14" height="14" style="color:#8db36a"${side < 0 ? ' transform="translate(40,0) scale(-1,1)"' : ''}/></g>`;
        }
        function tuft(H){
            let s = '';
            for (let k = 0; k < 3; k++){ const dx = (k - 1) * 4 + rand(-1, 1), hh = rand(6, 11), b = rand(-3, 3); s += `<path d="M${f1(20 + dx)} ${f1(H)} Q${f1(20 + dx + b * 0.4)} ${f1(H - hh * 0.6)} ${f1(20 + dx + b)} ${f1(H - hh)}" stroke="${pick(GREENS)}" stroke-width="2" stroke-linecap="round" fill="none"/>`; }
            return `<g class="g-leaf">${s}</g>`;
        }
        /* returns [markup, petal color] */
        function head(type, cx, top, sz, rare){
            const R = sz / 2, at = s => `<g class="g-head"><g transform="translate(${f1(cx)} ${f1(top)})">${s}</g></g>`;
            const useAt = (id, style) => `<g class="g-head" style="${style}"><use href="#${id}" x="${f1(cx - R)}" y="${f1(top - R)}" width="${f1(sz)}" height="${f1(sz)}"/></g>`;
            if (rare) return [`<g class="g-head"><use href="#fl-bloom" x="${f1(cx - R)}" y="${f1(top - R)}" width="${f1(sz)}" height="${f1(sz)}" style="color:#f79cc0;--center:#ffe27a"/></g>`, '#f79cc0'];
            let c, s = '';
            switch (type){
                case 'bloom': case 'daisy': case 'forsythia': c = pick(PAL[type]); return [useAt('fl-' + type, `color:${c[0]};--center:${c[1]}`), c[0]];
                case 'sunflower': return [useAt('fl-daisy', 'color:#f2c230;--center:#7a4a1e'), '#f2c230'];
                case 'tulip': c = pick(PAL.tulip); return [at(`<path d="M-8 -4 C-9 8 9 8 8 -4 L6 -12 L3 -6 L0 -13 L-3 -6 L-6 -12 Z" fill="${c[0]}"/><path d="M0 -13 L-3 -6 L0 5 L3 -6Z" fill="${c[1]}" opacity=".45"/>`), c[0]];
                case 'rose': c = pick(PAL.rose); return [at(`<circle r="10" fill="${c[0]}"/><path d="M-6 0 a6 6 0 1 1 6 6 a4 4 0 1 1 -4 -4 a2 2 0 1 1 2 2" fill="none" stroke="${c[1]}" stroke-width="1.6" stroke-linecap="round"/>`), c[0]];
                case 'lavender': for (let k = 0; k < 6; k++) s += `<ellipse cx="${k % 2 ? 2.5 : -2.5}" cy="${-6 + k * 5}" rx="3" ry="4" fill="${k % 2 ? '#9d7fd0' : '#b9a2de'}"/>`; return [at(s), '#b9a2de'];
                case 'bells': s = '<path d="M0 0 Q12 -6 16 4" stroke="#7fa65c" stroke-width="1.6" fill="none"/>'; [[4, 3], [10, 2], [15, 8]].forEach(([x, y]) => { s += `<path d="M${x - 3.5} ${y} C${x - 3.5} ${y - 5} ${x + 3.5} ${y - 5} ${x + 3.5} ${y} L${x + 4.5} ${y + 3} L${x - 4.5} ${y + 3} Z" fill="#fff" stroke="#e8dcea"/>`; }); return [at(s), '#ffffff'];
                case 'poppy': { c = pick(PAL.poppy); const r = R * 0.62, o = r * 0.62; [[-1, -0.6], [1, -0.6], [-0.8, 0.7], [0.8, 0.7]].forEach(([a, b]) => { s += `<circle cx="${f1(a * o)}" cy="${f1(b * o)}" r="${f1(r)}" fill="${c[0]}"/>`; }); s += `<circle cx="${f1(-o * 0.8)}" cy="${f1(-o)}" r="${f1(r * 0.35)}" fill="#fff" opacity=".3"/><circle r="${f1(r * 0.42)}" fill="${c[1]}"/>`; return [at(s), c[0]]; }
                case 'foxglove': { c = pick(PAL.foxglove); s = '<ellipse cx="0" cy="-4" rx="2" ry="3.6" fill="#8db36a"/>'; for (let k = 0; k < 6; k++){ const side = k % 2 ? 1 : -1, w = 3 + k * 0.4, y = 2 + k * 7, x = side * (2.5 + w * 0.7); s += `<g transform="rotate(${side * 22} ${f1(x)} ${f1(y)})"><ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(w)}" ry="${f1(w * 0.78)}" fill="${c[0]}"/><ellipse cx="${f1(x + side * w * 0.45)}" cy="${f1(y + w * 0.25)}" rx="${f1(w * 0.4)}" ry="${f1(w * 0.35)}" fill="${c[1]}"/></g>`; } return [at(s), c[0]]; }
                case 'allium': { c = pick(PAL.allium); s = `<circle r="${f1(R * 0.92)}" fill="${c[0]}"/>`; for (let k = 0; k < 16; k++){ const a = rand(0, Math.PI * 2), d = Math.sqrt(Math.random()) * R * 0.78; s += `<circle cx="${f1(Math.cos(a) * d)}" cy="${f1(Math.sin(a) * d)}" r="1.7" fill="${k % 2 ? c[1] : '#fff'}" opacity=".8"/>`; } return [at(s), c[0]]; }
                case 'cosmos': c = pick(PAL.cosmos); for (let k = 0; k < 8; k++) s += `<ellipse cx="0" cy="${f1(-R * 0.55)}" rx="${f1(R * 0.27)}" ry="${f1(R * 0.48)}" fill="${c[0]}" stroke="rgba(194,69,126,.15)" stroke-width=".6" transform="rotate(${k * 45})"/>`; s += `<circle r="${f1(R * 0.22)}" fill="${c[1]}"/>`; return [at(s), c[0]];
                case 'coneflower': c = pick(PAL.coneflower); for (let k = 0; k < 9; k++) s += `<ellipse cx="${f1(R * 0.55)}" cy="0" rx="${f1(R * 0.5)}" ry="${f1(R * 0.16)}" fill="${c[0]}" transform="rotate(${f1(-12 + k * 25.5)})"/>`; s += `<ellipse cy="-1" rx="${f1(R * 0.34)}" ry="${f1(R * 0.3)}" fill="#8a4a2a"/><circle cx="${f1(-R * 0.1)}" cy="${f1(-R * 0.12)}" r="1.4" fill="#d99a12"/><circle cx="${f1(R * 0.12)}" cy="${f1(-R * 0.02)}" r="1.2" fill="#d99a12"/>`; return [at(s), c[0]];
                case 'violet': c = pick(PAL.violet); s = `<ellipse cx="${f1(-R * 0.35)}" cy="${f1(-R * 0.4)}" rx="${f1(R * 0.4)}" ry="${f1(R * 0.5)}" fill="${c[0]}"/><ellipse cx="${f1(R * 0.35)}" cy="${f1(-R * 0.4)}" rx="${f1(R * 0.4)}" ry="${f1(R * 0.5)}" fill="${c[0]}"/><ellipse cx="${f1(-R * 0.5)}" cy="${f1(R * 0.12)}" rx="${f1(R * 0.38)}" ry="${f1(R * 0.32)}" fill="${c[1]}"/><ellipse cx="${f1(R * 0.5)}" cy="${f1(R * 0.12)}" rx="${f1(R * 0.38)}" ry="${f1(R * 0.32)}" fill="${c[1]}"/><ellipse cy="${f1(R * 0.4)}" rx="${f1(R * 0.4)}" ry="${f1(R * 0.34)}" fill="${c[1]}"/><circle r="${f1(R * 0.17)}" fill="#f2c230"/>`; return [at(s), c[0]];
            }
            return ['', '#8db36a'];
        }
        function plantMarkup(type, rare, row){
            const isFlower = rare || FLOWER_TYPES.includes(type), cx = 20, rh = (ROWS[row] || ROWS.front).h;
            let h, H, inner = '', color = '#8db36a';
            if (isFlower){
                const hr = rare ? [72, 108] : H_RANGE[type] || [46, 96], sr = rare ? [38, 44] : SZ_RANGE[type] || [26, 36];
                h = rand(hr[0], hr[1]) * rh; const sz = rand(sr[0], sr[1]);
                const top = !rare && (type === 'lavender' || type === 'foxglove') ? 8 : sz / 2 + 2; H = h + top;
                const bend = rand(-9, 9), side = Math.random() > 0.5 ? 1 : -1;
                inner += `<path class="g-stem" d="M${cx} ${f1(H)} Q ${f1(cx + bend)} ${f1(top + h * 0.5)} ${cx} ${f1(top)}"/>`;
                if (h > 22) inner += leaf(side, top + h * rand(0.45, 0.6));
                if (h > 50 && Math.random() > 0.3) inner += leaf(-side, top + h * rand(0.65, 0.8));
                /* clumps: most flowers send up 1-2 shorter side stems with their own smaller blooms */
                if (!rare && h > 34 && type !== 'bells' && Math.random() < 0.7){
                    const sides = Math.random() < 0.45 ? [-1, 1] : [Math.random() < 0.5 ? -1 : 1];
                    sides.forEach(sd => {
                        const sx = cx + sd * rand(7, 12), sy = top + h * rand(0.25, 0.5), ssz = sz * rand(0.55, 0.72);
                        inner += `<path class="g-stem" d="M${cx} ${f1(H)} Q ${f1(cx + sd * 2)} ${f1(sy + (H - sy) * 0.4)} ${f1(sx)} ${f1(sy)}"/>`;
                        inner += head(type, sx, type === 'lavender' || type === 'foxglove' ? sy - 4 : sy, ssz, false)[0];
                    });
                }
                if (Math.random() < 0.75) inner += tuft(H);
                const hd = head(type, cx, top, sz, rare); inner += hd[0]; color = hd[1];
            } else if (type === 'grass'){
                h = rand(24, 48) * rh; H = h + 4; let s = '';
                for (let k = 0; k < 5; k++){ const dx = (k - 2) * 3.5 + rand(-1, 1), b = rand(-9, 9), hh = h * rand(0.6, 1); s += `<path d="M${f1(cx + dx)} ${f1(H)} Q ${f1(cx + dx + b * 0.4)} ${f1(H - hh * 0.6)} ${f1(cx + dx + b)} ${f1(H - hh)}" stroke="${pick(GREENS)}" stroke-width="2.6" stroke-linecap="round" fill="none"/>`; }
                inner = `<g class="g-pop">${s}</g>`;
            } else if (type === 'fern'){
                h = rand(42, 74) * rh; H = h + 6; const b = rand(-8, 8);
                let s = `<path d="M${cx} ${f1(H)} Q ${f1(cx + b * 0.3)} ${f1(H - h * 0.5)} ${f1(cx + b)} ${f1(H - h)}" stroke="#6e9a4c" stroke-width="2" fill="none" stroke-linecap="round"/>`;
                for (let k = 1; k <= 7; k++){ const t = k / 8, x = cx + b * t * t, y = H - h * t, rx = 8 * (1 - t * 0.7), lx = x - rx * 0.8, rxx = x + rx * 0.8; s += `<ellipse cx="${f1(lx)}" cy="${f1(y)}" rx="${f1(rx)}" ry="2.6" fill="#8db36a" transform="rotate(22 ${f1(lx)} ${f1(y)})"/><ellipse cx="${f1(rxx)}" cy="${f1(y)}" rx="${f1(rx)}" ry="2.6" fill="#7fa65c" transform="rotate(-22 ${f1(rxx)} ${f1(y)})"/>`; }
                inner = `<g class="g-pop">${s}</g>`;
            } else if (type === 'mushroom'){
                h = rand(20, 30); H = h + 2; const capC = pick(['#e0603a', '#c2457e', '#d99a6a', '#b9a2de']), cw = rand(11, 15), capY = H - h + 8; color = capC;
                inner = `<g class="g-pop"><rect x="${cx - 4}" y="${f1(capY - 2)}" width="8" height="${f1(H - capY + 2)}" rx="3" fill="#fff7ea" stroke="#e8dcea"/><path d="M${f1(cx - cw)} ${f1(capY)} Q ${cx} ${f1(capY - cw * 1.3)} ${f1(cx + cw)} ${f1(capY)} Z" fill="${capC}"/><circle cx="${cx - 4}" cy="${f1(capY - 5)}" r="2" fill="#fff" opacity=".85"/><circle cx="${cx + 4}" cy="${f1(capY - 7)}" r="1.6" fill="#fff" opacity=".85"/><circle cx="${cx + 7}" cy="${f1(capY - 2.5)}" r="1.3" fill="#fff" opacity=".85"/></g>`;
            } else if (type === 'bush'){
                h = rand(26, 38) * rh; H = h + 2; let s = '';
                [[-9, 0.55, 10], [9, 0.55, 10], [0, 0.8, 12], [-4, 0.35, 9], [5, 0.38, 9]].forEach(([ox, oy, r]) => { s += `<circle cx="${cx + ox}" cy="${f1(H - h * oy)}" r="${f1(r * h / 34)}" fill="${pick(GREENS)}"/>`; });
                const berry = pick(['#e9789f', '#f2c230', '#b9a2de', '#ffffff']); color = berry;
                for (let k = 0; k < 4; k++) s += `<circle cx="${f1(cx + rand(-12, 12))}" cy="${f1(H - h * rand(0.35, 0.85))}" r="2" fill="${berry}"/>`;
                inner = `<g class="g-pop">${s}</g>`;
            } else { /* clover */
                h = rand(18, 28); H = h + 10; const t2 = H - h;
                let s = `<path d="M${cx} ${f1(H)} Q ${cx + 3} ${f1(H - h * 0.5)} ${cx} ${f1(t2)}" stroke="#6e9a4c" stroke-width="1.8" fill="none"/>`;
                [0, 120, 240].forEach(a => { const rad = (a - 90) * Math.PI / 180; s += `<circle cx="${f1(cx + Math.cos(rad) * 4.5)}" cy="${f1(t2 + Math.sin(rad) * 4.5)}" r="4.6" fill="#8db36a"/>`; });
                if (Math.random() < 0.5) s += `<circle cx="${cx + 9}" cy="${f1(t2 - 4)}" r="3.5" fill="#fff" stroke="#f9c6d6"/>`;
                inner = `<g class="g-pop">${s}</g>`;
            }
            return { isFlower, h, H, inner, color };
        }

    return { FLOWER_TYPES, GROUND_TYPES, TALL, SHORT, PAL, H_RANGE, SZ_RANGE, GREENS, ROWS, pickType, leaf, tuft, head, plantMarkup };
});
