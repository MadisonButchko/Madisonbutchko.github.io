/* =====================================================================
   Life: one director for every wandering creature. Only one moves at a
   time, so the page keeps returning to calm. A creature asks with
   claim(name, ms) before it sets off and calls release(name) when it has
   gone; `ms` is a safety limit in case it never reports back.
   ===================================================================== */
const Life = (() => {
    let who = null, until = 0, lastStart = -1e9, yieldFn = null;
    const free = () => !who || performance.now() > until;
    return {
        busy: () => !free(),
        /* force: take the stage regardless. 'preempt': take it only from a creature that offered to yield
           (background drifters pass onYield, and slip away when a creature with somewhere to be arrives) */
        claim(name, ms, force, onYield) {
            if (!free()) {
                if (force === 'preempt' && yieldFn) { const y = yieldFn; yieldFn = null; y(); }
                else if (force !== true) return false;
            }
            who = name; until = performance.now() + (ms || 15000); lastStart = performance.now(); yieldFn = onYield || null; return true;
        },
        release(name) { if (who === name) { who = null; until = 0; yieldFn = null; } },
        /* true when nothing has set off for `ms`: bigger events wait for a quiet stretch */
        calm: ms => free() && performance.now() - lastStart > ms
    };
})();
window.Life = Life;

/* The world's small memory (one localStorage key): how much has been explored, the caterpillar's story,
   the nest, dandelion seeds that took root, and the bouquet ribbon. Works without storage too. */
const WorldState = (() => {
    const KEY = 'mb-world-v1';
    let st = { explored: 0, story: 0, storyAt: 0, nest: 0, nestShown: 0, ribbon: '', sprouts: [], blownAt: 0 };
    try { Object.assign(st, JSON.parse(localStorage.getItem(KEY)) || {}); } catch (e) { }
    return { get: () => st, save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { } } };
})();

        const artworks = [
            {file:'mandala_passion.png',title:'Passion',category:'mandala'},{file:'mandala_multicolor.jpg',title:'Multicolor Mandala',category:'mandala'},{file:'mandala_bw.png',title:'Black & White',category:'mandala'},{file:'mandala.PNG',title:'Intricate Mandala',category:'mandala'},{file:'purplemandala.jpg',title:'Purple Mandala',category:'mandala'},{file:'mandala_blue.jpg',title:'Blue Mandala',category:'mandala'},{file:'mandala_green.jpg',title:'Teal Mandala',category:'mandala'},{file:'mandala_pink.jpg',title:'Pink Mandala',category:'mandala'},{file:'mandala_darkpink.jpg',title:'Hot Pink Mandala',category:'mandala'},{file:'mandala_orange.jpg',title:'Orange Mandala',category:'mandala'},{file:'mandala_yellow.jpg',title:'Yellow Mandala',category:'mandala'},{file:'mandala_circle.jpg',title:'Circle Mandala',category:'mandala'},{file:'mandala_w2.jpg',title:'Dual Mandala',category:'mandala'},
            {file:'Tulips.jpg',title:'Tulips',category:'digital'},{file:'Untitled_Artwork_27.jpg',title:'Sweet Treats',category:'digital'},{file:'Untitled_Artwork_26.jpg',title:'Kitty Loops',category:'digital'},{file:'cute_cat_ditigal_art.jpg',title:'Cereal-ously a Catch',category:'digital'},{file:'Untitled_Artwork_22.jpg',title:'Polaroid Cameras',category:'digital'},{file:'Untitled_Artwork_21.jpg',title:'Sunset Frame Purple',category:'digital'},{file:'Untitled_Artwork_20_copy.jpg',title:'Sunset Frame Warm',category:'digital'},{file:'Send_noods_2.jpg',title:'Send Noods',category:'digital'},{file:'Science_2.jpg',title:'Science Potions',category:'digital'},{file:'Roses.jpg',title:'Roses',category:'digital'},{file:'Little_prince_2.jpg',title:'Little Prince Rose',category:'digital'},{file:'Letter_2.jpg',title:'Flower Letter',category:'digital'},{file:'Gelato_.jpg',title:'Gelato at Yale',category:'digital'},{file:'Flower_Book_Open.jpg',title:'Flower Book',category:'digital'},{file:'Eggs_2.jpg',title:'Eggcellent',category:'digital'},{file:'Dog_hamburger_2.jpg',title:'Dog Burger',category:'digital'},{file:'Corgi__2.jpg',title:'Corgi Ice Cream',category:'digital'},{file:'Cinabunny_2.jpg',title:'Cinabunny',category:'digital'},{file:'Cat.jpg',title:'Reading Cat',category:'digital'},{file:'Cake.jpg',title:'Birthday Cake',category:'digital'},{file:'madeinchina.jpg',title:'Made in China',category:'digital'},
            {file:'calligraphy.jpg',title:'Kathleen',category:'calligraphy'},{file:'calligraphy1.jpg',title:'Maryam',category:'calligraphy'},{file:'calligraphy2.jpg',title:'Rise',category:'calligraphy'},{file:'calligraphy3.jpg',title:'Thank You',category:'calligraphy'},{file:'calligraphy4.jpg',title:'Mom Card',category:'calligraphy'},{file:'calligraphy5.jpg',title:'Thinking of You',category:'calligraphy'},{file:'calligraphy6.jpg',title:'Robin',category:'calligraphy'},{file:'card_mandala.jpg',title:'Mandala Card',category:'calligraphy'},{file:'card_flowers.jpg',title:'You Are Amazing',category:'calligraphy'},{file:'cards.jpg',title:'Handmade Cards',category:'calligraphy'},{file:'bday_card.jpg',title:'Birthday Card',category:'calligraphy'},
            {file:'face_full_of_stars.png',title:'Face Full of Stars',category:'fineart'},{file:'eyeswithcolors.jpg',title:'Colorful Eyes',category:'fineart'},{file:'peonies.png',title:'Peonies',category:'fineart'},{file:'mirror.jpg',title:'Broken Mirror',category:'fineart'},{file:'sunflowers.jpg',title:'Sunflowers',category:'fineart'},{file:'Reader.jpg',title:'The Reader',category:'fineart'},{file:'Books_Stacked.jpg',title:'Books Stacked',category:'fineart'},{file:'statueface.jpg',title:'Classical Statue',category:'fineart'},{file:'mybodyasnature.jpg',title:'My Body As Nature',category:'fineart'}
        ];
        
        let currentFilter='all';
        let currentLightboxIndex = 0;
        let filteredArtworks = artworks;
        
        /* buildCollage() is defined once, in the gallery script below (masonry, shuffle, preloading). */
        let buildCollage = () => {};
        
        /* open the lightbox on one exact artwork. Artworks are identified by file name (stable),
           so filters and shuffling can never send a click to the wrong piece. */
        function openArtwork(file){
            let i = filteredArtworks.findIndex(a => a.file === file);
            if (i < 0 && currentFilter !== 'all'){
                currentFilter = 'all';
                document.querySelectorAll('.gallery-modal-tab').forEach(t => t.classList.toggle('active', t.dataset.filter === 'all'));
                buildCollage(); i = filteredArtworks.findIndex(a => a.file === file);
            }
            if (i > -1) openLightbox(i);
        }
        function openLightbox(index){
            currentLightboxIndex = index;
            updateLightbox();
            document.getElementById('lightbox').classList.add('active');
        }
        
        /* updateLightbox() is defined once, in the gallery script below (thumbs, palette backdrop, preloading). */
        let updateLightbox = () => {};
        
        document.getElementById('lightboxClose').onclick=()=>document.getElementById('lightbox').classList.remove('active');
        document.getElementById('lightbox').onclick=e=>{if(e.target.id==='lightbox')document.getElementById('lightbox').classList.remove('active');};
        
        document.getElementById('lightboxPrev').onclick=(e)=>{
            e.stopPropagation();
            currentLightboxIndex = (currentLightboxIndex - 1 + filteredArtworks.length) % filteredArtworks.length;
            updateLightbox();
        };
        document.getElementById('lightboxNext').onclick=(e)=>{
            e.stopPropagation();
            currentLightboxIndex = (currentLightboxIndex + 1) % filteredArtworks.length;
            updateLightbox();
        };
        
        document.addEventListener('keydown', (e)=>{
            if(document.getElementById('lightbox').classList.contains('active')){
                if(e.key==='ArrowLeft') document.getElementById('lightboxPrev').click();
                if(e.key==='ArrowRight') document.getElementById('lightboxNext').click();
                if(e.key==='Escape') document.getElementById('lightbox').classList.remove('active');
            }
        });
        
        /* v10: Experience and Skills interactions live in explore.js (garden clusters, specimen cards, bouquet). */
        /* gallery preview: clicking a piece opens the gallery straight to that piece; clicking elsewhere just opens the gallery */
        document.querySelectorAll('#galleryPreview .preview-item img').forEach(img => {
            const file = img.getAttribute('src').replace(/^images\//, ''), art = artworks.find(a => a.file === file);
            if (!art) return;
            img.closest('.preview-item').dataset.art = file;
            if (!img.alt) img.alt = art.title;
        });
        document.getElementById('galleryPreview').onclick = e => {
            document.getElementById('galleryModal').classList.add('active'); document.body.style.overflow = 'hidden'; buildCollage();
            const it = e.target.closest('.preview-item[data-art]');
            if (it) openArtwork(it.dataset.art);
        };
        document.getElementById('galleryClose').onclick=()=>{document.getElementById('galleryModal').classList.remove('active');document.body.style.overflow='';};
        document.querySelectorAll('.gallery-modal-tab').forEach(t=>t.onclick=()=>{document.querySelectorAll('.gallery-modal-tab').forEach(x=>x.classList.remove('active'));t.classList.add('active');currentFilter=t.dataset.filter;buildCollage();});
        

        const rvIO=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');rvIO.unobserve(e.target);}}),{rootMargin:'0px 0px -60px 0px'});document.querySelectorAll('.reveal').forEach(e=>rvIO.observe(e));
        (()=>{const secs=[...document.querySelectorAll('section[id]')],links=[...document.querySelectorAll('.nav a')];let tk=false,cur='';addEventListener('scroll',()=>{if(tk)return;tk=true;requestAnimationFrame(()=>{tk=false;let c='about';for(const s of secs){if(s.id!=='home'&&scrollY>=s.offsetTop-200)c=s.id;}if(c===cur)return;cur=c;links.forEach(l=>{const on=l.getAttribute('href')==='#'+c;if(l.classList.contains('active')!==on)l.classList.toggle('active',on);});});},{passive:true});})();
        
        /* v10: in-page links and interest shortcuts are handled in explore.js */
        document.onkeydown=e=>{if(e.key==='Escape'){document.getElementById('galleryModal').classList.remove('active');document.getElementById('lightbox').classList.remove('active');document.body.style.overflow='';}};

    /* Drifting spring petals + click bursts */
    (function(){
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
    })();

    /* Flower FX: scroll stem, growing vines, butterfly, click blooms, photo pops */
    (function(){
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const NS = 'http://www.w3.org/2000/svg';
        const FLOWERS = [['fl-bloom','#f4a7bf','#f2c230'],['fl-daisy','#ffffff','#f2c230'],['fl-forsythia','#f2c230','#d99a12'],['fl-bloom','#b9a2de','#f2c230'],['fl-daisy','#b9a2de','#fbe7a1'],['fl-bloom','#f2c230','#e07fa3']];
        const pick = a => a[Math.floor(Math.random() * a.length)];
        const rand = (a, b) => a + Math.random() * (b - a);
        function flowerSVG(size, f){
            f = f || pick(FLOWERS);
            const svg = document.createElementNS(NS, 'svg');
            svg.setAttribute('class', 'fx-flower'); svg.setAttribute('viewBox', '-50 -50 100 100');
            svg.style.width = svg.style.height = size + 'px'; svg.style.color = f[1]; svg.style.setProperty('--center', f[2]);
            const u = document.createElementNS(NS, 'use'); u.setAttribute('href', '#' + f[0]); u.setAttribute('x', -50); u.setAttribute('y', -50); u.setAttribute('width', 100); u.setAttribute('height', 100);
            svg.appendChild(u); return svg;
        }

        /* (the old top-edge progress bar was retired: the sunflower in the corner is now the one scroll indicator) */
        function progress(){ const h = document.documentElement.scrollHeight - innerHeight; return h > 0 ? Math.min(1, scrollY / h) : 0; }

        /* --- name letters (hover wave) --- */
        document.querySelectorAll('.hero h1').forEach(h => {
            h.childNodes.forEach(n => {
                const wrap = (txt) => txt.split(/(\s+)/).map(w => /^\s+$/.test(w) || !w ? w : '<span class="word" style="display:inline-block;white-space:nowrap">' + w.split('').map(ch => '<span class="ltr">' + ch + '</span>').join('') + '</span>').join('');
                if (n.nodeType === 3 && n.textContent.trim()) { const sp = document.createElement('span'); sp.innerHTML = wrap(n.textContent); n.replaceWith(sp); }
                else if (n.nodeType === 1 && n.tagName === 'EM') { n.innerHTML = wrap(n.textContent); }
            });
            h.querySelectorAll('.ltr').forEach((l, k) => l.style.setProperty('--i', k));
            const em = h.querySelectorAll('em .ltr'), c0 = [194, 69, 126], c1 = [138, 99, 184];
            em.forEach((l, k) => { const t = em.length > 1 ? k / (em.length - 1) : 0; l.style.color = 'rgb(' + c0.map((v, j) => Math.round(v + (c1[j] - v) * t)).join(',') + ')'; });
        });

        /* --- growing vines --- */
        const vines = [];
        function buildVine(side){
            const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('class', 'vine vine-' + side);
            document.body.insertBefore(svg, document.body.firstChild.nextSibling);
            vines.push({ svg, side });
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
                path.style.transition = 'none'; path.style.strokeDasharray = '0 99999';
                svg.appendChild(path);
                const len = path.getTotalLength(); path.style.strokeDasharray = len; path.style.strokeDashoffset = len; v.path = path; v.len = len; v.items = [];
                let i = 0;
                for (let d = 50; d < len - 20; d += 46){
                    const pt = path.getPointAtLength(d), isFlower = i % 3 === 2;
                    const g = document.createElementNS(NS, 'g'); g.setAttribute('transform', `translate(${pt.x},${pt.y})`);
                    const inner = document.createElementNS(NS, 'g'); inner.setAttribute('class', 'vine-item' + (isFlower ? ' spin' : ''));
                    const u = document.createElementNS(NS, 'use'); const f = FLOWERS[(i + vi * 2) % FLOWERS.length];
                    if (isFlower){ const s = rand(22, 32); u.setAttribute('href', '#' + f[0]); u.setAttribute('x', -s / 2); u.setAttribute('y', -s / 2); u.setAttribute('width', s); u.setAttribute('height', s); inner.style.color = f[1]; inner.style.setProperty('--center', f[2]); }
                    else { const s = 15, dir = i % 2 ? 1 : -1; u.setAttribute('href', '#fl-leaf'); u.setAttribute('x', dir > 0 ? 0 : -s); u.setAttribute('y', -s); u.setAttribute('width', s); u.setAttribute('height', s); if (dir < 0) u.setAttribute('transform', `scale(-1,1) translate(${s},0)`); inner.style.color = i % 4 ? '#7fa65c' : '#a3c47f'; }
                    inner.dataset.d = d.toFixed(0); inner.appendChild(u); g.appendChild(inner); svg.appendChild(g); v.items.push({ el: inner, d }); i++;
                }
            });
            updateScroll();
            /* transitions come back only after the hidden starting state has been painted */
            requestAnimationFrame(() => requestAnimationFrame(() => vines.forEach(v => { if (v.path) v.path.style.transition = ''; })));
            if (window.__onVineLayout) window.__onVineLayout();
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
        function updateScroll(){
            const p = vineProgress();
            vines.forEach(v => {
                if (!v.len) return;
                const shown = Math.max(p > 0 ? v.len * (0.04 + p * 0.96) : 0, (window.__vineReach || {})[v.side] || 0);
                v.path.style.strokeDashoffset = v.len - shown;
                v.items.forEach(it => it.el.classList.toggle('on', it.d <= shown));
                /* the vine's click strip covers only the part of the vine that is drawn (plus a little past its tip),
                   so it never sits invisibly over the page edges or over flowers there */
                const hit = v.hit || (v.hit = document.querySelector('.vine-hit.' + v.side));
                if (hit){ const hpx = shown > 0 ? Math.min(innerHeight, Math.round(innerHeight * shown / v.len) + 40) : 0; if (hit._h !== hpx){ hit._h = hpx; hit.style.height = hpx + 'px'; hit.style.display = hpx ? '' : 'none'; } }
            });
        }
        window.__vineUpdate = () => updateScroll();
        if (!reduce){ buildVine('left'); buildVine('right'); }
        /* phones resize the viewport as the address bar shows/hides; only rebuild on a real layout change so grown sprigs stay put */
        let lastVW = 0, lastVH = 0;
        const relayout = () => { if (innerWidth === lastVW && Math.abs(innerHeight - lastVH) < 160) return; lastVW = innerWidth; lastVH = innerHeight; layoutVines(); };
        relayout(); addEventListener('resize', relayout);
        let vq = 0; addEventListener('scroll', () => { if (!vq) vq = requestAnimationFrame(() => { vq = 0; updateScroll(); }); }, { passive: true });

        if (reduce) return;

        /* --- click: a flower blooms where you click --- */
        let lastBloomClick = 0;
        addEventListener('click', e => {
            if (e.target.closest && e.target.closest('a, button, input, [role="button"], .g-stage, .g-row, .h-row, .mb-bouquet, .gallery-modal, .lightbox, .garden-bed, .nav, .fl-int, .w-piece')) return;
            /* rapid clicking: one burst at a time, so flowers never pile up */
            if (performance.now() - lastBloomClick < 280) return; lastBloomClick = performance.now();
            const n = 5;
            for (let k = 0; k < n; k++){
                const size = rand(26, 48), fl = flowerSVG(size), ang = (k / n) * Math.PI * 2 + rand(-0.3, 0.3), dist = rand(60, 140);
                fl.style.left = (e.clientX - size / 2) + 'px'; fl.style.top = (e.clientY - size / 2) + 'px';
                document.body.appendChild(fl);
                const dx = Math.cos(ang) * dist, dy = Math.sin(ang) * dist, spin = rand(-260, 260);
                fl.animate([
                    { transform: 'translate(0,0) scale(0) rotate(0deg)', opacity: 1 },
                    { transform: `translate(${dx * 0.75}px, ${dy * 0.75}px) scale(1.1) rotate(${spin * 0.6}deg)`, opacity: 1, offset: 0.45 },
                    { transform: `translate(${dx}px, ${dy + 40}px) scale(0.5) rotate(${spin}deg)`, opacity: 0 }
                ], { duration: rand(1100, 1600), easing: 'cubic-bezier(0.22, 1, 0.36, 1)', delay: k * 12 }).onfinish = () => fl.remove();
            }
            const core = flowerSVG(56); core.style.left = (e.clientX - 28) + 'px'; core.style.top = (e.clientY - 28) + 'px'; document.body.appendChild(core);
            core.animate([{ transform: 'scale(0) rotate(-120deg)', opacity: 1 }, { transform: 'scale(1.2) rotate(0deg)', opacity: 1, offset: 0.4 }, { transform: 'scale(0.8) rotate(40deg)', opacity: 0 }], { duration: 1000, easing: 'cubic-bezier(0.34,1.56,0.64,1)' }).onfinish = () => core.remove();
        });

        /* --- photos: little flowers pop out on hover --- */
        document.querySelectorAll('.profile-photo, .about-photo, .contact-photo, .preview-item').forEach(ph => {
            let last = 0;
            ph.addEventListener('mouseenter', () => {
                const now = Date.now(); if (now - last < 900) return; last = now;
                const r = ph.getBoundingClientRect(), n = ph.classList.contains('preview-item') ? 3 : 6;
                for (let i = 0; i < n; i++){
                    const size = rand(16, 28), fl = flowerSVG(size);
                    const edge = Math.floor(Math.random() * 4);
                    let x = edge % 2 ? (edge === 1 ? r.right : r.left) : rand(r.left, r.right);
                    let y = edge % 2 ? rand(r.top, r.bottom) : (edge === 0 ? r.top : r.bottom);
                    const dx = (x - (r.left + r.width / 2)) * 0.25 + rand(-20, 20), dy = (y - (r.top + r.height / 2)) * 0.25 + rand(-30, 10);
                    fl.style.left = (x - size / 2) + 'px'; fl.style.top = (y - size / 2) + 'px'; document.body.appendChild(fl);
                    fl.animate([{ transform: 'translate(0,0) scale(0) rotate(0deg)', opacity: 1 }, { transform: `translate(${dx * 0.7}px,${dy * 0.7}px) scale(1) rotate(160deg)`, opacity: 1, offset: 0.5 }, { transform: `translate(${dx}px,${dy - 25}px) scale(0.4) rotate(280deg)`, opacity: 0 }],
                        { duration: rand(1000, 1500), delay: i * 60, easing: 'cubic-bezier(0.22,1,0.36,1)', fill: 'backwards' }).onfinish = () => fl.remove();
                }
            });
        });

        /* --- a butterfly drifts across now and then --- */
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

    /* word-by-word About text with highlighted keywords */
    (function(){
        const KW = { physics:'kw-physics', writing:'kw-writing', teaching:'kw-teaching', art:'kw-art', curiosity:'kw-curiosity', creation:'kw-creation' };
        document.querySelectorAll('.about-text').forEach(p => {
            let i = 0;
            p.innerHTML = p.textContent.trim().split(/\s+/).map(word => {
                const key = word.toLowerCase().replace(/[^a-z]/g, '');
                const m = word.match(/^(.*?)([.,:;!?]*)$/);
                const cls = KW[key];
                const html = cls ? '<span class="w kw ' + cls + '" style="--i:' + i + '">' + m[1] + '</span>' + (m[2] ? '<span class="w" style="--i:' + i + '">' + m[2] + '</span>' : '') : '<span class="w" style="--i:' + i + '">' + word + '</span>';
                i++; return html;
            }).join(' ');
        });
    })();

    /* Hero v3: role rotator, photo fan shuffle, cursor glow */
    (function(){
        const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
        const words = [...document.querySelectorAll('.rot-word')]; let i = 0;
        const rot = document.querySelector('.rotator');
        const fit = () => { if (rot) rot.style.width = words[i].offsetWidth + 'px'; };
        fit(); addEventListener('resize', fit); document.fonts && document.fonts.ready.then(fit);
        setInterval(() => {
            const cur = words[i]; i = (i + 1) % words.length; const nxt = words[i];
            cur.classList.remove('is-on'); cur.classList.add('is-out');
            nxt.classList.remove('is-out'); nxt.classList.add('is-on'); fit();
            setTimeout(() => cur.classList.remove('is-out'), 650);
        }, 3400);

        const cards = [...document.querySelectorAll('.fan-card')], dots = [...document.querySelectorAll('.fan-dots button')];
        const col = document.getElementById('collage'), hero = document.querySelector('.hero');
        let front = 0, hovering = false;
        function bringFront(k){
            front = k;
            cards.forEach((c, idx) => c.dataset.slot = (idx - k + cards.length) % cards.length);
            dots.forEach((d, idx) => d.classList.toggle('on', idx === k));
        }
        cards.forEach((c, idx) => c.addEventListener('click', () => { if (c.dataset.slot !== '0') bringFront(idx); }));
        dots.forEach((d, idx) => d.addEventListener('click', () => bringFront(idx)));
        col.addEventListener('mouseenter', () => hovering = true);
        col.addEventListener('mouseleave', () => hovering = false);

        if (reduce) return;
        hero.addEventListener('mousemove', e => {
            const r = hero.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
            col.style.transform = `translate(${(x - 0.5) * 18}px, ${(y - 0.5) * 14}px)`;
        });
        hero.addEventListener('mouseleave', () => { col.style.transform = ''; });
    })();

    /* FX v2: animated titles, gallery upgrades, cursor ring, magnetic hovers */
    (function(){
        const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
        const NS = 'http://www.w3.org/2000/svg';

        /* gradient for squiggles */
        const defs = document.querySelector('svg defs');
        if (defs){ const g = document.createElementNS(NS, 'linearGradient'); g.id = 'squiggleGrad'; [['0%','#f2c230'],['50%','#e07fa3'],['100%','#9d7fd0']].forEach(([o,c]) => { const st = document.createElementNS(NS, 'stop'); st.setAttribute('offset', o); st.setAttribute('stop-color', c); g.appendChild(st); }); defs.appendChild(g); }
        function squiggle(){ const s = document.createElementNS(NS, 'svg'); s.setAttribute('class', 't-squiggle'); s.setAttribute('viewBox', '0 0 200 14'); s.setAttribute('preserveAspectRatio', 'none'); s.setAttribute('aria-hidden', 'true'); const p = document.createElementNS(NS, 'path'); p.setAttribute('d', 'M3 8 C 20 2, 35 13, 52 7 S 85 2, 102 8 S 135 13, 152 7 S 185 2, 197 7'); s.appendChild(p); return s; }

        /* split section titles into letters */
        let n = 0;
        document.querySelectorAll('.section-title, .contact-title').forEach(t => {
            n = 0;
            const walk = el => [...el.childNodes].forEach(node => {
                if (node.nodeType === 3){
                    const frag = document.createDocumentFragment();
                    node.textContent.split(/(\s+)/).forEach(w => {
                        if (!w) return;
                        if (/^\s+$/.test(w)) { frag.appendChild(document.createTextNode(' ')); return; }
                        const word = document.createElement('span'); word.className = 't-word';
                        [...w].forEach(ch => { const c = document.createElement('span'); c.className = 't-ch'; c.textContent = ch; c.style.setProperty('--i', n++); word.appendChild(c); });
                        frag.appendChild(word);
                    });
                    node.replaceWith(frag);
                } else if (node.nodeType === 1) walk(node);
            });
            walk(t);
            t.setAttribute('aria-label', t.textContent);
            t.appendChild(squiggle());
        });
        const hello = document.querySelector('.about-hello .hello-ink'); if (hello){ hello.style.position = 'relative'; hello.parentElement.style.position = 'relative'; hello.appendChild(squiggle()); hello.querySelector('.t-squiggle').style.cssText = 'left:0;translate:0 0;width:100%;bottom:-0.1em'; }

        /* gallery preview: stagger index + tilt */
        const prev = document.getElementById('galleryPreview');
        if (prev){
            prev.querySelectorAll('.preview-item').forEach((it, k) => {
                it.style.setProperty('--i', k);
                it.addEventListener('mousemove', e => { const r = it.getBoundingClientRect(), fx = (e.clientX - r.left) / r.width - 0.5, fy = (e.clientY - r.top) / r.height - 0.5; it.style.setProperty('--rx', fx * 16 + 'deg'); it.style.setProperty('--ry', -fy * 16 + 'deg'); it.style.setProperty('--px', (-fx * 14).toFixed(1) + 'px'); it.style.setProperty('--py', (-fy * 14).toFixed(1) + 'px'); });
                it.addEventListener('mouseleave', () => { ['--rx', '--ry', '--px', '--py'].forEach(v => it.style.removeProperty(v)); });
            });
        }

        /* gallery modal: counts + surprise + masonry build */
        if (typeof artworks !== 'undefined'){
            document.querySelectorAll('.gallery-modal-tab').forEach(t => {
                const f = t.dataset.filter, c = f === 'all' ? artworks.length : artworks.filter(a => a.category === f).length;
                const b = document.createElement('span'); b.className = 'tab-count'; b.textContent = c; t.appendChild(b);
            });
            const tabs = document.querySelector('.gallery-modal-tabs');
            const ICON_FL = '<svg class="tiny-fl" viewBox="-50 -50 100 100" aria-hidden="true"><use href="#fl-bloom" x="-50" y="-50" width="100" height="100"/></svg>';
            const ICON_PLAY = '<svg class="ic" viewBox="0 0 10 10" aria-hidden="true"><path d="M2.5 1.2 L8.8 5 L2.5 8.8Z" fill="currentColor"/></svg>';
            const ICON_PAUSE = '<svg class="ic" viewBox="0 0 10 10" aria-hidden="true"><rect x="2" y="1.5" width="2.2" height="7" rx=".6" fill="currentColor"/><rect x="5.8" y="1.5" width="2.2" height="7" rx=".6" fill="currentColor"/></svg>';
            const sb = document.createElement('button'); sb.className = 'surprise-btn'; sb.innerHTML = '<span class="sp">' + ICON_FL + '</span> Surprise me';
            sb.onclick = () => openLightbox(Math.floor(Math.random() * filteredArtworks.length)); tabs.appendChild(sb);
            const ICON_SHUFFLE = '<svg class="ic" viewBox="0 0 16 16" aria-hidden="true"><path d="M1 4h3c3 0 4 8 7 8h3M12 10l2 2-2 2M1 12h3c1.3 0 2.2-1.4 3-3M9 7c.8-1.6 1.7-3 3-3h2M12 2l2 2-2 2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
            let artView = null;
            const sh = document.createElement('button'); sh.className = 'surprise-btn shuffle-btn'; sh.innerHTML = '<span class="sp">' + ICON_SHUFFLE + '</span> Shuffle';
            sh.onclick = () => {
                const a = [...artworks]; for (let i = a.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
                artView = a; sh.classList.remove('spin'); void sh.offsetWidth; sh.classList.add('spin'); buildCollage();
            };
            tabs.appendChild(sh);

            /* image preloading: decode before showing so swaps are instant */
            const ready = new Set(), pending = new Map(), palette = new Map();
            /* two soft colors from each artwork (one from each half), made a little more vivid */
            function artPalette(im){
                try {
                    const N = 24, c = document.createElement('canvas'); c.width = c.height = N;
                    const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(im, 0, 0, N, N);
                    const d = x.getImageData(0, 0, N, N).data, A = [0, 0, 0, 0], B = [0, 0, 0, 0];
                    for (let i = 0; i < d.length; i += 4){
                        const k = i / 4, px = k % N, py = (k / N) | 0, mx = Math.max(d[i], d[i + 1], d[i + 2]), mn = Math.min(d[i], d[i + 1], d[i + 2]);
                        const w = 0.12 + (mx - mn) / 255, T = px + py < N ? A : B;
                        T[0] += d[i] * w; T[1] += d[i + 1] * w; T[2] += d[i + 2] * w; T[3] += w;
                    }
                    const fin = T => { let r = T[0] / T[3], g = T[1] / T[3], b = T[2] / T[3]; const av = (r + g + b) / 3, cl = v => Math.max(0, Math.min(255, Math.round(v))); return `rgb(${cl(av + (r - av) * 1.7)}, ${cl(av + (g - av) * 1.7)}, ${cl(av + (b - av) * 1.7)})`; };
                    return [fin(A), fin(B)];
                } catch (e){ return null; }
            }
            function preload(file){
                if (ready.has(file)) return Promise.resolve();
                if (pending.has(file)) return pending.get(file);
                const im = new Image(); im.decoding = 'async'; im.src = 'images/' + file;
                const pr = (im.decode ? im.decode() : new Promise((res, rej) => { im.onload = res; im.onerror = rej; }))
                    .catch(() => {}).then(() => { ready.add(file); pending.delete(file); if (!palette.has(file) && im.naturalWidth) palette.set(file, artPalette(im)); });
                pending.set(file, pr); return pr;
            }

            buildCollage = function(){
                const g = document.getElementById('galleryCollage'); g.innerHTML = '';
                const base = artView || artworks; filteredArtworks = currentFilter === 'all' ? base : base.filter(a => a.category === currentFilter);
                const d = document.createElement('div'); d.className = 'collage-grid';
                filteredArtworks.forEach((a, i) => {
                    const item = document.createElement('div'); item.className = 'collage-item'; item.style.setProperty('--i', Math.min(i, 30));
                    item.innerHTML = '<img loading="lazy" decoding="async" src="images/' + a.file + '" alt="' + a.title + '"><div class="collage-item-title">' + a.title + '</div>';
                    item.addEventListener('pointerenter', () => preload(a.file), { once: true });
                    item.addEventListener('pointerdown', () => preload(a.file), { once: true });
                    item.onclick = () => openArtwork(a.file); d.appendChild(item);
                });
                g.appendChild(d); g.scrollTop = 0;
            };

            /* lightbox extras */
            const lb = document.getElementById('lightbox'), img = document.getElementById('lightboxImg');
            img.decoding = 'async';
            /* one ambient backdrop: two image layers (crossfaded) + a color wash from artPalette() */
            let back = lb.querySelector('.lb-backdrop');
            if (!back){
                back = document.createElement('div'); back.className = 'lb-backdrop'; back.setAttribute('aria-hidden', 'true');
                back.innerHTML = '<div class="lb-backdrop-image"></div><div class="lb-backdrop-image"></div><div class="lb-backdrop-colors"></div>';
                lb.prepend(back);
            }
            const bgLayers = [...back.querySelectorAll('.lb-backdrop-image')]; let bgFront = 0, bgFile = null;
            /* the whole lightbox washes into the artwork's own colors (gradients only, so it stays smooth) */
            function setBackdrop(file){
                const colors = palette.get(file);
                /* no palette (e.g. canvas blocked when opened from file://): clear the wash so the previous piece's colors never linger */
                lb.style.setProperty('--art1', colors ? colors[0] : 'rgba(46, 34, 54, 0)');
                lb.style.setProperty('--art2', colors ? colors[1] : 'rgba(46, 34, 54, 0)');
                if (file === bgFile) return;
                bgFile = file; bgFront = 1 - bgFront;
                const on = bgLayers[bgFront], off = bgLayers[1 - bgFront];
                on.style.backgroundImage = 'url("images/' + file + '")';
                on.classList.add('on'); off.classList.remove('on');
            }
            const thumbs = document.createElement('div'); thumbs.className = 'lb-thumbs'; lb.appendChild(thumbs);
            const play = document.createElement('button'); play.className = 'lb-play'; play.innerHTML = ICON_PLAY + ' Slideshow'; lb.appendChild(play);
            const prog = document.createElement('div'); prog.className = 'lb-progress'; lb.appendChild(prog);
            let lastIdx = 0, playing = null, thumbsFor = null, req = 0;
            const CAT = { mandala: 'Mandala', digital: 'Digital Art', calligraphy: 'Calligraphy', fineart: 'Fine Art' };
            function buildThumbs(){
                if (thumbsFor === filteredArtworks) return; thumbsFor = filteredArtworks; thumbs.innerHTML = '';
                filteredArtworks.forEach((a, k) => { const t = document.createElement('img'); t.src = 'images/' + a.file; t.alt = ''; t.loading = 'lazy'; t.decoding = 'async'; t.onclick = e => { e.stopPropagation(); currentLightboxIndex = k; updateLightbox(); }; thumbs.appendChild(t); });
            }
            updateLightbox = function(){
                buildThumbs();
                const idx = currentLightboxIndex, a = filteredArtworks[idx], open = lb.classList.contains('active'), my = ++req;
                document.getElementById('lightboxTitle').textContent = a.title;
                document.getElementById('lightboxCat').textContent = CAT[a.category] || a.category;
                document.getElementById('lightboxCounter').textContent = (idx + 1) + ' / ' + filteredArtworks.length;
                [...thumbs.children].forEach((t, k) => t.classList.toggle('on', k === idx));
                const on = thumbs.children[idx]; if (on) on.scrollIntoView({ inline: 'center', block: 'nearest', behavior: open ? 'smooth' : 'auto' });
                img.classList.remove('zoomed');
                const cached = ready.has(a.file);
                if (open) img.classList.add(idx >= lastIdx ? 'swap-r' : 'swap-l');
                else if (!cached) img.classList.add('loading');
                lastIdx = idx;
                const show = () => {
                    if (my !== req) return;
                    img.src = 'images/' + a.file; img.alt = a.title; setBackdrop(a.file);
                    requestAnimationFrame(() => img.classList.remove('swap-l', 'swap-r', 'loading'));
                };
                if (cached && !open) show();
                else Promise.all([preload(a.file), new Promise(r => setTimeout(r, open ? 140 : 0))]).then(show);
                const n = filteredArtworks.length;
                [1, -1, 2].forEach(k => preload(filteredArtworks[(idx + k + n) % n].file));
                if (playing){ prog.classList.remove('run'); void prog.offsetWidth; prog.classList.add('run'); }
            };
            function stopPlay(){ clearInterval(playing); playing = null; play.innerHTML = ICON_PLAY + ' Slideshow'; prog.classList.remove('run'); }
            play.onclick = e => {
                e.stopPropagation();
                if (playing) return stopPlay();
                play.innerHTML = ICON_PAUSE + ' Pause';
                playing = setInterval(() => { currentLightboxIndex = (currentLightboxIndex + 1) % filteredArtworks.length; updateLightbox(); }, 3200);
                prog.classList.add('run');
            };
            new MutationObserver(() => { if (!lb.classList.contains('active')) stopPlay(); }).observe(lb, { attributes: true, attributeFilter: ['class'] });
            img.addEventListener('click', e => {
                e.stopPropagation();
                const r = img.getBoundingClientRect();
                img.style.setProperty('--ox', ((e.clientX - r.left) / r.width * 100) + '%'); img.style.setProperty('--oy', ((e.clientY - r.top) / r.height * 100) + '%');
                img.classList.toggle('zoomed');
            });
            img.addEventListener('mousemove', e => { if (!img.classList.contains('zoomed')) return; const r = img.getBoundingClientRect(); img.style.setProperty('--ox', ((e.clientX - r.left) / r.width * 100) + '%'); img.style.setProperty('--oy', ((e.clientY - r.top) / r.height * 100) + '%'); });
            let sx = null;
            lb.addEventListener('touchstart', e => { sx = e.touches[0].clientX; }, { passive: true });
            lb.addEventListener('touchend', e => { if (sx === null) return; const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 50) document.getElementById(dx < 0 ? 'lightboxNext' : 'lightboxPrev').click(); sx = null; });
        }

        if (reduce) return;

        /* hero photos: keep rotating naturally (pause briefly only after a click) */
        const cards = [...document.querySelectorAll('.fan-card')];
        if (cards.length){
            let hold = 0;
            cards.forEach(c => c.addEventListener('click', () => hold = Date.now()));
            document.querySelectorAll('.fan-dots button').forEach(d => d.addEventListener('click', () => hold = Date.now()));
            setInterval(() => {
                if (document.hidden || Date.now() - hold < 6000 || document.querySelector('.fan-card:hover')) return;
                const front = cards.findIndex(c => c.dataset.slot === '0');
                const next = cards[(front + 1) % cards.length];
                if (next) next.click(), hold = 0;
            }, 6000);
        }

    })();

    /* FX v3: rainbow cursor glow, butterfly cursor with flight path, text hover settle */
    (function(){
        const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
        const HC = ['#c2457e', '#8a63b8', '#4f7a34', '#c98a06', '#d96b93', '#3f8fb0'];

        /* letters/words settle after their entrance so hover only recolors */
        document.querySelectorAll('.section-title, .contact-title').forEach(t => {
            t.querySelectorAll('.t-ch').forEach((c, k) => c.style.setProperty('--hc', HC[k % HC.length]));
            const host = t.closest('.reveal'), total = t.querySelectorAll('.t-ch').length;
            const settle = () => setTimeout(() => t.classList.add('t-done'), total * 45 + 1100);
            if (!host || host.classList.contains('visible')) return settle();
            new MutationObserver((m, o) => { if (host.classList.contains('visible')) { o.disconnect(); settle(); } }).observe(host, { attributes: true, attributeFilter: ['class'] });
        });
        document.querySelectorAll('.about-text').forEach(p => {
            const ws = p.querySelectorAll('.w'); ws.forEach((w, k) => w.style.setProperty('--hc', HC[k % HC.length]));
            const host = p.closest('.reveal');
            const settle = () => setTimeout(() => p.classList.add('done'), ws.length * 28 + 2600);
            if (!host || host.classList.contains('visible')) return settle();
            new MutationObserver((m, o) => { if (host.classList.contains('visible')) { o.disconnect(); settle(); } }).observe(host, { attributes: true, attributeFilter: ['class'] });
        });
        if (reduce) return;

        /* rainbow glow that follows the cursor everywhere (moved with transforms = smooth) */
        const glow = document.createElement('div'); glow.className = 'rainbow-glow'; glow.innerHTML = '<i></i>'; document.body.insertBefore(glow, document.body.firstChild);
        let gx = innerWidth / 2, gy = innerHeight / 2, tgx = gx, tgy = gy, gRun = false;
        function gLoop(){ gx += (tgx - gx) * 0.18; gy += (tgy - gy) * 0.18; glow.style.transform = `translate3d(${gx - 300}px, ${gy - 300}px, 0)`; if (Math.abs(tgx - gx) + Math.abs(tgy - gy) > 0.5) requestAnimationFrame(gLoop); else gRun = false; }
        addEventListener('pointermove', e => { tgx = e.clientX; tgy = e.clientY; glow.classList.add('on'); if (!gRun){ gRun = true; requestAnimationFrame(gLoop); } }, { passive: true });
        document.addEventListener('mouseleave', () => glow.classList.remove('on'));

        /* butterfly cursor (mouse / trackpad only) */
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

    /* Gallery v3: rainbow frame around the preview */
    (function(){
        /* rainbow frame around the preview + hint */
        const prev = document.getElementById('galleryPreview'), sec = document.getElementById('gallery');
        if (prev && !prev.parentElement.classList.contains('gallery-frame')){
            const fr = document.createElement('div'); fr.className = 'gallery-frame'; prev.parentNode.insertBefore(fr, prev); fr.appendChild(prev);
        }
    })();

    /* v4: seamless background layers, nav pill, circle stagger + ripple, back-to-top */
    (function(){
        const bg = document.createElement('div'); bg.className = 'page-bg'; bg.setAttribute('aria-hidden', 'true');
        const amb = document.createElement('div'); amb.className = 'ambient'; amb.setAttribute('aria-hidden', 'true'); amb.innerHTML = '<span></span><span></span><span></span><span></span>';
        document.body.prepend(amb); document.body.prepend(bg);

        /* sliding nav pill */
        const nav = document.querySelector('.nav');
        if (nav){
            const pill = document.createElement('span'); pill.className = 'nav-pill'; nav.prepend(pill);
            const place = () => { const a = nav.querySelector('a.active') || nav.querySelector('a'); pill.style.left = a.offsetLeft + 'px'; pill.style.width = a.offsetWidth + 'px'; };
            place(); new MutationObserver(place).observe(nav, { subtree: true, attributes: true, attributeFilter: ['class'] }); addEventListener('resize', place);
            document.fonts && document.fonts.ready.then(place);
        }

        /* scroll indicator + back to top: a sunflower on its own little pad. At the top of the page it is a small
           closed bud; as you scroll the stem grows, leaves unfurl and the petals open ring by ring; at the bottom it
           is in full bloom. It follows scroll progress (0..1) both ways, eased so it grows and retreats smoothly. */
        const tt = document.createElement('button'); tt.type = 'button'; tt.className = 'to-top'; tt.setAttribute('aria-label', 'Back to top');
        const PET = 'M0 0 C-4.6 -6 -4.2 -15.5 0 -22 C4.2 -15.5 4.6 -6 0 0Z', BRACT = 'M0 0 C-3 -4 -2.6 -9 0 -12 C2.6 -9 3 -4 0 0Z';
        let bracts = '', back = '', front = '', seeds = '';
        for (let k = 0; k < 9; k++) bracts += `<path class="sf-bract" d="${BRACT}" fill="${k % 2 ? '#7fa65c' : '#8db36a'}"/>`;
        for (let k = 0; k < 13; k++) back += `<path class="sf-pet" d="${PET}" fill="#f2b51f"/>`;
        for (let k = 0; k < 13; k++) front += `<path class="sf-pet" d="${PET}" fill="${k % 2 ? '#ffd447' : '#ffcd2e'}"/>`;
        for (let r = 1; r <= 3; r++) for (let k = 0; k < r * 6; k++){ const a = k / (r * 6) * Math.PI * 2 + r, d = r * 2.7; seeds += `<circle cx="${(Math.cos(a) * d).toFixed(1)}" cy="${(Math.sin(a) * d).toFixed(1)}" r="0.9"/>`; }
        tt.innerHTML = '<span class="tt-tip" aria-hidden="true">back to top</span><svg viewBox="0 0 80 134" aria-hidden="true">'
            + '<path class="tt-arrow" d="M33 12 L40 5 L47 12"/>'
            + '<g class="sf-pot"><ellipse cx="40" cy="131.5" rx="21" ry="2.6" fill="rgba(90,60,40,.16)"/>'
            + '<path d="M25.5 112 L54.5 112 L51 128 Q50.4 131 47.5 131 L32.5 131 Q29.6 131 29 128 Z" fill="#d9825a" stroke="#b9623c" stroke-width="1.2" stroke-linejoin="round"/>'
            + '<path d="M29.5 116 L33 128.5" stroke="#f0a780" stroke-width="2.2" stroke-linecap="round" opacity=".7"/>'
            + '<rect x="21.5" y="104" width="37" height="9.5" rx="4.2" fill="#e8946b" stroke="#b9623c" stroke-width="1.2"/>'
            + '<path d="M26 107 H40" stroke="#f6b995" stroke-width="1.8" stroke-linecap="round" opacity=".8"/>'
            + '<circle cx="35" cy="121" r="1.4" fill="#5a3a2a"/><circle cx="45" cy="121" r="1.4" fill="#5a3a2a"/><path d="M37.6 123.6 Q40 126 42.4 123.6" stroke="#5a3a2a" stroke-width="1.2" fill="none" stroke-linecap="round"/>'
            + '<ellipse cx="31.6" cy="124" rx="2.3" ry="1.5" fill="#f4a7bf" opacity=".85"/><ellipse cx="48.4" cy="124" rx="2.3" ry="1.5" fill="#f4a7bf" opacity=".85"/>'
            + '<ellipse cx="40" cy="104.6" rx="16" ry="3.2" fill="#6b4a33"/><ellipse cx="35" cy="104.2" rx="4" ry="1" fill="#85603f"/></g>'
            + '<path class="sf-stem" d="M40 106 C35 92 45 80 40 63 C37 51 41 44 40 34" pathLength="1"/>'
            + '<g class="sf-leaf l1"><path d="M0 0 C6 -9 17 -10 23 -4 C16 3 6 4 0 0Z" fill="#8db36a"/><path d="M1 0 C8 -3 15 -4 21 -4" stroke="#6e9a4c" stroke-width=".9" fill="none"/></g>'
            + '<g class="sf-leaf l2"><path d="M0 0 C-6 -9 -17 -10 -23 -4 C-16 3 -6 4 0 0Z" fill="#7fa65c"/><path d="M-1 0 C-8 -3 -15 -4 -21 -4" stroke="#5f8a40" stroke-width=".9" fill="none"/></g>'
            + '<g class="sf-head"><g class="sf-sway"><g class="sf-bracts">' + bracts + '</g><g class="sf-back">' + back + '</g><g class="sf-front">' + front + '</g>'
            + '<circle class="sf-bud" r="8" fill="#8db36a"/><path class="sf-budline" d="M-5 -2 Q0 4 5 -2 M-3 -6 Q0 -1 3 -6" stroke="#6e9a4c" stroke-width="1" fill="none"/>'
            + '<g class="sf-disk"><circle r="10" fill="#6b3f22"/><circle r="7.4" fill="#8a5530"/><g fill="#d99a3a">' + seeds + '</g></g></g></g></svg>';
        tt.onclick = e => { e.stopPropagation(); scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); };
        document.body.appendChild(tt);
        const sfStem = tt.querySelector('.sf-stem'), sfHead = tt.querySelector('.sf-head'), sfL1 = tt.querySelector('.l1'), sfL2 = tt.querySelector('.l2');
        const sfBr = [...tt.querySelectorAll('.sf-bract')], sfBack = [...tt.querySelectorAll('.sf-back .sf-pet')], sfFront = [...tt.querySelectorAll('.sf-front .sf-pet')];
        const sfBud = tt.querySelectorAll('.sf-bud, .sf-budline'), sfDisk = tt.querySelector('.sf-disk');
        const ramp = (p, a, b) => Math.max(0, Math.min(1, (p - a) / (b - a))), lerp = (a, b, t) => a + (b - a) * t;
        const smooth = t => t * t * (3 - 2 * t), stemLen = sfStem.getTotalLength();
        /* petals sit in two rings; closed, they bunch upward inside the green bud; open, they fan out to full length */
        const ring = (els, open, offset, lenMin) => els.forEach((el, k) => {
            const full = offset + k * 360 / els.length - 90, ang = -90 + (full + 90 - (full > 90 ? 360 : 0)) * lerp(0.1, 1, open);
            el.setAttribute('transform', `rotate(${(ang + 90).toFixed(2)}) scale(${lerp(0.45, 1, open).toFixed(3)}, ${lerp(lenMin, 1, open).toFixed(3)})`);
        });
        function drawFlower(q){
            const grow = smooth(ramp(q, 0, 0.45)), stem = 0.4 + 0.6 * grow, open = smooth(ramp(q, 0.3, 0.97));
            sfStem.style.strokeDashoffset = (1 - stem).toFixed(4);
            const pt = sfStem.getPointAtLength(stemLen * stem);
            sfHead.setAttribute('transform', `translate(${pt.x.toFixed(2)} ${pt.y.toFixed(2)}) rotate(${lerp(0, -9, open).toFixed(2)}) scale(${lerp(0.95, 1.18, smooth(ramp(q, 0, 0.7))).toFixed(3)})`);
            const a = sfStem.getPointAtLength(stemLen * 0.42), b = sfStem.getPointAtLength(stemLen * 0.62);
            sfL1.setAttribute('transform', `translate(${a.x.toFixed(1)} ${a.y.toFixed(1)}) rotate(-12) scale(${smooth(ramp(q, 0.1, 0.3)).toFixed(3)})`);
            sfL2.setAttribute('transform', `translate(${b.x.toFixed(1)} ${b.y.toFixed(1)}) rotate(10) scale(${smooth(ramp(q, 0.22, 0.42)).toFixed(3)})`);
            const bo = smooth(ramp(q, 0.25, 0.6));
            sfBr.forEach((el, k) => { const full = k * 40 - 90, ang = -90 + (full + 90 - (full > 90 ? 360 : 0)) * lerp(0.4, 1, bo); el.setAttribute('transform', `rotate(${(ang + 90).toFixed(2)}) translate(0 ${lerp(1, -6, bo).toFixed(2)}) scale(${lerp(1.15, 1, bo).toFixed(3)})`); });
            ring(sfBack, smooth(ramp(q, 0.3, 0.85)), 0, 0.5);
            ring(sfFront, open, 360 / 26, 0.55);
            const budO = 1 - smooth(ramp(q, 0.35, 0.6)); sfBud.forEach(el => { el.style.opacity = budO.toFixed(3); });
            sfDisk.setAttribute('transform', `scale(${lerp(0.15, 1, smooth(ramp(q, 0.38, 0.9))).toFixed(3)})`);
            sfDisk.style.opacity = smooth(ramp(q, 0.34, 0.5)).toFixed(3);
            tt.classList.toggle('bloomed', q > 0.96); tt.classList.toggle('at-top', q < 0.02);
            tt.style.setProperty('--sfq', q.toFixed(3));
        }
        const sfReduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
        let sfTarget = 0, sfNow = -1, sfRaf = 0, sfLast = 0;
        const scrollP = () => { const h = document.documentElement.scrollHeight - innerHeight; return h > 0 ? Math.min(1, Math.max(0, scrollY / h)) : 0; };
        function sfTick(now){
            const dt = Math.min(0.05, (now - (sfLast || now)) / 1000); sfLast = now;
            sfNow += (sfTarget - sfNow) * (1 - Math.exp(-dt * 7));
            if (Math.abs(sfTarget - sfNow) < 0.0008){ sfNow = sfTarget; sfRaf = 0; sfLast = 0; drawFlower(sfNow); return; }
            drawFlower(sfNow); sfRaf = requestAnimationFrame(sfTick);
        }
        function growFlower(){
            sfTarget = scrollP();
            if (sfReduce || sfNow < 0){ sfNow = sfTarget; drawFlower(sfNow); return; }
            if (!sfRaf) sfRaf = requestAnimationFrame(sfTick);
        }
        addEventListener('scroll', growFlower, { passive: true });
        addEventListener('resize', growFlower); growFlower();
    })();

    /* v5: flower nav */
    (function(){
        const NS = 'http://www.w3.org/2000/svg', reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

        /* ---------- flower nav ---------- */
        const NAVFL = [['fl-bloom','#f4a7bf','#f2c230'],['fl-daisy','#b9a2de','#fbe7a1'],['fl-forsythia','#f2c230','#d99a12'],['fl-bloom','#8db36a','#fff1cc'],['fl-daisy','#e9789f','#f2c230']];
        function navFlower(k){ const f = NAVFL[k % NAVFL.length]; const s = document.createElementNS(NS, 'svg'); s.setAttribute('class', 'nav-fl'); s.setAttribute('viewBox', '-50 -50 100 100'); s.style.color = f[1]; s.style.setProperty('--center', f[2]); s.innerHTML = '<use href="#' + f[0] + '" x="-50" y="-50" width="100" height="100"/>'; return s; }
        document.querySelectorAll('.nav a').forEach((a, k, all) => { const idx = [...a.parentElement.querySelectorAll('a')].indexOf(a); a.prepend(navFlower(idx)); });
        const nav = document.querySelector('.nav');
        if (nav){
            const bug = document.createElementNS(NS, 'svg'); bug.setAttribute('class', 'nav-bug'); bug.setAttribute('viewBox', '-24 -20 48 40');
            bug.innerHTML = '<g class="bf-wing-l"><path d="M-1 -2 C-10 -20 -26 -16 -21 -3 C-18 4 -8 3 -1 0Z" fill="#c9b2ec"/><path d="M-1 1 C-9 3 -18 10 -13 16 C-8 19 -3 10 -1 3Z" fill="#f4a7bf"/></g><g class="bf-wing-r"><path d="M1 -2 C10 -20 26 -16 21 -3 C18 4 8 3 1 0Z" fill="#c9b2ec"/><path d="M1 1 C9 3 18 10 13 16 C8 19 3 10 1 3Z" fill="#f4a7bf"/></g><rect x="-1.5" y="-8" width="3" height="20" rx="1.5" fill="#5a4366"/>';
            nav.appendChild(bug);
            let bx = null;
            const perch = () => {
                const a = nav.querySelector('a.active') || nav.querySelector('a'); const nx = a.offsetLeft + a.offsetWidth - 16;
                if (bx === null || reduce){ bug.style.transform = `translateX(${nx}px)`; bx = nx; return; }
                if (Math.abs(nx - bx) < 1) return;
                bug.classList.add('flying');
                const dir = nx > bx ? 1 : -1;
                bug.animate([{ transform: `translateX(${bx}px) translateY(0) rotate(0deg)` }, { transform: `translateX(${(bx + nx) / 2}px) translateY(-16px) rotate(${dir * 20}deg)` }, { transform: `translateX(${nx}px) translateY(0) rotate(0deg)` }], { duration: 700, easing: 'cubic-bezier(0.45, 0, 0.25, 1)' }).onfinish = () => bug.classList.remove('flying');
                bug.style.transform = `translateX(${nx}px)`; bx = nx;
            };
            perch(); new MutationObserver(perch).observe(nav, { subtree: true, attributes: true, attributeFilter: ['class'] }); addEventListener('resize', () => { bx = null; perch(); });
            document.fonts && document.fonts.ready.then(() => { bx = null; perch(); });
            let tk = false; addEventListener('scroll', () => { if (tk) return; tk = true; requestAnimationFrame(() => { nav.classList.toggle('small', scrollY > 80); tk = false; }); }, { passive: true });
        }
    })();

    /* v6: vine stems + near-bloom, vine butterflies */
    (function(){
        const NS = 'http://www.w3.org/2000/svg', reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
        const rand = (a, b) => a + Math.random() * (b - a);
        const BF = '<svg viewBox="-24 -20 48 40"><g class="bf-wing-l"><path d="M-1 -2 C-10 -20 -26 -16 -21 -3 C-18 4 -8 3 -1 0Z" fill="{C1}"/><path d="M-1 1 C-9 3 -18 10 -13 16 C-8 19 -3 10 -1 3Z" fill="{C2}"/></g><g class="bf-wing-r"><path d="M1 -2 C10 -20 26 -16 21 -3 C18 4 8 3 1 0Z" fill="{C1}"/><path d="M1 1 C9 3 18 10 13 16 C8 19 3 10 1 3Z" fill="{C2}"/></g><rect x="-1.5" y="-8" width="3" height="20" rx="1.5" fill="#5a4366"/></svg>';

        /* --- vines: give each flower a little stem that grows with it; gentle grow when cursor is near --- */
        function addStems(){
            document.querySelectorAll('.vine').forEach(v => {
                v.querySelectorAll('.vine-item.spin').forEach(it => {
                    const g = it.parentNode; if (g.querySelector('.vine-bud-stem')) return;
                    const st = document.createElementNS(NS, 'path'); st.setAttribute('class', 'vine-bud-stem'); st.setAttribute('d', 'M0 0 Q -4 6 0 10'); g.insertBefore(st, it);
                    new MutationObserver(() => st.classList.toggle('on', it.classList.contains('on'))).observe(it, { attributes: true, attributeFilter: ['class'] });
                });
            });
        }
        addStems(); addEventListener('resize', () => setTimeout(addStems, 50));
        if (!reduce && matchMedia('(hover: hover)').matches){
            let q = false, ev;
            addEventListener('mousemove', e => { ev = e; if (q) return; q = true; requestAnimationFrame(() => { q = false;
                if (ev.clientX > 130 && ev.clientX < innerWidth - 130){
                    /* the cursor left the vines: let any flower it was touching settle back */
                    document.querySelectorAll('.vine-item.near').forEach(it => { it.classList.remove('near'); if (window.__spin) window.__spin.set(it.firstElementChild, false); });
                    return;
                }
                document.querySelectorAll('.vine-item.on').forEach(it => {
                    const r = it.getBoundingClientRect(), near = Math.hypot(r.left + r.width / 2 - ev.clientX, r.top + r.height / 2 - ev.clientY) < 60;
                    if (it.classList.contains('near') === near) return;
                    it.classList.toggle('near', near);
                    /* a flower the cursor reaches spins up, and eases back when it leaves */
                    if (window.__spin && it.classList.contains('spin')) window.__spin.set(it.firstElementChild, near);
                });
            }); }, { passive: true });
        }

    })();

    /* v7: tidy vine blooms (grow on spaced spots, fade over time, birds visit) + garden game */
    (function(){
        const NS = 'http://www.w3.org/2000/svg', reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
        const hoverable = matchMedia('(hover: hover)').matches, act = hoverable ? 'click' : 'tap';
        const rand = (a, b) => a + Math.random() * (b - a), pick = a => a[Math.floor(Math.random() * a.length)];
        const ease = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        const FLI = '<svg class="tiny-fl" viewBox="-50 -50 100 100" aria-hidden="true"><use href="#fl-bloom" x="-50" y="-50" width="100" height="100"/></svg>';
        const BLOOMS = [['fl-bloom','#f4a7bf','#f2c230'],['fl-daisy','#ffffff','#f2c230'],['fl-forsythia','#f2c230','#d99a12'],['fl-bloom','#b9a2de','#f2c230'],['fl-daisy','#c9b2ec','#fbe7a1'],['fl-bloom','#e9789f','#fff1cc'],['fl-daisy','#f2c230','#7a4a1e'],['fl-bloom','#f8c9a0','#e07fa3']];
        const BIRD_SVG = window.__birdSVG = '<svg viewBox="0 0 40 32"><path d="M5 15 L0 10 L1.5 18 Z" fill="#7fb3cc"/><ellipse cx="18" cy="18" rx="13" ry="10" fill="#a9d8ea"/><ellipse cx="20" cy="22" rx="8" ry="5.5" fill="#fff4e0"/><circle cx="29" cy="11" r="7" fill="#a9d8ea"/><circle cx="31" cy="9.5" r="1.4" fill="#5a4366"/><circle cx="31.5" cy="13.2" r="1.6" fill="#f9c6d6" opacity=".85"/><path d="M35 10.5 L40 12.5 L35 14 Z" fill="#f2c230"/><g class="c-wing"><path d="M11 15 C15 5 26 7 24 16 C21 20 13 20 11 15Z" fill="#8fc3dc"/></g><path d="M15 27.5 L14 31.5 M21 27.5 L22 31.5" stroke="#c98a06" stroke-width="1.3" stroke-linecap="round"/></svg>';
        const SVG = {
            bunny: '<svg viewBox="0 0 46 40"><circle cx="6" cy="27" r="4" fill="#fff" stroke="#e8dcea"/><ellipse cx="18" cy="28" rx="13" ry="10" fill="#f3ece6" stroke="#d9cbd0"/><ellipse cx="12" cy="36" rx="7" ry="3" fill="#e9dfd8"/><ellipse cx="30" cy="9" rx="3" ry="8" fill="#f3ece6" stroke="#d9cbd0" transform="rotate(-14 30 9)"/><ellipse cx="30" cy="9" rx="1.3" ry="5.5" fill="#f9c6d6" transform="rotate(-14 30 9)"/><ellipse cx="35.5" cy="8" rx="3" ry="8" fill="#f3ece6" stroke="#d9cbd0" transform="rotate(10 35.5 8)"/><ellipse cx="35.5" cy="8" rx="1.3" ry="5.5" fill="#f9c6d6" transform="rotate(10 35.5 8)"/><circle cx="33" cy="21" r="8" fill="#f3ece6" stroke="#d9cbd0"/><circle cx="35.5" cy="25" r="2" fill="#f9c6d6" opacity=".7"/><circle cx="36" cy="19" r="1.4" fill="#5a4366"/><circle cx="40.5" cy="22.5" r="1.3" fill="#f4a7bf"/><ellipse cx="28" cy="37" rx="4" ry="2.5" fill="#e9dfd8"/></svg>',
            snail: '<svg viewBox="0 0 40 26"><path d="M2 24 Q2 18 10 19 L30 19 Q33 13 35 10 Q39 12 37 18 Q36 24 30 24 Z" fill="#e8cfa8"/><path d="M34 12 L33 4 M36 12 L38 4" stroke="#c9a979" stroke-width="1.2" stroke-linecap="round"/><circle cx="33" cy="4" r="1.6" fill="#5a4366"/><circle cx="38" cy="4" r="1.6" fill="#5a4366"/><circle cx="18" cy="12" r="10" fill="#c9b2ec" stroke="#8a63b8" stroke-width="1.2"/><path d="M18 6 a6 6 0 1 1 -5.2 3 a4 4 0 1 1 4.2 -1 a2 2 0 1 1 1.6 2.6" fill="none" stroke="#8a63b8" stroke-width="1.2" stroke-linecap="round"/><circle cx="14" cy="7" r="2" fill="#fff" opacity=".5"/></svg>',
            bird: BIRD_SVG,
            flutter: '<svg viewBox="-24 -20 48 40"><g class="bf-wing-l"><path d="M-1 -2 C-10 -20 -26 -16 -21 -3 C-18 4 -8 3 -1 0Z" fill="#fbdc84"/><path d="M-1 1 C-9 3 -18 10 -13 16 C-8 19 -3 10 -1 3Z" fill="#f9b8cf"/></g><g class="bf-wing-r"><path d="M1 -2 C10 -20 26 -16 21 -3 C18 4 8 3 1 0Z" fill="#fbdc84"/><path d="M1 1 C9 3 18 10 13 16 C8 19 3 10 1 3Z" fill="#f9b8cf"/></g><rect x="-1.5" y="-8" width="3" height="20" rx="1.5" fill="#5a4366"/></svg>'
        };
        function tween(dur, fn, done){
            const t0 = performance.now(), tok = { stop: false };
            (function step(now){ if (tok.stop) return; const t = Math.min(1, (now - t0) / Math.max(dur, 1)); fn(t); if (t < 1) requestAnimationFrame(step); else done && done(); })(t0);
            return tok;
        }
        function fxFlower(size){
            const f = pick(BLOOMS), s = document.createElementNS(NS, 'svg');
            s.setAttribute('class', 'fx-flower'); s.setAttribute('viewBox', '-50 -50 100 100');
            s.style.width = s.style.height = size + 'px'; s.style.color = f[1]; s.style.setProperty('--center', f[2]);
            s.innerHTML = '<use href="#' + f[0] + '" x="-50" y="-50" width="100" height="100"/>';
            return s;
        }
        function burstAt(x, y, n){
            if (reduce) return;
            for (let k = 0; k < n; k++){
                const size = rand(22, 40), fl = fxFlower(size), ang = (k / n) * Math.PI * 2 + rand(-0.3, 0.3), dist = rand(50, 120);
                fl.style.left = (x - size / 2) + 'px'; fl.style.top = (y - size / 2) + 'px'; document.body.appendChild(fl);
                const dx = Math.cos(ang) * dist, dy = Math.sin(ang) * dist - 40;
                fl.animate([{ transform: 'translate(0,0) scale(0) rotate(0deg)', opacity: 1 }, { transform: `translate(${dx}px,${dy}px) scale(1) rotate(200deg)`, opacity: 1, offset: 0.5 }, { transform: `translate(${dx * 1.2}px,${dy + 60}px) scale(0.4) rotate(360deg)`, opacity: 0 }],
                    { duration: rand(1300, 1900), easing: 'cubic-bezier(0.22,1,0.36,1)', delay: k * 20 }).onfinish = () => fl.remove();
            }
        }

        /* =========================================================
           SIDE VINES: click (or tap, on phones) a vine to grow it.
           Every valid click visibly extends the vine and adds two new
           sprigs (stem, leaves, a flower) right next to what has already
           grown, so growth travels along the vine instead of piling up
           in one spot, and fills out one nearby sprig (a side bud, then a
           second bloom). Sprigs stay until a bird or caterpillar eats
           them. Limit: one sprig per spot (~every 46px) at 3 levels.
           ========================================================= */
        const VINE = { left: null, right: null };
        const GROWN = { left: new Map(), right: new Map() }; /* slot index -> { level, seed, leafy } (survives re-layout) */
        const rng = seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
        const vf = v => (+v).toFixed(1);
        function buildSlots(){
            ['left', 'right'].forEach(side => {
                const svg = document.querySelector('.vine-' + side), path = svg && svg.querySelector('.vine-path');
                if (!path){ VINE[side] = null; return; }
                const k = (svg.clientWidth || 90) / 90, narrow = k < 0.8, len = path.getTotalLength(), slots = []; let j = 0;
                for (let d = 73; d < len - 12; d += 46, j++){
                    const p = path.getPointAtLength(d), a = path.getPointAtLength(Math.max(0, d - 3)), b = path.getPointAtLength(Math.min(len, d + 3));
                    let tx = b.x - a.x, ty = b.y - a.y; const m = Math.hypot(tx, ty) || 1; tx /= m; ty /= m;
                    const s = j % 2 ? 1 : -1; let nx = -ty * s, ny = tx * s - 0.45;
                    /* phones: the vine lives in the page gutter, so sprigs hang along it instead of reaching into the text */
                    if (narrow){ nx = (side === 'left' ? 0.35 : -0.35) * (j % 2 ? 1 : 0.4); ny = j % 3 ? 0.9 : -0.9; }
                    const nm = Math.hypot(nx, ny) || 1;
                    slots.push({ i: j, d, x: p.x, y: p.y, nx: nx / nm, ny: ny / nm, sp: null, pending: false });
                }
                const layer = document.createElementNS(NS, 'g'); layer.setAttribute('class', 'vine-sprigs'); svg.appendChild(layer);
                const v = VINE[side] = { svg, path, len, slots, layer, k, narrow, side };
                GROWN[side].forEach((spec, i) => { if (slots[i]) renderSprig(v, slots[i], spec, 99); else GROWN[side].delete(i); });
            });
        }
        function vineShown(v){ return v.len - (parseFloat(v.path.style.strokeDashoffset) || 0); }
        const leafAt = (x, y, ang, size, color) => `<g class="vs-leaf" style="color:${color || '#8db36a'}"><use href="#fl-leaf" x="${vf(x)}" y="${vf(y - size)}" width="${vf(size)}" height="${vf(size)}" transform="rotate(${vf(ang)} ${vf(x)} ${vf(y)})"/></g>`;
        /* the slow spin goes on a wrapper group: rotating a <use> directly pivots around the wrong point in Chrome */
        const bloomAt = (x, y, size, f, cls) => `<g class="sprout ${cls || ''}" style="color:${f[1]};--center:${f[2]}"><g class="sp-spin"><use href="#${f[0]}" x="${vf(x - size / 2)}" y="${vf(y - size / 2)}" width="${vf(size)}" height="${vf(size)}"/></g></g>`;
        /* draws one sprig at its slot. `fresh` = the level that is new (it animates in); lower levels appear instantly. */
        function renderSprig(v, s, spec, fresh){
            if (s.sp && s.sp.g) s.sp.g.remove();
            const R = rng(spec.seed), z = v.narrow ? 1.7 : 1.15;
            const L = (17 + R() * 6) * z, ex = s.nx * L, ey = s.ny * L, bend = (R() - 0.5) * 10 * z;
            const cx = ex * 0.5 + s.ny * bend * 0.5, cy = ey * 0.5 - s.nx * bend * 0.5, ang = Math.atan2(ey, ex) * 180 / Math.PI;
            const f = BLOOMS[Math.floor(R() * BLOOMS.length)], f2 = BLOOMS[Math.floor(R() * BLOOMS.length)], f3 = BLOOMS[Math.floor(R() * BLOOMS.length)];
            const lv = n => `sp-lv${fresh > n ? ' still' : ''}`;
            let h = `<g class="${lv(1)}"><path class="sprout-stem" d="M0 0 Q ${vf(cx)} ${vf(cy)} ${vf(ex)} ${vf(ey)}"/>${leafAt(ex * 0.45, ey * 0.45, ang - 60, 10 * z)}`;
            h += spec.leafy ? `<g class="sprout leafy" style="color:#7fa65c"><use href="#fl-leaf" x="${vf(ex - 8 * z)}" y="${vf(ey - 8 * z)}" width="${vf(16 * z)}" height="${vf(16 * z)}" transform="rotate(${vf(ang - 45)} ${vf(ex)} ${vf(ey)})"/></g>` : bloomAt(ex, ey, (19 + R() * 6) * z, f, 'main');
            h += '</g>';
            const side = R() < 0.5 ? 1 : -1, px = -s.ny * side, py = s.nx * side; /* perpendicular to the sprig */
            if (spec.level >= 2){
                const mx = ex * 0.55, my = ey * 0.55, tl = 11 * z, bx = mx + (px * 0.85 + s.nx * 0.5) * tl, by = my + (py * 0.85 + s.ny * 0.5) * tl;
                h += `<g class="${lv(2)}"><path class="sprout-stem" d="M${vf(mx)} ${vf(my)} Q ${vf((mx + bx) / 2 + s.nx * 3)} ${vf((my + by) / 2 + s.ny * 3)} ${vf(bx)} ${vf(by)}"/>${leafAt(mx, my, ang + 70 * side, 9 * z, '#7fa65c')}${bloomAt(bx, by, 12 * z, f2)}</g>`;
            }
            if (spec.level >= 3){
                const mx = ex * 0.3, my = ey * 0.3, tl = 12 * z, bx = mx - (px * 0.9 - s.nx * 0.4) * tl, by = my - (py * 0.9 - s.ny * 0.4) * tl;
                h += `<g class="${lv(3)}"><path class="sprout-stem" d="M${vf(mx)} ${vf(my)} Q ${vf((mx + bx) / 2)} ${vf((my + by) / 2 + 3)} ${vf(bx)} ${vf(by)}"/>${bloomAt(bx, by, 14 * z, ['fl-daisy', f3[1] === '#ffffff' ? '#fde1ea' : '#ffffff', '#f2c230'])}`
                    + `<path class="sprout-stem tendril" d="M${vf(ex)} ${vf(ey)} q ${vf(s.nx * 6 * z)} ${vf(s.ny * 6 * z)} ${vf((s.nx * 4 + px * 4) * z)} ${vf((s.ny * 4 + py * 4) * z)} q ${vf(-px * 3 * z)} ${vf(-py * 3 * z)} ${vf(-s.nx * 2 * z)} ${vf(-s.ny * 2 * z)}"/></g>`;
            }
            const g = document.createElementNS(NS, 'g'); g.setAttribute('class', 'vine-sprout'); g.setAttribute('transform', `translate(${vf(s.x)},${vf(s.y)})`);
            g.innerHTML = h; v.layer.appendChild(g);
            s.sp = { g, spec, slot: s, side: v.side, leafy: !!spec.leafy };
        }
        /* eaten by a bird or caterpillar: the sprig drops away and its spot is free to regrow */
        function fadeSprout(sp, eaten){
            if (!sp || sp.gone) return; sp.gone = true;
            GROWN[sp.side].delete(sp.slot.i);
            sp.g.classList.add(eaten ? 'eaten' : 'wilt');
            setTimeout(() => { sp.g.remove(); if (sp.slot.sp === sp) sp.slot.sp = null; }, eaten ? 900 : 1700);
        }
        function extendVine(v, side, d){
            const reach = window.__vineReach || (window.__vineReach = {});
            if (d <= vineShown(v) - 10) return 0;
            reach[side] = Math.max(reach[side] || 0, Math.min(v.len, d));
            v.path.style.transition = 'stroke-dashoffset 0.8s cubic-bezier(0.22, 1, 0.36, 1)';
            if (window.__vineUpdate) window.__vineUpdate();
            setTimeout(() => { v.path.style.transition = ''; }, 850);
            return 520;
        }
        let vineClicks = 0;
        /* returns false when that stretch of vine is already at its limit */
        function growVine(side, clientY){
            const v = VINE[side]; if (!v) return false;
            vineClicks++;
            if (window.GardenLog) GardenLog.add({ id: 'vine:' + side, kind: 'flower', sym: 'fl-bloom', color: side === 'left' ? '#e9789f' : '#b9a2de', center: '#fff1cc' });
            const r = v.svg.getBoundingClientRect(), py = (clientY - r.top) / v.k, win = 320 / v.k, grown = GROWN[side];
            const near = v.slots.filter(s => Math.abs(s.y - py) < win);
            const adj = s => grown.has(s.i - 1) || grown.has(s.i + 1) ? 1 : 0;
            const empty = near.filter(s => !s.sp && !s.pending).sort((a, b) => (adj(b) - adj(a)) || Math.abs(a.y - py) - Math.abs(b.y - py));
            const fresh = empty.slice(0, 2);
            const upg = near.filter(s => s.sp && !s.sp.gone && s.sp.spec.level < 3).sort((a, b) => Math.abs(a.y - py) - Math.abs(b.y - py)).slice(0, fresh.length ? 1 : 3);
            if (!fresh.length && !upg.length) return false;
            const far = Math.max(...fresh.concat(upg).map(s => s.d));
            const wait = extendVine(v, side, far + 70);
            fresh.forEach((s, n) => {
                const spec = { level: 1, seed: 1 + Math.floor(Math.random() * 2e9), leafy: Math.random() < 0.12 };
                s.pending = true; grown.set(s.i, spec);
                setTimeout(() => { s.pending = false; if (VINE[side] === v && grown.get(s.i) === spec) renderSprig(v, s, spec, 1); }, wait + n * 170);
                (function wilt(){ setTimeout(() => { if (!s.sp || s.sp.spec !== spec) return; if (s.sp.targeted) return wilt(); fadeSprout(s.sp, false); }, wait + rand(70000, 110000)); })();
            });
            upg.forEach((s, n) => {
                const spec = s.sp.spec; spec.level++;
                setTimeout(() => { if (VINE[side] === v && grown.get(s.i) === spec) renderSprig(v, s, spec, spec.level); }, wait + 140 + n * 150);
            });
            return true;
        }
        window.__onVineLayout = buildSlots;

        if (!reduce){
            buildSlots();
            const tip = document.createElement('div'); tip.className = 'vine-tip'; document.body.appendChild(tip);
            const TIP = (hoverable ? 'click' : 'tap') + ' the vine to grow it ' + FLI;
            let tipHold = 0;
            ['left', 'right'].forEach(side => {
                const hit = document.createElement('div'); hit.className = 'vine-hit ' + side; hit.setAttribute('aria-hidden', 'true'); document.body.appendChild(hit);
                hit.addEventListener('mousemove', e => {
                    if (vineClicks > 3 && Date.now() > tipHold) { tip.classList.remove('show'); return; }
                    if (Date.now() > tipHold && tip.innerHTML !== TIP) tip.innerHTML = TIP;
                    tip.classList.add('show');
                    tip.style.transform = `translate(${side === 'left' ? e.clientX + 20 : e.clientX - tip.offsetWidth - 20}px, ${e.clientY - 14}px)`;
                });
                hit.addEventListener('mouseleave', () => tip.classList.remove('show'));
                hit.addEventListener('click', e => {
                    const v = VINE[side]; if (!v) return;
                    /* blooms already on the vine near the click give a happy bounce */
                    v.svg.querySelectorAll('.vine-item.on, .vine-sprout .sprout').forEach(it => { const b = it.getBoundingClientRect(); if (Math.abs(b.top + b.height / 2 - e.clientY) < 90){ it.classList.add('grow'); setTimeout(() => it.classList.remove('grow'), 650); } });
                    if (!growVine(side, e.clientY)){
                        tip.innerHTML = 'this stretch is in full bloom ' + FLI; tipHold = Date.now() + 1600; tip.classList.add('show');
                        tip.style.transform = `translate(${side === 'left' ? e.clientX + 20 : e.clientX - tip.offsetWidth - 20}px, ${e.clientY - 14}px)`;
                        setTimeout(() => { if (Date.now() >= tipHold) tip.classList.remove('show'); }, 1700);
                    }
                });
            });
            if (window.__vineUpdate) window.__vineUpdate();   /* size the click strips to the drawn vine right away */
            /* phones have no hover, so show the hint once, next to the vine, a few seconds in */
            /* (the vine stays hidden until the visitor scrolls past the hero, so wait until there is a vine to tap) */
            if (!hoverable) (function hint(tries){ setTimeout(() => {
                if (vineClicks || !VINE.left) return;
                const hit = document.querySelector('.vine-hit.left');
                if (!hit || hit.style.display === 'none' || (hit._h || 0) < innerHeight * 0.5){ if (tries < 12) hint(tries + 1); return; }
                tip.innerHTML = TIP; tip.style.transform = `translate(24px, ${Math.round(innerHeight - 70)}px)`; tip.classList.add('show');
                setTimeout(() => tip.classList.remove('show'), 3800);
            }, 6000); })(0);

            /* a bird drops by now and then to snack on a vine flower; click it to scare it off (wide screens) */
            function vineBird(){
                if (Life.busy() && !Life.claim('vine-bird-ask', 1, 'preempt')) { setTimeout(vineBird, 6000); return; }   /* someone else is out: try again soon */
                Life.release('vine-bird-ask');
                setTimeout(vineBird, rand(18000, 30000));
                if (document.hidden || innerWidth < 1024 || document.querySelector('.vine-bird')) return;
                /* anything blooming along the side vines: grown sprigs and the vine's own flowers */
                const all = [];
                ['left', 'right'].forEach(side => { const v = VINE[side]; if (v) v.slots.forEach(s => { if (s.sp && !s.sp.gone && !s.sp.leafy){ const h = s.sp.g.querySelector('.sprout.main'); if (h) all.push({ side, el: h, sp: s.sp }); } }); });
                document.querySelectorAll('.vine-item.spin.on:not(.eaten)').forEach(it => all.push({ side: it.closest('.vine-left') ? 'left' : 'right', el: it }));
                const seen = all.filter(t => { const r = t.el.getBoundingClientRect(); return r.width && r.top > 80 && r.bottom < innerHeight - 30; });
                if (!seen.length) return;
                const target = pick(seen), side = target.side, hr = target.el.getBoundingClientRect();
                if (!Life.claim('vine-bird', 12000)) return;
                if (target.sp) target.sp.targeted = true;   /* it will not wilt while the bird is on its way */
                const el = document.createElement('div'); el.className = 'vine-bird flying' + (side === 'left' ? ' left-facing' : '');
                el.setAttribute('role', 'button'); el.setAttribute('aria-label', 'Shoo the bird');
                el.innerHTML = `<div class="c-flip"><div class="c-body">${BIRD_SVG}</div></div>`; document.body.appendChild(el);
                const cxh = hr.left + hr.width / 2;
                let x = side === 'left' ? cxh + 260 : cxh - 300, y = -40, state = 'coming', tok, timer;
                const set = () => { el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`; }; set();
                const fly = (x1, y1, dur, arc, done) => { const x0 = x, y0 = y; if (tok) tok.stop = true; tok = tween(dur, t => { const e = ease(t); x = x0 + (x1 - x0) * e; y = y0 + (y1 - y0) * e - Math.sin(Math.PI * t) * arc; set(); }, done); };
                const leave = scared => {
                    if (state === 'leaving') return; state = 'leaving'; clearTimeout(timer);
                    target.el.classList.remove('pecked'); if (target.sp) target.sp.targeted = false;
                    el.classList.remove('eating'); el.classList.add('flying'); el.classList.toggle('left-facing', side !== 'left');
                    fly(side === 'left' ? x + 300 : x - 300, -90, scared ? 650 : 1300, 20, () => { el.remove(); Life.release('vine-bird'); });
                };
                el.addEventListener('click', e => { e.stopPropagation(); leave(true); });
                fly(side === 'left' ? cxh - 5 : cxh - 31, hr.top - 21, 1500, -45, () => {
                    if (state !== 'coming') return;
                    if (target.sp && target.sp.gone) return leave(false);
                    /* the bird has arrived: it pecks (the flower trembles), and only then is the flower gone */
                    state = 'eating'; el.classList.remove('flying'); el.classList.add('eating'); target.el.classList.add('pecked');
                    timer = setTimeout(() => {
                        if (state !== 'eating') return;
                        target.el.classList.remove('pecked');
                        if (target.sp) fadeSprout(target.sp, true);
                        else { target.el.classList.add('eaten'); setTimeout(() => target.el.classList.remove('eaten'), rand(45000, 80000)); }
                        leave(false);
                    }, 2600);
                });
            }
            setTimeout(vineBird, 14000);

            /* a caterpillar inches along a vine to a flower (or a leaf) and eats it; click/tap it and it drops off.
               It moves like one: slowly (about 15px a second on screen), one way for the whole trip, a stretch at a
               time with small rests in between. It belongs to the story (WorldState): once it has made its
               chrysalis it no longer appears. */
            function vineCaterpillar(){
                if (Life.busy() && !Life.claim('cat-ask', 1, 'preempt')) { setTimeout(vineCaterpillar, 7000); return; }
                Life.release('cat-ask');
                setTimeout(vineCaterpillar, rand(30000, 50000));
                if (document.hidden || document.querySelector('.vine-cat') || (WorldState.get().story || 0) > 0) return;
                const all = [];
                ['left', 'right'].forEach(side => { const v = VINE[side]; if (!v) return; const r = v.svg.getBoundingClientRect(), shown = vineShown(v);
                    v.slots.forEach(s => { const sy = r.top + s.y * v.k; if (s.sp && !s.sp.gone && !s.sp.leafy && sy > 110 && sy < innerHeight - 70) all.push({ v, s, sp: s.sp }); });
                    /* the vine's own flowers count too, so the caterpillar comes whether or not anyone has grown the vine */
                    v.svg.querySelectorAll('.vine-item.spin.on:not(.eaten)').forEach(it => {
                        const b = it.getBoundingClientRect(), cy = b.top + b.height / 2; if (!b.width || cy < 110 || cy > innerHeight - 70) return;
                        const d = parseFloat(it.dataset.d); if (d > 0 && d < shown - 20) all.push({ v, s: { d }, item: it });
                    }); });
                if (!all.length) return;
                const target = pick(all), v = target.v, goal = target.s.d, sp = target.sp, dir = Math.random() < 0.5 ? 1 : -1;
                const d0 = Math.max(10, Math.min(vineShown(v) - 10, goal + dir * rand(140, 200) / v.k));
                if (Math.abs(goal - d0) < 30 / v.k || !Life.claim('caterpillar', 60000)) return;
                const el = document.createElement('div'); el.className = 'vine-cat'; el.setAttribute('role', 'button'); el.setAttribute('aria-label', 'Shoo the caterpillar');
                el.innerHTML = `<div class="vc-flip">${SVG.caterpillar}</div>`; document.body.appendChild(el);
                const back = goal < d0, speed = 15 / v.k;   /* path units per second, ~15px/s on screen */
                let d = d0, state = 'crawl', tok = null, timer = 0;
                el.classList.toggle('rev', back);
                const place = () => {
                    const r = v.svg.getBoundingClientRect(), p = v.path.getPointAtLength(d), q = v.path.getPointAtLength(Math.min(v.len, d + 2));
                    const a = Math.atan2(q.y - p.y, q.x - p.x) * 180 / Math.PI;
                    el.style.transform = `translate(${(r.left + p.x * v.k).toFixed(1)}px, ${(r.top + p.y * v.k).toFixed(1)}px) rotate(${(back ? a + 180 : a).toFixed(1)}deg)`;
                };
                /* crawl to `to` a stretch at a time (about 35-70px), resting a moment between stretches */
                function crawl(to, done){
                    if (state === 'drop') return;
                    const left = to - d; if (Math.abs(left) < 0.5) { done && done(); return; }
                    const step = Math.sign(left) * Math.min(Math.abs(left), rand(35, 70) / v.k), from = d, end = from + step;
                    el.classList.remove('resting'); if (tok) tok.stop = true;
                    tok = tween(Math.abs(step) / speed * 1000, t => { d = from + step * t; place(); }, () => {
                        if (state === 'drop') return;
                        if (Math.abs(to - end) < 0.5) { done && done(); return; }
                        el.classList.add('resting'); timer = setTimeout(() => crawl(to, done), rand(700, 1900));
                    });
                }
                place(); requestAnimationFrame(() => el.classList.add('on'));
                crawl(goal, () => {
                    if (state !== 'crawl') return;
                    if (sp && sp.gone) return away();
                    state = 'eat'; el.classList.add('eating');
                    timer = setTimeout(() => {
                        if (state !== 'eat') return;
                        if (sp) fadeSprout(sp, true);
                        else if (target.item){ target.item.classList.add('eaten'); setTimeout(() => target.item.classList.remove('eaten'), rand(45000, 80000)); }
                        away();
                    }, 3200);
                });
                function away(){
                    state = 'away'; el.classList.remove('eating');
                    crawl(Math.max(5, Math.min(v.len - 5, d + (back ? -1 : 1) * 110 / v.k)), () => { el.classList.remove('on'); setTimeout(() => { el.remove(); Life.release('caterpillar'); }, 700); });
                }
                el.addEventListener('click', e => {
                    e.stopPropagation(); if (state === 'drop') return;
                    state = 'drop'; clearTimeout(timer); if (tok) tok.stop = true;
                    if (sp && !sp.gone){ const h = sp.g.querySelector('.sprout.main'); if (h){ h.classList.add('grow'); setTimeout(() => h.classList.remove('grow'), 650); } }
                    el.classList.remove('eating'); el.classList.add('drop'); setTimeout(() => { el.remove(); Life.release('caterpillar'); }, 900);
                });
            }
            setTimeout(vineCaterpillar, 16000);
            if (/[?&]v11debug\b/.test(location.search)) window.__vineDebug = { caterpillar: vineCaterpillar, bird: vineBird, VINE, flyby: () => flyby };

            /* now and then a bird (or a pair) flies across the page on a varied path */
            const TINTS = [['#a9d8ea', '#8fc3dc', '#7fb3cc'], ['#f9c6d6', '#f4a7bf', '#e98fb0'], ['#fbe7a1', '#f6d36b', '#e8b923'], ['#d9cbf3', '#c9b2ec', '#b39ddc']];
            function flyby(){
                setTimeout(flyby, rand(35000, 60000));
                if (document.hidden || document.querySelector('.gallery-modal.active, .lightbox.active')) return;
                const W = innerWidth, H = innerHeight;
                if (!Life.claim('flyby', (W + 140) / 42 * 1000 + 1500)) return;
                const ltr = Math.random() < 0.5, kind = pick(['glide', 'swoop', 'wave']);
                const n = Math.random() < 0.3 ? 2 : 1, y0 = rand(H * 0.12, H * 0.5), dur = (W + 140) / rand(42, 56) * 1000; /* constant ~50px/s at every width */
                for (let k = 0; k < n; k++){
                    const t = pick(TINTS), el = document.createElement('div'); el.className = 'flyby-bird' + (ltr ? '' : ' left-facing'); el.setAttribute('aria-hidden', 'true');
                    el.innerHTML = `<div class="c-flip"><div class="c-body">${BIRD_SVG.replace(/#a9d8ea/g, t[0]).replace(/#8fc3dc/g, t[1]).replace(/#7fb3cc/g, t[2])}</div></div>`;
                    el.style.setProperty('--fs', (rand(0.6, 0.8) * (W < 600 ? 0.8 : 1)).toFixed(2));
                    /* now and then the first bird carries something home for its nest: a twig, a strand of grass, a bit of fluff */
                    const carries = k === 0 && window.World && World.gather && (World.nestStage ? World.nestStage() < 5 : true) && Math.random() < 0.4;
                    if (carries){ const it = document.createElement('i'); it.className = 'w-twig is-' + pick(['twig', 'grass', 'fluff']); el.querySelector('.c-body').appendChild(it); el.__carry = true; }
                    document.body.appendChild(el);
                    const yy = y0 + k * 22, lag = k * 0.06;
                    tween(dur * (1 + lag), q => {
                        const u = Math.max(0, q * (1 + lag) - lag), x = ltr ? -70 + (W + 140) * u : W + 70 - (W + 140) * u;
                        const y = kind === 'glide' ? yy - u * H * 0.08 + Math.sin(u * 7) * 6 : kind === 'swoop' ? yy + Math.sin(Math.PI * u) * H * 0.16 : yy + Math.sin(u * Math.PI * 3) * 26;
                        el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
                    }, () => { if (el.__carry) World.gather(); el.remove(); });
                }
            }
            setTimeout(flyby, 30000);
            if (window.__vineDebug) window.__vineDebug.flyby = flyby;
        }

        /* =========================================================
           FLOWER PATCHES in open spaces: small arrangements placed only
           where they touch no text, photo, button or panel (re-checked
           when the layout changes). They sway; hover or tap and they bloom
           and bounce, shaking off a few petals.
           ========================================================= */
        (function(){
            const SPOTS = { home: [[0.05, 0.95], [0.95, 0.97]], about: [[0.94, 0.9], [0.06, 0.92]], experience: [[0.06, 0.16], [0.94, 0.14], [0.86, 0.99], [0.14, 0.99]],
                skills: [[0.07, 0.88], [0.93, 0.88], [0.08, 0.2], [0.92, 0.2]], gallery: [[0.05, 0.06], [0.95, 0.07], [0.12, 0.995], [0.88, 0.995]], contact: [[0.93, 0.25], [0.07, 0.88], [0.93, 0.9], [0.22, 0.98], [0.78, 0.98]] };
            const CONTENT = 'p,h1,h2,h3,h4,li,a,button,img,input,label,span.tag,.hero-text,.collage,.about-photo-wrap,.section-head,.section-hint,.xp-head,.garden,.herbarium,.gallery-frame,.gallery-preview,.gallery-deviant,.contact-inner,.contact-photo,.garden-bed,.garden-tip';
            const SPECIES = [['fl-bloom', '#f4a7bf', '#f2c230'], ['fl-daisy', '#ffffff', '#f2c230'], ['fl-forsythia', '#f2c230', '#d99a12'], ['fl-bloom', '#b9a2de', '#f2c230'], ['fl-daisy', '#c9b2ec', '#fbe7a1'], ['fl-bloom', '#e9789f', '#fff1cc'], ['fl-bloom', '#f8c9a0', '#e07fa3']];
            const patches = [];
            function make(seed){
                const R = rng(seed), n = 3 + Math.floor(R() * 3), el = document.createElement('div');
                el.className = 'page-posy'; el.setAttribute('aria-hidden', 'true');
                let h = '<svg viewBox="-70 -120 140 140">';
                for (let k = 0; k < 4; k++){ const gx = (k - 1.5) * 7 + (R() - 0.5) * 4, gh = 10 + R() * 9, b = (R() - 0.5) * 8; h += `<path class="pp-grass" d="M${vf(gx)} 0 Q${vf(gx + b * 0.4)} ${vf(-gh * 0.6)} ${vf(gx + b)} ${vf(-gh)}"/>`; }
                for (let k = 0; k < n; k++){
                    const a = (-34 + 68 * (n === 1 ? 0.5 : k / (n - 1)) + (R() - 0.5) * 10) * Math.PI / 180, L = 46 + R() * 36, tx = Math.sin(a) * L, ty = -Math.cos(a) * L;
                    const f = SPECIES[Math.floor(R() * SPECIES.length)], sz = 20 + R() * 10, lx = tx * 0.45, ly = ty * 0.45, side = k % 2 ? 1 : -1;
                    h += `<g class="pp-stem" style="--sd:${vf(3 + R() * 2)}s;--dl:-${vf(R() * 3)}s"><path class="pp-st" d="M0 0 Q${vf(tx * 0.2 + side * 6)} ${vf(ty * 0.55)} ${vf(tx)} ${vf(ty)}"/>`
                        + `<g style="color:${R() < 0.5 ? '#8db36a' : '#7fa65c'}"><use href="#fl-leaf" x="${vf(lx)}" y="${vf(ly - 12)}" width="12" height="12" transform="rotate(${side > 0 ? 10 : -100} ${vf(lx)} ${vf(ly)})"/></g>`
                        + `<g class="pp-fl" transform="translate(${vf(tx)} ${vf(ty)})" style="--i:${k}"><g class="pp-pop" style="color:${f[1]};--center:${f[2]}"><use href="#${f[0]}" x="${vf(-sz / 2)}" y="${vf(-sz / 2)}" width="${vf(sz)}" height="${vf(sz)}"/></g></g></g>`;
                }
                el.innerHTML = h + '</svg>';
                const boing = () => {
                    if (reduce) return;
                    el.classList.remove('boing'); void el.offsetWidth; el.classList.add('boing');
                    el.querySelectorAll('.pp-fl').forEach((fl, k) => {
                        if (Math.random() < 0.5) return;
                        const p = document.createElement('i'); p.className = 'pp-petal'; p.style.background = getComputedStyle(fl.firstChild).color;
                        const b = fl.getBoundingClientRect(), r = el.getBoundingClientRect(); p.style.left = (b.left - r.left + b.width / 2) + 'px'; p.style.top = (b.top - r.top + b.height / 2) + 'px';
                        el.appendChild(p); const dx = rand(-30, 30);
                        p.animate([{ transform: 'translate(0,0) rotate(0)', opacity: 1 }, { transform: `translate(${dx}px, ${rand(30, 60)}px) rotate(${rand(-300, 300)}deg)`, opacity: 0 }], { duration: rand(900, 1300), delay: k * 60, easing: 'ease-in', fill: 'backwards' }).onfinish = () => p.remove();
                    });
                };
                el.addEventListener('click', e => { boing(); });
                el.addEventListener('mouseenter', () => { if (hoverable) boing(); });
                return el;
            }
            const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) e.target.classList.add('open'); }), { threshold: 0.4 });
            function place(){
                const W = document.documentElement.clientWidth, narrow = W < 700, wide = W >= 1240;
                const size = narrow ? 64 : W < 1100 ? 80 : 96, maxAll = narrow ? 4 : 8;
                const xMin = wide ? 104 : 26, xMax = W - xMin;
                let used = 0, idx = 0; const placed = [];
                Object.keys(SPOTS).forEach(id => {
                    const sec = document.getElementById(id); if (!sec) return;
                    const sr = sec.getBoundingClientRect(), blocks = [...sec.querySelectorAll(CONTENT)].map(e => e.getBoundingClientRect()).filter(r => r.width && r.height);
                    let inSec = 0;
                    SPOTS[id].forEach(([fx, fy]) => {
                        const key = id + fx + fy; let p = patches.find(q => q.key === key);
                        const cx = sr.left + sr.width * fx, by = sr.top + sr.height * fy, box = { l: cx - size / 2, r: cx + size / 2, t: by - size, b: by };
                        const m = 14, clear = used < maxAll && inSec < 2 && box.l >= 6 && box.r <= W - 6 && cx > xMin && cx < xMax && box.t > sr.top && box.b < sr.bottom
                            && !blocks.some(r => r.left < box.r + m && r.right > box.l - m && r.top < box.b + m && r.bottom > box.t - m)
                            && !placed.some(q => Math.abs(q.cx - cx) < size && Math.abs(q.by - by) < size);
                        if (!clear){ if (p) p.el.style.display = 'none'; return; }
                        if (!p){ p = { key, el: make(1 + (idx * 7919 + key.length * 104729) % 2147483646) }; patches.push(p); sec.appendChild(p.el); io.observe(p.el); }
                        p.el.style.display = ''; p.el.style.width = p.el.style.height = size + 'px';
                        p.el.style.left = (cx - sr.left - size / 2).toFixed(0) + 'px'; p.el.style.top = (by - sr.top - size).toFixed(0) + 'px';
                        placed.push({ cx, by }); used++; inSec++; idx++;
                    });
                });
            }
            let pt = 0; const later = ms => { clearTimeout(pt); pt = setTimeout(place, ms); };
            addEventListener('load', () => later(400)); later(1200);
            let lastW = innerWidth; addEventListener('resize', () => { if (innerWidth !== lastW){ lastW = innerWidth; later(300); } });
            /* panels open and close, skills expand: re-check after clicks */
            document.addEventListener('click', e => { if (!e.target.closest('.page-posy')) later(650); });
        })();

        /* =========================================================
           SCATTERED BLOOMS AND LEAVES: single flowers and leaves in the same
           style as the ones around the hero (slow spin / gentle leaf sway),
           dropped into empty margins and gaps. Each candidate spot is checked
           against text, photos, panels and the other decorations, so nothing
           is ever covered, and the check re-runs when the layout changes.
           ========================================================= */
        (function(){
            const IDS = ['home', 'about', 'experience', 'skills', 'gallery', 'contact'];
            const CONTENT = 'p,h1,h2,h3,h4,li,a,button,img,input,label,span.tag,.hero-text,.collage,.about-body,.about-photo-wrap,.section-head,.section-hint,.xp-head,.garden,.herbarium,.gallery-frame,.gallery-preview,.gallery-deviant,.contact-inner,.contact-photo,.garden-bed,.garden-tip,.bloom,.page-posy,.footer-flowers';
            const SPECIES = [['fl-bloom', '#f4a7bf', '#f2c230'], ['fl-daisy', '#ffffff', '#f2c230'], ['fl-forsythia', '#f2c230', '#d99a12'], ['fl-bloom', '#b9a2de', '#f2c230'], ['fl-daisy', '#c9b2ec', '#fbe7a1'], ['fl-bloom', '#e9789f', '#fff1cc'], ['fl-bloom', '#f8c9a0', '#e07fa3'], ['fl-leaf', '#8db36a'], ['fl-leaf', '#7fa65c'], ['fl-leaf', '#a6c47f']];
            const mk = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
            const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) e.target.classList.add('open'); }), { threshold: 0.3 });
            const made = new Map();
            function build(key, seed, leafy){
                const R = mk(seed), pool = SPECIES.filter(f => (f[0] === 'fl-leaf') === leafy), f = pool[Math.floor(R() * pool.length)];
                const el = document.createElement('div'); el.className = 'scatter ' + (leafy ? 'sc-leaf' : 'sc-bloom'); el.setAttribute('aria-hidden', 'true');
                el.style.setProperty('--spin', (30 + R() * 28).toFixed(0) + 's'); el.style.setProperty('--sdl', '-' + (R() * 30).toFixed(1) + 's'); el.style.setProperty('--rot', ((R() - 0.5) * 70).toFixed(0) + 'deg');
                el.innerHTML = `<svg viewBox="-50 -50 100 100" style="color:${f[1]};${f[2] ? '--center:' + f[2] : ''}"><use href="#${f[0]}"/></svg>`;
                return el;
            }
            function place(){
                const W = document.documentElement.clientWidth, narrow = W < 700, wide = W >= 1240;
                const xMin = wide ? 100 : 10, perSec = narrow ? 2 : W < 1100 ? 3 : 4, gap = narrow ? 140 : 190;
                const taken = [...document.querySelectorAll('.page-posy')].filter(e => e.style.display !== 'none').map(e => e.getBoundingClientRect());
                IDS.forEach(id => {
                    const sec = document.getElementById(id); if (!sec) return;
                    const sr = sec.getBoundingClientRect(), blocks = [...sec.querySelectorAll(CONTENT)].filter(e => !e.classList.contains('scatter')).map(e => e.getBoundingClientRect()).filter(r => r.width && r.height);
                    const R = mk(id.length * 7717 + 13), cand = [];
                    const rows = Math.max(3, Math.round(sr.height / (narrow ? 230 : 190)));
                    /* v10: blooms gather along the page edges only, never in the reading column */
                    const EDGE = narrow ? [0.05, 0.95] : [0.03, 0.08, 0.13, 0.87, 0.92, 0.97];
                    for (let r = 0; r < rows; r++) for (let c = 0; c < EDGE.length; c++){
                        const fx = EDGE[c];
                        cand.push({ i: r * 20 + c, fx: Math.min(0.97, Math.max(0.03, fx + (R() - 0.5) * 0.03)), fy: (r + 0.15 + R() * 0.7) / rows, o: R() });
                    }
                    cand.sort((a, b) => a.o - b.o);
                    const mine = []; let n = 0;
                    cand.forEach(cd => {
                        const key = id + ':' + cd.i, leafy = cd.o > 0.62, size = leafy ? 22 + cd.o * 14 : 28 + (1 - cd.o) * 22;
                        let item = made.get(key);
                        const cx = sr.left + sr.width * cd.fx, cy = sr.top + sr.height * cd.fy, m = 14, h = size / 2;
                        const box = { l: cx - h, r: cx + h, t: cy - h, b: cy + h };
                        const ok = n < perSec && box.l >= 8 && box.r <= W - 8 && cx > xMin && cx < W - xMin && box.t > sr.top + 4 && box.b < sr.bottom - 4
                            && !blocks.some(r => r.left < box.r + m && r.right > box.l - m && r.top < box.b + m && r.bottom > box.t - m)
                            && !taken.some(r => r.left < box.r + 10 && r.right > box.l - 10 && r.top < box.b + 10 && r.bottom > box.t - 10)
                            && !mine.some(q => Math.hypot(q.x - cx, q.y - cy) < gap);
                        if (!ok){ if (item) item.style.display = 'none'; return; }
                        if (!item){ item = build(key, 31 + cd.i * 977 + id.length * 131, leafy); made.set(key, item); sec.appendChild(item); io.observe(item); }
                        item.style.display = ''; item.style.width = item.style.height = size.toFixed(0) + 'px';
                        item.style.left = (cx - sr.left - h).toFixed(0) + 'px'; item.style.top = (cy - sr.top - h).toFixed(0) + 'px';
                        mine.push({ x: cx, y: cy }); n++;
                    });
                });
            }
            let pt = 0; const later = ms => { clearTimeout(pt); pt = setTimeout(place, ms); };
            addEventListener('load', () => later(900)); later(1800);
            let lastW = innerWidth; addEventListener('resize', () => { if (innerWidth !== lastW){ lastW = innerWidth; later(350); } });
            document.addEventListener('click', () => later(800));
            window.__scatterPlace = place;
        })();

        /* =========================================================
           GARDEN GAME
           plants grow in three layered rows (back / middle / front),
           get thirsty (click to water), critters snack on them (click
           to shoo), butterflies pollinate seedlings, the sun and a rain
           cloud take turns, rare starblooms appear, a deer very rarely
           wanders through, badges unlock, and the whole game state is
           saved. "start over" clears every bit of it, storage included.
           ========================================================= */
        const footer = document.querySelector('footer'); if (!footer) return;
        const f1 = v => (+v).toFixed(1);
        const bed = document.createElement('div'); bed.className = 'garden-bed'; bed.dataset.stage = '0';
        bed.setAttribute('role', 'button'); bed.setAttribute('tabindex', '0');
        bed.setAttribute('aria-label', 'Flower garden: ' + act + ' to plant flowers, or press Enter to plant and water');
        let grass = '';
        for (let i = 0; i < 170; i++){ const x = i * 2.36 + rand(-0.8, 0.8), h = rand(5, 13), l = rand(-3, 3); grass += `M${f1(x)} 16 Q${f1(x + l / 2)} ${f1(16 - h * 0.6)} ${f1(x + l)} ${f1(16 - h)} `; }
        /* wildflower dots: tier 0 always, tiers 1 and 2 fade in as the garden fills */
        let meadow = ''; const WC = ['#f4a7bf', '#fbe7a1', '#c9b2ec', '#ffffff', '#f8c9a0', '#e9789f'];
        for (let i = 0; i < 72; i++) meadow += `<i class="t${i < 24 ? 0 : i < 48 ? 1 : 2}" style="left:${f1(rand(2, 98))}%;bottom:${rand(3, 24).toFixed(0)}px;--c:${pick(WC)};--dl:-${f1(rand(0, 3))}s"></i>`;
        /* soft foliage hedge behind the plants, grows with the garden's stage */
        const humps = (min, max, step) => { let d = '', x = -10; while (x < 410){ const w = rand(min, max), h = rand(14, 30); d += `M${f1(x)} 40 Q${f1(x + w / 2)} ${f1(40 - h * 2)} ${f1(x + w)} 40 Z `; x += w * step; } return d; };
        let motes = '';
        for (let i = 0; i < 9; i++) motes += `<i class="mote" style="left:${rand(6, 92).toFixed(0)}%;top:${rand(25, 75).toFixed(0)}%;--md:${f1(rand(7, 12))}s;--mdl:-${f1(rand(0, 10))}s"></i>`;
        let rays = '';
        for (let k = 0; k < 8; k++){ const a = k * Math.PI / 4, c = Math.cos(a), s = Math.sin(a); rays += `<line x1="${f1(c * 18)}" y1="${f1(s * 18)}" x2="${f1(c * (k % 2 ? 23 : 26))}" y2="${f1(s * (k % 2 ? 23 : 26))}"/>`; }
        const SUN_SVG = `<svg viewBox="-32 -32 64 64"><circle class="sun-glow" r="21"/><g class="sun-rays">${rays}</g><circle r="14" fill="#ffd968" stroke="#f2b43a" stroke-width="1.6"/><circle cx="-4.6" cy="-2" r="1.6" fill="#5a4366"/><circle cx="4.6" cy="-2" r="1.6" fill="#5a4366"/><path d="M-3.4 3.4 Q0 6.4 3.4 3.4" stroke="#5a4366" stroke-width="1.4" fill="none" stroke-linecap="round"/><ellipse cx="-8.4" cy="3" rx="2.6" ry="1.8" fill="#f4a7bf" opacity=".75"/><ellipse cx="8.4" cy="3" rx="2.6" ry="1.8" fill="#f4a7bf" opacity=".75"/></svg>`;
        bed.innerHTML = `<div class="g-meadow">${meadow}</div><svg class="g-hedge" viewBox="0 0 400 40" preserveAspectRatio="none" aria-hidden="true"><path class="h1" d="${humps(22, 40, 0.55)}"/><path class="h2" d="${humps(14, 28, 0.62)}"/></svg><div class="g-sun" aria-hidden="true">${SUN_SVG}</div><div class="garden-soil"></div><svg class="garden-grass" viewBox="0 0 400 16" preserveAspectRatio="none" aria-hidden="true"><path d="${grass}"/></svg>${motes}<div class="g-toast" role="status" aria-live="polite"></div>`;
        const toast = bed.querySelector('.g-toast');
        const tip = document.createElement('div'); tip.className = 'garden-tip';
        tip.innerHTML = '<span class="gt-text"></span><span class="garden-meter" aria-hidden="true"><i></i></span>'
            + '<div class="g-hl"><span class="g-stats g-stats-main"></span><button class="g-reset" type="button">start over</button></div>'
            + '<button class="g-notes-btn" type="button" aria-expanded="false" aria-controls="gardenNotes">garden notes</button>'
            + '<div class="g-notes" id="gardenNotes" hidden><span class="g-stats g-stats-more"></span><span class="g-badges" role="list" aria-label="Garden badges"></span></div>';
        /* v10: stats and badges stay one tap away instead of always on screen */
        (() => { const nb = tip.querySelector('.g-notes-btn'), nd = tip.querySelector('.g-notes'); nb.addEventListener('click', e => { e.stopPropagation(); const open = nb.getAttribute('aria-expanded') !== 'true'; nb.setAttribute('aria-expanded', open); nd.hidden = !open; }); })();
        footer.prepend(tip); footer.prepend(bed);
        const txt = tip.querySelector('.gt-text'), meter = tip.querySelector('.garden-meter i'), stats = tip.querySelector('.g-stats-main'), statsMore = tip.querySelector('.g-stats-more'), shelf = tip.querySelector('.g-badges'), resetBtn = tip.querySelector('.g-reset');
        const setHTML = (el, s) => { if (el._h !== s){ el._h = s; el.innerHTML = s; } };

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

        /* --- game state: one place, so loading, saving and "start over" all touch the same things --- */
        const KEY = 'mb-garden-v1';
        const store = {
            get(){ try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch (e){ return null; } },
            set(v){ try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e){} },
            clear(){ try { localStorage.removeItem(KEY); } catch (e){} }
        };
        const freshStats = () => ({ planted: 0, shooed: 0, watered: 0, rare: 0, lost: 0, deer: 0 });
        const P = [], C = [];
        let S = freshStats(), badges = new Set(), fullReached = false, regrowing = false;
        let gen = 0, tick = 0, inView = false, started = false, restoring = false;
        let flashMsg = '', flashT = 0, saveT = 0;
        let cloud = null, deer = null;
        /* "active play" = garden on screen and you interacted with it in the last 90s */
        let play = 0, lastTouch = 0, deerAt = Math.round(rand(8, 14));
        const touched = () => { lastTouch = Date.now(); };
        let nextPest = 9, nextFriend = 7, nextCloud = 25, nextSun = 6, sunUntil = 0;

        const BADGES = {
            sprout: ['first sprout', 'plant your first flower', 'fl-bloom', '#8db36a'],
            thumb: ['green thumb', 'plant 25 flowers by hand', 'fl-leaf', '#6e9a4c'],
            full: ['full bloom', 'grow the garden to full bloom', 'fl-bloom', '#f4a7bf'],
            care: ['caretaker', 'water 5 thirsty plants', 'fl-daisy', '#7fbfdc'],
            rain: ['rainmaker', act + ' a cloud to make it rain', 'fl-daisy', '#9fbde6'],
            guard: ['garden guardian', 'shoo away 5 hungry visitors', 'fl-forsythia', '#f2c230'],
            rare: ['starbloom finder', 'grow a rare starbloom', 'fl-bloom', '#f79cc0'],
            pollen: ['pollinator pal', 'let a butterfly sprout a seedling', 'fl-daisy', '#c9b2ec'],
            deer: ['brave gardener', 'chase a deer out of the garden', 'fl-forsythia', '#d9a877'],
            regrow: ['second spring', 'regrow to full bloom after a deer visit', 'fl-bloom', '#e9789f']
        };
        function loadState(){
            const s = store.get(); if (!s || typeof s !== 'object') return null;
            S = Object.assign(freshStats(), s.stats || {});
            badges = new Set((s.badges || []).filter(k => BADGES[k]));
            fullReached = !!s.full; regrowing = !!s.regrowing;
            return s;
        }
        function snapshot(){
            return { v: 2, plants: P.filter(p => p.state !== 'gone').map(p => ({ x: +p.x.toFixed(2), row: p.row, inner: p.inner, H: +p.H.toFixed(1), h: +p.h.toFixed(1), flower: p.flower, rare: p.rare, color: p.color })),
                stats: S, badges: [...badges], full: fullReached, regrowing };
        }
        function save(){ clearTimeout(saveT); saveT = setTimeout(flushSave, 600); }
        function flushSave(){ clearTimeout(saveT); saveT = 0; if (started) store.set(snapshot()); }
        addEventListener('pagehide', () => { if (saveT) flushSave(); });

        const live = () => P.filter(p => p.state !== 'gone');
        const count = () => live().length;
        const bedW = () => bed.clientWidth || 800;
        const gapOf = row => ROWS[row].gap * (bedW() < 600 ? 1.35 : 1);
        const rowCap = row => Math.max(4, Math.floor(bedW() * 0.94 / gapOf(row)));
        const CAP = () => rowCap('back') + rowCap('mid') + rowCap('front');
        const GOAL = Math.max(24, Math.min(60, Math.round(CAP() * 0.3)));
        /* 0 fresh soil, 1 first sprouts, 2 filling in, 3 lush, 4 full bloom, 5 overflowing */
        const stageOf = n => n === 0 ? 0 : n < 8 ? 1 : n < GOAL * 0.55 ? 2 : n < GOAL ? 3 : n < Math.round(GOAL * 1.35) ? 4 : 5;
        const nameOf = p => p.rare ? 'starbloom' : p.flower ? 'flower' : 'plant';
        const lifeSpan = flower => rand(150, 260) * (flower ? 1 : 1.5);

        /* --- badges --- */
        const toastQ = []; let toasting = false, toastT = 0;
        function award(k){ if (badges.has(k)) return; badges.add(k); toastQ.push(`<span class="g-badge">${FLI}</span><span>badge unlocked: <b>${BADGES[k][0]}</b></span>`); runToast(); save(); }
        function notice(html){ toastQ.unshift(html); runToast(); }
        function runToast(){
            if (toasting || !toastQ.length) return; toasting = true;
            toast.innerHTML = toastQ.shift();
            toast.classList.remove('show'); void toast.offsetWidth; toast.classList.add('show');
            toastT = setTimeout(() => { toast.classList.remove('show'); toastT = setTimeout(() => { toasting = false; runToast(); }, 450); }, 2700);
        }
        function checkBadges(){ if (S.planted >= 1) award('sprout'); if (S.planted >= 25) award('thumb'); if (S.watered >= 5) award('care'); if (S.shooed >= 5) award('guard'); }
        function renderShelf(){
            setHTML(shelf, Object.keys(BADGES).map(k => {
                const b = BADGES[k], on = badges.has(k);
                return `<span class="g-bdg${on ? ' on' : ''}" role="listitem" title="${b[0]}: ${b[1]}" aria-label="${b[0]}, ${on ? 'unlocked' : 'locked'}: ${b[1]}" style="--bc:${b[3]}"><svg viewBox="-50 -50 100 100" aria-hidden="true"><use href="#${b[2]}" x="-50" y="-50" width="100" height="100"/></svg></span>`;
            }).join(''));
        }

        /* layered planting: pick the emptiest row (with a little randomness), then the nearest open gap in it */
        function findSpot(xPct, prefer){
            const W = bedW(), all = live(), fill = r => all.filter(p => p.row === r).length / rowCap(r);
            const order = Object.keys(ROWS).map(r => [r, fill(r) + Math.random() * 0.2 - (r === prefer ? 1 : 0)]).sort((a, b) => a[1] - b[1]).map(a => a[0]);
            for (const row of order){
                const minPct = gapOf(row) / W * 100, taken = all.filter(p => p.row === row).map(p => p.x);
                for (let k = 0; k <= 60; k++){
                    const x = xPct + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.45;
                    if (x < 3 || x > 97) continue;
                    if (taken.every(t => Math.abs(t - x) >= minPct)) return { x, row };
                }
            }
            return null;
        }
        function fxEl(cls, x, y, style){
            const el = document.createElement('span'); el.className = 'g-fx ' + cls;
            el.style.left = f1(x) + 'px'; el.style.top = f1(y) + 'px'; if (style) el.style.cssText += ';' + style;
            bed.appendChild(el); return el;
        }
        function fx(cls, x, y, frames, dur, delay, o){
            if (reduce) return;
            o = o || {};
            const el = fxEl(cls, x, y, o.style);
            el.animate(frames, { duration: dur, delay: delay || 0, easing: o.easing || 'cubic-bezier(0.22,1,0.36,1)', fill: 'backwards' }).onfinish = () => { el.remove(); if (o.done) o.done(); };
        }
        function headOf(p){ const b = bed.getBoundingClientRect(), r = p.el.getBoundingClientRect(); return { x: r.left - b.left + r.width / 2, y: r.top - b.top }; }
        function sparkles(x, y, n){
            if (reduce) return;
            for (let k = 0; k < n; k++){ const sp = document.createElement('span'); sp.className = 'g-sparkle'; sp.style.left = f1(x + rand(-22, 22)) + 'px'; sp.style.top = f1(y + rand(-26, 6)) + 'px'; sp.style.animationDelay = (k * 0.07) + 's'; bed.appendChild(sp); setTimeout(() => sp.remove(), 1700); }
        }
        /* petals tumble off a plant that is being eaten */
        function shedPetals(p, n){
            if (reduce || !p.el.isConnected) return;
            const hd = headOf(p);
            for (let k = 0; k < n; k++){
                const dx = rand(-28, 28), dy = rand(30, 70);
                fx('g-petal', hd.x + rand(-8, 8), hd.y + rand(2, 14), [
                    { transform: 'translate(0,0) rotate(0deg)', opacity: 1 },
                    { transform: `translate(${f1(dx * 0.6)}px,${f1(dy * 0.35)}px) rotate(${f1(rand(-200, 200))}deg)`, opacity: 1, offset: 0.45 },
                    { transform: `translate(${f1(dx)}px,${f1(dy)}px) rotate(${f1(rand(-400, 400))}deg)`, opacity: 0 }
                ], rand(900, 1400), k * 40, { style: '--pc:' + (p.color || '#f4a7bf'), easing: 'ease-in' });
            }
        }
        function minusPop(p){ if (!p.el.isConnected) return; const hd = headOf(p), el = fxEl('g-minus', hd.x, hd.y - 4); el.textContent = '−1'; setTimeout(() => el.remove(), 1200); }

        /* plant something; opts.preset restores a saved plant exactly, opts.quiet skips the HUD refresh */
        function plant(xPct, delay, type, opts){
            opts = opts || {};
            let spot, m, rare = false;
            if (opts.preset){
                const s = opts.preset; spot = { x: +s.x, row: ROWS[s.row] ? s.row : 'front' };
                m = { isFlower: !!s.flower, h: +s.h, H: +s.H, inner: s.inner, color: s.color || '#f4a7bf' }; rare = !!s.rare;
            } else {
                spot = findSpot(xPct, opts.row); if (!spot) return null;
                type = type || pickType(spot.row);
                rare = !opts.noRare && FLOWER_TYPES.includes(type) && Math.random() < 0.05;
                m = plantMarkup(type, rare, spot.row);
            }
            const pl = document.createElement('div');
            pl.className = 'g-plant row-' + spot.row + (rare ? ' rare' : ''); pl.style.left = spot.x + '%';
            pl.style.setProperty('--d', delay + 's'); pl.style.setProperty('--sd', f1(-Math.random() * 4) + 's');
            pl.style.setProperty('--l', (m.h + 24).toFixed(0)); pl.style.setProperty('--droop', f1((Math.random() < 0.5 ? -1 : 1) * rand(7, 12)) + 'deg');
            pl.innerHTML = `<div class="g-life"><div class="g-sway"><svg viewBox="0 0 40 ${f1(m.H)}" width="40" height="${f1(m.H)}" aria-hidden="true">${m.inner}</svg></div></div>`;
            bed.appendChild(pl);
            const p = { el: pl, x: spot.x, row: spot.row, flower: m.isFlower, rare, inner: m.inner, H: +m.H, h: +m.h, color: m.color, state: 'grow', age: 0, life: lifeSpan(m.isFlower), thirst: 0, targeted: false };
            P.push(p);
            requestAnimationFrame(() => pl.classList.add('grow'));
            if (!opts.preset){
                const W = bed.clientWidth, bx = spot.x / 100 * W, by = bed.clientHeight - ROWS[spot.row].y - 3;
                for (let k = 0; k < 6; k++){ const dx = rand(-16, 16), dy = rand(-14, -4); fx('dirt', bx, by, [{ transform: 'translate(0,0) scale(1)', opacity: 1 }, { transform: `translate(${f1(dx)}px,${f1(dy)}px) scale(.4)`, opacity: 0 }], rand(500, 800), delay * 1000); }
            }
            const g = gen;
            setTimeout(() => {
                if (g !== gen || p.state !== 'grow') return;
                p.state = 'bloom'; pl.classList.add('bloomed');
                if (!reduce && p.flower && inView && !opts.preset){ const hd = headOf(p); fx('bloom-ring' + (rare ? ' rare-ring' : ''), hd.x, hd.y + 12, [{ opacity: 1 }, { opacity: 1 }], 950); }
            }, delay * 1000 + 1500);
            if (rare && !opts.preset){ S.rare++; award('rare'); flash(`a rare starbloom sprouted — it shimmers through every color ${FLI}`, 3600); }
            if (!opts.quiet) updateHud();
            save();
            return p;
        }
        /* how: 'eaten' | 'withered' (both count as lost and visibly drop the count right away) */
        function removePlant(p, how){
            if (p.state === 'gone') return;
            if (how === 'eaten') shedPetals(p, p.flower ? 9 : 4);
            minusPop(p);
            p.state = 'gone'; p.targeted = false; S.lost++;
            p.el.classList.remove('thirsty', 'nibbled', 'saved'); p.el.classList.add(how);
            setTimeout(() => { p.el.remove(); const i = P.indexOf(p); if (i > -1) P.splice(i, 1); }, how === 'eaten' ? 1100 : 1550);
            updateHud(); save();
        }
        function refresh(p){ p.state = 'bloom'; p.age = 0; p.thirst = 0; p.life = lifeSpan(p.flower); p.el.classList.remove('thirsty'); }
        function water(p){
            refresh(p); S.watered++;
            if (!reduce){ const hd = headOf(p); for (let k = 0; k < 6; k++){ const ox = rand(-14, 14); fx('drop', hd.x + ox, hd.y - 26, [{ transform: 'translate(0,0)', opacity: 0 }, { transform: 'translate(0,8px)', opacity: 1, offset: 0.3 }, { transform: 'translate(0,34px)', opacity: 0 }], rand(600, 850), k * 60); } }
            flash('watered — it perked right back up ' + FLI, 2200); save();
        }

        /* --- HUD: urgent things (deer, pests, events, thirst) win over the progress story --- */
        function flash(msg, ms){ flashMsg = msg; clearTimeout(flashT); flashT = setTimeout(() => { flashMsg = ''; updateHud(); }, ms || 3000); updateHud(); }
        const PEST_MSG = {
            bunny: `a hungry bunny hopped in — <b>${act} it</b> before it starts nibbling`,
            bird: `a bird swooped down for a snack — <b>${act} it</b> to scare it off`,
            snail: `a snail is creeping toward your flowers — <b>${act} it</b> to shoo it`,
            caterpillar: `a caterpillar is inching in for lunch — <b>${act} it</b> to shoo it`
        };
        const STAGE_MSG = [
            () => `fresh soil ${FLI} ${act} anywhere to plant your first seeds`,
            n => `first sprouts are up — keep planting <b>${n}</b> / ${GOAL}`,
            n => `the garden is filling in <b>${n}</b> / ${GOAL}`,
            n => `it's getting lush — <b>${GOAL - n}</b> more for full bloom`,
            () => `full bloom ${FLI} keep it watered and watch for hungry visitors`,
            () => `overflowing with flowers ${FLI} the butterflies are thrilled`
        ];
        function hudText(n, st){
            if (deer && deer.state !== 'leaving'){
                const t = deer.hp + ' more time' + (deer.hp === 1 ? '' : 's');
                return deer.state === 'coming' || deer.state === 'eyeing' ? `a little visitor is here — a hungry deer! <b>${act} it ${t}</b> to chase it off` : `the deer is nibbling its way through the garden — <b>${act} it ${t}</b>`;
            }
            const pest = C.find(c => c.pest && c.kind !== 'deer' && c.state !== 'leaving');
            if (pest) return PEST_MSG[pest.kind];
            if (flashMsg) return flashMsg;
            const thirsty = P.filter(p => p.state === 'thirsty').length;
            if (thirsty) return `${thirsty === 1 ? 'a plant is' : thirsty + ' plants are'} thirsty — <b>${act} the drooping ${thirsty === 1 ? 'one' : 'ones'}</b> to water`;
            if (cloud) return cloud.raining ? `rain! everything underneath is getting a drink ${FLI}` : `a little cloud is drizzling — <b>${act} it</b> for a proper shower`;
            if (regrowing && n < GOAL) return `the deer left a bare patch — replant to bring it back <b>${n}</b> / ${GOAL}`;
            return STAGE_MSG[st](n);
        }
        function updateHud(){
            checkBadges();
            const n = count(), st = stageOf(n);
            if (bed.dataset.stage !== String(st)) bed.dataset.stage = st;
            if (!fullReached && n >= GOAL && started && !restoring){ fullReached = true; award('full'); const again = regrowing; if (regrowing){ regrowing = false; award('regrow'); } celebrate(again); save(); }
            meter.style.width = Math.min(100, n / GOAL * 100) + '%';
            setHTML(stats, `growing <b>${n}</b> &middot; planted <b>${S.planted}</b>`);
            setHTML(statsMore, `watered <b>${S.watered}</b> &middot; shooed <b>${S.shooed}</b> &middot; starblooms <b>${S.rare}</b> &middot; lost <b>${S.lost}</b>`);
            renderShelf();
            tip.classList.toggle('alert', C.some(c => c.pest && c.state !== 'leaving'));
            setHTML(txt, hudText(n, st));
        }
        function celebrate(again){
            const r = bed.getBoundingClientRect();
            for (let k = 0; k < 5; k++) setTimeout(() => burstAt(r.left + r.width * (0.15 + k * 0.175), r.top + r.height * 0.45, 9), k * 160);
            flash(again ? `second spring ${FLI} the garden is back in full bloom` : `full bloom ${FLI} your garden is complete — keep it safe from hungry visitors`, 5000);
        }

        /* --- input --- */
        bed.addEventListener('click', e => {
            touched();
            const pe = e.target.closest('.g-plant.thirsty');
            if (pe){ const p = P.find(q => q.el === pe); if (p && p.state === 'thirsty') return water(p); }
            const r = bed.getBoundingClientRect(), cx = ((e.clientX - r.left) / r.width) * 100; let got = 0;
            [[0, 0], [-rand(2, 4), 0.14], [rand(2, 4), 0.26], [rand(-7, 7), 0.4]].forEach(([dx, d]) => { if (plant(cx + dx, reduce ? 0 : d, null, { quiet: true })) got++; });
            if (got){ sparkles(e.clientX - r.left, e.clientY - r.top, 6); S.planted += got; updateHud(); save(); }
            else flash('this patch is packed — try a barer spot', 2000);
        });
        bed.addEventListener('keydown', e => {
            if (e.target !== bed || (e.key !== 'Enter' && e.key !== ' ')) return; e.preventDefault(); touched();
            const t = P.find(p => p.state === 'thirsty'); if (t) return water(t);
            let got = 0; for (let k = 0; k < 3; k++) if (plant(rand(5, 95), reduce ? 0 : k * 0.15, null, { quiet: true })) got++;
            if (got){ S.planted += got; updateHud(); save(); }
        });

        /* start over: two-step confirm, then wipe every part of the game (not just the visible plants) */
        let armed = false, armT = 0;
        const disarm = () => { armed = false; clearTimeout(armT); resetBtn.textContent = 'start over'; resetBtn.classList.remove('armed'); };
        resetBtn.addEventListener('click', e => {
            e.stopPropagation();
            if (!armed){ armed = true; resetBtn.textContent = 'erase the whole garden? ' + act + ' again'; resetBtn.classList.add('armed'); armT = setTimeout(disarm, 3500); return; }
            disarm(); resetGame();
        });
        resetBtn.addEventListener('blur', disarm);
        function resetGame(){
            gen++;
            P.forEach(p => { p.state = 'gone'; p.el.remove(); }); P.length = 0;
            S = freshStats(); badges = new Set(); fullReached = false; regrowing = false;
            C.slice().forEach(dropCritter); deer = null; bed.classList.remove('deer-alert');
            if (cloud){ if (cloud.tok) cloud.tok.stop = true; cloud.el.remove(); cloud = null; }
            setSunny(false);
            bed.querySelectorAll('.g-fx, .g-sparkle, .shoo-pop').forEach(el => el.remove());
            toastQ.length = 0; clearTimeout(toastT); toasting = false; toast.classList.remove('show');
            clearTimeout(flashT); flashMsg = '';
            tick = 0; nextPest = 9; nextFriend = 7; nextCloud = 25; nextSun = 6; sunUntil = 0; play = 0; lastTouch = 0; deerAt = Math.round(rand(20, 30));
            started = true; bed.classList.add('grown');
            store.clear(); flushSave();
            flash(`fresh soil ${FLI} a brand-new garden — ${act} anywhere to plant`, 3600);
        }

        /* a breeze follows the cursor: plants lean the way you sweep across them */
        if (!reduce && hoverable){
            let wind = 0, wRun = false, lastX = null;
            const windLoop = () => { wind *= 0.93; bed.style.setProperty('--lean', wind.toFixed(2) + 'deg'); if (Math.abs(wind) > 0.05) requestAnimationFrame(windLoop); else { wRun = false; bed.style.setProperty('--lean', '0deg'); } };
            bed.addEventListener('mousemove', e => {
                if (lastX !== null) wind = Math.max(-14, Math.min(14, wind + (e.clientX - lastX) * 0.12));
                lastX = e.clientX; if (!wRun){ wRun = true; requestAnimationFrame(windLoop); }
            });
            bed.addEventListener('mouseleave', () => { lastX = null; });
        }

        /* first visit only: a small starter patch. A saved garden (even an empty one after "start over") is restored exactly. */
        function seedStarter(){ const n = innerWidth < 700 ? 6 : 10; for (let i = 0; i < n; i++) plant(8 + i * (84 / (n - 1)) + rand(-2, 2), reduce ? 0 : i * 0.08, null, { quiet: true, noRare: true }); }
        const initial = loadState();
        function start(){
            started = true; bed.classList.add('grown'); restoring = true;
            if (initial){
                const keep = (initial.plants || []).filter(s => s && typeof s.inner === 'string' && isFinite(s.x) && isFinite(s.H));
                keep.forEach((s, i) => plant(s.x, reduce ? 0 : Math.min(i * 0.03, 1.4), null, { quiet: true, preset: s }));
                if (keep.length) flash('welcome back — your garden is right where you left it ' + FLI, 3200);
            } else seedStarter();
            restoring = false;
            if (count() >= GOAL) fullReached = true;
            updateHud();
        }
        new IntersectionObserver(es => es.forEach(e => {
            inView = e.isIntersecting; bed.classList.toggle('awake', inView);
            if (inView && !started) start();
        }), { threshold: 0.25 }).observe(bed);
        updateHud();

        /* --- critters --- */
        SVG.caterpillar = '<svg viewBox="0 0 44 22"><g class="cat-segs">' + [6, 12, 18, 24, 30].map((x, k) => `<circle cx="${x}" cy="15" r="5.4" fill="${k % 2 ? '#b6d88f' : '#9cc27a'}"/><circle cx="${x}" cy="20.5" r="1.3" fill="#6e9a4c"/>`).join('') + '</g><path d="M35 5 L33 0.5 M39 5 L41 0.5" stroke="#6e9a4c" stroke-width="1.2" stroke-linecap="round"/><circle cx="33" cy="0.8" r="1.3" fill="#f4a7bf"/><circle cx="41" cy="0.8" r="1.3" fill="#f4a7bf"/><circle cx="37" cy="11" r="7" fill="#8db36a"/><circle cx="39.5" cy="9.5" r="1.4" fill="#5a4366"/><circle cx="40" cy="13.4" r="1.6" fill="#f9c6d6" opacity=".9"/><path d="M41.5 12 Q43 13 41.8 14" stroke="#5a4366" stroke-width=".9" fill="none"/></svg>';
        /* a spotted fawn, side view facing right. Legs and head are their own groups so they can walk and nibble. */
        const leg = (x, top, fill, cls) => `<g class="leg ${cls}" style="transform-origin:${x + 2.5}px ${top}px"><rect x="${x}" y="${top}" width="5" height="${84 - top}" rx="2.5" fill="${fill}"/><rect x="${x - 0.3}" y="80.5" width="5.6" height="5" rx="1.8" fill="#5a3f33"/></g>`;
        SVG.deer = '<svg viewBox="0 0 100 90">'
            + leg(27, 54, '#b47a4c', 'la') + leg(61, 54, '#b47a4c', 'lb')
            + '<path d="M21 45 Q13 41 15 34 Q19 38 24 40Z" fill="#c98f5e"/><path d="M15.5 36.5 Q14 35 15 34 Q17 36.5 18.5 37.5Z" fill="#fff7ec"/>'
            + '<ellipse cx="44" cy="47" rx="25" ry="12.5" fill="#c98f5e"/><ellipse cx="46" cy="54" rx="16" ry="5" fill="#f1dcc2"/>'
            + '<circle cx="30" cy="42" r="2.1" fill="#fff7ec"/><circle cx="37.5" cy="39.5" r="2" fill="#fff7ec"/><circle cx="45.5" cy="41" r="2.2" fill="#fff7ec"/><circle cx="53" cy="39.5" r="1.8" fill="#fff7ec"/><circle cx="35" cy="46" r="1.5" fill="#fff7ec"/><circle cx="49" cy="45.5" r="1.6" fill="#fff7ec"/><circle cx="41" cy="44" r="1.2" fill="#fff7ec"/>'
            + leg(33, 55, '#c98f5e', 'lb') + leg(55, 55, '#c98f5e', 'la')
            + '<g class="deer-head">'
            + '<path d="M57 45 Q61 31 70 22 L78 26 Q71 36 68 50Z" fill="#c98f5e"/><path d="M66 48 Q69 37 75.5 28.5 L77.5 30.5 Q72 39 69.5 49Z" fill="#f1dcc2"/>'
            + '<g class="deer-ear e1"><ellipse cx="70" cy="13" rx="3.8" ry="8.5" transform="rotate(-38 70 13)" fill="#b47a4c"/></g>'
            + '<ellipse cx="79" cy="20" rx="9.5" ry="7.8" fill="#c98f5e"/>'
            + '<path d="M84 15.5 Q93 18 93.5 22.5 Q92.5 27 84 27Z" fill="#c98f5e"/><ellipse cx="89" cy="23.6" rx="4.6" ry="3.4" fill="#f1dcc2"/><ellipse cx="93" cy="21.8" rx="2.1" ry="1.7" fill="#3a2b33"/>'
            + '<g class="deer-ear e2"><ellipse cx="76" cy="9.5" rx="4.2" ry="9" transform="rotate(-16 76 9.5)" fill="#c98f5e"/><ellipse cx="76.2" cy="10" rx="2" ry="6" transform="rotate(-16 76.2 10)" fill="#f9c6d6"/></g>'
            + '<circle cx="81" cy="18" r="2.6" fill="#2e2236"/><circle cx="82" cy="17" r="0.95" fill="#fff"/><path d="M78.6 15.4 L77.6 14.4 M80 14.8 L79.6 13.6" stroke="#2e2236" stroke-width=".7" stroke-linecap="round"/>'
            + '<ellipse cx="82.5" cy="23.5" rx="2.4" ry="1.4" fill="#f4a7bf" opacity=".7"/></g></svg>';
        window.__deerSVG = SVG.deer;
        const SIZES = { bunny: [46, 40], snail: [40, 26], bird: [36, 29], flutter: [26, 22], caterpillar: [44, 22], deer: [108, 97] };
        const SPEED = { bunny: 150, snail: 42, caterpillar: 34 };
        const EAT_MS = { bunny: 2400, bird: 2200, snail: 3800, caterpillar: 3400 };
        const FLEE = { bunny: 'bolted for the hedge', bird: 'flapped away', snail: 'slid off in a huff', caterpillar: 'inched away' };
        function makeCritter(kind){
            const [w, h] = SIZES[kind], el = document.createElement('div');
            el.className = 'critter ' + kind; el.innerHTML = `<div class="c-flip"><div class="c-body">${SVG[kind]}</div></div>`;
            bed.appendChild(el);
            const c = { el, kind, w: el.offsetWidth || w, h: el.offsetHeight || h, x: 0, y: 0, state: 'coming', pest: kind !== 'flutter', tok: null, timer: 0, shed: 0, munch: 0, meals: 0 };
            if (c.pest){
                el.setAttribute('role', 'button'); el.setAttribute('tabindex', '0'); el.setAttribute('aria-label', kind === 'deer' ? 'Chase off the deer' : 'Shoo the ' + kind);
                const hit = e => { e.stopPropagation(); touched(); if (kind === 'deer') hitDeer(c); else leave(c, true); };
                el.addEventListener('click', hit);
                el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); hit(e); } });
            }
            C.push(c); return c;
        }
        const setPos = c => { c.el.style.transform = `translate(${f1(c.x)}px,${f1(c.y)}px)`; };
        const groundY = c => bed.clientHeight - 6 - c.h;
        function go(c, x1, y1, speed, arc, done, wobble){
            if (c.tok) c.tok.stop = true;
            const x0 = c.x, y0 = c.y, dur = Math.max(250, Math.hypot(x1 - x0, y1 - y0) / speed * 1000), linear = c.kind !== 'bird' && c.kind !== 'flutter';
            if (Math.abs(x1 - x0) > 2) c.el.classList.toggle('left-facing', x1 < x0);
            if (reduce){ const tok = c.tok = { stop: false }; setTimeout(() => { if (tok.stop) return; c.x = x1; c.y = y1; setPos(c); if (done) done(); }, Math.min(dur, 700)); return; }
            c.el.classList.add('moving');
            c.tok = tween(dur, t => {
                const e = linear ? t : ease(t);
                c.x = x0 + (x1 - x0) * e; c.y = y0 + (y1 - y0) * e - Math.sin(Math.PI * t) * arc + (wobble ? Math.sin(t * dur / 110) * wobble : 0);
                setPos(c);
            }, () => { c.el.classList.remove('moving'); if (done) done(); });
        }
        function dropCritter(c){
            if (c.tok) c.tok.stop = true; clearTimeout(c.timer); clearInterval(c.shed); clearInterval(c.munch);
            c.el.remove(); const i = C.indexOf(c); if (i > -1) C.splice(i, 1);
            if (deer === c){ deer = null; bed.classList.remove('deer-alert'); }
            updateHud();
        }
        const edible = p => (p.state === 'bloom' || p.state === 'thirsty') && !p.targeted;
        function walkTo(c, hx){ go(c, c.x + c.w / 2 < hx ? hx - c.w + 6 : hx - 6, c.y, SPEED[c.kind], 0, () => arrive(c)); }

        function spawnPest(only){
            const opts = P.filter(edible); if (!opts.length) return;
            const kind = only || pick(['bunny', 'bunny', 'bird', 'bird', 'snail', 'caterpillar']);
            const tasty = opts.filter(p => p.flower), target = pick(tasty.length ? tasty : opts);
            const c = makeCritter(kind), W = bed.clientWidth, hd = headOf(target);
            c.target = target; target.targeted = true;
            if (kind === 'bird'){
                c.fromLeft = Math.random() < 0.5; c.x = c.fromLeft ? -c.w - 10 : W + 10; c.y = rand(-40, -12); setPos(c);
                go(c, c.fromLeft ? hd.x - c.w + 5 : hd.x - 5, Math.max(0, hd.y - c.h + 9), 230, -35, () => arrive(c));
            } else {
                c.fromLeft = kind === 'bunny' ? Math.random() < 0.5 : hd.x < W / 2;
                c.x = c.fromLeft ? -c.w - 10 : W + 10; c.y = groundY(c); setPos(c); walkTo(c, hd.x);
            }
            updateHud();
        }
        /* eating: the plant shakes and sheds petals, then is eaten (visibly disappears, count drops). Bunnies go back for seconds. */
        function arrive(c){
            if (c.state !== 'coming') return;
            const t = c.target;
            if (!t || t.state === 'gone') return leave(c, false);
            c.state = 'eating'; c.el.classList.add('eating'); t.el.classList.add('nibbled'); updateHud();
            if (!reduce) c.shed = setInterval(() => shedPetals(t, 1), 480);
            c.timer = setTimeout(() => {
                if (c.state !== 'eating') return;
                clearInterval(c.shed); c.el.classList.remove('eating');
                if (t.state !== 'gone'){ removePlant(t, 'eaten'); flash(`the ${c.kind} ate a ${nameOf(t)} — ${act} the soil to regrow it`, 3000); }
                c.meals++;
                if (c.kind === 'bunny' && c.meals < 3){
                    const W = bed.clientWidth, cx = c.x + c.w / 2;
                    const next = P.filter(p => edible(p) && Math.abs(p.x / 100 * W - cx) < W * 0.18).sort((a, b) => Math.abs(a.x / 100 * W - cx) - Math.abs(b.x / 100 * W - cx))[0];
                    if (next){ c.target = next; next.targeted = true; c.state = 'coming'; walkTo(c, headOf(next).x); updateHud(); return; }
                }
                leave(c, false);
            }, EAT_MS[c.kind]);
        }
        function shooFx(c, text){
            const pop = document.createElement('span'); pop.className = 'shoo-pop'; pop.innerHTML = text + ' ' + FLI;
            pop.style.left = f1(Math.max(44, Math.min(bed.clientWidth - 44, c.x + c.w / 2))) + 'px'; pop.style.top = f1(Math.max(4, c.y - 22)) + 'px';
            bed.appendChild(pop); setTimeout(() => pop.remove(), 1200);
            for (let k = 0; k < 7; k++){ const a = (k / 7) * Math.PI * 2, d = rand(16, 30); fx('puff', c.x + c.w / 2, c.y + c.h - 4, [{ transform: 'translate(-50%,-50%) scale(.4)', opacity: 0.9 }, { transform: `translate(calc(-50% + ${f1(Math.cos(a) * d)}px), calc(-50% + ${f1(Math.sin(a) * d * 0.5 - 6)}px)) scale(1.3)`, opacity: 0 }], rand(450, 650)); }
        }
        function leave(c, scared){
            if (c.state === 'leaving') return;
            c.state = 'leaving'; clearTimeout(c.timer); clearInterval(c.shed); c.el.classList.remove('eating');
            const t = c.target;
            if (t && t.state !== 'gone'){
                t.targeted = false; t.el.classList.remove('nibbled');
                if (scared){ t.el.classList.add('saved'); setTimeout(() => t.el.classList.remove('saved'), 900); if (inView){ const hd = headOf(t); sparkles(hd.x, hd.y + 8, 5); } }
            }
            if (scared){ S.shooed++; shooFx(c, 'shoo!'); flash(`saved! the ${c.kind} ${FLEE[c.kind]} ${FLI}`, 2400); save(); }
            const W = bed.clientWidth, back = c.x + c.w / 2 < W / 2 ? -c.w - 30 : W + 30;
            const run = () => {
                if (!c.el.isConnected) return; c.el.classList.remove('startled');
                if (c.kind === 'bird') go(c, back, -60, scared ? 520 : 260, 25, () => dropCritter(c));
                else go(c, back, c.y, scared ? { bunny: 430, snail: 150, caterpillar: 130 }[c.kind] : SPEED[c.kind] * 1.1, 0, () => dropCritter(c));
            };
            if (scared && !reduce){ if (c.tok) c.tok.stop = true; c.el.classList.add('startled'); setTimeout(run, 320); } else run();
            updateHud();
        }

        /* friendly butterfly: visits blooms and sometimes pollinates a new seedling nearby */
        function spawnFlutter(){
            const c = makeCritter('flutter'), W = bed.clientWidth;
            c.fromLeft = Math.random() < 0.5; c.x = c.fromLeft ? -30 : W + 10; c.y = rand(70, 110); setPos(c);
            let visits = 0;
            const next = () => {
                if (!c.el.isConnected) return;
                const opts = P.filter(p => p.state === 'bloom' && p.flower);
                if (visits >= 3 || !opts.length){ c.state = 'leaving'; return go(c, c.fromLeft ? W + 40 : -40, 40, 90, 20, () => dropCritter(c), 6); }
                const p = pick(opts), hd = headOf(p);
                go(c, hd.x - c.w / 2, Math.max(0, hd.y - c.h + 6), 85, 30, () => {
                    visits++; c.el.classList.add('perch');
                    setTimeout(() => {
                        if (!c.el.isConnected) return;
                        c.el.classList.remove('perch');
                        if (p.state === 'bloom' && Math.random() < 0.45){
                            const seedling = plant(p.x + (Math.random() < 0.5 ? -1 : 1) * rand(3, 8), 0, null, { quiet: true });
                            if (seedling){ award('pollen'); flash('a butterfly pollinated a flower — a new seedling sprouted ' + FLI, 2800); }
                        }
                        next();
                    }, rand(1400, 2200));
                }, 6);
            };
            next();
        }

        /* --- deer: a gentle but hungry visitor. It walks in, pauses to look around, then works across the bed
               stop by stop: walk to the next plants, lower its head, nibble, and those plants are gone (removed from
               the game state, so the count, stage and full-bloom progress all drop). Then it walks out so you can
               replant. Three clicks/taps chase it off early. Lifetime stats and badges survive a visit.
               Timing: first visit after ~20-30s of active play (needs plants to eat), then every ~45-60s. --- */
        const narrowBed = () => bed.clientWidth < 600;
        const deerReach = () => narrowBed() ? 30 : 44;
        const deerSpeed = () => narrowBed() ? 55 : 72;
        const mouthX = c => c.fromLeft ? c.x + c.w * 0.93 : c.x + c.w * 0.07;
        function spawnDeer(){
            if (deer || !started || !count()) return;
            const c = makeCritter('deer'), W = bed.clientWidth; deer = c;
            c.hp = 3; c.ate = 0; c.stops = 0; c.prey = []; c.startN = count(); c.fromLeft = Math.random() < 0.5;
            c.y = groundY(c);
            /* on phones the whole path stays inside the bed: it fades in at the edge instead of walking in from off-screen */
            const inside = narrowBed();
            c.x = c.fromLeft ? (inside ? 2 : -c.w - 10) : (inside ? W - c.w - 2 : W + 10);
            c.el.classList.toggle('left-facing', !c.fromLeft);
            if (inside){ c.el.classList.add('faded'); requestAnimationFrame(() => requestAnimationFrame(() => c.el.classList.remove('faded'))); }
            setPos(c);
            bed.classList.add('deer-alert');
            notice(`<span class="g-badge">${FLI}</span><span>a little visitor is here</span>`);
            const inX = c.fromLeft ? Math.min(W * 0.06, W - c.w) : Math.max(0, W * 0.94 - c.w);
            go(c, inside ? c.x : inX, c.y, deerSpeed(), 0, () => {
                if (c.state !== 'coming') return;
                c.state = 'eyeing'; c.el.classList.add('sniff'); updateHud();
                c.timer = setTimeout(() => deerNext(c), reduce ? 1200 : 1800);
            });
            updateHud();
        }
        /* walk to the next plants ahead of the deer (in its walking direction), or leave if there are none */
        function deerNext(c){
            if (c.state === 'leaving' || !c.el.isConnected) return;
            c.el.classList.remove('sniff', 'eating'); c.state = 'grazing';
            const W = bed.clientWidth, R = deerReach(), dir = c.fromLeft ? 1 : -1, m = mouthX(c);
            const ahead = P.filter(p => p.state !== 'gone' && p.deerSeen !== c).map(p => p.x / 100 * W).filter(px => (px - m) * dir > -R).sort((a, b) => (a - b) * dir);
            if (!ahead.length || c.stops >= 18) return deerGone(c, false);
            const mouth = ahead[0] + dir * R * 0.7;
            const nx = Math.max(2, Math.min(W - c.w - 2, mouth - (c.fromLeft ? c.w * 0.93 : c.w * 0.07)));
            c.el.classList.toggle('left-facing', !c.fromLeft);
            if (Math.abs(nx - c.x) < 1) deerBite(c);
            else { go(c, nx, c.y, deerSpeed(), 0, () => deerBite(c)); c.el.classList.toggle('left-facing', !c.fromLeft); }
            updateHud();
        }
        function deerBite(c){
            if (c.state === 'leaving') return;
            c.state = 'eating'; c.el.classList.add('eating'); c.stops++;
            const W = bed.clientWidth, R = deerReach(), m = mouthX(c);
            c.prey = P.filter(p => p.state !== 'gone' && p.deerSeen !== c && Math.abs(p.x / 100 * W - m) <= R);
            c.prey.forEach(p => { p.deerSeen = c; p.targeted = true; p.el.classList.add('nibbled'); });
            if (!reduce) c.shed = setInterval(() => c.prey.forEach(p => { if (p.state !== 'gone' && Math.random() < 0.45) shedPetals(p, 1); }), 260);
            c.timer = setTimeout(() => {
                clearInterval(c.shed);
                /* nearly everything in reach is eaten; now and then a plant is lucky */
                c.prey.forEach(p => { if (p.state === 'gone') return; if (Math.random() < 0.92){ removePlant(p, 'eaten'); c.ate++; } else { p.targeted = false; p.el.classList.remove('nibbled'); } });
                c.prey = [];
                if (c.state === 'eating') c.timer = setTimeout(() => deerNext(c), 200);
            }, c.prey.length ? 1150 : 300);
            updateHud();
        }
        function hitDeer(c){
            if (c.state === 'leaving') return;
            c.hp--;
            c.el.classList.remove('startled'); void c.el.offsetWidth; c.el.classList.add('startled');
            if (c.hp <= 0) return deerGone(c, true);
            shooFx(c, c.hp === 1 ? 'one more!' : 'shoo!');
            updateHud();
        }
        function deerGone(c, scared){
            if (c.state === 'leaving') return;
            c.state = 'leaving'; clearTimeout(c.timer); clearInterval(c.shed); c.el.classList.remove('eating', 'sniff');
            c.prey.forEach(p => { if (p.state !== 'gone'){ p.targeted = false; p.el.classList.remove('nibbled'); } }); c.prey = [];
            if (deer === c) deer = null; bed.classList.remove('deer-alert');
            S.deer++; deerAt = play + Math.round(rand(45, 60));
            if (scared){ S.shooed++; award('deer'); shooFx(c, 'off you go!'); }
            if (c.ate >= Math.max(4, c.startN * 0.3)){ regrowing = true; fullReached = false; }
            const pl = n => n + ' plant' + (n === 1 ? '' : 's');
            flash(scared ? (c.ate ? `you chased off the deer — it only got ${pl(c.ate)} ${FLI}` : `you chased off the deer before it took a bite ${FLI}`) : (c.ate ? `the deer ate ${pl(c.ate)} and wandered off — ${act} the soil to replant` : `the deer sniffed around and wandered off ${FLI}`), 5200);
            /* walk (or bolt) out the far side; on phones it stays inside the bed and fades away at the edge */
            const W = bed.clientWidth, inside = narrowBed(), fwd = c.fromLeft;
            const out = inside ? (fwd ? W - c.w - 2 : 2) : (fwd ? W + 30 : -c.w - 30);
            const run = () => {
                if (!c.el.isConnected) return; c.el.classList.remove('startled');
                go(c, out, c.y, scared ? deerSpeed() * 3.6 : deerSpeed() * 1.15, 0, () => {
                    if (!inside) return dropCritter(c);
                    c.el.classList.add('faded'); setTimeout(() => dropCritter(c), 650);
                });
                c.el.classList.toggle('left-facing', !fwd);
            };
            if (c.tok) c.tok.stop = true;
            if (reduce || !scared) run(); else setTimeout(run, 380);
            save(); updateHud();
        }

        /* --- weather: a little sun and a rain cloud take turns --- */
        const CLOUD_SVG = window.__cloudSVG = '<svg viewBox="0 0 110 62" aria-hidden="true"><path class="cl-body" d="M26 54 C12 54 7 41 17 35 C13 22 28 13 39 19 C44 7 65 4 73 17 C84 11 99 19 96 32 C107 35 105 54 91 54 Z"/><circle cx="46" cy="36" r="2.3" fill="#5a4366"/><circle cx="64" cy="36" r="2.3" fill="#5a4366"/><path d="M51 42 Q55 45.5 59 42" stroke="#5a4366" stroke-width="1.6" fill="none" stroke-linecap="round"/><ellipse cx="40" cy="41" rx="3.4" ry="2.2" fill="#f9c6d6"/><ellipse cx="70" cy="41" rx="3.4" ry="2.2" fill="#f9c6d6"/><g class="cl-still" fill="#8cc4e6"><rect x="30" y="62" width="2.4" height="8" rx="1.2"/><rect x="46" y="66" width="2.4" height="10" rx="1.2"/><rect x="62" y="63" width="2.4" height="8" rx="1.2"/><rect x="78" y="67" width="2.4" height="10" rx="1.2"/></g></svg>';
        function setSunny(on){ bed.classList.toggle('sunny', !!on); }
        function rainDrop(x, y, ground, W){
            if (reduce || x < 2 || x > W - 2) return;
            const len = rand(7, 13), el = fxEl('raindrop', x, y, `height:${f1(len)}px;width:${f1(len > 10 ? 2.6 : 2.2)}px`);
            const dist = ground - y - rand(0, 26), dx = -dist * 0.06, op = rand(0.6, 0.92);
            el.animate([{ transform: 'translate(0,0) rotate(3deg)', opacity: 0 }, { opacity: op, offset: 0.15 }, { transform: `translate(${f1(dx)}px,${f1(dist)}px) rotate(3deg)`, opacity: op * 0.8 }], { duration: dist / rand(230, 340) * 1000, easing: 'cubic-bezier(0.4, 0, 1, 1)' }).onfinish = () => {
                el.remove();
                if (Math.random() < 0.35) fx('splash', x + dx, y + dist + len, [{ transform: 'translate(-50%,-50%) scale(.3)', opacity: 0.8 }, { transform: 'translate(-50%,-50%) scale(1.3)', opacity: 0 }], 360);
            };
        }
        function spawnCloud(){
            setSunny(false);
            const W = bed.clientWidth, el = document.createElement('div');
            el.className = 'g-cloud'; el.innerHTML = CLOUD_SVG; el.setAttribute('role', 'button'); el.setAttribute('tabindex', '0'); el.setAttribute('aria-label', 'Make it rain');
            bed.appendChild(el);
            const cw = el.offsetWidth || 110, ch = el.offsetHeight || 62;
            /* the cloud's whole path is inside the bed, so it is never cut off; it fades in and out at the ends */
            const ltr = Math.random() < 0.5, x0 = ltr ? 6 : W - cw - 6, x1 = ltr ? W - cw - 6 : 6;
            const c = { el, x: x0, raining: Math.random() < 0.3, revived: 0, tok: null };
            cloud = c; if (c.raining) el.classList.add('raining');
            const makeRain = e => {
                if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
                e.stopPropagation(); e.preventDefault();
                if (!c.raining){ c.raining = true; el.classList.add('raining'); award('rain'); flash('you made it rain ' + FLI, 2200); }
            };
            el.addEventListener('click', makeRain); el.addEventListener('keydown', makeRain);
            let lastDrop = 0, gap = 60, lastWater = 0;
            const ground = bed.clientHeight - 12;
            c.tok = tween(Math.max(13000, W * 15), t => {
                c.x = x0 + (x1 - x0) * t;
                const y = 9 + Math.sin(t * 14) * 3;
                el.style.transform = `translate(${f1(c.x)}px, ${f1(y)}px)`;
                el.style.opacity = Math.min(1, t / 0.07, (1 - t) / 0.07).toFixed(3);
                if (t < 0.04 || t > 0.96) return;
                const now = performance.now();
                /* always a gentle drizzle under the cloud; a click turns it into a proper shower that waters plants */
                if (now - lastDrop > gap){ lastDrop = now; gap = c.raining ? rand(30, 70) : rand(60, 115); rainDrop(c.x + rand(cw * 0.2, cw * 0.8), y + ch * 0.84, ground, W); }
                if (c.raining && now - lastWater > 400){
                    lastWater = now; const lo = c.x / W * 100, hi = (c.x + cw) / W * 100;
                    P.forEach(p => { if (p.state === 'gone' || p.x < lo || p.x > hi) return; if (p.state === 'thirsty'){ refresh(p); c.revived++; } else if (p.state === 'bloom') p.age = 0; });
                }
            }, () => {
                el.remove(); if (cloud === c) cloud = null; nextCloud = tick + Math.round(rand(35, 60));
                if (c.revived) flash(`the rain perked up ${c.revived} thirsty plant${c.revived > 1 ? 's' : ''} ${FLI}`, 2600);
                updateHud(); save();
            });
            updateHud();
        }
        function weatherTick(n){
            if (cloud) return;
            const sunny = bed.classList.contains('sunny');
            if (n >= 4 && tick >= nextCloud){ spawnCloud(); return; }
            if (sunny && tick >= sunUntil){ setSunny(false); nextSun = tick + Math.round(rand(25, 50)); }
            else if (!sunny && n >= 1 && tick >= nextSun){ setSunny(true); sunUntil = tick + Math.round(rand(18, 32)); if (n >= 8) flash('the sun came out — plants get thirsty a little faster', 2600); }
        }

        /* --- one heartbeat drives plant life, visitors, weather and the deer (only while the garden is on screen) --- */
        setInterval(() => {
            if (!inView || document.hidden || !started) return;
            tick++;
            const sunny = bed.classList.contains('sunny');
            P.forEach(p => {
                if (p.state === 'bloom' && !p.targeted){ p.age += sunny ? 1.6 : 1; if (p.age > p.life){ p.state = 'thirsty'; p.thirst = 0; p.el.classList.add('thirsty'); } }
                else if (p.state === 'thirsty' && !p.targeted){ if (++p.thirst > 60) removePlant(p, 'withered'); }
            });
            /* deer: one visit at a time, only during active play, only when there is something to eat */
            /* the deer's clock runs during play, and at half speed while someone is simply watching the garden */
            if (Date.now() - lastTouch < 90000 || tick % 2 === 0) play++;
            if (!deer && play >= deerAt && count() >= 2) spawnDeer();
            if (!reduce){
                const n = count();
                if (!deer){
                    const pests = C.filter(c => c.pest && c.state !== 'leaving').length, maxPests = n < 5 ? 0 : n < 14 ? 1 : n < 32 ? 2 : 3;
                    if (pests < maxPests && tick >= nextPest){ spawnPest(); nextPest = tick + Math.max(5, Math.round(rand(11, 17) - n * 0.12)); }
                }
                if (n >= 3 && !C.some(c => c.kind === 'flutter') && tick >= nextFriend){ spawnFlutter(); nextFriend = tick + Math.round(rand(14, 22)); }
                weatherTick(n);
            }
            updateHud();
        }, 1000);

        /* test hook, only when the page is opened with ?gardendebug */
        if (/[?&]gardendebug\b/.test(location.search)) window.__garden = {
            spawnDeer, spawnPest, touch: touched, play: () => ({ play, deerAt, lastTouch }), spawnCloud: () => { if (!cloud) spawnCloud(); }, sun: setSunny, reset: resetGame,
            thirsty: k => P.filter(p => p.state === 'bloom').slice(0, k).forEach(p => { p.age = p.life + 1; }),
            state: () => ({ count: count(), goal: GOAL, cap: CAP(), stage: bed.dataset.stage, stats: Object.assign({}, S), badges: [...badges], fullReached, regrowing, critters: C.map(c => c.kind + ':' + c.state), cloud: cloud && (cloud.raining ? 'raining' : 'cloud'), deer: deer && deer.state, sunny: bed.classList.contains('sunny'), rows: ['back', 'mid', 'front'].map(r => live().filter(p => p.row === r).length), saved: store.get() })
        };
    })();

    /* little info pop-ins: tags and bullets appear one by one as they come into view */
    (function(){
        const groups = ['.hero-tags', '.social-links'];
        groups.forEach(sel => document.querySelectorAll(sel).forEach(g => [...g.children].forEach((el, i) => el.style.setProperty('--ci', i))));
    })();


    /* slowly shifting background: three soft gradients crossfade (opacity only, so it costs almost nothing) */
    (function(){
        const sky = document.createElement('div'); sky.className = 'sky-shift'; sky.setAttribute('aria-hidden', 'true'); sky.innerHTML = '<i></i><i></i><i></i>';
        const bg = document.querySelector('.page-bg'); if (bg) bg.after(sky); else document.body.prepend(sky);
    })();

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

    /* v9: every bit of text changes color on hover */
    (function(){
        const HC = ['#c2457e', '#8a63b8', '#4f7a34', '#c98a06', '#d96b93', '#3f8fb0'];
        const sel = 'main p, main li, main h3, main h4, main h5, main strong, main .hero-tag, main .gallery-deviant a, main .hero-label, main .contact-text, .gallery-modal-title, .gallery-modal-tab, .surprise-btn, .lightbox-title, .lightbox-cat, .lightbox-counter, .collage-item-title, footer p, footer span, .garden-tip, .gt-text, .g-stats, .nav a, .gb-bubble';
        let i = 0;
        const tag = el => {
            if (el.classList.contains('hc-text') || el.closest('.about-text, .section-title, .contact-title, .hero h1, .rotator, .rb-text, .rb-host, .xl-list')) return;
            if (!el.textContent.trim()) return;
            el.classList.add('hc-text'); el.style.setProperty('--hc', HC[i++ % HC.length]);
            const td = getComputedStyle(el).transitionDuration;
            if (!td || td.split(',').every(d => parseFloat(d) === 0)) el.classList.add('hc-smooth');
        };
        const run = () => document.querySelectorAll(sel).forEach(tag);
        run(); setTimeout(run, 1500);
        /* gallery tiles and garden text are built later, so tag new text as it appears. Only the places that
           actually receive text are watched: watching the whole body re-scanned the page after every petal,
           seed and bird that the decorations add. */
        const later = () => { clearTimeout(run.t); run.t = setTimeout(run, 200); };
        const mo = new MutationObserver(later);
        const watch = () => ['#galleryCollage', '#lightbox', '.garden-tip', '#xpStage', '#skStage', '.mb-bouquet'].forEach(s => { const el = document.querySelector(s); if (el && !el.__hcWatched){ el.__hcWatched = true; mo.observe(el, { childList: true, subtree: true }); } });
        watch(); setTimeout(watch, 0);   /* the bouquet and the final garden are built by later scripts */
        document.querySelectorAll('.hero h1 .ltr').forEach((l, k) => l.style.setProperty('--hc', HC[k % HC.length]));
        document.querySelectorAll('.section-title .t-ch, .contact-title .t-ch').forEach((c, k) => { if (!c.style.getPropertyValue('--hc')) c.style.setProperty('--hc', HC[k % HC.length]); });
    })();

/* =====================================================================
   Botanical interface
   Experience is a living garden: choose a flower, it travels to the
   centre, grows branches, and each bud is one experience.
   Skills is a pressed-specimen collection: choose a specimen, it lifts
   onto the page, separates into pieces, and each piece is one skill.
   Both read their content from <template> blocks in index.html, show one
   note at a time (so every category has the same footprint), remember
   what the visitor explored this session, and feed the discovery bouquet.
   ===================================================================== */
(function () {
    'use strict';
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
    const $ = (sel, root) => (root || document).querySelector(sel);
    const $$ = (sel, root) => [...(root || document).querySelectorAll(sel)];
    const wait = ms => new Promise(r => setTimeout(r, ms));
    /* animation waits never hang: hidden tabs pause frames and animations, so each wait also has a timer */
    const frame = () => Promise.race([new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))), wait(120)]);
    const settle = (anim, ms) => Promise.race([anim.finished.catch(() => { }), wait(ms + 250)]);
    const esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);
    const plain = html => { const d = document.createElement('div'); d.innerHTML = html; return d.textContent.replace(/\s+/g, ' ').trim(); };
    const f1 = v => (+v).toFixed(1);
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const behavior = () => (reduce ? 'auto' : 'smooth');
    const hash = str => { let h = 2166136261; for (const ch of str) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; };
    const rng = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

    const navH = () => { const n = $('.nav'); return n ? n.getBoundingClientRect().bottom : 0; };
    const focusQuiet = el => { if (!el) return; if (!el.hasAttribute('tabindex') && !/^(A|BUTTON|INPUT|SELECT|TEXTAREA)$/.test(el.tagName)) el.setAttribute('tabindex', '-1'); try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); } };
    /* scroll just enough to show `el` below the nav; if it is taller than the screen, line up its top */
    function bringIntoView(el, pad) {
        if (!el) return;
        pad = pad == null ? 10 : pad;
        const r = el.getBoundingClientRect(), top = navH() + pad, bottom = innerHeight - pad;
        if (r.top < top || r.height > bottom - top) scrollBy({ top: r.top - top, behavior: behavior() });
        else if (r.bottom > bottom) scrollBy({ top: r.bottom - bottom, behavior: behavior() });
    }
    /* session memory: optional, everything works without storage */
    const mem = (key, fallback) => ({
        get() { try { const v = JSON.parse(sessionStorage.getItem(key)); return v == null ? fallback : v; } catch (e) { return fallback; } },
        set(v) { try { sessionStorage.setItem(key, JSON.stringify(v)); } catch (e) { /* in memory only */ } },
        clear() { try { sessionStorage.removeItem(key); } catch (e) { } }
    });
    const visitsStore = mem('mb-visits-v1', {});
    const visits = visitsStore.get();
    const visit = id => { visits[id] = (visits[id] || 0) + 1; visitsStore.set(visits); return visits[id]; };

    /* ------------------------------------------------------------------
       Content, read from the templates
       ------------------------------------------------------------------ */
    const EXP = {}, SK = {};
    const xpT = $('#xpData');
    if (xpT) $$('.xp-panel', xpT.content).forEach(panel => {
        const cat = panel.dataset.panel, btn = $('#cat-' + cat); if (!btn) return;
        const items = $$('.xp-card', panel).map(card => {
            const html = sel => { const e = $(sel, card); return e ? e.innerHTML.trim() : ''; };
            return {
                id: card.id, cat, minor: card.classList.contains('xp-card--quiet'),
                date: html('.xp-date'), role: html('.xp-role'), org: html('.xp-org'), lead: html('.xp-lead'),
                notes: $$('.xp-more > ul:not(.xp-chips):not(.xp-samples) > li', card).map(li => li.innerHTML.trim()),
                chips: $$('.xp-chips li', card).map(li => li.innerHTML.trim()),
                links: $$('a[href^="http"]', card).map(a => ({ href: a.getAttribute('href'), text: a.firstChild.textContent.trim() })),
                skills: $$('a[data-skill]', card).map(a => ({ key: a.dataset.skill, text: a.textContent.trim() })),
                related: $$('a[data-goto]', card).map(a => ({ goto: a.dataset.goto, text: a.textContent.trim() }))
            };
        });
        EXP[cat] = { cat, kind: 'exp', btn, name: $('.g-name', btn).textContent.trim(), note: btn.dataset.note || '', items, sym: 'cl-' + cat, box: '0 0 120 110' };
    });
    const skT = $('#skData');
    if (skT) $$('section[data-cat]', skT.content).forEach(sec => {
        const cat = sec.dataset.cat, btn = $('#sk-' + cat); if (!btn) return;
        const intro = $('.sk-intro', sec);
        SK[cat] = {
            cat, kind: 'skill', btn, plant: sec.dataset.plant || 'blossom',
            name: $('.h-name', btn).textContent.trim(), no: $('.h-no', btn).textContent.trim(),
            intro: intro ? intro.innerHTML.trim() : '', sym: 'pf-' + cat, box: '0 0 100 100',
            items: $$('li[data-item]', sec).map(li => ({ id: 'skill:' + cat + ':' + li.dataset.item, name: li.dataset.item, html: li.innerHTML.trim(), minor: li.hasAttribute('data-minor') }))
        };
    });
    const PIECE_WORD = { fern: 'frond', umbel: 'floret', eucalyptus: 'leaf', geometric: 'petal', blossom: 'blossom', frilled: 'petal', wheat: 'stem', wildflower: 'flower' };

    /* ------------------------------------------------------------------
       Discoveries: categories gather in the bouquet, explored pieces add
       small sprays of filler. Marks beside each label say "visited".
       ------------------------------------------------------------------ */
    const CATS = {};
    Object.values(EXP).forEach(d => { CATS['exp:' + d.cat] = { id: 'exp:' + d.cat, kind: 'Experience', name: d.name, sym: d.sym, box: d.box, label: $('.g-label', d.btn) }; });
    Object.values(SK).forEach(d => { CATS['skill:' + d.cat] = { id: 'skill:' + d.cat, kind: 'Skills', name: d.name, sym: d.sym, box: d.box, label: $('.h-label', d.btn) }; });
    const foundStore = mem('mb-discoveries-v2', []), itemStore = mem('mb-found-items-v1', []);
    let found = foundStore.get().filter((id, i, a) => CATS[id] && a.indexOf(id) === i);
    let foundItems = itemStore.get().filter(x => typeof x === 'string');

    function setMark(id, fresh) {
        const c = CATS[id]; if (!c) return;
        const slot = $('.mark-slot', c.label), txt = $('.mark-text', c.label);
        if (slot && !slot.firstChild) {
            slot.innerHTML = '<svg viewBox="-10 -10 20 20" aria-hidden="true"' + (fresh ? ' class="fresh"' : '') + '><use href="#mk" x="-10" y="-10" width="20" height="20"/></svg>';
        }
        if (txt) txt.textContent = ' (visited)';
    }
    function clearMarks() { Object.values(CATS).forEach(c => { const s = $('.mark-slot', c.label), t = $('.mark-text', c.label); if (s) s.innerHTML = ''; if (t) t.textContent = ''; }); }
    function discover(id, fromEl) {
        if (!CATS[id] || found.includes(id)) return;
        found.push(id); foundStore.set(found); setMark(id, true);
        bouquet.collect(id, fromEl);
        /* the garden at the bottom keeps a sprig of every branch the visitor opened */
        if (window.GardenLog) GardenLog.add({ id: 'cat:' + id, kind: 'cluster', sym: CATS[id].sym, box: CATS[id].box });
        if (window.World) World.note(2);
    }
    function discoverItem(id, fromEl) {
        if (foundItems.includes(id)) return;
        foundItems.push(id); itemStore.set(foundItems);
        bouquet.sprinkle(fromEl);
        if (window.World) World.note(1);
    }

    /* ------------------------------------------------------------------
       Small creatures that answer what the visitor does. They go through
       the shared Life director, so they never pile up.
       ------------------------------------------------------------------ */
    const WINGS = (c1, c2) => '<svg viewBox="-24 -20 48 40" aria-hidden="true"><g class="bf-wing-l"><path d="M-1 -2 C-10 -20 -26 -16 -21 -3 C-18 4 -8 3 -1 0Z" fill="' + c1 + '"/><path d="M-1 1 C-9 3 -18 10 -13 16 C-8 19 -3 10 -1 3Z" fill="' + c2 + '"/></g><g class="bf-wing-r"><path d="M1 -2 C10 -20 26 -16 21 -3 C18 4 8 3 1 0Z" fill="' + c1 + '"/><path d="M1 1 C9 3 18 10 13 16 C8 19 3 10 1 3Z" fill="' + c2 + '"/></g><rect x="-1.5" y="-8" width="3" height="20" rx="1.5" fill="#5a4366"/><path d="M-1 -8 Q-5 -15 -7 -16 M1 -8 Q5 -15 7 -16" stroke="#5a4366" stroke-width="1" fill="none"/></svg>';
    const BEE = '<svg viewBox="-16 -14 32 28" aria-hidden="true"><g class="bee-wings"><ellipse cx="-4" cy="-8" rx="5" ry="7" fill="#eaf6ff" stroke="#a9cbe0" stroke-width=".8" transform="rotate(-25 -4 -8)"/><ellipse cx="4" cy="-8" rx="5" ry="7" fill="#eaf6ff" stroke="#a9cbe0" stroke-width=".8" transform="rotate(25 4 -8)"/></g><ellipse rx="10" ry="7.2" fill="#f6cf4a" stroke="#c9961a" stroke-width=".8"/><path d="M-4 -6.6 V6.6 M2 -7 V7" stroke="#4a3a2a" stroke-width="2.6"/><circle cx="10" cy="-1" r="4.4" fill="#4a3a2a"/><circle cx="11.6" cy="-2.2" r="1" fill="#fff"/><path d="M-10 0 L-13.5 0" stroke="#4a3a2a" stroke-width="1.4" stroke-linecap="round"/></svg>';
    const LADYBUG = '<svg viewBox="-10 -9 20 18" aria-hidden="true"><circle cx="7" cy="0" r="3.6" fill="#3a2b33"/><ellipse rx="7.4" ry="6.6" fill="#e2483d"/><path d="M-7.4 0 H7.4" stroke="#3a2b33" stroke-width=".9"/><circle cx="-3" cy="-3" r="1.3" fill="#3a2b33"/><circle cx="2" cy="-3.4" r="1.1" fill="#3a2b33"/><circle cx="-2.4" cy="3.2" r="1.2" fill="#3a2b33"/><circle cx="2.6" cy="3" r="1.3" fill="#3a2b33"/><circle cx="-5" cy="-1.8" r=".9" fill="#fff" opacity=".55"/></svg>';
    let lastVisit = 0;
    /* a butterfly (or bee) flies to `target`, settles on it for a moment, then leaves */
    function visitFlower(target, kind) {
        if (reduce || document.hidden || !target || performance.now() - lastVisit < 9000) return;
        if (!Life.claim('visitor', 14000, true)) return;
        lastVisit = performance.now();
        const bee = kind === 'bee', el = document.createElement('div');
        el.className = 'visitor ' + (bee ? 'is-bee' : 'is-butterfly'); el.setAttribute('aria-hidden', 'true');
        const pal = [['#c9b2ec', '#f4a7bf'], ['#fbdc84', '#f9b8cf'], ['#a9d8ea', '#c9b2ec']][Math.floor(Math.random() * 3)];
        el.innerHTML = bee ? BEE : WINGS(pal[0], pal[1]);
        document.body.appendChild(el);
        const W = innerWidth, H = innerHeight, fromLeft = Math.random() < 0.5;
        let x = fromLeft ? -40 : W + 40, y = H * (0.2 + Math.random() * 0.4);
        const spot = () => { const r = target.getBoundingClientRect(); return { x: r.left + r.width * (0.4 + Math.random() * 0.2), y: r.top + r.height * 0.3 }; };
        const place = (px, py, rot) => { el.style.transform = 'translate(' + f1(px) + 'px,' + f1(py) + 'px) rotate(' + f1(rot) + 'deg)'; };
        place(x, y, 0);
        const go = (dur, to, wobble, done) => {
            const t0 = performance.now(), x0 = x, y0 = y;
            (function step(now) {
                if (!document.contains(el)) return;
                const t = Math.min(1, (now - t0) / dur), e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2, p = to();
                x = x0 + (p.x - x0) * e + Math.sin(t * Math.PI * 3) * wobble;
                y = y0 + (p.y - y0) * e - Math.sin(t * Math.PI) * 40 + Math.sin(t * 26) * (bee ? 4 : 2);
                place(x, y, Math.cos(t * 20) * (bee ? 8 : 14));
                if (t < 1) requestAnimationFrame(step); else done && done();
            })(t0);
        };
        const finish = () => { el.remove(); Life.release('visitor'); };
        const leave = () => { el.classList.remove('perched'); const ex = Math.random() < 0.5 ? -60 : W + 60; go(1700, () => ({ x: ex, y: -50 }), 30, finish); };
        const land = spot();
        go(2000, () => land, 26, () => {
            if (bee) {   /* a bee investigates: two small loops, then away */
                const c = spot(), t0 = performance.now();
                (function loop(now) {
                    if (!document.contains(el)) return;
                    const t = (now - t0) / 1600, a = t * Math.PI * 2;
                    x = c.x + Math.cos(a) * 18; y = c.y + Math.sin(a) * 9; place(x, y, Math.sin(a) * 10);
                    if (t < 2) requestAnimationFrame(loop); else leave();
                })(t0);
            } else {
                el.classList.add('perched');
                const stay = performance.now() + 2800;
                (function follow() { if (!document.contains(el)) return; const p = spot(); x += (p.x - x) * 0.25; y += (p.y - y) * 0.25; place(x, y, 0); if (performance.now() < stay) requestAnimationFrame(follow); else leave(); })();
                target.classList.add('is-visited-by'); setTimeout(() => target.classList.remove('is-visited-by'), 2800);
            }
        });
    }
    /* Should a creature come to visit the piece the visitor just chose for the first time?
       nthFound: how many pieces they have explored so far this visit (1 on their very first).
       isExp:    true for an Experience bloom (butterfly), false for a Skills piece (ladybug).
       visitFlower/ladybugOn already enforce a cooldown and the one-creature-at-a-time director. */
    function shouldVisit(nthFound, isExp) {
        // TODO(human): return true when a visitor should appear
        return false;
    }
    let lastBug = 0;
    function ladybugOn(piece) {
        if (reduce || !piece || performance.now() - lastBug < 12000) return;
        lastBug = performance.now();
        const bug = document.createElement('span'); bug.className = 'ladybug'; bug.setAttribute('aria-hidden', 'true'); bug.innerHTML = LADYBUG;
        piece.appendChild(bug); setTimeout(() => bug.remove(), 3600);
    }

    /* ------------------------------------------------------------------
       Shared geometry for an open plant (viewBox 400 x 380)
       ------------------------------------------------------------------ */
    const VW = 400, VH = 380, HC = { x: 200, y: 186 };
    function ring(n, seed, organic) {
        const R = rng(seed);
        const span = n <= 1 ? [270, 270] : n === 2 ? [234, 306] : n === 3 ? [214, 326] : n <= 5 ? [198, 342] : n <= 7 ? [186, 354] : [178, 362];
        const r0 = organic ? 148 : 138;
        return Array.from({ length: n }, (_, i) => {
            const t = n === 1 ? 0.5 : i / (n - 1);
            const a = span[0] + (span[1] - span[0]) * t + (organic ? (R() - 0.5) * 7 : 0);
            const r = r0 + (organic ? (R() - 0.5) * 22 : (i % 2 ? 9 : -6));
            const rad = a * Math.PI / 180;
            return { x: HC.x + Math.cos(rad) * r, y: HC.y + Math.sin(rad) * r * 0.97, a, rad };
        });
    }
    const pct = (v, of) => f1(v / of * 100) + '%';

    /* closed bud that opens into a six-petalled flower (Experience) */
    function budArt() {
        let pet = ''; for (let k = 0; k < 6; k++) pet += '<ellipse cx="0" cy="-10" rx="6.4" ry="10.4" transform="rotate(' + k * 60 + ')"/>';
        return '<svg class="gb-art" viewBox="-24 -24 48 48" aria-hidden="true"><g class="b-sepals"><path d="M0 3 C-8 5 -12 12 -11 19 C-6 15 -2 10 0 3Z"/><path d="M0 3 C8 5 12 12 11 19 C6 15 2 10 0 3Z"/></g>'
            + '<g class="b-pet">' + pet + '</g><circle class="b-core" r="4.4"/><path class="b-spark" d="M12 -15 l1.3 3.4 3.4 1.3 -3.4 1.3 -1.3 3.4 -1.3 -3.4 -3.4 -1.3 3.4 -1.3Z"/></svg>';
    }
    /* one piece of a pressed specimen (Skills); drawn pointing up, rotated outward by the caller */
    const PIECE = {
        fern: () => { let s = '<path class="p-rib" d="M0 20 L0 -21"/>'; for (let k = 0; k < 6; k++) { const y = 14 - k * 6.4, r = 6.2 - k * 0.7; s += '<ellipse cx="' + f1(-r * 0.9) + '" cy="' + f1(y) + '" rx="' + f1(r) + '" ry="2.2" transform="rotate(28 ' + f1(-r * 0.9) + ' ' + f1(y) + ')"/><ellipse cx="' + f1(r * 0.9) + '" cy="' + f1(y - 2) + '" rx="' + f1(r) + '" ry="2.2" transform="rotate(-28 ' + f1(r * 0.9) + ' ' + f1(y - 2) + ')"/>'; } return s; },
        umbel: () => { let s = '<path class="p-rib" d="M0 20 L0 -6"/>'; for (let k = 0; k < 7; k++) { const a = -Math.PI / 2 + (k - 3) * 0.42, x = Math.cos(a) * 11, y = -6 + Math.sin(a) * 11; s += '<path class="p-rib thin" d="M0 -6 L' + f1(x) + ' ' + f1(y) + '"/><circle cx="' + f1(x) + '" cy="' + f1(y) + '" r="3.4"/>'; } return s + '<circle class="p-core" cx="0" cy="-6" r="2"/>'; },
        eucalyptus: () => '<path class="p-rib" d="M0 21 L0 -19"/><circle cx="0" cy="-10" r="9.5"/><circle cx="-6" cy="8" r="6"/><circle cx="6" cy="10" r="5"/><path class="p-vein" d="M0 -19 V0 M-6 3 V13 M6 6 V15"/>',
        geometric: () => '<path d="M0 -21 L9 -5 L0 19 L-9 -5Z"/><path class="p-vein" d="M0 -21 V19 M-9 -5 H9"/>',
        blossom: () => { let s = '<path class="p-rib" d="M0 21 L0 -2"/>'; for (let k = 0; k < 5; k++) { const a = k * 72 * Math.PI / 180; s += '<circle cx="' + f1(Math.sin(a) * 6.5) + '" cy="' + f1(-9 - Math.cos(a) * 6.5) + '" r="5.6"/>'; } return s + '<circle class="p-core" cx="0" cy="-9" r="3"/>'; },
        frilled: () => '<path d="M0 19 C-11 8 -11 -12 -5.5 -20 L-2.4 -15.5 L0 -20.5 L2.4 -15.5 L5.5 -20 C11 -12 11 8 0 19Z"/><path class="p-vein" d="M0 17 V-14"/>',
        wheat: () => { let s = '<path class="p-rib" d="M0 21 L0 -20"/>'; for (let k = 0; k < 4; k++) { const y = 8 - k * 7; s += '<ellipse cx="-3.4" cy="' + y + '" rx="2.8" ry="4.8" transform="rotate(-24 -3.4 ' + y + ')"/><ellipse cx="3.4" cy="' + (y - 2) + '" rx="2.8" ry="4.8" transform="rotate(24 3.4 ' + (y - 2) + ')"/>'; } return s + '<ellipse cx="0" cy="-20" rx="2.6" ry="4.2"/>'; },
        wildflower: () => { let s = '<path class="p-rib" d="M0 21 L0 -2"/><ellipse class="p-leaf" cx="-5" cy="11" rx="5" ry="2" transform="rotate(-30 -5 11)"/>'; for (let k = 0; k < 5; k++) { const a = k * 72 * Math.PI / 180; s += '<circle cx="' + f1(Math.sin(a) * 6) + '" cy="' + f1(-9 - Math.cos(a) * 6) + '" r="5.4"/>'; } return s + '<circle class="p-core gold" cx="0" cy="-9" r="3.2"/>'; }
    };
    const pieceArt = (plant, rot) => '<svg class="gb-art" viewBox="-24 -24 48 48" aria-hidden="true"><g transform="rotate(' + f1(rot) + ')">' + (PIECE[plant] || PIECE.blossom)() + '</g></svg>';

    /* ------------------------------------------------------------------
       The stage: one per section. open() -> fly + grow, select() -> one
       note at a time, close() -> everything folds back the way it came.
       ------------------------------------------------------------------ */
    function Stage(cfg) {
        const { kind, garden, row, root, data } = cfg;
        const isExp = kind === 'exp';
        const S = { cat: null, active: -1, busy: false, n: 0 };
        root.innerHTML =
            '<div class="gs-inner">'
            + '<div class="gs-close-wrap"><button type="button" class="gs-close"><span aria-hidden="true">&times;</span><span class="vh gs-close-name">Close</span></button></div>'
            + '<div class="gs-plant">'
            + '<svg class="gs-lines" viewBox="0 0 ' + VW + ' ' + VH + '" preserveAspectRatio="none" aria-hidden="true"></svg>'
            + '<button type="button" class="gs-head"><svg class="gs-head-art" aria-hidden="true"><use/></svg><span class="gs-extra" aria-hidden="true"></span></button>'
            + '<div class="gs-pieces" role="group"></div>'
            + '<div class="gs-tip" aria-hidden="true"></div>'
            + '</div>'
            + '<div class="gs-note"><div class="gn-body" aria-live="polite"></div>'
            + '<div class="gn-nav"><button type="button" class="gn-prev" aria-label="Previous"><span aria-hidden="true">&lsaquo;</span></button><span class="gn-count"></span><button type="button" class="gn-next" aria-label="Next"><span aria-hidden="true">&rsaquo;</span></button></div>'
            + '</div></div>';
        const inner = $('.gs-inner', root), plant = $('.gs-plant', root), lines = $('.gs-lines', root), head = $('.gs-head', root), headArt = $('.gs-head-art', root);
        const piecesEl = $('.gs-pieces', root), tip = $('.gs-tip', root), body = $('.gn-body', root), note = $('.gs-note', root);
        const prevB = $('.gn-prev', root), nextB = $('.gn-next', root), count = $('.gn-count', root), closeB = $('.gs-close', root);
        root.classList.add('gs-' + kind);

        /* head box inside the 400 x 380 plant (percentages so it scales with the plant) */
        const HB = isExp ? { x: 114, y: 112, w: 172, h: 158 } : { x: 110, y: 96, w: 180, h: 180 };
        Object.assign(head.style, { left: pct(HB.x, VW), top: pct(HB.y, VH), width: pct(HB.w, VW), height: pct(HB.h, VH) });

        function build(d) {
            const n = d.items.length, pos = ring(n, hash(d.cat), isExp);
            S.n = n; S.pos = pos;
            root.dataset.cat = d.cat;
            if (!isExp) root.style.cssText = '--sk:' + d.btn.style.getPropertyValue('--sk') + ';--sk-soft:' + d.btn.style.getPropertyValue('--sk-soft');
            headArt.setAttribute('viewBox', d.box); $('use', headArt).setAttribute('href', '#' + d.sym);
            head.setAttribute('aria-label', d.name + ': back to all ' + (isExp ? 'experience' : 'skills'));
            $('.gs-close-name', root).textContent = 'Close ' + d.name;
            piecesEl.setAttribute('aria-label', d.name + (isExp ? ' experiences' : ' skills'));
            /* returning visitors find a new little bud on a plant they have opened before */
            const again = Math.min(3, (visits[(isExp ? 'exp:' : 'skill:') + d.cat] || 0));
            $('.gs-extra', root).innerHTML = Array.from({ length: again }, (_, k) => '<i style="--k:' + k + '"><svg viewBox="-10 -10 20 20"><use href="#mk" x="-10" y="-10" width="20" height="20"/></svg></i>').join('');

            /* stems / pin lines */
            let g = '';
            if (isExp) {
                g += '<path class="gs-stem" pathLength="1" d="M200 380 C196 340 205 300 200 ' + (HB.y + HB.h - 34) + '"/>';
                g += '<g class="gs-leaf" style="--i:0"><use href="#fl-leaf" x="200" y="318" width="22" height="22" transform="rotate(-20 200 340)" style="color:#8db36a"/></g>';
                g += '<g class="gs-leaf" style="--i:1"><use href="#fl-leaf" x="200" y="300" width="20" height="20" transform="rotate(-110 200 320)" style="color:#7fa65c"/></g>';
            } else {
                g += '<rect class="gs-tape" x="186" y="262" width="34" height="11" rx="1.5" transform="rotate(-6 203 268)"/>';
            }
            pos.forEach((p, i) => {
                const dx = p.x - HC.x, dy = p.y - HC.y, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L;
                const sx = HC.x + ux * (isExp ? 44 : 70), sy = HC.y + uy * (isExp ? 40 : 70);
                const ex = p.x - ux * 16, ey = p.y - uy * 16, bend = (i % 2 ? 1 : -1) * (isExp ? 14 : 6);
                const cx = (sx + ex) / 2 - uy * bend, cy = (sy + ey) / 2 + ux * bend;
                g += '<path class="gs-branch" pathLength="1" style="--i:' + i + ';--ri:' + (n - 1 - i) + '" d="M' + f1(sx) + ' ' + f1(sy) + ' Q' + f1(cx) + ' ' + f1(cy) + ' ' + f1(ex) + ' ' + f1(ey) + '"/>';
                if (isExp && !d.items[i].minor) {
                    const mx = (sx + 2 * cx + ex) / 4, my = (sy + 2 * cy + ey) / 4, side = i % 2 ? 1 : -1, ang = Math.atan2(uy, ux) * 180 / Math.PI + 45 + side * 50;
                    g += '<g class="gs-leaf" style="--i:' + (i + 2) + '"><use href="#fl-leaf" x="' + f1(mx) + '" y="' + f1(my - 11) + '" width="11" height="11" transform="rotate(' + f1(ang) + ' ' + f1(mx) + ' ' + f1(my) + ')" style="color:' + (i % 2 ? '#8db36a' : '#a3c47f') + '"/></g>';
                }
            });
            lines.innerHTML = g;

            /* buds / pieces */
            piecesEl.innerHTML = '';
            d.items.forEach((it, i) => {
                const p = pos[i], b = document.createElement('button');
                b.type = 'button'; b.className = 'gs-bud' + (it.minor ? ' is-minor' : '') + ((visits[it.id] || 0) ? ' is-seen' : '');
                b.style.cssText = 'left:' + pct(p.x, VW) + ';top:' + pct(p.y, VH) + ';--i:' + i + ';--ri:' + (n - 1 - i) + ';--tilt0:' + f1(isExp ? (p.a - 270) * 0.18 : 0) + 'deg';
                b.dataset.i = i;
                b.setAttribute('aria-pressed', 'false');
                if (isExp) {
                    b.setAttribute('aria-label', plain(it.role) + ', ' + plain(it.org));
                    b.innerHTML = budArt();
                } else {
                    b.setAttribute('aria-label', it.name);
                    /* labels lean out along the piece's own direction, away from its neighbours */
                    const a = ((p.a % 360) + 360) % 360;
                    const side = a >= 160 && a < 224 ? 'l' : a >= 224 && a < 254 ? 'tl' : a >= 254 && a <= 286 ? 't' : a > 286 && a <= 316 ? 'tr' : 'r';
                    b.innerHTML = pieceArt(d.plant, p.a + 90) + '<span class="gs-lab" data-side="' + side + '">' + esc(it.name) + '</span>';
                }
                piecesEl.appendChild(b);
            });
            showIntro(d);
        }
        /* buds start at the heart of the flower: offsets in px, measured once the plant has a size */
        function measure() {
            const k = plant.clientWidth / VW; if (!k || !S.pos) return;
            $$('.gs-bud', piecesEl).forEach((b, i) => { const p = S.pos[i]; b.style.setProperty('--fx', f1((HC.x - p.x) * k) + 'px'); b.style.setProperty('--fy', f1((HC.y - p.y) * k) + 'px'); });
        }
        addEventListener('resize', () => { clearTimeout(measure.t); measure.t = setTimeout(measure, 120); });

        /* --- the note beside (or under) the plant: one thing at a time --- */
        function swapNote(html) {
            if (!reduce) { note.classList.remove('swap'); void note.offsetWidth; note.classList.add('swap'); }
            body.innerHTML = html;
        }
        /* Experience: every role and where it was, visible at once (one row per bud); a row or its bud opens
           that item's field note in place, with dates and details */
        function detailHTML(it) {
            let h = (it.date ? '<p class="xl-date">' + it.date + '</p>' : '') + '<p class="gn-text">' + it.lead + '</p>';
            if (it.notes.length) h += '<ul class="gn-notes">' + it.notes.map(x => '<li>' + x + '</li>').join('') + '</ul>';
            if (it.chips.length) h += '<ul class="gn-chips">' + it.chips.map(x => '<li>' + x + '</li>').join('') + '</ul>';
            let acts = '';
            it.links.forEach(l => { acts += '<a class="gn-link" href="' + esc(l.href) + '" target="_blank" rel="noopener">' + esc(l.text) + ' <span aria-hidden="true">&#8599;&#xFE0E;</span><span class="vh"> (opens in a new tab)</span></a>'; });
            it.related.forEach(r => { acts += '<a class="gn-link" href="#' + esc(r.goto.split(':')[1]) + '" data-goto="' + esc(r.goto) + '">' + esc(r.text) + '</a>'; });
            if (it.skills.length) acts += '<span class="gn-sprigs"><span class="vh">Skills used: </span>' + it.skills.map(x => '<a href="#sk-' + esc(x.key) + '" data-skill="' + esc(x.key) + '">' + esc(x.text) + '</a>').join('') + '</span>';
            return h + (acts ? '<div class="gn-acts">' + acts + '</div>' : '');
        }
        function listHTML(d) {
            const row = i => {
                const it = d.items[i];
                return '<li class="xl-item' + (it.minor ? ' is-minor' : '') + '" data-i="' + i + '" style="--i:' + i + '">'
                    + '<button type="button" class="xl-row" aria-expanded="false" aria-controls="xl-' + esc(it.id) + '">'
                    + '<svg class="xl-mark" viewBox="-10 -10 20 20" aria-hidden="true"><use href="#mk" x="-10" y="-10" width="20" height="20"/></svg>'
                    + '<span class="xl-text"><span class="xl-role">' + it.role + '</span><span class="xl-org">' + it.org + '</span></span>'
                    + '<span class="xl-chev" aria-hidden="true"></span></button>'
                    + '<div class="xl-detail" id="xl-' + esc(it.id) + '" hidden>' + detailHTML(it) + '</div></li>';
            };
            const idx = d.items.map((_, i) => i), main = idx.filter(i => !d.items[i].minor), minor = idx.filter(i => d.items[i].minor);
            return '<p class="gn-kicker xl-cat">' + esc(d.name) + '</p><h3 class="gn-title" tabindex="-1">' + esc(d.note) + '</h3>'
                + '<ol class="xl-list">' + main.map(row).join('') + '</ol>'
                + (minor.length ? '<p class="xl-also">also</p><ol class="xl-list xl-list--quiet">' + minor.map(row).join('') + '</ol>' : '');
        }
        function showIntro(d) {
            const word = isExp ? 'bloom' : 'skill';
            if (isExp) {
                swapNote(listHTML(d));
                if (window.__rainbow) window.__rainbow($('.xl-cat', body));
                count.textContent = ''; prevB.disabled = nextB.disabled = true;
                return;
            }
            swapNote(isExp
                ? '<p class="gn-kicker">' + esc(d.name) + '</p><h3 class="gn-title" tabindex="-1">' + esc(d.note) + '</h3><p class="gn-text gn-quiet">' + d.items.length + ' ' + word + 's on this branch. Choose one to read its field note.</p>'
                : '<p class="gn-kicker">' + esc(d.no) + ' &middot; pressed specimen</p><h3 class="gn-title" tabindex="-1">' + esc(d.name) + '</h3>'
                  + (d.intro ? '<p class="gn-text">' + d.intro + '</p>' : '') + '<p class="gn-text gn-quiet">Choose a ' + word + ' to read its label.</p>');
            count.textContent = d.items.length + ' ' + word + 's';
            prevB.disabled = true; nextB.disabled = false;
        }
        function itemNote(d, it, i) {
            if (!isExp) {
                return '<p class="gn-kicker">' + esc(d.name) + ' &middot; ' + esc(PIECE_WORD[d.plant] || 'piece') + ' ' + (i + 1) + '</p><h3 class="gn-title" tabindex="-1">' + esc(it.name) + '</h3>'
                    + (it.html ? '<p class="gn-text">' + it.html + '</p>' : '<p class="gn-text gn-quiet">Part of the ' + esc(d.name) + ' collection.</p>');
            }
            const hasMore = it.notes.length || it.chips.length;
            let h = '<p class="gn-kicker">' + it.date + '</p><h3 class="gn-title" tabindex="-1">' + it.role + '</h3><p class="gn-org">' + it.org + '</p>'
                + '<div class="gn-pages"><div class="gn-page is-on"><p class="gn-text">' + it.lead + '</p></div>';
            if (hasMore) h += '<div class="gn-page" hidden>' + (it.notes.length ? '<ul class="gn-notes">' + it.notes.map(x => '<li>' + x + '</li>').join('') + '</ul>' : '') + (it.chips.length ? '<ul class="gn-chips">' + it.chips.map(x => '<li>' + x + '</li>').join('') + '</ul>' : '') + '</div>';
            h += '</div><div class="gn-acts">';
            if (hasMore) h += '<button type="button" class="gn-more" aria-expanded="false">field notes</button>';
            it.links.forEach(l => { h += '<a class="gn-link" href="' + esc(l.href) + '" target="_blank" rel="noopener">' + esc(l.text) + ' <span aria-hidden="true">&#8599;&#xFE0E;</span><span class="vh"> (opens in a new tab)</span></a>'; });
            it.related.forEach(r => { h += '<a class="gn-link" href="#' + esc(r.goto.split(':')[1]) + '" data-goto="' + esc(r.goto) + '">' + esc(r.text) + '</a>'; });
            if (it.skills.length) h += '<span class="gn-sprigs"><span class="vh">Skills used: </span>' + it.skills.map(s => '<a href="#sk-' + esc(s.key) + '" data-skill="' + esc(s.key) + '">' + esc(s.text) + '</a>').join('') + '</span>';
            return h + '</div>';
        }
        note.addEventListener('click', e => {
            const more = e.target.closest('.gn-more'); if (!more) return;
            const pages = $$('.gn-page', note), open = more.getAttribute('aria-expanded') !== 'true';
            pages[0].hidden = open; pages[1].hidden = !open; pages.forEach((pg, k) => pg.classList.toggle('is-on', open ? k === 1 : k === 0));
            more.setAttribute('aria-expanded', String(open)); more.textContent = open ? 'summary' : 'field notes';
        });

        function setRows(i) {
            $$('.xl-item', body).forEach(li => {
                const on = +li.dataset.i === i, row = $('.xl-row', li), det = $('.xl-detail', li);
                li.classList.toggle('is-open', on); row.setAttribute('aria-expanded', String(on)); det.hidden = !on;
            });
        }
        function select(i, opts) {
            opts = opts || {};
            const d = data[S.cat]; if (!d) return;
            const buds = $$('.gs-bud', piecesEl);
            /* Experience: choosing the open item again folds it back */
            if (isExp && opts.toggle && i === S.active) i = -1;
            if (i == null || i < 0 || i >= buds.length) { S.active = -1; buds.forEach(b => { b.classList.remove('is-active'); b.setAttribute('aria-pressed', 'false'); b.style.removeProperty('--px'); b.style.removeProperty('--py'); }); if (isExp) setRows(-1); else showIntro(d); return; }
            S.active = i;
            buds.forEach((b, k) => {
                const on = k === i; b.classList.toggle('is-active', on); b.setAttribute('aria-pressed', String(on));
                /* neighbours lean out of the way, along the curve of the ring */
                const dk = k - i, push = on ? 0 : Math.sign(dk) * Math.max(0, 10 - (Math.abs(dk) - 1) * 4), p = S.pos[k];
                b.style.setProperty('--px', f1(-Math.sin(p.rad) * push) + 'px'); b.style.setProperty('--py', f1(Math.cos(p.rad) * push) + 'px');
            });
            const it = d.items[i], bud = buds[i];
            if (isExp) {
                setRows(i);
                const li = $('.xl-item[data-i="' + i + '"]', body);
                if (li && (opts.reveal || opts.scroll)) setTimeout(() => bringIntoView(li, 16), 30);
                if (li && opts.focus) focusQuiet($('.xl-row', li));
            } else {
                swapNote(itemNote(d, it, i));
                count.textContent = (i + 1) + ' / ' + buds.length;
                prevB.disabled = false; nextB.disabled = i >= buds.length - 1;
            }
            const first = !visits[it.id]; visit(it.id); bud.classList.add('is-seen');
            discoverItem(it.id, bud);
            if (opts.focus && !isExp) focusQuiet(bud);
            if (opts.scroll && !isExp) bringIntoView(inner);
            /* sometimes a visitor comes to see what you opened (a butterfly on a bloom, a ladybug on a specimen piece) */
            if (first && !opts.quiet && shouldVisit(foundItems.length, isExp)) {
                if (isExp) visitFlower(bud, 'butterfly'); else ladybugOn(bud);
            }
        }
        prevB.addEventListener('click', () => select(S.active - 1));
        nextB.addEventListener('click', () => select(S.active + 1));
        piecesEl.addEventListener('click', e => { const b = e.target.closest('.gs-bud'); if (b) select(+b.dataset.i, { toggle: true, reveal: true }); });
        if (isExp) {
            /* the list and the buds answer each other: hover (or focus) one and its partner lights up */
            const hot = (i, on) => {
                const b = piecesEl.children[i], li = $('.xl-item[data-i="' + i + '"]', body);
                if (b) b.classList.toggle('is-hot', on); if (li) li.classList.toggle('is-hot', on);
                if (b && window.__spin && on && fine) { const art = $('.gb-art', b); if (art) art.animate([{ rotate: '0deg' }, { rotate: '72deg' }], { duration: 700, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)', composite: 'add' }); }
            };
            body.addEventListener('click', e => { const r = e.target.closest('.xl-row'); if (r) select(+r.parentElement.dataset.i, { toggle: true }); });
            body.addEventListener('pointerover', e => { const r = e.target.closest('.xl-item'); if (r && !r.contains(e.relatedTarget)) hot(+r.dataset.i, true); });
            body.addEventListener('pointerout', e => { const r = e.target.closest('.xl-item'); if (r && !r.contains(e.relatedTarget)) hot(+r.dataset.i, false); });
            body.addEventListener('focusin', e => { const r = e.target.closest('.xl-row'); if (r) hot(+r.parentElement.dataset.i, true); });
            body.addEventListener('focusout', e => { const r = e.target.closest('.xl-row'); if (r) hot(+r.parentElement.dataset.i, false); });
            piecesEl.addEventListener('pointerover', e => { const b = e.target.closest('.gs-bud'); if (b && !b.contains(e.relatedTarget)) hot(+b.dataset.i, true); });
            piecesEl.addEventListener('pointerout', e => { const b = e.target.closest('.gs-bud'); if (b && !b.contains(e.relatedTarget)) hot(+b.dataset.i, false); });
        }
        piecesEl.addEventListener('keydown', e => {
            const b = e.target.closest('.gs-bud'); if (!b) return;
            const k = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key], buds = $$('.gs-bud', piecesEl);
            let j = null;
            if (k) j = (+b.dataset.i + k + buds.length) % buds.length; else if (e.key === 'Home') j = 0; else if (e.key === 'End') j = buds.length - 1;
            if (j != null) { e.preventDefault(); focusQuiet(buds[j]); }
        });
        /* swipe the note on touch screens to move between pieces */
        let sx = null;
        note.addEventListener('touchstart', e => { sx = e.touches[0].clientX; }, { passive: true });
        note.addEventListener('touchend', e => { if (sx == null || isExp) return; const dx = e.changedTouches[0].clientX - sx; sx = null; if (Math.abs(dx) > 60) select(clamp(S.active + (dx < 0 ? 1 : -1), 0, S.n - 1)); }, { passive: true });

        /* hover: buds lean toward the cursor, the head follows a little; a short label appears (Experience) */
        if (fine && !reduce) {
            let q = 0, ev = null;
            plant.addEventListener('pointermove', e => { ev = e; if (q) return; q = requestAnimationFrame(() => {
                q = 0;
                $$('.gs-bud', piecesEl).forEach(b => {
                    const r = b.getBoundingClientRect(), dx = ev.clientX - (r.left + r.width / 2), dy = ev.clientY - (r.top + r.height / 2), dist = Math.hypot(dx, dy);
                    b.style.setProperty('--lean', dist < 110 ? f1(clamp(dx / 6, -12, 12) * (1 - dist / 110)) + 'deg' : '0deg');
                });
                const hr = head.getBoundingClientRect();
                head.style.setProperty('--lean', f1(clamp((ev.clientX - (hr.left + hr.width / 2)) / 40, -4, 4)) + 'deg');
            }); });
            plant.addEventListener('pointerleave', () => { $$('.gs-bud', piecesEl).forEach(b => b.style.setProperty('--lean', '0deg')); head.style.setProperty('--lean', '0deg'); tip.classList.remove('on'); });
        }
        /* skills: the specimen can be nudged and tilted very slightly, and springs back */
        if (!isExp) {
            let drag = null;
            head.addEventListener('pointerdown', e => { if (e.button) return; drag = { x: e.clientX, y: e.clientY, moved: false, id: e.pointerId }; });
            addEventListener('pointermove', e => {
                if (!drag || e.pointerId !== drag.id) return;
                const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
                if (!drag.moved && Math.hypot(dx, dy) > 6) { drag.moved = true; head.classList.add('dragging'); try { head.setPointerCapture(drag.id); } catch (_) { } }
                if (drag.moved) { head.style.setProperty('--nx', f1(clamp(dx * 0.25, -14, 14)) + 'px'); head.style.setProperty('--ny', f1(clamp(dy * 0.25, -14, 14)) + 'px'); head.style.setProperty('--nr', f1(clamp(dx * 0.06, -4, 4)) + 'deg'); }
            });
            const end = () => { if (!drag) return; const moved = drag.moved; drag = null; head.classList.remove('dragging'); ['--nx', '--ny', '--nr'].forEach(v => head.style.removeProperty(v)); if (moved) head.dataset.dragged = '1'; };
            addEventListener('pointerup', end); addEventListener('pointercancel', end);
        }
        head.addEventListener('click', e => { if (head.dataset.dragged) { delete head.dataset.dragged; e.preventDefault(); return; } close(); });
        closeB.addEventListener('click', () => close());

        /* --- the selected flower/specimen travels between the row and the stage --- */
        function docRect(el) { const r = el.getBoundingClientRect(); return { x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height }; }
        function flight(from, to, d, back) {
            if (reduce) return Promise.resolve();
            const c = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            c.setAttribute('class', 'gs-fly'); c.setAttribute('viewBox', d.box); c.setAttribute('aria-hidden', 'true');
            c.innerHTML = '<use href="#' + d.sym + '"/>';
            Object.assign(c.style, { left: from.x + 'px', top: from.y + 'px', width: from.w + 'px', height: from.h + 'px' });
            document.body.appendChild(c);
            const sx = to.w / from.w, sy = to.h / from.h, dx = to.x - from.x, dy = to.y - from.y, lift = Math.min(60, Math.abs(dy) * 0.25 + 20);
            const a = c.animate([
                { transform: 'translate(0,0) scale(1,1) rotate(0deg)' },
                { transform: 'translate(' + f1(dx * 0.5) + 'px,' + f1(dy * 0.5 - lift) + 'px) scale(' + f1((1 + sx) / 2) + ',' + f1((1 + sy) / 2) + ') rotate(' + (back ? -6 : 6) + 'deg)', offset: 0.55 },
                { transform: 'translate(' + f1(dx) + 'px,' + f1(dy) + 'px) scale(' + sx.toFixed(3) + ',' + sy.toFixed(3) + ') rotate(0deg)' }
            ], { duration: back ? 560 : 680, easing: 'cubic-bezier(0.45, 0, 0.2, 1)', fill: 'forwards' });
            return settle(a, back ? 560 : 680).then(() => c);
        }

        async function open(cat, opts) {
            opts = opts || {};
            const d = data[cat]; if (!d) return;
            if (S.busy) { S.next = [cat, opts]; return; }   /* chosen mid-flight: open it as soon as this one lands */
            S.busy = true;
            if (S.closing) await S.closing;   /* a fast second click waits for the first plant to fold away */
            if (S.cat === cat) { S.busy = false; if (opts.select != null) select(opts.select, { focus: opts.focus !== false, scroll: true }); else bringIntoView(garden); return; }
            if (S.cat) await close({ quick: true, keepRow: true });
            const srcArt = $('svg', d.btn), from = docRect(srcArt);
            S.cat = cat; S.active = -1;
            build(d);
            row.classList.add('compact'); garden.classList.add('is-open');
            $$('[aria-controls="' + root.id + '"]', row).forEach(b => { const on = b === d.btn; b.setAttribute('aria-expanded', String(on)); b.classList.toggle('is-current', on); });
            root.hidden = false;
            plant.classList.remove('grown', 'folding'); head.classList.add('is-landing');
            await frame();
            measure();
            /* quiet: opened for the visitor before they choose anything (no flight, no scrolling, no focus, not a
               "discovery"); the branch grows the first time it is actually on screen */
            const quiet = !!opts.quiet;
            if (!quiet) bringIntoView(garden, 8);
            const n = quiet ? (visits[(isExp ? 'exp:' : 'skill:') + cat] || 0) : visit((isExp ? 'exp:' : 'skill:') + cat);
            const clone = quiet ? null : await flight(from, docRect(headArt), d, false);
            head.classList.remove('is-landing');
            if (clone) clone.remove();
            const grow = () => { if (S.cat !== cat) return; plant.classList.add('grown'); setTimeout(() => { if (S.cat === cat) plant.classList.add('settled'); }, reduce ? 0 : 1100 + S.n * 75); };
            if (quiet && !reduce) { const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); grow(); } }, { threshold: 0.3 }); io.observe(plant); }
            else grow();
            if (n > 1 && !reduce) head.classList.add('regrow');
            if (!quiet) discover((isExp ? 'exp:' : 'skill:') + cat, head);
            S.busy = false;
            if (opts.select != null) select(opts.select, { focus: opts.focus !== false, quiet: true, scroll: true });
            else if (opts.focus !== false && !quiet) focusQuiet($('.gn-title', note));
            /* a visitor comes to the flower you just opened, now and then */
            if (!reduce && !quiet && n === 1 && Math.random() < (isExp ? 0.5 : 0.4)) setTimeout(() => { if (S.cat === cat) visitFlower(headArt, isExp ? 'butterfly' : 'bee'); }, 1400);
            if (S.next) { const [c2, o2] = S.next; S.next = null; if (c2 !== cat || o2.select != null) open(c2, o2); }
        }

        function close(opts) {
            if (S.closing) return S.closing;
            if (!S.cat) return Promise.resolve();
            S.closing = closeNow(opts || {}).finally(() => { S.closing = null; });
            return S.closing;
        }
        async function closeNow(opts) {
            const d = data[S.cat], btn = d.btn, srcArt = $('svg', btn);
            plant.classList.remove('grown', 'settled'); plant.classList.add('folding'); head.classList.remove('regrow');
            tip.classList.remove('on');
            if (!reduce) await wait(opts.quick ? 260 : Math.min(620, 300 + S.n * 40));
            const from = docRect(headArt);
            head.classList.add('is-landing');
            if (!opts.keepRow) {
                /* settle the row instantly so the flower knows where home is */
                row.classList.add('no-anim'); row.classList.remove('compact'); garden.classList.remove('is-open');
            }
            root.hidden = true;
            btn.classList.remove('is-current'); btn.setAttribute('aria-expanded', 'false');
            if (!opts.quick && !reduce) {
                void row.offsetWidth;
                const r = btn.getBoundingClientRect();
                if (r.top < navH() || r.bottom > innerHeight) scrollBy({ top: r.top - navH() - Math.max(16, (innerHeight - navH() - r.height) / 2), behavior: 'auto' });
                srcArt.style.visibility = 'hidden';
                const clone = await flight(from, docRect(srcArt), d, true);
                srcArt.style.visibility = '';
                if (clone) settle(clone.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 120 }), 120).then(() => clone.remove());
                btn.classList.add('just-home'); setTimeout(() => btn.classList.remove('just-home'), 700);
            }
            row.classList.remove('no-anim');
            head.classList.remove('is-landing');
            S.cat = null; S.active = -1;
            if (!opts.quick && opts.restoreFocus !== false) focusQuiet(btn);
            cfg.onClose && cfg.onClose();
        }

        /* the row: choose a flower; the open one has moved up to the stage */
        $$('[aria-controls="' + root.id + '"]', row).forEach(b => b.addEventListener('click', () => {
            const cat = b.dataset.cat;
            if (S.cat === cat) close(); else open(cat);
        }));
        /* click on the empty space around an open plant to put it back */
        garden.closest('section').addEventListener('click', e => {
            if (!S.cat || S.busy || e.target.closest('.gs-inner, .g-row, .h-row, a, button, .seed-wrap')) return;
            close();
        });
        return { open, close, select, get cat() { return S.cat; }, root, garden, indexOf: (cat, id) => data[cat] ? data[cat].items.findIndex(it => it.id === id || it.name === id) : -1 };
    }

    const xpGarden = $('#expGarden'), skGarden = $('#skillGarden');
    const xpStage = xpGarden && Stage({ kind: 'exp', garden: xpGarden, row: $('.g-row', xpGarden), root: $('#xpStage'), data: EXP });
    const skStage = skGarden && Stage({ kind: 'skill', garden: skGarden, row: $('.h-row', skGarden), root: $('#skStage'), data: SK });
    let lastOpened = null;
    if (xpStage) { const o = xpStage.open; xpStage.open = (c, x) => { lastOpened = xpStage; return o(c, x); }; }
    if (skStage) { const o = skStage.open; skStage.open = (c, x) => { lastOpened = skStage; return o(c, x); }; }

    /* Escape closes whichever plant is open (the one with focus first) */
    document.addEventListener('keydown', e => {
        if (e.key !== 'Escape' || document.querySelector('.gallery-modal.active, .lightbox.active')) return;
        if (bouquet.isOpen()) return;
        const inside = [xpStage, skStage].find(s => s && s.cat && s.root.contains(document.activeElement));
        const target = inside || (lastOpened && lastOpened.cat ? lastOpened : [xpStage, skStage].find(s => s && s.cat));
        if (target) { e.preventDefault(); target.close(); }
    });

    /* Easter egg: linger on a flower in the row and a butterfly comes to see it */
    if (fine && !reduce) $$('.g-cat, .h-spec').forEach(b => {
        let t = 0;
        b.addEventListener('pointerenter', () => { t = setTimeout(() => { if (!b.classList.contains('is-current')) visitFlower($('svg', b), b.classList.contains('h-spec') ? 'bee' : 'butterfly'); }, 2600); });
        b.addEventListener('pointerleave', () => clearTimeout(t));
    });

    /* a fawn wanders past the garden once per visit, nibbles, and leaves */
    (function () {
        const row = xpGarden && $('.g-row', xpGarden); if (!row || reduce || !window.__deerSVG) return;
        const seen = mem('mb-fawn-v2', { n: 0, at: 0 }), log = seen.get();
        if (log.n >= 2) return;
        let timer = 0, done = false;
        const lane = document.createElement('div'); lane.className = 'g-lane'; lane.setAttribute('aria-hidden', 'true'); xpGarden.appendChild(lane);
        function walk() {
            if (done || document.hidden || Date.now() - log.at < 240000 || !Life.claim('fawn', 30000)) { timer = setTimeout(walk, 6000); return; }
            done = true; log.n++; log.at = Date.now(); seen.set(log);
            const deer = document.createElement('div'); deer.className = 'g-fawn left-facing'; deer.innerHTML = window.__deerSVG; lane.appendChild(deer);
            const cats = $$('.g-cat', row), last = cats[cats.length - 1], lr = lane.getBoundingClientRect(), tr = $('svg', last).getBoundingClientRect();
            const W = lr.width, stopX = Math.min(W - 70, tr.right - lr.left + 8);
            /* a fawn's pace (about 55px a second), whatever the screen width; it pauses to look around before nibbling */
            const inMs = Math.max(2400, (W + 20 - stopX) / 55 * 1000), outMs = Math.max(2000, (W + 40 - stopX) / 70 * 1000);
            deer.style.setProperty('--x', W + 20 + 'px'); deer.style.transitionDuration = (inMs / 1000).toFixed(2) + 's';
            requestAnimationFrame(() => requestAnimationFrame(() => { deer.classList.add('walking'); deer.style.setProperty('--x', stopX + 'px'); }));
            setTimeout(() => { deer.classList.remove('walking'); }, inMs + 50);
            setTimeout(() => { deer.classList.add('nibbling'); last.classList.add('is-nibbled'); }, inMs + 900);
            setTimeout(() => { deer.classList.remove('nibbling'); last.classList.remove('is-nibbled'); deer.classList.remove('left-facing'); deer.style.transitionDuration = (outMs / 1000).toFixed(2) + 's'; deer.classList.add('walking'); deer.style.setProperty('--x', W + 40 + 'px'); }, inMs + 3900);
            setTimeout(() => { deer.remove(); Life.release('fawn'); done = false; }, inMs + 4000 + outMs);
        }
        new IntersectionObserver(es => es.forEach(e => { clearTimeout(timer); if (e.isIntersecting && !done && log.n < 2) timer = setTimeout(walk, 7000); }), { threshold: 0.6 }).observe(row);
    })();

    /* ------------------------------------------------------------------
       The visitor's bouquet: a small, distinct posy in the corner. New
       finds travel to it; tap it to fan out what you have found.
       ------------------------------------------------------------------ */
    const BOW_PATHS = '<path class="bw-tail" d="M29 19 L17 41 L24 38.5 L28 43.5Z M31 19 L43 41 L36 38.5 L32 43.5Z"/>'
        + '<path class="bw-loop" d="M30 18 C23 3 5 2 4.5 13 C4.5 24 21 24 30 18Z M30 18 C37 3 55 2 55.5 13 C55.5 24 39 24 30 18Z"/>'
        + '<path class="bw-fold" d="M26 16 C20 9 12 9 9 13 M34 16 C40 9 48 9 51 13"/>'
        + '<rect class="bw-knot" x="25" y="12.5" width="10" height="11" rx="4"/>';
    const BOW_SVG = '<svg class="bq-bow" viewBox="0 0 60 46" aria-hidden="true">' + BOW_PATHS + '</svg>';
    const bouquet = (function () {
        const wrap = document.createElement('div'); wrap.className = 'mb-bouquet'; wrap.hidden = true;
        wrap.innerHTML =
            '<button type="button" class="bq-btn" aria-expanded="false" aria-controls="bqFan">'
            + '<span class="bq-disc" aria-hidden="true"></span>'
            + '<svg class="bq-art" viewBox="0 0 80 104" aria-hidden="true"><g class="bq-stems"></g><g class="bq-filler"></g>'
            + '<path d="M17 62 L63 62 L45 101 Q40 104 35 101 Z" fill="#f3dcbd" stroke="#c9a06a" stroke-width="1.3" stroke-linejoin="round"/>'
            + '<path d="M17 62 L40 70 L63 62" fill="none" stroke="#c9a06a" stroke-width="1.1" opacity=".7"/>'
            + '<path d="M27 66 L33 92 M53 66 L46 92" stroke="#e8cfa6" stroke-width="1.4" opacity=".8"/>'
            + '<path class="bq-band" d="M29 67.5 Q40 72.5 51 67.5 L51.6 72 Q40 77 28.4 72Z" stroke-width=".8"/></svg>'
            + '<span class="vh">Your discoveries</span></button>'
            + '<button type="button" class="bq-bowbtn" aria-expanded="false" aria-controls="bqPick" aria-label="Change the bow colour">' + BOW_SVG + '</button>'
            + '<div class="bq-pick" id="bqPick" role="radiogroup" aria-label="Bow colour" hidden></div>'
            + '<span class="bq-label" aria-hidden="true"><svg viewBox="0 0 40 24"><path d="M38 4 C26 2 12 6 6 18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M3 12 L6 19 L12 15" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>your discoveries</span>'
            + '<div class="bq-fan" id="bqFan" role="group" aria-label="Your discoveries" hidden><p class="bq-title">your discoveries</p><ol class="bq-list"></ol><button type="button" class="bq-reset">start a fresh bouquet</button></div>';
        document.body.appendChild(wrap);
        /* once the bouquet is full enough, the visitor may tie it with a ribbon of their choosing (remembered) */
        const RIBBONS = [['blush pink', '#f4a7bf', '#d9789e'], ['soft yellow', '#f6d36b', '#c99a1a'], ['sage green', '#b7cfa0', '#7f9f6a'], ['lavender', '#cdb8f2', '#9d7fd0'], ['cream', '#fbf1dc', '#c9a06a']];
        const ribbonBox = $('.bq-pick', wrap), bowBtn = $('.bq-bowbtn', wrap);
        ribbonBox.innerHTML = RIBBONS.map(([n, c, e]) => '<button type="button" role="radio" aria-checked="false" aria-label="' + n + ' bow" title="' + n + '" data-ribbon="' + n + '" style="--rc:' + c + ';--re:' + e + '"><svg viewBox="0 0 60 46" aria-hidden="true">' + BOW_PATHS + '</svg></button>').join('');
        const picking = () => !ribbonBox.hidden;
        function pick(open, restore) {
            if (open === picking()) return;
            ribbonBox.hidden = !open; bowBtn.setAttribute('aria-expanded', String(open)); wrap.classList.toggle('is-picking', open);
            if (open) { const on = $('[aria-checked="true"]', ribbonBox) || $('button', ribbonBox); focusQuiet(on); } else if (restore) focusQuiet(bowBtn);
        }
        function tie(name) {
            const r = RIBBONS.find(x => x[0] === name) || RIBBONS[0];
            wrap.style.setProperty('--ribbon', r[1]); wrap.style.setProperty('--ribbon-edge', r[2]);
            $$('[data-ribbon]', ribbonBox).forEach(b => b.setAttribute('aria-checked', String(b.dataset.ribbon === r[0])));
        }
        tie(WorldState.get().ribbon);
        ribbonBox.addEventListener('click', e => { const b = e.target.closest('[data-ribbon]'); if (!b) return; e.stopPropagation(); WorldState.get().ribbon = b.dataset.ribbon; WorldState.save(); tie(b.dataset.ribbon); bowBtn.classList.remove('wiggle'); void bowBtn.offsetWidth; bowBtn.classList.add('wiggle'); });
        bowBtn.addEventListener('click', e => { e.stopPropagation(); if (!fan.hidden) close(false); pick(!picking(), true); });
        const btn = $('.bq-btn', wrap), stems = $('.bq-stems', wrap), filler = $('.bq-filler', wrap), fan = $('.bq-fan', wrap), list = $('.bq-list', wrap), label = $('.bq-label', wrap);

        function draw(newId) {
            stems.innerHTML = '';
            const n = found.length, bx = 40, by = 66;
            found.forEach((id, i) => {
                const c = CATS[id]; if (!c) return;
                const a = (n === 1 ? 0 : -48 + 96 * i / (n - 1)) * Math.PI / 180, L = 36 + (i % 2 ? 9 : 0) + (n > 6 ? (i % 3) * 3 : 0);
                const tx = bx + Math.sin(a) * L, ty = by - Math.cos(a) * L, s = c.kind === 'Skills' ? 28 : 32;
                const g = document.createElementNS('http://www.w3.org/2000/svg', 'g'); g.setAttribute('class', 'bq-stem' + (id === newId && !reduce ? ' new' : ''));
                g.innerHTML = '<path d="M' + bx + ' ' + by + ' Q' + f1(bx + (tx - bx) * 0.4) + ' ' + f1(by - L * 0.55) + ' ' + f1(tx) + ' ' + f1(ty + s * 0.3) + '" fill="none" stroke="#7fa65c" stroke-width="1.6" stroke-linecap="round"/>'
                    + '<use href="#' + c.sym + '" x="' + f1(tx - s / 2) + '" y="' + f1(ty - s / 2) + '" width="' + s + '" height="' + s + '"/>';
                stems.appendChild(g);
            });
            /* baby's breath: one tiny bloom for every piece explored (it fills out, never counts) */
            const R = rng(7), k = Math.min(24, foundItems.length);
            let h = '';
            for (let i = 0; i < k; i++) { const a = (R() - 0.5) * 1.9, L = 22 + R() * 30; h += '<circle cx="' + f1(40 + Math.sin(a) * L) + '" cy="' + f1(64 - Math.cos(a) * L) + '" r="' + f1(1.3 + R() * 1.1) + '" fill="' + (i % 3 ? '#fff' : '#fde1ea') + '" stroke="#e6d5c3" stroke-width=".5"/>'; }
            filler.innerHTML = h;
            list.innerHTML = '';
            found.forEach((id, k) => {
                const c = CATS[id]; if (!c) return;
                const li = document.createElement('li'); li.style.setProperty('--n', k);
                li.innerHTML = '<button type="button" data-open="' + id + '"><svg viewBox="' + c.box + '" aria-hidden="true"><use href="#' + c.sym + '"/></svg><span class="bq-name">' + esc(c.name) + '</span><span class="bq-kind">' + c.kind + '</span></button>';
                list.appendChild(li);
            });
            wrap.hidden = !n && !foundItems.length;
            wrap.classList.toggle('is-full', n >= 6);
        }
        let labelT = 0;
        function nudge(long) {
            if (reduce) return;
            btn.classList.remove('sway'); void btn.offsetWidth; btn.classList.add('sway');
            wrap.classList.add('show-label'); clearTimeout(labelT); labelT = setTimeout(() => wrap.classList.remove('show-label'), long ? 4800 : 2600);
        }
        /* a small copy of what was found drifts to the bouquet along a soft arc */
        function travel(fromEl, html, size) {
            if (reduce || !fromEl || wrap.hidden) return Promise.resolve();
            const a = fromEl.getBoundingClientRect(), b = btn.getBoundingClientRect();
            if (!a.width) return Promise.resolve();
            const el = document.createElement('div'); el.className = 'bq-traveler'; el.setAttribute('aria-hidden', 'true'); el.innerHTML = html;
            el.style.width = el.style.height = size + 'px'; el.style.left = (a.left + a.width / 2 - size / 2) + 'px'; el.style.top = (a.top + a.height / 2 - size / 2) + 'px';
            document.body.appendChild(el);
            const dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height * 0.35 - (a.top + a.height / 2);
            const anim = el.animate([
                { transform: 'translate(0,0) scale(.4) rotate(0deg)', opacity: 0 },
                { transform: 'translate(' + f1(dx * 0.15) + 'px,' + f1(dy * 0.15 - 40) + 'px) scale(1) rotate(40deg)', opacity: 1, offset: 0.2 },
                { transform: 'translate(' + f1(dx * 0.6) + 'px,' + f1(dy * 0.5 - 70) + 'px) scale(.9) rotate(160deg)', opacity: 1, offset: 0.6 },
                { transform: 'translate(' + f1(dx) + 'px,' + f1(dy) + 'px) scale(.5) rotate(300deg)', opacity: 0.2 }
            ], { duration: 1300, easing: 'cubic-bezier(0.4, 0, 0.3, 1)' });
            return settle(anim, 1300).then(() => el.remove());
        }
        function collect(id, fromEl) {
            const c = CATS[id], first = wrap.hidden;
            if (first) { wrap.hidden = false; }
            travel(fromEl, '<svg viewBox="' + c.box + '"><use href="#' + c.sym + '"/></svg>', 40).then(() => { draw(id); nudge(first || found.length === 1); });
        }
        function sprinkle(fromEl) {
            if (wrap.hidden) { draw(); return; }
            travel(fromEl, '<svg viewBox="-10 -10 20 20" style="color:#f4a7bf;--center:#fff6d8"><use href="#mk" x="-10" y="-10" width="20" height="20"/></svg>', 16).then(() => { draw(); if (!reduce) { btn.classList.remove('sway'); void btn.offsetWidth; btn.classList.add('sway'); } });
        }
        const isOpen = () => !fan.hidden;
        function open() { pick(false); fan.hidden = false; btn.setAttribute('aria-expanded', 'true'); wrap.classList.add('is-open'); const f = $('button', list); if (f) focusQuiet(f); }
        function close(restore) { if (fan.hidden) return; fan.hidden = true; btn.setAttribute('aria-expanded', 'false'); wrap.classList.remove('is-open'); if (restore !== false) focusQuiet(btn); }
        btn.addEventListener('click', e => { e.stopPropagation(); isOpen() ? close() : open(); });
        list.addEventListener('click', e => { const b = e.target.closest('[data-open]'); if (!b) return; close(false); openById(b.dataset.open); });
        $('.bq-reset', wrap).addEventListener('click', () => { found = []; foundItems = []; foundStore.clear(); itemStore.clear(); clearMarks(); close(); draw(); wrap.hidden = true; });
        document.addEventListener('keydown', e => { if (e.key === 'Escape' && picking()) { e.stopPropagation(); pick(false, true); } else if (e.key === 'Escape' && isOpen()) { e.stopPropagation(); close(); } });
        document.addEventListener('click', e => { if (wrap.contains(e.target)) return; if (isOpen()) close(false); pick(false); });
        return { collect, sprinkle, draw, isOpen: () => isOpen() || picking() };
    })();
    found.forEach(id => setMark(id, false));
    bouquet.draw();

    /* ------------------------------------------------------------------
       Ways in: links, hero interests, bouquet, cross-links between
       experiences and skills
       ------------------------------------------------------------------ */
    function openById(id) {
        const [kind, cat] = id.split(':');
        if (kind === 'exp' && xpStage) xpStage.open(cat);
        else if (kind === 'skill' && skStage) skStage.open(cat);
    }
    function gotoItem(spec, opts) {
        const [cat, id] = spec.split(':'); if (!xpStage || !EXP[cat]) return false;
        const i = xpStage.indexOf(cat, id);
        xpStage.open(cat, Object.assign({ select: i < 0 ? null : i }, opts));
        return true;
    }
    let galleryOpener = null;
    function openGallery(filter, file) {
        const modal = $('#galleryModal'); if (!modal) return false;
        galleryOpener = document.activeElement;
        modal.classList.add('active'); document.body.style.overflow = 'hidden';
        const tab = filter ? $('.gallery-modal-tab[data-filter="' + filter + '"]') : null;
        if (tab) tab.click(); else if (typeof buildCollage === 'function') buildCollage();
        if (file && typeof openArtwork === 'function') openArtwork(file);
        setTimeout(() => focusQuiet(file ? $('#lightboxClose') : $('#galleryClose')), 50);
        return true;
    }
    const gClose = $('#galleryClose');
    if (gClose) gClose.addEventListener('click', () => { if (galleryOpener && document.contains(galleryOpener)) focusQuiet(galleryOpener); galleryOpener = null; });
    const prevw = $('#galleryPreview');
    if (prevw) {
        prevw.addEventListener('click', () => { galleryOpener = prevw; });
        prevw.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); prevw.click(); setTimeout(() => focusQuiet($('#galleryClose')), 50); } });
    }
    document.addEventListener('click', e => {
        const a = e.target.closest('a[href^="#"], [data-gallery]');
        if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey) return;
        if (a.dataset.gallery) { e.preventDefault(); openGallery(a.dataset.gallery); return; }
        if (a.dataset.open) { e.preventDefault(); openById(a.dataset.open); return; }
        if (a.dataset.goto) { e.preventDefault(); gotoItem(a.dataset.goto); return; }
        if (a.dataset.skill) { e.preventDefault(); if (skStage) skStage.open(a.dataset.skill); return; }
        const id = a.getAttribute('href').slice(1); if (!id) return;
        const t = document.getElementById(id); if (!t) return;
        e.preventDefault();
        if (id === 'home') scrollTo({ top: 0, behavior: behavior() });
        else { const y = t.getBoundingClientRect().top - navH() - (id === 'about' ? 0 : 6); if (Math.abs(y) > 2) scrollBy({ top: y, behavior: behavior() }); }
        const h = t.querySelector('h2, h1'); if (h && !a.closest('.nav')) setTimeout(() => focusQuiet(h), reduce ? 0 : 450);
    });

    /* ------------------------------------------------------------------
       "A seed of curiosity": a surprise piece of work
       ------------------------------------------------------------------ */
    (function () {
        const packet = $('#seedPacket'), status = $('#seedStatus'); if (!packet || !status) return;
        const card = id => { for (const d of Object.values(EXP)) { const it = d.items.find(x => x.id === id); if (it) return it; } return null; };
        const CANDIDATES = [
            ...['xp-pinn', 'xp-energy', 'xp-biophysics', 'xp-tweezers', 'xp-mesophyll', 'xp-materials'].map(id => ({ key: id, type: 'card', cat: 'research', id })),
            { key: 'w-chinahands', type: 'link', cat: 'writing', id: 'xp-chinahands', url: 'https://chinahandsmagazine.org/author/madisonbutchko/', title: 'Articles in China Hands Magazine', source: 'China Hands Magazine', desc: 'Chinese history, technology & social issues.' },
            { key: 'w-hercampus', type: 'link', cat: 'writing', id: 'xp-hercampus', url: 'https://www.hercampus.com/author/maddie-butchko/', title: 'Articles in Her Campus at Yale', source: 'Her Campus at Yale', desc: 'Weekly lifestyle content.' },
            { key: 'w-ydn', type: 'link', cat: 'writing', id: 'xp-ydn', url: 'https://yaledailynews.com/author/madison-butchko', title: 'Columns in the Yale Daily News', source: 'Yale Daily News', desc: 'Personal essays with illustrations.' },
            { key: 'w-herald', type: 'link', cat: 'writing', id: 'xp-herald', url: 'https://yale-herald.com/2025/03/30/a-guide-to-achieving-perfect-skin/', title: 'A Guide to Achieving Perfect Skin', source: 'Yale Herald', desc: 'A personal essay.' },
            { key: 't-classrooms', type: 'link', cat: 'teaching', id: 'xp-gtp', url: 'https://globalteachingproject.com/2024/05/24/from-classrooms-to-change/', title: 'From Classrooms to Change', source: 'Global Teaching Project', desc: 'An article linked from the AP Physics Teaching Assistant role.' },
            { key: 't-beyond', type: 'link', cat: 'teaching', id: 'xp-gtp', url: 'https://globalteachingproject.com/2025/04/18/beyond-physics/', title: 'Beyond Physics', source: 'Global Teaching Project', desc: 'An article linked from the AP Physics Teaching Assistant role.' },
            ...['mandala_passion.png', 'Tulips.jpg', 'calligraphy3.jpg', 'face_full_of_stars.png', 'Little_prince_2.jpg', 'peonies.png', 'Reader.jpg', 'madeinchina.jpg'].map(file => ({ key: 'a-' + file, type: 'art', file }))
        ];
        const ARTS = typeof artworks !== 'undefined' ? artworks : [];
        const POOL = CANDIDATES.filter(it => it.type === 'art' ? ARTS.some(a => a.file === it.file) : !!card(it.id));
        POOL.forEach(it => {
            if (it.type === 'card') { const c = card(it.id); it.title = plain(c.role) + ', ' + plain(c.org).split('·')[0].trim(); }
            if (it.type === 'art') it.title = (ARTS.find(a => a.file === it.file) || {}).title || 'Artwork';
        });
        if (!POOL.length) { packet.closest('.seed-wrap').hidden = true; return; }
        const bagStore = mem('mb-seed-bag-v1', null);
        function draw() {
            const bag = bagStore.get() || { left: [], last: null };
            bag.left = (bag.left || []).filter(k => POOL.some(p => p.key === k));
            if (!bag.left.length) {
                const keys = POOL.map(p => p.key);
                for (let i = keys.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [keys[i], keys[j]] = [keys[j], keys[i]]; }
                if (keys.length > 1 && keys[0] === bag.last) keys.push(keys.shift());
                bag.left = keys;
            }
            const key = bag.left.shift(); bag.last = key; bagStore.set(bag);
            return POOL.find(p => p.key === key);
        }
        let busy = false, noteT = 0;
        function say(text, keep) { clearTimeout(noteT); status.innerHTML = '<p class="seed-note">' + esc(text) + '</p>'; if (!keep) noteT = setTimeout(() => { if (status.querySelector('.seed-note')) status.innerHTML = ''; }, 5000); }
        function preview(it) {
            clearTimeout(noteT);
            status.innerHTML = '<div class="seed-preview"><button type="button" class="sv-close" aria-label="Close preview">&times;</button><p class="sv-kicker">' + esc(it.source) + '</p><p class="sv-title">' + esc(it.title) + '</p><p class="sv-desc">' + esc(it.desc) + '</p>'
                + '<a class="sv-link" href="' + esc(it.url) + '" target="_blank" rel="noopener">Read on ' + esc(it.source) + ' <span aria-hidden="true">&#8599;&#xFE0E;</span><span class="vh"> (opens in a new tab)</span></a></div>';
            $('.sv-close', status).addEventListener('click', () => { status.innerHTML = ''; focusQuiet(packet); });
        }
        packet.addEventListener('click', () => {
            if (busy) return; busy = true;
            const it = draw();
            packet.classList.add('opening'); say('Sprouting: ' + it.title, true);
            const pour = window.__eco && window.__eco.pour ? window.__eco.pour(packet) : 0;
            setTimeout(() => {
                packet.classList.remove('opening'); busy = false;
                if (it.type === 'card') { gotoItem(it.cat + ':' + it.id); say('Planted: ' + it.title); }
                else if (it.type === 'link') { gotoItem(it.cat + ':' + it.id, { focus: false }); preview(it); }
                else { say('Planted: ' + it.title); openGallery(null, it.file); }
            }, reduce ? 350 : Math.max(1300, pour + 250));
        });
    })();

    /* ------------------------------------------------------------------
       Small hidden moments
       ------------------------------------------------------------------ */
    /* tap a scattered leaf and a ladybug walks out across it */
    document.addEventListener('click', e => {
        const leaf = e.target.closest('.sc-leaf'); if (!leaf || reduce) return;
        const bug = document.createElement('span'); bug.className = 'ladybug on-leaf'; bug.setAttribute('aria-hidden', 'true'); bug.innerHTML = LADYBUG;
        leaf.appendChild(bug); setTimeout(() => bug.remove(), 3600);
    });
    /* fireflies glow around the contact section in the evening (local time) */
    (function () {
        const h = new Date().getHours(), sec = $('#contact'); if (!sec || reduce || (h >= 6 && h < 19)) return;
        const box = document.createElement('div'); box.className = 'fireflies'; box.setAttribute('aria-hidden', 'true');
        box.innerHTML = Array.from({ length: 5 }, (_, k) => '<i style="--k:' + k + ';left:' + (8 + k * 19) + '%;top:' + (20 + (k * 37) % 60) + '%"></i>').join('');
        sec.appendChild(box);
        new IntersectionObserver(es => es.forEach(en => box.classList.toggle('on', en.isIntersecting))).observe(sec);
    })();

    /* touch screens have no hover: a tap gives "hello, I'm Madison" the same gentle colour change */
    const hello = $('.about-hello');
    if (hello) hello.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse') return; hello.classList.add('is-tapped'); clearTimeout(hello._t); hello._t = setTimeout(() => hello.classList.remove('is-tapped'), 1600); });

    /* footer year */
    const fy = $('#footerYear'); if (fy) { const y = new Date().getFullYear(); if (y >= 2026) fy.textContent = y; }
})();

/* =====================================================================
   The little world: things that quietly happen as someone explores.
   Flowers lean toward the cursor like sunlight, a caterpillar becomes a
   chrysalis and later a butterfly, birds take seeds and petals and slowly
   build a nest, a dandelion scatters seeds that may take root further
   down, and now and then a small cloud brings rain (and maybe a rainbow).
   Everything shares WorldState (memory) and Life (one creature at a time,
   and bigger events only after a quiet stretch), driven by one heartbeat.
   ===================================================================== */
(function () {
    'use strict';
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
    const $ = (sel, root) => (root || document).querySelector(sel);
    const $$ = (sel, root) => [...(root || document).querySelectorAll(sel)];
    const rand = (a, b) => a + Math.random() * (b - a);
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const f1 = v => (+v).toFixed(1);
    const W = WorldState.get();
    const save = () => WorldState.save();
    const NS = 'http://www.w3.org/2000/svg';
    /* is anything the visitor reads or clicks at (x, y)? decorations and the world's own pieces don't count */
    const BLOCK = 'p,h1,h2,h3,h4,li,a,button,img,input,label,.nav,.hero-text,.collage,.about-body,.about-photo-wrap,.section-head,.section-hint,.xp-head,.garden,.herbarium,.mb-bouquet,.seed-wrap,.gallery-frame,.gallery-deviant,.contact-inner,.garden-bed,.garden-tip,.to-top,.guide-bird,.page-posy,.w-piece,footer';
    function clearAt(x, y, r) {
        if (x - r < 8 || x + r > innerWidth - 8 || y - r < navBottom() + 6 || y + r > innerHeight - 8) return false;
        for (const dx of [-r, 0, r]) for (const dy of [-r, 0, r]) {
            const top = document.elementsFromPoint(x + dx, y + dy).find(e => !e.closest('.w-ignore'));
            if (top && top.closest(BLOCK)) return false;
        }
        return true;
    }
    const navBottom = () => { const n = $('.nav'); return n ? n.getBoundingClientRect().bottom : 0; };
    function openSpot(r, tries) {
        for (let k = 0; k < (tries || 40); k++) {
            const x = rand(20, innerWidth - 20), y = rand(navBottom() + 40, innerHeight - 60);
            if (clearAt(x, y, r)) return { x, y };
        }
        return null;
    }
    /* runs fn once the element is out of view (so changes happen while nobody is looking) */
    const offscreen = el => { const r = el.getBoundingClientRect(); return r.bottom < 0 || r.top > innerHeight || !r.width; };
    const waiting = [];
    function whenUnseen(el, fn) {
        if (offscreen(el)) { fn(); return; }
        let done = false;
        const once = () => { if (done) return; done = true; io.disconnect(); fn(); };
        const io = new IntersectionObserver(es => { if (!es[0].isIntersecting) once(); });
        io.observe(el);
        waiting.push({ el, once, done: () => done });   /* the heartbeat double-checks, in case the observer is throttled */
    }
    function checkWaiting() { for (let i = waiting.length - 1; i >= 0; i--) { const w = waiting[i]; if (w.done()) waiting.splice(i, 1); else if (offscreen(w.el)) { w.once(); waiting.splice(i, 1); } } }
    const inView = el => { if (!el) return false; const r = el.getBoundingClientRect(); return r.width && r.bottom > 60 && r.top < innerHeight - 40; };

    /* ------------------------------------------------------------------
       Sunlight: flowers near the cursor lean toward it by a few degrees;
       the sunflower in the corner turns its face to follow, slowly.
       ------------------------------------------------------------------ */
    if (fine && !reduce) {
        const SEL = '.g-art, .h-art, .hello-flower, .w-dandelion:not([hidden]), .page-posy, .w-sprout, .v11-bud';   /* flowers with stems: a tilt reads on them (on a turning bloom it would not) */
        let items = [], dirty = true, q = 0, px = -1e4, py = -1e4;
        const sun = $('.to-top .sf-sway'), sunHost = $('.to-top');
        const refresh = () => { items = $$(SEL).map(el => ({ el, r: el.getBoundingClientRect() })).filter(o => o.r.width && o.r.bottom > -50 && o.r.top < innerHeight + 50); dirty = false; };
        addEventListener('scroll', () => { dirty = true; }, { passive: true });
        addEventListener('resize', () => { dirty = true; });
        addEventListener('pointermove', e => {
            px = e.clientX; py = e.clientY; if (q) return;
            q = requestAnimationFrame(() => {
                q = 0; if (dirty) refresh();
                const R = 240;
                items.forEach(o => {
                    const cx = o.r.left + o.r.width / 2, cy = o.r.top + o.r.height * 0.45, dx = px - cx, dy = py - cy, d = Math.hypot(dx, dy);
                    const tilt = d < R ? clamp(dx / (d || 1) * 7 * (1 - d / R) * (dy < 0 ? 1 : 0.6), -6, 6) : 0;
                    if (Math.abs((o.t || 0) - tilt) > 0.15) { o.t = tilt; o.el.style.setProperty('--sun', f1(tilt) + 'deg'); }
                });
                if (sun) {
                    const r = sunHost.getBoundingClientRect(), dx = px - (r.left + r.width / 2), d = Math.hypot(dx, py - r.top);
                    sun.style.setProperty('--face', f1(d < 1100 ? clamp(dx / 22, -24, 24) : 0) + 'deg');   /* the one flower that follows noticeably, still within a gentle range */
                }
            });
        }, { passive: true });
        document.addEventListener('mouseleave', () => { items.forEach(o => { o.t = 0; o.el.style.setProperty('--sun', '0deg'); }); if (sun) sun.style.setProperty('--face', '0deg'); });
    }

    /* ------------------------------------------------------------------
       A small bird that comes in for something (a seed, a petal), shared
       by feeding and stealing. Uses the vine-bird look and states.
       ------------------------------------------------------------------ */
    function visitingBird(getTarget, opts) {
        opts = opts || {};
        const el = document.createElement('div'); el.className = 'vine-bird flying w-bird'; el.setAttribute('aria-hidden', 'true');
        el.innerHTML = '<div class="c-flip"><div class="c-body">' + (window.__birdSVG || '') + '</div></div>';
        document.body.appendChild(el);
        const t0 = getTarget(), fromLeft = t0.x > innerWidth / 2 ? false : true;
        let x = fromLeft ? -50 : innerWidth + 50, y = rand(-40, innerHeight * 0.25);
        el.classList.toggle('left-facing', !fromLeft);
        const set = () => { el.style.transform = 'translate(' + f1(x - 18) + 'px,' + f1(y - 26) + 'px)'; }; set();
        const go = (to, dur, arc, done) => {
            const s0 = performance.now(), x0 = x, y0 = y;
            (function step(now) {
                if (!document.contains(el)) return;
                const t = Math.min(1, (now - s0) / dur), e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2, p = to();
                x = x0 + (p.x - x0) * e; y = y0 + (p.y - y0) * e - Math.sin(Math.PI * t) * arc; set();
                if (t < 1) requestAnimationFrame(step); else done && done();
            })(s0);
        };
        const away = () => {
            el.classList.remove('eating'); el.classList.add('flying'); el.classList.toggle('left-facing', fromLeft);
            const ex = fromLeft ? innerWidth + 60 : -60, ey = rand(-60, innerHeight * 0.2);
            go(() => ({ x: ex, y: ey }), 1500, 30, () => { el.remove(); opts.done && opts.done(); });
        };
        go(getTarget, opts.swoop ? 1100 : 1700, opts.swoop ? -30 : -50, () => {
            if (opts.swoop) { opts.arrive && opts.arrive(el); away(); return; }
            el.classList.remove('flying'); el.classList.add('eating');
            opts.arrive && opts.arrive(el);
            setTimeout(away, opts.stay || 1500);
        });
        return el;
    }
    /* birds keep what they find: every few pieces of material, the nest grows by one stage */
    function gather() { W.nestBits = (W.nestBits || 0) + 1; if (W.nestBits >= 2 && W.nest < 5) { W.nestBits = 0; W.nest++; } save(); nest.render(); }

    /* ------------------------------------------------------------------
       A seed to feed a bird: drag it near a bird (or anywhere, if no bird
       is around, and one will come). Keyboard: Enter scatters it.
       ------------------------------------------------------------------ */
    const seed = (function () {
        let el = null, timer = 0, shownThisVisit = 0;
        const SVG = '<svg viewBox="-8 -11 16 22" aria-hidden="true"><path d="M0 -10 C6 -6 6 6 0 10 C-6 6 -6 -6 0 -10Z" fill="#c9a06a" stroke="#8a5a2a" stroke-width="1"/><path d="M0 -8 C3 -4 3 4 0 8" stroke="#f3dcbd" stroke-width="1.4" fill="none" stroke-linecap="round"/></svg>';
        function remove(fade) { if (!el) return; const e = el; el = null; clearTimeout(timer); if (fade) { e.classList.add('gone'); setTimeout(() => e.remove(), 900); } else e.remove(); }
        function docPos() { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
        function feed(near) {
            const s = el; if (!s || s.classList.contains('taken')) return; s.classList.add('taken'); s.setAttribute('aria-disabled', 'true');
            const gb = window.__guideBird, pos = docPos();
            const eat = bird => { s.classList.add('eaten'); if (bird) { bird.classList.add('fed'); setTimeout(() => bird.classList.remove('fed'), 1400); } sparkle(pos.x, pos.y); setTimeout(() => remove(false), 500); gather(); };
            if (near && gb && gb.visible()) { gb.visit(pos.x, pos.y, () => eat(gb.el)); return; }
            if (reduce) { eat(null); return; }
            Life.claim('fed-bird', 9000, true);
            visitingBird(() => docPos(), { stay: 1300, arrive: b => eat(b), done: () => Life.release('fed-bird') });
        }
        function spawn(at) {
            if (el || shownThisVisit >= 3 || reduce) return false;
            const spot = at && clearAt(at.x, at.y, 14) ? at : openSpot(18); if (!spot) return false;
            shownThisVisit++;
            el = document.createElement('div'); el.className = 'w-seed w-piece'; el.innerHTML = SVG;
            el.setAttribute('role', 'button'); el.setAttribute('tabindex', '0'); el.setAttribute('aria-label', 'A seed. Drag it to a bird, or press Enter to scatter it for the birds');
            el.style.left = f1(spot.x + scrollX) + 'px'; el.style.top = f1(spot.y + scrollY) + 'px';
            document.body.appendChild(el);
            let drag = null;
            el.addEventListener('pointerdown', e => { if (el.classList.contains('taken')) return; e.preventDefault(); drag = { id: e.pointerId, dx: e.pageX - parseFloat(el.style.left), dy: e.pageY - parseFloat(el.style.top), moved: 0, sx: e.pageX, sy: e.pageY }; try { el.setPointerCapture(e.pointerId); } catch (_) { } el.classList.add('held'); });
            el.addEventListener('pointermove', e => {
                if (!drag || e.pointerId !== drag.id) return;
                el.style.left = f1(e.pageX - drag.dx) + 'px'; el.style.top = f1(e.pageY - drag.dy) + 'px';
                drag.moved = Math.max(drag.moved, Math.hypot(e.pageX - drag.sx, e.pageY - drag.sy));
                const gb = window.__guideBird;
                if (gb && gb.visible()) { const p = gb.at(); gb.el.classList.toggle('curious', Math.hypot(p.x - e.clientX, p.y - e.clientY) < 220); }
            });
            const drop = e => {
                if (!drag || e.pointerId !== drag.id) return;
                const moved = drag.moved; drag = null; el.classList.remove('held');
                const gb = window.__guideBird; if (gb) gb.el.classList.remove('curious');
                if (moved < 24) { el.classList.remove('wiggle'); void el.offsetWidth; el.classList.add('wiggle'); return; }
                const p = docPos(), near = gb && gb.visible() && Math.hypot(gb.at().x - p.x, gb.at().y - p.y) < 220;
                feed(near || !(gb && gb.visible()));
            };
            el.addEventListener('pointerup', drop); el.addEventListener('pointercancel', drop);
            el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); feed(true); } });
            /* unclaimed seeds blow away after a while */
            timer = setTimeout(() => remove(true), 75000);
            return true;
        }
        return { spawn, get el() { return el; }, take: () => { const e = el; el = null; clearTimeout(timer); return e; } };
    })();
    function sparkle(x, y) {
        if (reduce) return;
        for (let k = 0; k < 4; k++) {
            const s = document.createElement('i'); s.className = 'w-spark'; s.style.left = f1(x) + 'px'; s.style.top = f1(y) + 'px';
            document.body.appendChild(s);
            const a = k / 4 * Math.PI * 2 + 0.4;
            s.animate([{ transform: 'translate(0,0) scale(.3)', opacity: 1 }, { transform: 'translate(' + f1(Math.cos(a) * 18) + 'px,' + f1(Math.sin(a) * 18 - 8) + 'px) scale(1)', opacity: 0 }], { duration: 700, easing: 'ease-out' }).onfinish = () => s.remove();
        }
    }

    /* uncommon: a bird swoops for a loose seed, or snatches a petal out of the air, and carries it off */
    function steal() {
        if (reduce || !Life.claim('thief', 9000)) return false;
        let carried = seed.el && !seed.el.classList.contains('held') && !seed.el.classList.contains('taken') && inView(seed.el) ? seed.take() : null;
        let x, y;
        if (carried) { const r = carried.getBoundingClientRect(); x = r.left + r.width / 2; y = r.top + r.height / 2; }
        else {
            const spot = openSpot(14); if (!spot) { Life.release('thief'); return false; }
            carried = document.createElement('div'); carried.className = 'w-petal'; carried.setAttribute('aria-hidden', 'true');
            document.body.appendChild(carried);
            x = spot.x; y = navBottom() + 20;
        }
        carried.classList.add('w-loose');
        const t0 = performance.now(), driftTo = y + rand(120, 200);
        const pos = () => { const t = (performance.now() - t0) / 1000; return { x: x + Math.sin(t * 1.6) * 16, y: Math.min(driftTo, y + t * 34) }; };
        carried.style.position = 'fixed';
        const place = () => { const p = pos(); carried.style.left = f1(p.x) + 'px'; carried.style.top = f1(p.y) + 'px'; };
        let falling = true;
        (function fall() { if (!falling) return; place(); requestAnimationFrame(fall); })();
        setTimeout(() => visitingBird(pos, {
            swoop: true,
            arrive: b => { falling = false; carried.style.cssText = ''; carried.className = 'w-carried ' + (carried.classList.contains('w-seed') ? 'is-seed' : 'is-petal'); b.querySelector('.c-body').appendChild(carried); },
            done: () => { Life.release('thief'); gather(); }
        }), 1600);
        return true;
    }

    /* ------------------------------------------------------------------
       The nest: tucked at a corner of the contact photo. It only changes
       while out of sight, a twig at a time, and birds visit it later.
       ------------------------------------------------------------------ */
    const nest = (function () {
        const host = $('.contact-photo'); if (!host) return { render() { }, visit() { return false; } };
        const el = document.createElement('div'); el.className = 'w-nest'; el.setAttribute('aria-hidden', 'true');
        el.innerHTML = '<svg viewBox="0 0 80 46">'
            + '<g class="n1"><path d="M8 34 L58 26" stroke="#9a6b3a" stroke-width="2.2" stroke-linecap="round"/><path d="M40 29 L48 21" stroke="#9a6b3a" stroke-width="1.4" stroke-linecap="round"/></g>'
            + '<g class="n2"><path d="M18 38 L70 33" stroke="#b07f4a" stroke-width="2" stroke-linecap="round"/><path d="M26 37 L20 31" stroke="#b07f4a" stroke-width="1.3" stroke-linecap="round"/></g>'
            + '<g class="n3" fill="none" stroke="#a7b86a" stroke-width="1.3" stroke-linecap="round"><path d="M14 33 Q30 28 44 33"/><path d="M36 36 Q50 30 66 34"/><path d="M22 30 Q28 24 34 30"/></g>'
            + '<g class="n4"><path d="M14 30 Q40 50 66 30 Q60 40 40 42 Q20 40 14 30Z" fill="#b8865a" stroke="#8a5a2a" stroke-width="1.2"/><path d="M18 32 Q40 44 62 32" fill="none" stroke="#d9b07a" stroke-width="1.2"/><path d="M22 35 L58 35 M26 38 L54 38" stroke="#9a6b3a" stroke-width=".8"/></g>'
            + '<g class="n5"><ellipse cx="34" cy="30" rx="4.2" ry="5" fill="#cfe5f2" stroke="#9ab8cc" stroke-width=".7"/><ellipse cx="44" cy="31" rx="4" ry="4.8" fill="#dbeef8" stroke="#9ab8cc" stroke-width=".7"/><path d="M58 24 q6 -4 9 2" stroke="#f4a7bf" stroke-width="1.6" fill="none" stroke-linecap="round"/></g></svg>';
        host.appendChild(el);
        function render() {
            if (W.nestShown === W.nest) { el.dataset.stage = W.nestShown; return; }
            /* the next twig appears while nobody is looking */
            whenUnseen(el, () => { W.nestShown = W.nest; save(); el.dataset.stage = W.nestShown; });
        }
        el.dataset.stage = W.nestShown || 0;
        render();
        let lastVisit = 0;
        function visit() {
            if (reduce || W.nestShown < 4 || !inView(el) || performance.now() - lastVisit < 180000 || !Life.claim('nest-bird', 9000)) return false;
            lastVisit = performance.now();
            visitingBird(() => { const r = el.getBoundingClientRect(); return { x: r.left + r.width * 0.5, y: r.top + r.height * 0.45 }; }, { stay: 3200, done: () => Life.release('nest-bird') });
            return true;
        }
        return { render, visit };
    })();

    /* ------------------------------------------------------------------
       The caterpillar's story: it lives on a twig by the About photo.
       With enough exploring it becomes a chrysalis (while out of sight),
       later the chrysalis is gone, and a butterfly with the same jade and
       gold appears down by the contact section. Nothing announces it.
       ------------------------------------------------------------------ */
    (function () {
        const host = $('.about-photo-wrap'); if (!host) return;
        const el = document.createElement('div'); el.className = 'w-story'; el.setAttribute('aria-hidden', 'true');
        el.innerHTML = '<svg viewBox="0 0 120 50" class="ws-twig"><path d="M2 22 C30 18 62 26 118 16" stroke="#8a6a3a" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M78 21 C84 12 96 10 104 12 C98 20 88 24 78 21Z" fill="#8db36a"/><path d="M30 20 C26 30 30 38 38 42 C40 34 38 26 30 20Z" fill="#7fa65c"/></svg>'
            + '<div class="ws-cat"><svg viewBox="0 0 34 14"><g class="ws-segs">' + [4, 9, 14, 19, 24].map((x, k) => '<circle cx="' + x + '" cy="9" r="4.2" fill="' + (k % 2 ? '#b6d88f' : '#9cc27a') + '"/>').join('') + '</g><circle cx="29" cy="7" r="4.6" fill="#8db36a"/><circle cx="30.6" cy="6" r="1" fill="#5a4366"/><path d="M28 2.6 L27 0.4 M31 2.6 L32.4 0.6" stroke="#6e9a4c" stroke-width=".9" stroke-linecap="round"/></svg></div>'
            + '<div class="ws-chrysalis"><svg viewBox="0 0 16 30"><path d="M8 0 V4" stroke="#8a6a3a" stroke-width="1.2"/><path d="M8 4 C14 8 14 22 8 28 C2 22 2 8 8 4Z" fill="#a8d5a2" stroke="#6f9f6a" stroke-width=".8"/><path d="M4.5 12 H11.5" stroke="#e8b923" stroke-width="1" stroke-dasharray="1 1.6"/><circle cx="6" cy="17" r=".9" fill="#e8b923"/><circle cx="10" cy="17" r=".9" fill="#e8b923"/></svg></div>';
        host.appendChild(el);
        const show = () => { el.dataset.stage = W.story; };
        show();
        let seen = false;
        new IntersectionObserver(es => { if (es[0].isIntersecting) seen = true; }, { threshold: 0.5 }).observe(el);
        function advance() {
            const now = Date.now();
            if (inView(el)) seen = true;
            if (W.story === 0 && W.explored >= 8 && seen) { whenUnseen(el, () => { W.story = 1; W.storyAt = now; save(); show(); }); seen = false; }
            else if (W.story === 1 && W.explored >= 16 && seen && now - W.storyAt > 90000) { whenUnseen(el, () => { W.story = 2; W.storyAt = Date.now(); save(); show(); }); seen = false; }
        }
        /* the butterfly finds the visitor further down the page, once */
        const contact = $('#contact');
        let jadeT = 0;
        function jade() {
            if (W.story !== 2 || reduce || jadeT || !inView(contact)) return;
            jadeT = setTimeout(() => { jadeT = 0;
                if (W.story !== 2 || !inView(contact) || !Life.claim('jade-butterfly', 12000, true)) return;
                W.story = 3; save();
                const photo = $('.contact-photo') || contact;
                const b = document.createElement('div'); b.className = 'visitor is-butterfly w-jade'; b.setAttribute('aria-hidden', 'true');
                b.innerHTML = '<svg viewBox="-24 -20 48 40"><g class="bf-wing-l"><path d="M-1 -2 C-10 -20 -26 -16 -21 -3 C-18 4 -8 3 -1 0Z" fill="#9fd3b4"/><path d="M-1 1 C-9 3 -18 10 -13 16 C-8 19 -3 10 -1 3Z" fill="#f6d36b"/><circle cx="-13" cy="-8" r="1.3" fill="#e8b923"/><circle cx="-17" cy="-5" r="1" fill="#e8b923"/></g><g class="bf-wing-r"><path d="M1 -2 C10 -20 26 -16 21 -3 C18 4 8 3 1 0Z" fill="#9fd3b4"/><path d="M1 1 C9 3 18 10 13 16 C8 19 3 10 1 3Z" fill="#f6d36b"/><circle cx="13" cy="-8" r="1.3" fill="#e8b923"/><circle cx="17" cy="-5" r="1" fill="#e8b923"/></g><rect x="-1.5" y="-8" width="3" height="20" rx="1.5" fill="#4f6b45"/></svg>';
                document.body.appendChild(b);
                let x = -40, y = innerHeight * 0.35; const t0 = performance.now();
                const spot = () => { const r = photo.getBoundingClientRect(); return { x: r.left + r.width * 0.82, y: r.top + 10 }; };
                (function fly(now) {
                    if (!document.contains(b)) return;
                    const t = (now - t0) / 1000, p = spot();
                    if (t < 3) { x += (p.x - x) * 0.05; y += (p.y - y) * 0.05 + Math.sin(t * 6) * 1.5; }
                    else if (t < 7) { b.classList.add('perched'); x += (p.x - x) * 0.2; y += (p.y - y) * 0.2; }
                    else { b.classList.remove('perched'); x += 3.2; y -= 1.8 + Math.sin(t * 5); }
                    b.style.transform = 'translate(' + f1(x) + 'px,' + f1(y) + 'px)';
                    if (t < 11 && x < innerWidth + 50 && y > -50) requestAnimationFrame(fly); else { b.remove(); Life.release('jade-butterfly'); }
                })(t0);
            }, 2200);
        }
        if (contact) new IntersectionObserver(es => { if (es[0].isIntersecting) jade(); }, { threshold: 0.4 }).observe(contact);
        window.__story = { advance: () => { advance(); if (contact) jade(); } };
    })();

    /* ------------------------------------------------------------------
       The dandelion: tap it or brush across it and its seeds float off on
       the breeze. A few may take root further down the page, later.
       ------------------------------------------------------------------ */
    const SECTIONS = ['home', 'about', 'experience', 'skills', 'gallery', 'contact'];
    /* what a reader actually sees in a section: text lines, images and controls (not the empty width of their boxes) */
    function contentRects(sec) {
        const rects = $$('img, button, a, input, svg.g-art, svg.h-art, .collage, .gallery-frame, .contact-photo, .about-photo, .seed-art, .page-posy, .scatter, .w-sprout, .gs-inner, .title-bloom, .w-dandelion:not([hidden]), .v11-bud', sec).map(e => e.getBoundingClientRect());
        const tw = document.createTreeWalker(sec, NodeFilter.SHOW_TEXT, { acceptNode: n => n.textContent.trim() && !n.parentElement.closest('template, .vh') ? 1 : 2 });
        const range = document.createRange();
        for (let n = tw.nextNode(); n; n = tw.nextNode()) { range.selectNodeContents(n); rects.push(...range.getClientRects()); }
        return rects.filter(r => r.width && r.height);
    }
    function placeIn(sec, w, h) {
        const sr = sec.getBoundingClientRect(), blocks = contentRects(sec), W2 = document.documentElement.clientWidth, m = 12;
        for (const fy of [0.995, 0.97, 0.9, 0.8, 0.68, 0.55, 0.4]) for (const fx of [0.025, 0.975, 0.06, 0.94, 0.12, 0.88, 0.2, 0.8]) {
            const cx = sr.left + sr.width * fx, by = sr.top + sr.height * fy, box = { l: cx - w / 2, r: cx + w / 2, t: by - h, b: by };
            if (box.l < 6 || box.r > W2 - 6 || box.t < sr.top + 4 || box.b > sr.bottom - 2) continue;
            if (blocks.some(r => r.left < box.r + m && r.right > box.l - m && r.top < box.b + m && r.bottom > box.t - m)) continue;
            return { left: cx - sr.left - w / 2, top: by - sr.top - h };
        }
        return null;
    }
    /* (the dandelions themselves live in the v11 pass below: several of them, sharing one drift loop) */
    /* seeds that took root: small flowers along the bottom of a later section */
    function sprouts() {
        W.sprouts.forEach((sp, k) => {
            const sec = document.getElementById(sp.sec); if (!sec) return;
            let f = sec.querySelector('.w-sprout[data-k="' + k + '"]');
            const reveal = () => {
                if (f) return;
                f = document.createElement('div'); f.className = 'w-sprout'; f.dataset.k = k; f.setAttribute('aria-hidden', 'true');
                const col = ['#fbe7a1', '#f9c6d6', '#d9cbf3'][k % 3], kind = sp.type || 'daisy';
                const stem = '<path d="M12 40 C11 32 13 24 12 14" stroke="#8db36a" stroke-width="1.4" fill="none"/><path d="M12 30 C7 28 5 24 5 21 C9 23 11 26 12 30Z" fill="#9fbe88"/>';
                f.innerHTML = '<svg viewBox="0 0 24 40">' + (kind === 'sprout' ? '<path d="M12 40 C11 34 13 30 12 26" stroke="#8db36a" stroke-width="1.4" fill="none"/><path d="M12 27 C6 26 3 21 4 17 C9 18 12 22 12 27Z" fill="#9fbe88"/><path d="M12 28 C17 26 20 22 20 18 C15 19 12 23 12 28Z" fill="#8db36a"/>'
                    : kind === 'dandelion' ? stem + '<use href="#fl-daisy" x="4" y="6" width="16" height="16" style="color:#f6cf3a;--center:#e0a020"/>'
                    : stem + '<use href="#fl-daisy" x="2" y="4" width="20" height="20" style="color:' + col + ';--center:#f2c230"/>') + '</svg>';
                if (window.GardenLog) GardenLog.add({ id: 'sprout:' + k + ':' + sp.sec, kind: 'sprout', sym: kind === 'sprout' ? 'fl-leaf' : 'fl-daisy', color: kind === 'dandelion' ? '#f6cf3a' : kind === 'sprout' ? '#8db36a' : col, center: '#f2c230' });
                f.style.left = (sp.fx * 100).toFixed(1) + '%';
                sec.appendChild(f); sp.shown = true; save();
            };
            if (sp.shown) reveal(); else if (!f) whenUnseen(sec, reveal);
        });
    }
    setTimeout(sprouts, 1500);
    /* a dandelion seed that took root: it shows up later, further down, while that spot is out of sight */
    function plantSeed(fromId) {
        if (W.sprouts.length >= 4) return false;
        const here = SECTIONS.indexOf(fromId), next = SECTIONS[Math.min(SECTIONS.length - 1, Math.max(1, here + 1 + (Math.random() < 0.5 ? 1 : 0)))];
        W.sprouts.push({ sec: next, fx: rand(0.06, 0.94), shown: false, type: ['daisy', 'sprout', 'dandelion'][Math.floor(Math.random() * 3)] });
        save(); sprouts(); return true;
    }
    const beatFns = [];

    /* ------------------------------------------------------------------
       A small rain cloud, rarely, over a row of flowers. Tap it: a gentle,
       local shower, the flowers bow and lift; sometimes a faint rainbow.
       ------------------------------------------------------------------ */
    let lastCloud = -1e9;
    function rainCloud() {
        if (reduce || !window.__cloudSVG || performance.now() - lastCloud < 300000) return false;
        const row = [$('.g-row'), $('.h-row')].find(r => r && inView(r) && r.getBoundingClientRect().top > navBottom() + 60 && !r.classList.contains('compact'));
        if (!row || !Life.claim('cloud', 45000)) return false;
        lastCloud = performance.now();
        const sec = row.closest('section'), sr = sec.getBoundingClientRect(), rr = row.getBoundingClientRect();
        const cloud = document.createElement('div'); cloud.className = 'w-cloud'; cloud.innerHTML = window.__cloudSVG;
        cloud.setAttribute('role', 'button'); cloud.setAttribute('tabindex', '0'); cloud.setAttribute('aria-label', 'A small rain cloud. Press to make it rain');
        /* over one end of the row, never over the centred section title */
        const cx = (Math.random() < 0.5 ? rand(rr.left + 60, rr.left + rr.width * 0.3) : rand(rr.right - rr.width * 0.3, rr.right - 60)) - sr.left, top = rr.top - sr.top - 90;
        cloud.style.left = f1(cx - 55) + 'px'; cloud.style.top = f1(Math.max(10, top)) + 'px';
        sec.appendChild(cloud);
        requestAnimationFrame(() => cloud.classList.add('on'));
        let raining = false;
        const leave = () => { cloud.classList.remove('on'); cloud.classList.add('away'); setTimeout(() => { cloud.remove(); Life.release('cloud'); }, 1600); };
        const idle = setTimeout(() => { if (!raining) leave(); }, 30000);
        const rain = () => {
            if (raining) return; raining = true; clearTimeout(idle);
            const cr = cloud.getBoundingClientRect(), fall = Math.max(80, rr.bottom - cr.bottom - 30);
            const sheet = document.createElement('div'); sheet.className = 'w-rain'; sheet.style.height = f1(fall) + 'px';
            sheet.innerHTML = Array.from({ length: 14 }, (_, k) => '<i style="left:' + f1(8 + k * 6.2) + '%;--d:' + f1(rand(0, 0.9)) + 's;--s:' + f1(rand(0.7, 1)) + 's"></i>').join('');
            cloud.appendChild(sheet); cloud.classList.add('raining');
            const wet = $$('.g-cat, .h-spec', row).filter(c => { const r = c.getBoundingClientRect(); return r.right > cr.left - 20 && r.left < cr.right + 20; });
            wet.forEach(c => c.classList.add('w-rained'));
            /* dandelions and posies under the shower sway harder while it rains, and the posies perk up after */
            const under = el => { const r = el.getBoundingClientRect(); return r.width && r.right > cr.left - 30 && r.left < cr.right + 30 && r.top > cr.top && r.top < cr.bottom + fall + 40; };
            const swayers = $$('.v11-dand:not([hidden]), .page-posy', sec).filter(under);
            swayers.forEach(el => { if (window.__spin) (el.classList.contains('page-posy') ? $$('.pp-stem', el) : [el]).forEach(x => window.__spin.set(x, true, 6200)); });
            setTimeout(() => swayers.forEach(el => { if (el.classList.contains('page-posy')) { el.classList.remove('boing'); void el.offsetWidth; el.classList.add('boing'); } }), 6700);
            setTimeout(() => {
                sheet.classList.add('stop'); cloud.classList.remove('raining');
                wet.forEach(c => { c.classList.remove('w-rained'); c.classList.add('w-refreshed'); setTimeout(() => c.classList.remove('w-refreshed'), 1500); });
                setTimeout(() => { sheet.remove(); leave(); }, 900);
                if (Math.random() < 0.4) {
                    const bow = document.createElement('div'); bow.className = 'w-rainbow'; bow.setAttribute('aria-hidden', 'true');
                    const w = Math.min(320, rr.width * 0.5);
                    bow.style.width = f1(w) + 'px'; bow.style.height = f1(w / 2) + 'px';
                    bow.style.left = f1(clamp(cx - w / 2 + rand(-60, 60), 0, sr.width - w)) + 'px'; bow.style.top = f1(Math.max(0, rr.top - sr.top - w / 2 + 30)) + 'px';
                    sec.insertBefore(bow, sec.firstChild); setTimeout(() => bow.remove(), 10000);
                }
            }, 6500);
        };
        cloud.addEventListener('click', rain);
        cloud.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); rain(); } });
        return true;
    }

    /* ------------------------------------------------------------------
       One heartbeat for all of it. Small things are occasional; bigger
       ones wait for a quiet stretch, so the page keeps returning to calm.
       ------------------------------------------------------------------ */
    let beats = 0;
    setInterval(() => {
        if (document.hidden) return;
        beats++;
        checkWaiting();
        if (window.__story) window.__story.advance();
        nest.render();
        beatFns.forEach(fn => { try { fn(beats); } catch (e) { } });
        if (beats > 6 && !seed.el && W.explored >= 2 && Math.random() < 0.06) seed.spawn();
        if (!Life.calm(40000)) return;                  /* quiet stretch first */
        const r = Math.random();
        if (r < 0.03) rainCloud();
        else if (r < 0.06) steal();
        else if (r < 0.12) nest.visit();
    }, 6000);

    window.World = {
        note(n) { W.explored += n || 1; save(); if (window.__story) window.__story.advance(); },
        /* shared with the v11 pass below, so it reuses these instead of making its own */
        sparkle, gather, placeIn, openSpot, clearAt, inView, whenUnseen, contentRects,
        seedAt: at => seed.spawn(at), hasSeed: () => !!seed.el, nestStage: () => W.nest,
        plantSeed, onBeat: fn => beatFns.push(fn), calm: ms => Life.calm(ms)
    };
    /* test hook, only when the page is opened with ?worlddebug */
    if (/[?&]worlddebug\b/.test(location.search)) window.__world = { seed: () => seed.spawn(), steal, rain: rainCloud, nestVisit: () => nest.visit(), state: W, sprouts };
})();

/* =====================================================================
   v11 polish pass. Runs last, so it can reuse everything above: the Life
   director, WorldState and the World helpers.
   ===================================================================== */
(function () {
    'use strict';
    /* sections far off screen pause their CSS animations (see .is-off in style.css) */
    const offIO = new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle('is-off', !e.isIntersecting)), { rootMargin: '300px 0px' });
    document.querySelectorAll('main > section, footer').forEach(s => offIO.observe(s));

    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
    const $ = (sel, root) => (root || document).querySelector(sel);
    const $$ = (sel, root) => [...(root || document).querySelectorAll(sel)];

    /* ------------------------------------------------------------------
       Rainbow letters: the same effect the section titles use ("Experience"):
       on hover each letter eases into its own colour from the shared
       palette, one after another. Used only on headings and labels that
       already feel interactive, never on body text. Screen readers get the
       plain words (the letters are aria-hidden beside a hidden copy).
       ------------------------------------------------------------------ */
    const HC = ['#c2457e', '#8a63b8', '#4f7a34', '#c98a06', '#d96b93', '#3f8fb0'];
    function rainbow(el, host) {
        if (!el || el.__rb) return; el.__rb = true;
        let k = 0;
        const walk = node => [...node.childNodes].forEach(n => {
            if (n.nodeType === 1) { if (!n.matches('svg, .vh, .mark-slot, .mark-text')) walk(n); return; }
            if (n.nodeType !== 3 || !n.textContent.trim()) return;
            const frag = document.createDocumentFragment(), txt = n.textContent;
            const sr = document.createElement('span'); sr.className = 'vh'; sr.textContent = txt; frag.appendChild(sr);
            const vis = document.createElement('span'); vis.className = 'rb-vis'; vis.setAttribute('aria-hidden', 'true');
            for (const ch of txt) {
                if (/\s/.test(ch)) { vis.appendChild(document.createTextNode(ch)); continue; }
                const c = document.createElement('span'); c.className = 'rb-ch'; c.textContent = ch;
                c.style.setProperty('--i', k); c.style.setProperty('--hc', HC[k++ % HC.length]); vis.appendChild(c);
            }
            frag.appendChild(vis); n.replaceWith(frag);
        });
        walk(el);
        el.classList.add('rb-text');
        const h = host || el; h.classList.add('rb-host'); h.classList.remove('hc-text');
    }
    window.__rainbow = rainbow;
    rainbow($('.about-hello .hello-ink'), $('.about-hello'));
    $$('.nav a').forEach(a => rainbow(a));
    $$('.g-cat').forEach(b => rainbow($('.g-name', b), b));
    $$('.h-spec').forEach(b => rainbow($('.h-name', b), b));
    $$('.hero-tag').forEach(a => rainbow(a));
    /* the hero name already has its own letters (.ltr): the whole name washes into colour too */
    const h1 = $('.hero h1'); if (h1) h1.classList.add('rb-host', 'rb-h1');
    /* ------------------------------------------------------------------
       Turning flowers. Each decorative flower turns slowly on its own
       (a CSS animation, so it costs nothing while left alone). Hover
       ramps that animation's playback rate up, and leaving lets it ease
       back down: the angle never jumps because the rate, not the
       duration, changes. One small rAF loop runs only while some flower
       is still changing speed.
       ------------------------------------------------------------------ */
    const Spin = (() => {
        const st = new WeakMap(), active = new Set();
        const NAMES = ['flSpin', 'flSpinRev', 'ppSway', 'leafSway', 'dandSway'];
        let raf = 0, last = 0;
        const find = el => el.getAnimations ? el.getAnimations().find(a => NAMES.includes(a.animationName)) : null;
        function set(el, boost, hold) {
            if (reduce || !el) return;
            const a = find(el); if (!a) return;
            let s = st.get(el); if (!s) { s = { rate: 1, target: 1 }; st.set(el, s); }
            s.a = a;
            const dur = a.effect && a.effect.getTiming().duration, sway = a.animationName === 'ppSway' || a.animationName === 'leafSway' || a.animationName === 'dandSway';
            /* hovered: about 280 degrees a second whatever the flower's resting pace (sways just quicken 3x) */
            s.target = boost ? (sway ? 3 : Math.max(2, 280 / (360000 / (dur || 40000)))) : 1;
            if (typeof boost === 'number') s.target *= boost;
            clearTimeout(s.hold); if (hold) s.hold = setTimeout(() => set(el, false), hold);
            active.add(el);
            if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); }
        }
        function tick(now) {
            const dt = Math.min(0.05, (now - last) / 1000); last = now;
            active.forEach(el => {
                const s = st.get(el);
                if (!s || !s.a || !el.isConnected) { active.delete(el); return; }
                /* speeds up briskly, settles back gently */
                s.rate += (s.target - s.rate) * (1 - Math.exp(-dt * (s.target > s.rate ? 2.6 : 1.3)));
                if (Math.abs(s.target - s.rate) < 0.03) { s.rate = s.target; if (s.target === 1) active.delete(el); }
                try { s.a.playbackRate = s.rate; } catch (e) { active.delete(el); }
            });
            raf = active.size ? requestAnimationFrame(tick) : 0;
        }
        return { set, spinning: el => { const s = st.get(el); return !!s && s.rate > 1.5; } };
    })();
    window.__spin = Spin;

    /* ------------------------------------------------------------------
       Small shared pieces: a particle budget (petals, seeds, sparkles and
       raindrops all draw from it, so repeated clicking can never pile up
       hundreds of them) and the session log of what the visitor touched,
       found and grew, which the garden at the bottom is made from.
       ------------------------------------------------------------------ */
    const FX = (() => {
        let live = 0; const MAX = innerWidth < 700 ? 28 : 48;
        return {
            room: n => Math.max(0, Math.min(n, MAX - live)),
            /* el is removed (and its slot returned) when its animation ends, or after ms at the latest */
            track(el, anim, ms) {
                live++; let done = false;
                const end = () => { if (done) return; done = true; live--; el.remove(); };
                if (anim) anim.onfinish = end; setTimeout(end, ms || 4000);
            },
            /* for particles moved by a script loop instead of an animation */
            claim: n => { const k = Math.max(0, Math.min(n, MAX - live)); live += k; return k; },
            free: k => { live = Math.max(0, live - k); },
            get live() { return live; }
        };
    })();
    window.__fx = FX;
    const GardenLog = (() => {
        const KEY = 'mb-grown-v1', LIMIT = 30;
        let st = { items: [], pos: {}, ribbon: '' };
        try { Object.assign(st, JSON.parse(sessionStorage.getItem(KEY)) || {}); } catch (e) { }
        const listeners = new Set();
        const save = () => { try { sessionStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { } };
        return {
            /* one entry per thing (by id); entries are small: what kind of flower, its colours, where it came from */
            add(entry) {
                if (!entry || !entry.id || st.items.some(x => x.id === entry.id)) return false;
                st.items.push(Object.assign({ t: Date.now() }, entry));
                if (st.items.length > LIMIT) st.items.splice(0, st.items.length - LIMIT);
                save(); listeners.forEach(f => f(entry)); return true;
            },
            items: () => st.items.slice(),
            pos: () => st.pos, setPos(id, p) { st.pos[id] = p; save(); },
            ribbon: () => st.ribbon, setRibbon(r) { st.ribbon = r; save(); },
            clear() { st = { items: [], pos: {}, ribbon: '' }; save(); listeners.forEach(f => f(null)); },
            on: f => listeners.add(f)
        };
    })();
    window.GardenLog = GardenLog;

    /* ------------------------------------------------------------------
       Touching a flower. Each decorative flower has its own little
       response (a quick spin, a bloom, a few petals, a hop, a blush of
       colour, a sparkle, a nod toward you), and now and then a small
       discovery: a ladybug, a tiny butterfly, a seed for the birds, or a
       bud that opens beside it. One response at a time per flower, so
       fast clicking never stacks animations.
       ------------------------------------------------------------------ */
    const rnd = (a, b) => a + Math.random() * (b - a);
    const strHash = str => { let h = 2166136261; for (const ch of str) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; };
    const centre = el => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height }; };
    const colourOf = el => { const c = getComputedStyle(el).color; return c && c !== 'rgba(0, 0, 0, 0)' ? c : '#f4a7bf'; };
    function petals(el, n) {
        const c = centre(el), col = colourOf(el); n = FX.room(n);
        for (let k = 0; k < n; k++) {
            const p = document.createElement('i'); p.className = 'v11-petal'; p.style.background = col;
            p.style.left = c.x + 'px'; p.style.top = c.y + 'px'; document.body.appendChild(p);
            const dx = rnd(-40, 40), dy = rnd(40, 90), rot = rnd(-260, 260);
            FX.track(p, p.animate([
                { transform: 'translate(-50%,-50%) rotate(0deg) scale(.6)', opacity: 0 },
                { transform: `translate(calc(-50% + ${(dx * 0.3).toFixed(0)}px), calc(-50% + ${(dy * 0.2).toFixed(0)}px)) rotate(${(rot * 0.3).toFixed(0)}deg) scale(1)`, opacity: 0.95, offset: 0.18 },
                { transform: `translate(calc(-50% + ${dx.toFixed(0)}px), calc(-50% + ${dy.toFixed(0)}px)) rotate(${rot.toFixed(0)}deg) scale(.8)`, opacity: 0 }
            ], { duration: rnd(1500, 2300), delay: k * 90, easing: 'cubic-bezier(.3,.1,.5,1)', fill: 'backwards' }), 3000);
        }
    }
    const SPRING = 'cubic-bezier(0.34, 1.56, 0.64, 1)';
    const REACT = {
        spin: el => { if (Spin.spinning(el)) return 500; Spin.set(el, 1.4, 700); return 1600; },
        bloom: el => { el.animate([{ scale: 1 }, { scale: 1.32, offset: 0.35 }, { scale: 0.96, offset: 0.7 }, { scale: 1 }], { duration: 950, easing: 'ease-out' }); return 950; },
        petals: el => { petals(el, 1 + Math.floor(Math.random() * 3)); el.animate([{ scale: 1 }, { scale: 1.08 }, { scale: 1 }], { duration: 500 }); return 900; },
        bounce: el => { el.animate([{ translate: '0 0' }, { translate: '0 -9px', offset: 0.3 }, { translate: '0 0', offset: 0.6 }, { translate: '0 -3px', offset: 0.8 }, { translate: '0 0' }], { duration: 800, easing: 'ease-in-out', composite: 'add' }); return 800; },
        blush: el => { el.animate([{ filter: 'none' }, { filter: 'hue-rotate(' + (Math.random() < 0.5 ? 38 : -42) + 'deg) saturate(1.25)', offset: 0.25 }, { filter: 'hue-rotate(0deg)', offset: 0.85 }, { filter: 'none' }], { duration: 2200, easing: 'ease-in-out' }); return 1400; },
        sparkle: el => { const c = centre(el); if (World.sparkle && FX.room(4) >= 4) World.sparkle(c.x, c.y - c.h * 0.3); el.animate([{ scale: 1 }, { scale: 1.12 }, { scale: 1 }], { duration: 600 }); return 900; },
        nod: (el, e) => { const c = centre(el), dir = e && e.clientX < c.x ? -1 : 1; el.animate([{ rotate: '0deg' }, { rotate: (14 * dir) + 'deg', offset: 0.3 }, { rotate: (-6 * dir) + 'deg', offset: 0.65 }, { rotate: '0deg' }], { duration: 1100, easing: 'ease-in-out', composite: 'add' }); return 1100; },
        wiggle: el => { el.animate([{ rotate: '0deg' }, { rotate: '-14deg', offset: 0.25 }, { rotate: '10deg', offset: 0.5 }, { rotate: '-5deg', offset: 0.75 }, { rotate: '0deg' }], { duration: 900, easing: 'ease-in-out', composite: 'add' }); return 900; }
    };
    const ORDER = ['spin', 'bloom', 'petals', 'bounce', 'blush', 'sparkle', 'nod'];
    const LADY = '<svg viewBox="-10 -9 20 18" aria-hidden="true"><circle cx="7" cy="0" r="3.6" fill="#3a2b33"/><ellipse rx="7.4" ry="6.6" fill="#e2483d"/><path d="M-7.4 0 H7.4" stroke="#3a2b33" stroke-width=".9"/><circle cx="-3" cy="-3" r="1.3" fill="#3a2b33"/><circle cx="2" cy="-3.4" r="1.1" fill="#3a2b33"/><circle cx="-2.4" cy="3.2" r="1.2" fill="#3a2b33"/><circle cx="2.6" cy="3" r="1.3" fill="#3a2b33"/></svg>';
    const TINY_BF = '<svg viewBox="-24 -20 48 40" aria-hidden="true"><g class="bf-wing-l"><path d="M-1 -2 C-10 -20 -26 -16 -21 -3 C-18 4 -8 3 -1 0Z" fill="#cdb8f2"/><path d="M-1 1 C-9 3 -18 10 -13 16 C-8 19 -3 10 -1 3Z" fill="#fbdc84"/></g><g class="bf-wing-r"><path d="M1 -2 C10 -20 26 -16 21 -3 C18 4 8 3 1 0Z" fill="#cdb8f2"/><path d="M1 1 C9 3 18 10 13 16 C8 19 3 10 1 3Z" fill="#fbdc84"/></g><rect x="-1.5" y="-8" width="3" height="20" rx="1.5" fill="#5a4366"/></svg>';
    let lastFind = 0;
    const FINDS = {
        ladybug: el => {
            const c = centre(el), b = document.createElement('span'); b.className = 'v11-ladybug'; b.innerHTML = LADY; b.setAttribute('aria-hidden', 'true');
            b.style.left = (c.x - c.w * 0.3) + 'px'; b.style.top = (c.y - 4) + 'px'; document.body.appendChild(b);
            FX.track(b, b.animate([{ transform: 'translate(0,0) rotate(-10deg)', opacity: 0 }, { opacity: 1, offset: 0.1 }, { transform: `translate(${(c.w * 0.3).toFixed(0)}px,-6px) rotate(8deg)`, offset: 0.5 }, { transform: `translate(${(c.w * 0.6).toFixed(0)}px,2px) rotate(-4deg)`, opacity: 1, offset: 0.9 }, { transform: `translate(${(c.w * 0.65).toFixed(0)}px,2px)`, opacity: 0 }], { duration: 4200, easing: 'ease-in-out' }), 4500);
            return true;
        },
        butterfly: el => {
            if (!Life.claim('tiny-butterfly', 3500)) return false;
            const c = centre(el), b = document.createElement('span'); b.className = 'v11-tinybf'; b.innerHTML = TINY_BF; b.setAttribute('aria-hidden', 'true');
            b.style.left = c.x + 'px'; b.style.top = c.y + 'px'; document.body.appendChild(b);
            const dir = c.x > innerWidth / 2 ? -1 : 1;
            const a = b.animate([{ transform: 'translate(-50%,-50%) scale(.2)', opacity: 0 }, { transform: 'translate(-50%,-50%) scale(1)', opacity: 1, offset: 0.12 }, { transform: `translate(calc(-50% + ${dir * 30}px), calc(-50% - 40px)) rotate(${dir * 10}deg)`, offset: 0.4 }, { transform: `translate(calc(-50% + ${dir * 10}px), calc(-50% - 85px)) rotate(${-dir * 8}deg)`, offset: 0.7 }, { transform: `translate(calc(-50% + ${dir * 70}px), calc(-50% - 150px))`, opacity: 0 }], { duration: 3200, easing: 'ease-in-out' });
            FX.track(b, a, 3600); a.addEventListener('finish', () => Life.release('tiny-butterfly'));
            return true;
        },
        seed: el => { if (!World.seedAt || World.hasSeed()) return false; const c = centre(el); return World.seedAt({ x: c.x + (c.x > innerWidth / 2 ? -34 : 34), y: c.y + 20 }); },
        bud: el => {
            const host = el.closest('section') || el.closest('footer'); if (!host || $$('.v11-bud', host).length >= 2) return false;
            const c = centre(el), hr = host.getBoundingClientRect(), side = c.x > hr.left + hr.width / 2 ? -1 : 1;
            const x = c.x + side * (c.w * 0.5 + 12), y = c.y + c.h * 0.35;
            if (World.clearAt && !World.clearAt(x, y, 10)) return false;
            const b = document.createElement('span'); b.className = 'v11-bud'; b.setAttribute('aria-hidden', 'true');
            b.innerHTML = '<svg viewBox="-12 -12 24 30"><path d="M0 18 C-1 12 1 6 0 2" stroke="#8db36a" stroke-width="1.4" fill="none"/><g class="vb-head" style="color:' + colourOf(el) + '"><use href="#fl-bloom" x="-9" y="-9" width="18" height="18"/></g><g class="vb-cap"><path d="M0 4 C-6 2 -5 -7 0 -9 C5 -7 6 2 0 4Z" fill="#8db36a"/></g></svg>';
            b.style.left = (x - hr.left) + 'px'; b.style.top = (y - hr.top) + 'px'; host.appendChild(b);
            requestAnimationFrame(() => requestAnimationFrame(() => b.classList.add('open')));
            GardenLog.add({ id: 'bud:' + (el.dataset.gk || Math.random()), kind: 'bud', sym: 'fl-bloom', color: colourOf(el), center: '#f2c230' });
            return true;
        }
    };
    function react(el, e) {
        if (el.__busy && performance.now() < el.__busy) return;
        const key = el.dataset.gk || '';
        /* a flower usually answers the same way (its own personality), sometimes differently */
        const own = el.__own || ORDER[strHash(key) % ORDER.length];
        let name = el.dataset.react || (Math.random() < 0.7 ? own : ORDER[Math.floor(Math.random() * ORDER.length)]);
        if (reduce) name = name === 'spin' || name === 'bounce' || name === 'nod' ? 'blush' : name;
        let ms = (REACT[name] || REACT.bloom)(el, e) || 800;
        /* leaves sometimes have a ladybug living on them */
        if (el.dataset.find && !reduce && Math.random() < 0.3 && FINDS[el.dataset.find](el)) ms = Math.max(ms, 1500);
        /* a small discovery now and then: rare, and never twice in quick succession */
        if (!reduce && performance.now() - lastFind > 20000 && Math.random() < 0.14) {
            const opts = Object.keys(FINDS).sort(() => Math.random() - 0.5);
            for (const f of opts) if (FINDS[f](el)) { lastFind = performance.now(); ms = Math.max(ms, 1200); break; }
        }
        el.__busy = performance.now() + ms;
        /* everything touched leaves something for the garden at the bottom */
        if (!el.__logged) {
            el.__logged = true;
            const use = el.querySelector && el.querySelector('use'), sym = use ? (use.getAttribute('href') || '').slice(1) : 'fl-bloom';
            if (sym !== 'fl-leaf' && GardenLog.add({ id: 'fl:' + key, kind: 'flower', sym: sym || 'fl-bloom', color: colourOf(el), center: getComputedStyle(el).getPropertyValue('--center').trim() || '#f2c230' })) { if (window.World) World.note(1); }
        }
    }
    if (/[?&]v11debug\b/.test(location.search)) window.__v11 = { REACT, FINDS, react, Spin, FX, GardenLog };
    let gkN = 0;
    function interactive(el, opts) {
        if (!el || el.__int) return; el.__int = true;
        opts = opts || {};
        el.classList.add('fl-int'); el.dataset.gk = el.dataset.gk || (opts.key || 'f' + (gkN++));
        if (opts.react) el.dataset.react = opts.react;
        const target = opts.target || el;
        target.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); react(el, e); });
    }

    /* which flowers turn, how fast (seconds per turn, from the original site) and which element hovering speeds them up */
    const seeded = (k => () => (k = (k * 16807) % 2147483647) / 2147483647)(7);
    function turning(el, spd, opts) {
        opts = opts || {};
        el.classList.add('fl-spin'); if (opts.rev) el.classList.add('fl-rev');
        el.style.setProperty('--spd', spd + 's');
        el.style.setProperty('--sdl', '-' + (seeded() * spd).toFixed(1) + 's');
        el.style.setProperty('--fl', (5 + seeded() * 3).toFixed(1) + 's');
        el.style.setProperty('--fdl', '-' + (seeded() * 6).toFixed(1) + 's');
        if (opts.bdl != null) el.style.setProperty('--bdl', opts.bdl + 's');
        const host = opts.host || el;
        if (!opts.noHover) {
            host.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') Spin.set(el, true); });
            host.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') Spin.set(el, false); });
        }
        return el;
    }
    const HERO = { f1: [40, 0.4], f2: [30, 0.7], f3: [40, 1], f4: [50, 1.2], f6: [34, 1.4], f7: [40, 1.6] };
    $$('.hero-flowers .bloom').forEach((b, i) => {
        const k = Object.keys(HERO).find(c => b.classList.contains(c));
        if (k) turning(b, HERO[k][0], { bdl: HERO[k][1], rev: k === 'f3' });
        interactive(b, { key: 'hero' + i, react: k ? null : 'wiggle' });   /* f5 and f8 are leaves: they wiggle */
    });
    $$('.about-bloom').forEach((b, i) => { turning(b, b.classList.contains('ab2') ? 22 : 30, { rev: b.classList.contains('ab3') }); interactive(b, { key: 'about' + i }); });
    $$('.title-bloom').forEach((b, i) => { turning(b, 24, { host: b.closest('.section-head') || b }); interactive(b, { key: 'title' + i }); });
    const hf = $('.hello-flower'); if (hf) { turning(hf, 12, { host: $('.about-hello') }); interactive(hf, { key: 'hello', react: 'spin' }); }
    $$('.nav a').forEach(a => { const f = $('.nav-fl', a); if (f) turning(f, 8, { host: a }); });
    /* scattered blooms and posies are placed by earlier scripts after layout settles: pick them up as they appear */
    function adoptLate() {
        $$('.sc-bloom svg:not(.fl-spin)').forEach(sv => { const s = parseFloat(sv.parentElement.style.getPropertyValue('--spin')) || 40; turning(sv, Math.round(s), { host: sv.parentElement, rev: seeded() < 0.4 }); });
        $$('.scatter').forEach((sc, i) => { const sv = $('svg', sc); if (sv) interactive(sv, { key: 'sc' + (sc.style.left + sc.style.top), target: sc, react: sc.classList.contains('sc-leaf') ? 'wiggle' : null }); if (sc.classList.contains('sc-leaf') && sv) sv.dataset.find = 'ladybug'; });
        $$('.page-posy:not(.fl-adopted)').forEach(p => {
            p.classList.add('fl-adopted');
            /* a posy already bounces when touched (its own script); it also goes in the visitor's garden */
            p.addEventListener('click', () => { const f = $('.pp-pop', p); if (f && GardenLog.add({ id: 'posy:' + p.style.left + p.style.top, kind: 'posy', sym: ($('use', f).getAttribute('href') || '#fl-bloom').slice(1), color: getComputedStyle(f).color, center: f.style.getPropertyValue('--center') || '#f2c230' })) World.note(1); });
            $$('.pp-pop > use', p).forEach(u => { const spd = 18 + seeded() * 14; u.style.setProperty('--spd', spd.toFixed(1) + 's'); u.style.setProperty('--sdl', '-' + (seeded() * spd).toFixed(1) + 's'); });
            p.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') { $$('.pp-pop > use, .pp-stem', p).forEach(u => Spin.set(u, true)); } });
            p.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') { $$('.pp-pop > use, .pp-stem', p).forEach(u => Spin.set(u, false)); } });
        });
    }
    adoptLate(); setTimeout(adoptLate, 2500); addEventListener('load', () => setTimeout(adoptLate, 1500));
    document.addEventListener('click', () => setTimeout(adoptLate, 1000));
    window.__adoptFlowers = adoptLate;

    /* ------------------------------------------------------------------
       The chrysalis hangs on the left vine (the caterpillar's own vine)
       rather than on the twig by the photo, whenever vines are showing.
       It appears only once that stretch of vine has grown in, so it is
       found, not announced. Same jade and gold as the butterfly later.
       ------------------------------------------------------------------ */
    (function () {
        const story = $('.w-story'); if (!story) return;
        const NSV = 'http://www.w3.org/2000/svg';
        let g = null, at = 0, path = null;
        function draw() {
            if (g) { g.remove(); g = null; }
            const svg = $('.vine-left'); path = svg && $('.vine-path', svg);
            story.classList.toggle('on-vine', !!path);
            if (!path || (WorldState.get().story || 0) !== 1) return;
            const len = path.getTotalLength(), k = (svg.clientWidth || 90) / 90;
            at = len * 0.38; const p = path.getPointAtLength(at), z = 1 / Math.max(0.5, k);
            g = document.createElementNS(NSV, 'g'); g.setAttribute('class', 'v11-chrys'); g.setAttribute('transform', 'translate(' + p.x.toFixed(1) + ' ' + p.y.toFixed(1) + ') scale(' + z.toFixed(2) + ')');
            g.innerHTML = '<g class="vc-hang"><path d="M0 0 V5" stroke="#8a6a3a" stroke-width="1.2"/><path d="M0 5 C6 9 6 23 0 29 C-6 23 -6 9 0 5Z" fill="#a8d5a2" stroke="#6f9f6a" stroke-width=".8"/><path d="M-3.5 13 H3.5" stroke="#e8b923" stroke-width="1" stroke-dasharray="1 1.6"/><circle cx="-2" cy="18" r=".9" fill="#e8b923"/><circle cx="2" cy="18" r=".9" fill="#e8b923"/></g>';
            svg.appendChild(g); update();
        }
        function update() { if (!g || !path) return; const shown = path.getTotalLength() - (parseFloat(path.style.strokeDashoffset) || 0); g.classList.toggle('on', shown > at + 10); }
        const prev = window.__onVineLayout; window.__onVineLayout = () => { if (prev) prev(); draw(); };
        new MutationObserver(draw).observe(story, { attributes: true, attributeFilter: ['data-stage'] });
        let q = 0; addEventListener('scroll', () => { if (!q) q = requestAnimationFrame(() => { q = 0; update(); }); }, { passive: true });
        draw();
    })();

    /* ------------------------------------------------------------------
       Dandelions, here and there down the page: fluffy clocks, half-blown
       ones and a few yellow flowers. Tap a clock and a few seeds let go;
       tap again and more do; brush or swipe across it and many go at once.
       The head really loses the seeds that flew (and ends as a bare head).
       Seeds drift slowly, each on its own path, on a shared breeze; now and
       then one leaves on its own. Rarely, one takes root further down.
       ------------------------------------------------------------------ */
    const Dandelions = (() => {
        const NSV = 'http://www.w3.org/2000/svg';
        const narrow = () => innerWidth < 700;
        const PLAN = [['home', 'puff'], ['about', 'yellow'], ['experience', 'partial'], ['skills', 'puff'], ['gallery', 'yellow'], ['contact', 'puff']];
        const list = [];
        /* one loop moves every loose seed; it only runs while seeds are in the air */
        const air = []; let raf = 0, last = 0;
        function fly(now) {
            const dt = Math.min(0.05, (now - last) / 1000); last = now;
            const wind = 12 + Math.sin(now / 2600) * 8 + Math.sin(now / 900) * 3;
            for (let i = air.length - 1; i >= 0; i--) {
                const p = air[i]; p.age += dt;
                p.vx += (p.dir * wind * p.catch - p.vx) * 0.35 * dt; p.vy += (p.sink - p.vy) * 0.18 * dt;
                p.x += (p.vx + Math.sin(p.age * p.wf + p.ph) * p.sway) * dt; p.y += (p.vy + Math.cos(p.age * p.wf * 0.7 + p.ph) * 4) * dt;
                const o = Math.min(1, p.age * 2.5, (p.life - p.age) / 1.8);
                p.d.style.transform = 'translate(' + p.x.toFixed(1) + 'px,' + p.y.toFixed(1) + 'px) rotate(' + (Math.sin(p.age * 1.9 + p.ph) * 28).toFixed(0) + 'deg)';
                p.d.style.opacity = Math.max(0, o).toFixed(2);
                if (p.age > p.life || p.x < -30 || p.x > innerWidth + 30 || p.y < -40) { p.d.remove(); air.splice(i, 1); FX.free(1); }
            }
            raf = air.length ? requestAnimationFrame(fly) : 0;
        }
        function launch(x, y, dir, strength) {
            if (!FX.claim(1)) return false;
            const d = document.createElement('i'); d.className = 'w-fluff'; d.setAttribute('aria-hidden', 'true'); document.body.appendChild(d);
            d.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)'; d.style.opacity = '0';
            air.push({ d, x, y, dir, age: 0, life: rnd(7, 13), ph: rnd(0, 6.3), wf: rnd(1.2, 2.2), sway: rnd(6, 15), catch: rnd(0.55, 1.15),
                vx: dir * rnd(6, 16) * (0.6 + strength * 0.6), vy: rnd(-26, -8) * (0.7 + strength * 0.4), sink: rnd(2, 8) });
            if (!raf) { last = performance.now(); raf = requestAnimationFrame(fly); }
            return true;
        }
        function build(kind, i) {
            const el = document.createElement('div');
            el.className = 'w-dandelion w-piece v11-dand is-' + kind; el.setAttribute('tabindex', '0');
            el.dataset.sec = PLAN[i][0];
            const stemBend = (seeded() - 0.5) * 6, leafSide = seeded() < 0.5 ? -1 : 1;
            let h = '<svg viewBox="0 0 44 84" aria-hidden="true"><path d="M22 84 C' + (21 + stemBend).toFixed(1) + ' 66 ' + (24 - stemBend).toFixed(1) + ' 46 22 22" stroke="#8db36a" stroke-width="1.8" fill="none" stroke-linecap="round"/>'
                + '<path d="M22 70 C' + (22 - 8 * leafSide) + ' 66 ' + (22 - 12 * leafSide) + ' 58 ' + (22 - 13 * leafSide) + ' 52 C' + (22 - 6 * leafSide) + ' 56 ' + (22 - 2 * leafSide) + ' 62 22 70Z" fill="#9fbe88"/>';
            if (kind === 'yellow') {
                el.setAttribute('aria-label', 'A yellow dandelion');
                h += '<g class="wd-flower"><use href="#fl-daisy" x="9" y="8" width="26" height="26" style="color:#f6cf3a;--center:#e0a020"/><circle cx="22" cy="21" r="3.2" fill="#e8a91a"/></g>';
            } else {
                el.setAttribute('role', 'button'); el.setAttribute('aria-label', 'A dandelion. Press to blow some of its seeds');
                const n = reduce ? 10 : narrow() ? 14 : 18;
                h += '<g class="wd-puff">';
                for (let k = 0; k < n; k++) {
                    const a = (k / n) * Math.PI * 2 + seeded() * 0.25, r = 13 + seeded() * 3, x = 22 + Math.cos(a) * r, y = 21 + Math.sin(a) * r;
                    const tx = Math.cos(a), ty = Math.sin(a), px = -ty, py = tx;
                    h += '<g class="wd-seed" data-k="' + k + '"><path d="M22 21 L' + x.toFixed(1) + ' ' + y.toFixed(1) + '" stroke="#d8d2c4" stroke-width=".55"/>'
                        + '<path d="M' + (x + px * 2.6).toFixed(1) + ' ' + (y + py * 2.6).toFixed(1) + ' Q' + (x + tx * 2.4).toFixed(1) + ' ' + (y + ty * 2.4).toFixed(1) + ' ' + (x - px * 2.6).toFixed(1) + ' ' + (y - py * 2.6).toFixed(1) + '" stroke="#efe9db" stroke-width=".9" fill="none"/>'
                        + '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="1.5" fill="#fffdf6" stroke="#e4ddcd" stroke-width=".4"/></g>';
                }
                h += '</g><g class="wd-bare"><circle cx="22" cy="21" r="3.4" fill="#c9b98a"/><circle cx="21" cy="20" r=".6" fill="#a8956a"/><circle cx="23.2" cy="21.6" r=".6" fill="#a8956a"/><circle cx="21.6" cy="22.4" r=".5" fill="#a8956a"/></g>'
                    + '<circle class="wd-core" cx="22" cy="21" r="2.4" fill="#c9b98a"/>';
            }
            el.innerHTML = h + '</svg>';
            el.style.setProperty('--sw', (4.5 + seeded() * 3).toFixed(1) + 's'); el.style.setProperty('--swd', '-' + (seeded() * 5).toFixed(1) + 's');
            const d = { el, kind, i, sec: PLAN[i][0], taps: 0, lastRelease: 0, logged: false };
            if (kind === 'partial') $$('.wd-seed', el).forEach((sd, k) => { if (k % 2 === 0 || seeded() < 0.25) sd.classList.add('gone'); });
            wire(d); list.push(d);
            return d;
        }
        /* let `n` seeds go, from the side the push comes from; returns how many went */
        function release(d, n, dir, strength) {
            const now = performance.now();
            if (now - d.lastRelease < 240) return 0; d.lastRelease = now;
            const left = $$('.wd-seed:not(.gone)', d.el); if (!left.length) { REACT.nod(d.el); return 0; }
            if (left.length - n <= 2) n = left.length;   /* never leave one or two lonely seeds */
            const box = d.el.getBoundingClientRect(), cx = box.left + box.width / 2;
            left.sort((a, b) => dir * (a.getBoundingClientRect().left - b.getBoundingClientRect().left) + (Math.random() - 0.5) * 8);
            let went = 0;
            left.slice(0, n).forEach((sd, k) => {
                const c = $('circle', sd).getBoundingClientRect();
                sd.classList.add('gone'); went++;
                if (reduce) return;
                setTimeout(() => launch(c.left + c.width / 2, c.top + c.height / 2, dir || (c.left < cx ? -1 : 1), strength), k * rnd(30, 90));
            });
            if (!$$('.wd-seed:not(.gone)', d.el).length) d.el.classList.add('bare');
            d.el.classList.remove('puffed'); void d.el.offsetWidth; d.el.classList.add('puffed');
            /* a seed or two may take root later, further down the page */
            for (let k = 0; k < went; k++) if (Math.random() < 0.035 && World.plantSeed) { World.plantSeed(d.sec); break; }
            if (!d.logged) { d.logged = true; GardenLog.add({ id: 'dand:' + d.sec, kind: 'dandelion', sym: 'dandelion', color: '#fffdf6', center: '#c9b98a' }); if (window.World) World.note(1); }
            return went;
        }
        function wire(d) {
            const el = d.el;
            if (d.kind === 'yellow') {
                el.classList.add('fl-int');
                el.addEventListener('click', e => { e.stopPropagation(); REACT.nod(el, e); if (!d.logged) { d.logged = true; GardenLog.add({ id: 'dand:y:' + d.sec, kind: 'flower', sym: 'fl-daisy', color: '#f6cf3a', center: '#e0a020' }); } });
                return;
            }
            const tapCount = () => (d.taps++ === 0 ? 3 + Math.floor(Math.random() * 2) : 5 + Math.floor(Math.random() * 3));
            el.addEventListener('click', e => {
                e.stopPropagation();
                if (e.detail === 0) return;   /* keyboard activation is handled below */
                const r = el.getBoundingClientRect();
                release(d, tapCount(), e.clientX < r.left + r.width / 2 ? 1 : -1, 0.6);
            });
            el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); release(d, tapCount(), 1, 0.6); } });
            /* brushing or swiping across it: the faster the stroke, the more seeds go */
            let lx = null, lt = 0;
            el.addEventListener('pointermove', e => {
                const now = performance.now();
                if (lx != null && now - lt < 80) {
                    const v = (e.clientX - lx) / Math.max(1, now - lt);
                    if (Math.abs(v) > 0.7) release(d, Math.round(Math.min(12, 3 + Math.abs(v) * 5)), Math.sign(v), Math.min(1.6, Math.abs(v)));
                }
                lx = e.clientX; lt = now;
            });
            el.addEventListener('pointerleave', () => { lx = null; });
            el.addEventListener('pointercancel', () => { lx = null; });
        }
        function place() {
            const small = narrow(), w = small ? 32 : 44, h = small ? 61 : 84, max = small ? 4 : PLAN.length;
            let shown = 0;
            PLAN.forEach(([id, kind], i) => {
                const sec = document.getElementById(id);
                let d = list.find(x => x.i === i);
                if (!sec || shown >= max || (small && kind === 'yellow' && i > 2)) { if (d) d.el.hidden = true; return; }
                if (!d) { d = build(kind, i); sec.appendChild(d.el); }
                d.el.hidden = true;   /* measure the section without this one */
                d.el.classList.toggle('small', small);
                const p = World.placeIn && World.placeIn(sec, w, h);
                if (!p) return;
                d.el.style.left = p.left.toFixed(1) + 'px'; d.el.style.top = p.top.toFixed(1) + 'px'; d.el.hidden = false; shown++;
            });
        }
        let pt = 0; const later = ms => { clearTimeout(pt); pt = setTimeout(place, ms); };
        later(2200); addEventListener('load', () => later(700));
        let lw = innerWidth; addEventListener('resize', () => { if (innerWidth !== lw) { lw = innerWidth; later(400); } });
        document.addEventListener('click', e => { if (!e.target.closest('.v11-dand')) later(900); });
        /* now and then, in a breeze, a single seed lets go by itself (only from a dandelion someone can see) */
        if (World.onBeat && !reduce) World.onBeat(() => {
            if (Math.random() > 0.22 || FX.live > 10) return;
            const seen = list.filter(d => d.kind !== 'yellow' && !d.el.hidden && World.inView(d.el) && $$('.wd-seed:not(.gone)', d.el).length > 6);
            if (!seen.length) return;
            const d = seen[Math.floor(Math.random() * seen.length)], left = $$('.wd-seed:not(.gone)', d.el), sd = left[Math.floor(Math.random() * left.length)];
            const c = $('circle', sd).getBoundingClientRect(); sd.classList.add('gone'); launch(c.left + 1, c.top + 1, 1, 0.3);
        });
        return { place, list, release };
    })();
    if (/[?&]v11debug\b/.test(location.search)) window.__dand = Dandelions;

    if (Dandelions) setTimeout(() => Dandelions.place(), 2400);

    /* touch screens have no hover: a tap on a garden flower or specimen gives the same little lift for a moment */
    document.addEventListener('pointerdown', e => {
        if (e.pointerType === 'mouse') return;
        const h = e.target.closest && e.target.closest('.g-cat, .h-spec'); if (!h) return;
        h.classList.add('is-tapped'); clearTimeout(h.__tapF); h.__tapF = setTimeout(() => h.classList.remove('is-tapped'), 900);
    }, { passive: true });

    /* touch screens have no hover: a tap on a heading gives the same colour change for a moment */
    document.addEventListener('pointerdown', e => {
        if (e.pointerType === 'mouse') return;
        const h = e.target.closest && e.target.closest('.rb-host'); if (!h) return;
        h.classList.add('is-tapped'); clearTimeout(h.__tap); h.__tap = setTimeout(() => h.classList.remove('is-tapped'), 1600);
    }, { passive: true });
})();
