/* js/animals/vine-caterpillar.js
   Purpose : caterpillars that live on the side vines: a few at a time, crawling along the real vine path, resting, eyeing a bloom, leaning in to nibble it; a click/tap drops one off. They stop appearing once the chrysalis story has begun (WorldState.story).
   Owns    : the caterpillar list, claims, the crawl/eat/lean state machine, spawnCat and its scheduler (every 3.5-8 s, 70% when one is out); start() returns spawnCat (the ?v11debug `caterpillar`).
   Uses    : core.utils (rand), core.state (WorldState), plants.plants (SVG.caterpillar, added by the garden code), plants.vine-sprigs (VINE, vineShown, fadeSprout).
   Used by : legacy/140 calls start() (only when motion is allowed) at the spot the block ran.
   Mobile / reduced motion: unchanged: 2 caterpillars (1 per vine) under 1240 px, 3 (2 per vine) above; none under reduced motion (the caller skips it).
   Moved verbatim from legacy/140 (Migration Step 12e); behaviour, order and timing unchanged. */
MB.define('animals.vine-caterpillar', ['core.utils', 'core.state', 'plants.plants', 'plants.vine-sprigs'], function (utils, state, plants, sprigs) {
    'use strict';
    const { rand } = utils, WorldState = state.WorldState, { SVG } = plants, { VINE, vineShown, fadeSprout } = sprigs;

    function start() {
            /* Caterpillars live on the side vines: a few at a time (a small cap, spaced apart), each crawling along
               the real vine path at its own pace, resting now and then. Any bloom they pass may catch their eye: the
               caterpillar crawls up so its mouth reaches that one bloom, leans in, nibbles, and only that bloom goes.
               They show up as soon as a stretch of vine is drawn (no need for the whole vine), and stay inside the
               part of the vine that is on screen. A click/tap drops one off. Once the chrysalis story has begun
               (WorldState) they no longer appear. */
            const CAT_MAX = () => innerWidth < 1240 ? 2 : 3, CAT_PER_VINE = () => innerWidth < 1240 ? 1 : 2;
            const CAT_MOUTH = { x: 15.5, y: 5 };   /* the mouth, in px from the caterpillar's anchor on the vine (desktop size) */
            const cats = [], catClaims = new Set();
            let catRaf = 0, catLast = 0;
            const angDiff = a => { a %= 360; return a > 180 ? a - 360 : a < -180 ? a + 360 : a; };
            /* the path only runs downhill, so a binary search finds the path distance at a given screen height */
            const dAtScreenY = (v, top, py) => { let a = 0, b = v.len; for (let i = 0; i < 14; i++){ const m = (a + b) / 2; if (top + v.path.getPointAtLength(m).y * v.k < py) a = m; else b = m; } return a; };
            /* the stretch of vine a caterpillar may use: drawn so far, and on screen */
            const catSpan = v => { const top = v.svg.getBoundingClientRect().top; return { lo: dAtScreenY(v, top, 70), hi: Math.min(vineShown(v) - 8, dAtScreenY(v, top, innerHeight - 50)) }; };
            const pathPose = (v, d) => {
                const p = v.path.getPointAtLength(d), p0 = v.path.getPointAtLength(Math.max(0, d - 5)), p1 = v.path.getPointAtLength(Math.min(v.len, d + 5));
                return { x: p.x, y: p.y, a: Math.atan2(p1.y - p0.y, p1.x - p0.x) * 180 / Math.PI };
            };
            function catFlowers(v, span){
                const out = [], ok = b => b.width > 8 && b.top + b.height / 2 > 70 && b.top + b.height / 2 < innerHeight - 50;
                v.slots.forEach(s => { const sp = s.sp; if (!sp || sp.gone || sp.targeted) return;
                    sp.g.querySelectorAll('.sprout:not(.leafy):not(.bitten)').forEach(el => { if (catClaims.has(el)) return; const b = el.getBoundingClientRect();
                        if (ok(b)) out.push({ el, sp, kind: 'sprig', d: s.d, cx: b.left + b.width / 2, cy: b.top + b.height / 2, fr: Math.min(b.width, b.height) / 2 }); }); });
                v.svg.querySelectorAll('.vine-item.spin.on:not(.eaten)').forEach(el => { if (catClaims.has(el)) return; const b = el.getBoundingClientRect();
                    if (ok(b)) out.push({ el, kind: 'item', d: parseFloat(el.dataset.d), cx: b.left + b.width / 2, cy: b.top + b.height / 2, fr: Math.min(b.width, b.height) / 2 }); });
                return out.filter(f => f.d > span.lo - 10 && f.d < span.hi + 10);
            }
            /* where on the vine to stop (and how far to lean) so the mouth lands on the bloom, not beside it */
            function reachPose(c, f){
                const v = c.v, r = v.svg.getBoundingClientRect(), spread = (f.kind === 'sprig' ? 90 : 40) / v.k; let best = null;
                for (let d = Math.max(0, f.d - spread); d <= Math.min(v.len, f.d + spread); d += 2){
                    if ((d - c.d) * c.dir < -1) continue;   /* only places still ahead of it */
                    const P = pathPose(v, d), ax = r.left + P.x * v.k, ay = r.top + P.y * v.k, hdg = c.dir > 0 ? P.a : P.a + 180;
                    const mx = CAT_MOUTH.x * c.sc, my = (c.dir > 0 ? -CAT_MOUTH.y : CAT_MOUTH.y) * c.sc, vx = f.cx - ax, vy = f.cy - ay;
                    const lean = Math.max(-70, Math.min(70, angDiff(Math.atan2(vy, vx) * 180 / Math.PI - hdg - Math.atan2(my, mx) * 180 / Math.PI)));
                    const cost = Math.abs(Math.hypot(vx, vy) - (Math.hypot(mx, my) + f.fr * 0.4)) + Math.abs(lean) * 0.12;
                    if (!best || cost < best.cost) best = { d, lean, cost };
                }
                return best;
            }
            function catPlace(c){
                const r = c.v.svg.getBoundingClientRect(), P = pathPose(c.v, c.d);
                c.el.style.transform = `translate(${(r.left + P.x * c.v.k).toFixed(1)}px, ${(r.top + P.y * c.v.k).toFixed(1)}px) rotate(${((c.dir > 0 ? P.a : P.a + 180) + c.lean).toFixed(1)}deg)`;
            }
            function catRelease(c){
                if (!c.target) return;
                catClaims.delete(c.target.f.el); c.target.f.el.classList.remove('pecked'); c.target = null;
            }
            function catLeave(c, drop){
                if (c.state === 'gone' || c.state === 'drop') return;
                c.state = drop ? 'drop' : 'gone'; catRelease(c); c.el.classList.remove('eating', 'resting');
                const i = cats.indexOf(c); if (i >= 0) cats.splice(i, 1);
                if (drop) c.el.classList.add('drop'); else c.el.classList.remove('on');
                setTimeout(() => c.el.remove(), drop ? 900 : 700);
            }
            function catTurn(c, now){ catRelease(c); c.dir = -c.dir; c.el.classList.toggle('rev', c.dir < 0); c.restUntil = now + rand(500, 1400); }
            function catStartEat(c, now){
                const f = c.target.f, b = f.el.getBoundingClientRect(); f.cx = b.left + b.width / 2; f.cy = b.top + b.height / 2;
                const again = reachPose(c, f); c.leanTo = again ? again.lean : c.target.pose.lean;
                c.state = 'eat'; c.eatEnd = now + rand(2300, 3500); c.el.classList.add('eating'); f.el.classList.add('pecked');
            }
            function catFinishEat(c, now){
                const f = c.target.f; f.el.classList.remove('pecked'); catClaims.delete(f.el);
                if (f.kind === 'item'){ f.el.classList.add('eaten'); setTimeout(() => f.el.classList.remove('eaten'), rand(45000, 80000)); }
                else { f.el.classList.add('bitten'); setTimeout(() => { if (!f.sp.g.querySelector('.sprout:not(.leafy):not(.bitten)')) fadeSprout(f.sp, true); }, 700); }
                c.target = null; c.leanTo = 0; c.state = 'unlean'; c.el.classList.remove('eating'); c.restUntil = now + rand(900, 1800);
            }
            function stepCat(c, now, dt){
                let v = VINE[c.side];
                if (!v || !v.path.isConnected) return catLeave(c);
                if (v.path !== c.v.path){ c.d *= v.len / c.v.len; catRelease(c); c.v = v; c.sc = c.el.offsetWidth / 34; c.span = null; }   /* the layout changed: stay at the same spot along the vine */
                if (!c.span || now - c.spanAt > 250){ c.span = catSpan(v); c.spanAt = now; }
                const span = c.span;
                if (c.state === 'eat'){
                    c.lean += (c.leanTo - c.lean) * (1 - Math.exp(-dt * 9));
                    const f = c.target.f;
                    if (f.sp && f.sp.gone) { catRelease(c); c.state = 'unlean'; c.leanTo = 0; c.el.classList.remove('eating'); }
                    else if (now >= c.eatEnd) catFinishEat(c, now);
                    return catPlace(c);
                }
                if (c.state === 'unlean'){
                    c.lean += (0 - c.lean) * (1 - Math.exp(-dt * 10));
                    if (Math.abs(c.lean) < 0.5){ c.lean = 0; c.state = 'crawl'; }
                    return catPlace(c);
                }
                if (now > c.dieAt && !c.target) return catLeave(c);
                /* off the drawn / visible part of the vine (scrolled away, or the vine pulled back): head back, or go */
                const inside = c.d >= span.lo - 12 / v.k && c.d <= span.hi + 12 / v.k;
                if (span.hi - span.lo < 40 / v.k || !inside){
                    if (!c.outSince) c.outSince = now;
                    if (now - c.outSince > 2500 || span.hi - span.lo < 40 / v.k) return catLeave(c);
                    if (!c.target){ const want = c.d > span.hi ? -1 : 1; if (c.dir !== want){ c.dir = want; c.el.classList.toggle('rev', want < 0); } }
                } else c.outSince = 0;
                if (c.target){
                    const f = c.target.f;
                    if (!f.el.isConnected || (f.sp && f.sp.gone) || f.el.classList.contains('eaten') || f.el.classList.contains('bitten')) catRelease(c);
                }
                if (now < c.restUntil){ c.el.classList.add('resting'); return catPlace(c); }
                c.el.classList.remove('resting');
                /* sometimes a bloom catches its eye: pick one ahead, close enough to be worth the trip */
                if (!c.target && now >= c.lookAt){
                    c.lookAt = now + rand(900, 1800);
                    if (Math.random() < 0.6){
                        const list = catFlowers(v, span).filter(f => (f.d - c.d) * c.dir > 6 && Math.abs(f.d - c.d) * v.k < 320).sort((a, b) => Math.abs(a.d - c.d) - Math.abs(b.d - c.d));
                        for (const f of list){ const pose = reachPose(c, f); if (pose){ c.target = { f, pose }; catClaims.add(f.el); break; } }
                    }
                }
                /* never crawl into another caterpillar on the same vine: wait, and sometimes turn around */
                for (const o of cats){
                    const gap = (o.d - c.d) * c.dir * v.k;
                    if (o !== c && o.side === c.side && gap > 0 && gap < 46){ c.restUntil = now + rand(1200, 2800); if (Math.random() < 0.5) catTurn(c, now); return catPlace(c); }
                }
                c.d += c.speed * dt / v.k * c.dir; c.stretch -= c.speed * dt;
                if (c.target){
                    if ((c.target.pose.d - c.d) * c.dir <= 0.3){ c.d = c.target.pose.d; catStartEat(c, now); }
                } else {
                    if (c.d >= span.hi - 2 && c.dir > 0) catTurn(c, now);
                    else if (c.d <= span.lo + 2 && c.dir < 0) catTurn(c, now);
                }
                if (c.stretch <= 0){ c.restUntil = now + rand(700, 2200); c.stretch = rand(40, 120); if (!c.target && Math.random() < 0.12) catTurn(c, now); }
                c.d = Math.max(0, Math.min(v.len, c.d));
                catPlace(c);
            }
            function catTick(now){
                catRaf = 0; const dt = Math.min(0.1, (now - catLast) / 1000 || 0.016); catLast = now;
                cats.slice().forEach(c => { if (c.state !== 'gone' && c.state !== 'drop') stepCat(c, now, dt); });
                if (cats.length) catRaf = requestAnimationFrame(catTick);
            }
            function spawnCat(){
                if (document.hidden || cats.length >= CAT_MAX() || (WorldState.get().story || 0) > 0) return false;
                const opts = [];
                ['left', 'right'].forEach(side => { const v = VINE[side]; if (!v) return;
                    const n = cats.filter(c => c.side === side).length, span = catSpan(v);
                    if (n < CAT_PER_VINE() && span.hi - span.lo >= 70 / v.k) opts.push({ v, side, span, n, w: n + Math.random() * 0.9 }); });
                if (!opts.length) return false;
                const o = opts.sort((a, b) => a.w - b.w)[0], v = o.v; let d = -1;
                for (let i = 0; i < 12 && d < 0; i++){
                    const t = rand(o.span.lo + 6 / v.k, o.span.hi - 6 / v.k);
                    if (cats.every(c => c.side !== o.side || Math.abs(c.d - t) * v.k > 110)) d = t;
                }
                if (d < 0) return false;
                const el = document.createElement('div'); el.className = 'vine-cat'; el.setAttribute('role', 'button'); el.setAttribute('aria-label', 'Shoo the caterpillar');
                el.innerHTML = `<div class="vc-flip">${SVG.caterpillar}</div>`; document.body.appendChild(el);
                const dir = Math.random() < 0.5 ? 1 : -1, now = performance.now();
                const c = { el, v, side: o.side, d, dir, speed: rand(10, 19), sc: el.offsetWidth / 34, state: 'crawl', lean: 0, leanTo: 0, target: null, span: o.span, spanAt: now,
                    restUntil: now + rand(0, 1200), lookAt: now + rand(600, 2000), stretch: rand(40, 120), dieAt: now + rand(55000, 100000), outSince: 0 };
                el.classList.toggle('rev', dir < 0); cats.push(c); catPlace(c); requestAnimationFrame(() => el.classList.add('on'));
                el.addEventListener('click', e => {
                    e.stopPropagation(); if (c.state === 'drop') return;
                    if (c.target && c.target.f.el.isConnected){ const h = c.target.f.el; h.classList.add('grow'); setTimeout(() => h.classList.remove('grow'), 650); }
                    catLeave(c, true);
                });
                if (!catRaf){ catLast = performance.now(); catRaf = requestAnimationFrame(catTick); }
                return true;
            }
            const vineCaterpillar = spawnCat;
            (function catScheduler(){ setTimeout(() => { if (!cats.length || Math.random() < 0.7) spawnCat(); catScheduler(); }, rand(3500, 8000)); })();
            return vineCaterpillar;
    }

    return { start };
});
