    /* Flower FX (b): scroll progress + growing vines */
    (function(){
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const NS = 'http://www.w3.org/2000/svg';
        const FLOWERS = [['fl-bloom','#f4a7bf','#f2c230'],['fl-daisy','#ffffff','#f2c230'],['fl-forsythia','#f2c230','#d99a12'],['fl-bloom','#b9a2de','#f2c230'],['fl-daisy','#b9a2de','#fbe7a1'],['fl-bloom','#f2c230','#e07fa3']];
        const rand = (a, b) => a + Math.random() * (b - a);
        /* (the old top-edge progress bar was retired: the sunflower in the corner is now the one scroll indicator) */
        function progress(){ const h = document.documentElement.scrollHeight - innerHeight; return h > 0 ? Math.min(1, scrollY / h) : 0; }

        const vines = [];
        function buildVine(side){
            const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('class', 'vine vine-' + side);
            document.body.insertBefore(svg, document.body.firstChild.nextSibling);
            vines.push({ svg, side, pf: 0, qf: 0, bonus: 0, bonusAt: 0 });
        }
        function layoutVines(){
            vines.forEach((v, vi) => {
                /* the svg is 90 units wide; on phones it is drawn narrower, so scale the viewBox height to keep it uniform */
                const svg = v.svg; svg.innerHTML = '';
                const k = (svg.clientWidth || 90) / 90, H = Math.max(innerHeight, svg.clientHeight || 0) / k;
                svg.setAttribute('viewBox', '0 0 90 ' + H.toFixed(1));
                const phase = vi ? Math.PI : 0, pts = [];
                /* the path hugs the inner side of the screen, far enough in that a flower grown to 1.9x on hover still clears the edge */
                const narrowVine = k < 0.6, cx = narrowVine ? (v.side === 'left' ? 46 : 44) : (v.side === 'left' ? 50 : 40), amp = narrowVine ? 12 : 20;
                for (let y = -10; y <= H + 10; y += 14) pts.push([cx + Math.sin(y / H * Math.PI * 4.2 + phase) * amp + Math.sin(y / 37) * (narrowVine ? 1.5 : 3), y]);
                const path = document.createElementNS(NS, 'path');
                path.setAttribute('d', 'M' + pts.map(p => p[0].toFixed(1) + ' ' + p[1]).join(' L'));
                path.setAttribute('class', 'vine-path');
                /* start fully hidden, with no transition: measuring the path below forces a style pass, and the
                   dash-offset transition would otherwise animate from "fully drawn" (the flash on page load) */
                svg.appendChild(path);
                const len = path.getTotalLength(); path.style.strokeDasharray = len; path.style.strokeDashoffset = len; v.path = path; v.len = len; v.items = [];
                let i = 0;
                for (let d = 50; d < len - 20; d += 46){
                    const pt = path.getPointAtLength(d), isFlower = i % 3 === 2 && pt.y > 78 + 8 / k && pt.y < H - 78 - 8 / k;
                    const g = document.createElementNS(NS, 'g'); g.setAttribute('transform', `translate(${pt.x},${pt.y})`);
                    const inner = document.createElementNS(NS, 'g'); inner.setAttribute('class', 'vine-item' + (isFlower ? ' spin' : ''));
                    const u = document.createElementNS(NS, 'use'); const f = FLOWERS[(i + vi * 2) % FLOWERS.length];
                    if (isFlower){ const s = rand(22, 32);
                        /* flowers sit right on the vine line: no loose stems hanging off it */
                        u.setAttribute('href', '#' + f[0]); u.setAttribute('x', -s / 2); u.setAttribute('y', -s / 2); u.setAttribute('width', s); u.setAttribute('height', s); inner.style.color = f[1]; inner.style.setProperty('--center', f[2]); }
                    else { const s = 15, dir = i % 2 ? 1 : -1; u.setAttribute('href', '#fl-leaf'); u.setAttribute('x', dir > 0 ? 0 : -s); u.setAttribute('y', -s); u.setAttribute('width', s); u.setAttribute('height', s); if (dir < 0) u.setAttribute('transform', `scale(-1,1) translate(${s},0)`); inner.style.color = i % 4 ? '#7fa65c' : '#a3c47f'; }
                    inner.dataset.d = d.toFixed(0); inner.appendChild(u); g.appendChild(inner); svg.appendChild(g); v.items.push({ el: inner, d, flower: isFlower, g, gv: -1, sv: -1, on: false }); i++;
                }
            });
            /* the sprigs a visitor has grown are redrawn first, then everything is painted at its current growth in one go */
            if (window.__onVineLayout) window.__onVineLayout();
            vines.forEach(renderVine); vineWake();
        }
        /* the vines wait below the hero: nothing at the top of the page; they begin as the About section
           comes up and reach the bottom of the screen at the end of the page */
        let aboutTop = -1;
        const measureAbout = () => { const a = document.getElementById('about'); aboutTop = a ? a.getBoundingClientRect().top + scrollY : 0; };
        addEventListener('load', measureAbout); addEventListener('resize', measureAbout);
        function vineProgress(){
            if (aboutTop < 0) measureAbout();
            const h = document.documentElement.scrollHeight - innerHeight, start = Math.max(0, aboutTop - innerHeight * 0.75);
            return h > start ? Math.max(0, Math.min(1, (scrollY - start) / (h - start))) : progress();
        }
        /* ---------------------------------------------------------------------------
           ONE growth system for scroll AND clicks.
             scrollGrowth   : how far the page has scrolled (0..1 of the vine)
             interactionBonus: extra growth earned by clicking (remembered, but only counts while the
                              visitor is near the spot where they clicked, so scrolling back up retreats it)
             visible growth = clamp(scrollGrowth + interactionBonus)
           Every leaf, bud, bloom and click-grown sprig derives its own 0..1 progress from that single
           visible growth, so nothing can be on screen without the vine that carries it.
           pf = where the drawn stem tip is; qf = where leaves/blooms are allowed to reach.
           On the way down they move together; on the way up qf retreats faster, so blooms close, then
           leaves soften, and only then does the stem pull back.
           --------------------------------------------------------------------------- */
        const clamp01 = x => x < 0 ? 0 : x > 1 ? 1 : x;
        const smooth = x => { x = clamp01(x); return x * x * (3 - 2 * x); };
        const range = (t, a, b) => smooth((t - a) / (b - a));
        window.__gm = { clamp01, smooth, range };
        function targetFrac(v, p){
            const base = p > 0 ? 0.04 + p * 0.96 : 0;
            const gate = smooth(p / 0.03) * smooth((p - (v.bonusAt - 0.22)) / 0.18);
            return Math.min(1, Math.max(base, (v.reach || 0) * gate));   /* a click sets how far the vine has grown; scrolling can carry it further */
        }
        const ITEM_SPAN = 55;   /* path units over which a leaf / flower finishes growing after the stem reaches it */
        function renderVine(v){
            if (!v.len) return;
            const shown = v.pf * v.len, q = v.qf * v.len;
            v.path.style.strokeDashoffset = v.len - shown;
            v.items.forEach(it => {
                const u = (q - it.d) / ITEM_SPAN; let g, st;
                if (it.flower){ st = range(u, 0, 0.4); g = 0.2 * clamp01((st - 0.5) * 2) + 0.8 * range(u, 0.3, 1); }
                else { st = 0; g = range(u, 0.05, 0.6); }
                if (it.sv !== st){ it.sv = st; if (it.flower) it.g.style.setProperty('--st', st.toFixed(3)); }
                if (it.gv !== g){ it.gv = g; it.el.style.setProperty('--g', g.toFixed(3)); }
                const on = g > 0.35;
                if (it.on !== on){ it.on = on; it.el.classList.toggle('on', on); if (!on) it.el.classList.remove('near'); }
            });
            /* the vine's click strip covers only the part of the vine that is drawn (plus a little past its tip) */
            const hit = v.hit || (v.hit = document.querySelector('.vine-hit.' + v.side));
            if (hit){ const hpx = shown > 1 ? innerHeight : 0;   /* once any vine shows, the whole gutter listens: a click below the tip grows it toward the click */ if (hit._h !== hpx){ hit._h = hpx; hit.style.height = hpx + 'px'; hit.style.display = hpx ? '' : 'none'; } }
            return window.__vineSprigs ? window.__vineSprigs(v.side, q, performance.now()) : false;
        }
        let raf = 0, last = 0;
        function tick(now){
            raf = 0; const dt = Math.min(0.1, (now - last) / 1000 || 0.016); last = now;
            const p = vineProgress(); let busy = false;
            vines.forEach(v => {
                if (!v.len) return;
                const t = targetFrac(v, p);
                v.pf += (t - v.pf) * (1 - Math.exp(-dt * (t > v.pf ? 9 : 4.5)));
                v.qf += (t - v.qf) * (1 - Math.exp(-dt * (t > v.qf ? 9 : 11)));
                if (Math.abs(t - v.pf) < 0.0003) v.pf = t;
                if (Math.abs(t - v.qf) < 0.0003) v.qf = t;
                if (v.qf > v.pf) v.qf = v.pf;
                if (renderVine(v) || v.pf !== t || v.qf !== t) busy = true;
            });
            if (window.__onVineTick) window.__onVineTick();
            if (busy) raf = requestAnimationFrame(tick);
        }
        function vineWake(){ if (!raf){ last = performance.now(); raf = requestAnimationFrame(tick); } }
        window.__vineUpdate = vineWake;
        window.__vineQ = side => { const v = vines.find(x => x.side === side); return v && v.len ? v.qf * v.len : 0; };
        /* a click earns the vine a little extra length beyond what scrolling shows */
        window.__vineBonus = (side, d) => {
            const v = vines.find(x => x.side === side); if (!v || !v.len) return;
            v.reach = Math.max(v.reach || 0, Math.min(1, d / v.len)); v.bonusAt = vineProgress(); vineWake();
        };
        if (!reduce){ buildVine('left'); buildVine('right'); }
        /* phones resize the viewport as the address bar shows/hides; only rebuild on a real layout change so grown sprigs stay put */
        let lastVW = 0, lastVH = 0;
        const relayout = () => { if (innerWidth === lastVW && Math.abs(innerHeight - lastVH) < 160) return; lastVW = innerWidth; lastVH = innerHeight; layoutVines(); };
        relayout(); addEventListener('resize', relayout);
        addEventListener('scroll', vineWake, { passive: true }); addEventListener('resize', vineWake); addEventListener('load', () => setTimeout(vineWake, 0));
    })();

