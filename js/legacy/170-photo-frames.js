    /* photo floral frames: clicking one of the personal photos grows an ornamental flower frame that hugs
       its edge. Click 1: flower clusters at the 4 corners. Clicks 2-5: vines grow from each corner along
       both edges (leaves and flowers bloom off the vine as it passes) until they meet mid-edge. Click 6:
       accent blooms finish the frame. After that, clicks just make it bounce and sparkle (no new DOM).
       The frame lives inside the photo element, so it follows every hover scale / tilt / move. */
    (function(){
        const NS = 'http://www.w3.org/2000/svg', reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
        const STEPS = 6, M = 28, VINE = [0, 0, 0.25, 0.5, 0.75, 1, 1];
        const FL = [['fl-bloom', '#f4a7bf', '#f2c230'], ['fl-daisy', '#ffffff', '#f2c230'], ['fl-forsythia', '#f2c230', '#d99a12'], ['fl-bloom', '#b9a2de', '#f2c230'], ['fl-daisy', '#c9b2ec', '#fbe7a1'], ['fl-bloom', '#e9789f', '#fff1cc']];
        const f1 = v => (+v).toFixed(1);
        const mk = (name, attrs, parent) => { const e = document.createElementNS(NS, name); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; };
        const D = [[1, -1], [1, 1], [-1, 1], [-1, -1]].map(([x, y]) => [x / Math.SQRT2, y / Math.SQRT2]); /* outward diagonals: TR, BR, BL, TL */

        function build(st){
            const ph = st.ph, W = ph.offsetWidth, H = ph.offsetHeight; if (!W || !H) return false;
            st.W = W; st.H = H;
            const cs = getComputedStyle(ph);
            let r = ['borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomRightRadius', 'borderBottomLeftRadius'].map(k => parseFloat(cs[k]) || 0);
            const fit = Math.min(1, W / ((r[0] + r[1]) || 1), W / ((r[3] + r[2]) || 1), H / ((r[0] + r[3]) || 1), H / ((r[1] + r[2]) || 1));
            const [tl, tr, br, bl] = r.map(v => v * fit), x0 = M, y0 = M, x1 = M + W, y1 = M + H;
            const layer = cls => { const s = mk('svg', { class: 'pf-layer ' + cls, viewBox: `0 0 ${f1(W + 2 * M)} ${f1(H + 2 * M)}`, 'aria-hidden': 'true' }); s.style.cssText = `left:${-M}px;top:${-M}px;width:${f1(W + 2 * M)}px;height:${f1(H + 2 * M)}px`; ph.appendChild(s); return s; };
            st.back = layer('pf-back'); st.front = layer('pf-front');
            /* the photo's real outline (same corner radii as the photo), starting at top-center, clockwise */
            const guide = mk('path', { class: 'pf-guide', d: `M${f1(x0 + W / 2)} ${y0} L${f1(x1 - tr)} ${y0} A${f1(tr)} ${f1(tr)} 0 0 1 ${x1} ${f1(y0 + tr)} L${x1} ${f1(y1 - br)} A${f1(br)} ${f1(br)} 0 0 1 ${f1(x1 - br)} ${y1} L${f1(x0 + bl)} ${y1} A${f1(bl)} ${f1(bl)} 0 0 1 ${x0} ${f1(y1 - bl)} L${x0} ${f1(y0 + tl)} A${f1(tl)} ${f1(tl)} 0 0 1 ${f1(x0 + tl)} ${y0} Z` }, st.back);
            const L = guide.getTotalLength(), N = Math.ceil(L / 2), pts = [];
            for (let i = 0; i <= N; i++) pts.push(guide.getPointAtLength(i * L / N));
            const near = (x, y) => { let b = 0, bd = Infinity; pts.forEach((p, i) => { const d = (p.x - x) ** 2 + (p.y - y) ** 2; if (d < bd){ bd = d; b = i; } }); return b * L / N; };
            const at = s => guide.getPointAtLength(Math.max(0, Math.min(L, s)));
            const c45 = Math.SQRT1_2;
            const corners = [[x1 - tr + tr * c45, y0 + tr - tr * c45], [x1 - br + br * c45, y1 - br + br * c45], [x0 + bl - bl * c45, y1 - bl + bl * c45], [x0 + tl - tl * c45, y0 + tl - tl * c45]].map(([x, y]) => near(x, y));
            const mids = [0, near(x1, y0 + H / 2), near(x0 + W / 2, y1), near(x0, y0 + H / 2), L];
            /* local frame at arc length s: point, outward normal, tangent */
            const frame = s => { const a = at(s - 1.5), b = at(s + 1.5), p = at(s); let tx = b.x - a.x, ty = b.y - a.y; const m = Math.hypot(tx, ty) || 1; tx /= m; ty /= m; return { x: p.x, y: p.y, nx: ty, ny: -tx, tx, ty }; };
            st.segs = []; st.items = []; let fi = 0;
            const ps = Math.max(1, Math.min(1.6, Math.min(W, H) / 175)); /* arrangement scale follows the photo size */
            const flower = (parent, x, y, ox, oy, size, kind, cls, t, extra) => {
                const f = FL[fi++ % FL.length], g = mk('g', { class: 'pf-it pf-fl ' + (cls || ''), transform: `translate(${f1(x)} ${f1(y)})` }, parent);
                if (ox || oy) mk('path', { class: 'pf-st', d: `M0 0 L${f1(ox)} ${f1(oy)}` }, g);
                const pop = mk('g', { class: 'pf-pop' }, g); pop.style.color = f[1]; pop.style.setProperty('--center', f[2]);
                mk('use', { href: '#' + (kind || f[0]), x: f1(ox - size / 2), y: f1(oy - size / 2), width: f1(size), height: f1(size) }, pop);
                g.style.setProperty('--d', st.items.length * 18);
                st.items.push(Object.assign({ g, t, fl: true }, extra)); return g;
            };
            const leaf = (parent, x, y, dx, dy, size, t, extra) => {
                const ang = Math.atan2(dy, dx) * 180 / Math.PI + 45;
                const g = mk('g', { class: 'pf-it pf-leaf', transform: `translate(${f1(x)} ${f1(y)}) rotate(${f1(ang)})` }, parent);
                const pop = mk('g', { class: 'pf-pop' }, g); pop.style.color = Math.random() < 0.5 ? '#8db36a' : '#7fa65c';
                mk('use', { href: '#fl-leaf', x: 0, y: f1(-size), width: f1(size), height: f1(size) }, pop);
                st.items.push(Object.assign({ g, t }, extra)); return g;
            };
            /* 8 vine segments: each corner grows toward the two neighbouring edge midpoints */
            corners.forEach((sc, ci) => {
                [mids[ci], mids[ci + 1]].forEach((sm, side) => {
                    const len = Math.abs(sm - sc), dir = Math.sign(sm - sc) || 1;
                    let d = ''; for (let s = 0; s <= len + 0.01; s += 3){ const p = at(sc + dir * Math.min(s, len)); d += (s ? 'L' : 'M') + f1(p.x) + ' ' + f1(p.y); }
                    const path = mk('path', { class: 'pf-vine', d }, st.back);
                    path.style.strokeDasharray = f1(len + 1); path.style.strokeDashoffset = f1(len + 1);
                    st.segs.push({ path, len });
                    let n = 0;
                    for (let s = 10; s < len - 5; s += 13, n++){ /* leaves alternate: outward (front) and tucked behind the photo edge (back) */
                        const q = frame(sc + dir * s), out = n % 2 === 0, k = out ? 0.8 : -0.55;
                        leaf(out ? st.front : st.back, q.x, q.y, q.nx * k + q.tx * dir * 0.6, q.ny * k + q.ty * dir * 0.6, out ? 13 : 11, s / len);
                    }
                    let m = 0;
                    for (let s = 30; s < len - 12; s += 34, m++){ /* flowers bloom off short stems, just outside the edge; big and small alternate */
                        const q = frame(sc + dir * s), big = m % 2 === 0;
                        flower(st.front, q.x, q.y, q.nx * (big ? 6 : 4), q.ny * (big ? 6 : 4), big ? 17 + Math.random() * 3 : 11 + Math.random() * 2, big ? null : 'fl-daisy', '', s / len);
                    }
                });
                /* corner cluster: big bloom + bud + leaves (front), two leaves tucked behind (back).
                   On decorated photos two diagonal corners are always in bloom (kind 'posy'); clicks grow the rest. */
                const q = frame(sc), [dx, dy] = D[ci], rot = (vx, vy, a) => [vx * Math.cos(a) - vy * Math.sin(a), vx * Math.sin(a) + vy * Math.cos(a)];
                const major = st.posy && st.major.includes(ci), ck = major ? 'posy' : 'corner', pd = major ? (ci === st.major[0] ? 0 : 0.45) : 0, z = major ? ps : 1;
                [[-1.05, 12], [1.05, 12]].forEach(([a, s]) => { const v = rot(dx, dy, a); leaf(st.front, q.x, q.y, v[0], v[1], s * z, 0, { kind: ck, dl: pd + 0.05 }); });
                [[-2.4, 10], [2.4, 10]].forEach(([a, s]) => { const v = rot(dx, dy, a); leaf(st.back, q.x, q.y, v[0], v[1], s, 0, { kind: 'corner', dl: 0 }); });
                flower(st.front, q.x, q.y, dx * 4 * z, dy * 4 * z, 23 * z, null, 'pf-big', 0, { kind: ck, dl: pd + 0.15 });
                const b = rot(dx, dy, 0.9); flower(st.front, q.x, q.y, b[0] * 15 * z, b[1] * 15 * z, 11 * z, 'fl-daisy', '', 0, { kind: ck, dl: pd + 0.3 });
                if (major){ /* a smaller bloom, a bud and a leaf trailing a little way along one edge */
                    const sg = ci % 2 ? -1 : 1, e = frame(sc + sg * 22 * z), e2 = frame(sc + sg * 37 * z), e3 = frame(sc - sg * 18 * z);
                    flower(st.front, e.x, e.y, e.nx * 5, e.ny * 5, 16 * z, null, '', 0, { kind: 'posy', dl: pd + 0.4 });
                    leaf(st.front, e2.x, e2.y, e2.nx * 0.6 + e2.tx * sg * 0.8, e2.ny * 0.6 + e2.ty * sg * 0.8, 13 * z, 0, { kind: 'posy', dl: pd + 0.5 });
                    leaf(st.front, e3.x, e3.y, e3.nx * 0.6 - e3.tx * sg * 0.8, e3.ny * 0.6 - e3.ty * sg * 0.8, 12 * z, 0, { kind: 'posy', dl: pd + 0.55 });
                }
                /* extra blooms that fill the cluster out when the frame completes */
                [-1, 1].forEach(sg => { const e = frame(sc + sg * 15); flower(st.front, e.x, e.y, e.nx * 6, e.ny * 6, 13, null, '', 0, { kind: 'late', dl: 0.1 + (sg + 1) * 0.08 }); });
            });
            if (st.posy){ /* one small sprig on a long edge, between a bare corner and the middle of that side */
                const minor = st.major.includes(1) ? 2 : 1, sm = minor === 2 ? mids[3] : mids[1];
                const q = frame(corners[minor] + (sm - corners[minor]) * 0.45);
                [-1, 1].forEach(sg => leaf(st.front, q.x, q.y, q.nx * 0.7 + q.tx * sg * 0.7, q.ny * 0.7 + q.ty * sg * 0.7, 12 * ps, 0, { kind: 'posy', dl: 0.75 }));
                flower(st.front, q.x, q.y, q.nx * 6, q.ny * 6, 14 * ps, 'fl-daisy', '', 0, { kind: 'posy', dl: 0.85 });
            }
            /* accent blooms where the vines meet, plus sparkles used for the "complete" bounce */
            mids.slice(0, 4).forEach((sm, mi) => {
                const q = frame(sm);
                [-1, 1].forEach(sg => leaf(st.front, q.x, q.y, q.nx * 0.7 + q.tx * sg * 0.7, q.ny * 0.7 + q.ty * sg * 0.7, 11, 0, { kind: 'late', dl: 0.2 }));
                flower(st.front, q.x, q.y, q.nx * 5, q.ny * 5, 19, null, 'pf-big', 0, { kind: 'late', dl: 0.3 + mi * 0.06 });
            });
            corners.concat(mids.slice(0, 4)).forEach((s, k) => {
                const q = frame(s), sp = mk('path', { class: 'pf-spark', d: 'M0 -5 L1.3 -1.3 L5 0 L1.3 1.3 L0 5 L-1.3 1.3 L-5 0 L-1.3 -1.3Z', transform: `translate(${f1(q.x + q.nx * 16)} ${f1(q.y + q.ny * 16)})` }, st.front);
                sp.style.setProperty('--d', k * 70);
            });
            st.built = true; return true;
        }
        function apply(st, prevStep, instant){
            const p = VINE[st.step], pp = VINE[prevStep];
            st.segs.forEach(sg => { sg.path.style.strokeDashoffset = f1((sg.len + 1) * (1 - p)); });
            st.items.forEach(it => {
                let on, delay = 0;
                if (it.kind === 'posy'){ on = true; delay = it.dl; }
                else if (it.kind === 'corner'){ on = st.step >= 1; delay = it.dl; }
                else if (it.kind === 'late'){ on = st.step >= STEPS; delay = 0.3 + it.dl; }
                else { on = it.t <= p + 1e-6; delay = p > pp ? Math.max(0, (it.t - pp) / (p - pp)) * 0.85 + (it.fl ? 0.12 : 0) : 0; }
                if (on && !it.g.classList.contains('on')){ it.g.style.setProperty('--dl', (instant || reduce ? 0 : delay).toFixed(2) + 's'); it.g.classList.add('on'); }
                else if (!on) it.g.classList.remove('on');
            });
        }
        function grow(st){
            if (!st.built && !build(st)) return;
            if (st.step >= STEPS){ /* complete: bounce + sparkle the existing frame, no new elements */
                st.ph.classList.remove('pf-cheer'); void st.ph.offsetWidth; st.ph.classList.add('pf-cheer');
                clearTimeout(st.cheerT); st.cheerT = setTimeout(() => st.ph.classList.remove('pf-cheer'), 1500);
                return;
            }
            const prev = st.step; st.step++;
            apply(st, prev, false);
            if (st.step === STEPS) setTimeout(() => st.ph.classList.add('pf-complete'), reduce ? 0 : 1400);
        }
        function rebuild(st){
            [st.back, st.front].forEach(l => l && l.remove()); st.built = false;
            if (!build(st)) return;
            st.ph.classList.add('pf-instant'); apply(st, st.step, true);
            requestAnimationFrame(() => requestAnimationFrame(() => st.ph.classList.remove('pf-instant')));
        }
        /* the three hero photos and the contact photo always wear a small corner arrangement (two diagonal corners
           plus one sprig, alternating per photo); it blooms in the first time the photo is on screen */
        const posyObs = new IntersectionObserver(es => es.forEach(e => {
            if (!e.isIntersecting) return; posyObs.unobserve(e.target);
            const st = e.target.__pf; if (st && !st.built && build(st)) apply(st, 0, false);
        }), { threshold: 0.2 });
        document.querySelectorAll('.collage .fan-card, .about-photo, .contact-photo').forEach((ph, k) => {
            const posy = !ph.classList.contains('about-photo');
            const st = { ph, step: 0, built: false, posy, major: k % 2 ? [0, 2] : [3, 1] };
            ph.__pf = st; if (posy) posyObs.observe(ph);
            /* capture phase: decide before the fan's own click handler reshuffles the cards.
               A click on a back card only brings it forward; clicks on the front card grow its frame. */
            ph.addEventListener('click', e => {
                if (!e.isTrusted) return;
                if (ph.classList.contains('fan-card') && ph.dataset.slot !== '0') return;
                grow(st);
            }, true);
            /* sizes change with the responsive layout: rebuild the geometry, keep the growth stage */
            let rt; new ResizeObserver(() => { if (!st.built) return; clearTimeout(rt); rt = setTimeout(() => { if (ph.offsetWidth !== st.W || ph.offsetHeight !== st.H) rebuild(st); }, 150); }).observe(ph);
        });
    })();

