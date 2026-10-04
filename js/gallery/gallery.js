/* js/gallery/gallery.js
   Purpose : the artwork gallery: preview grid, modal (filters, counts, Surprise me, Shuffle, masonry collage) and the lightbox
             (arrows, keys, thumbs, zoom, slideshow, swipe, palette backdrop, preloading), plus the rainbow frame around the preview.
   Owns    : openArtwork / openLightbox / buildCollage / updateLightbox and their shared state (currentFilter, filteredArtworks,
             currentLightboxIndex). That state is shared by the collage and the lightbox on purpose: one file keeps it private.
   Uses    : gallery.artworks.   Used by: script.js (legacy: `openArtwork` and `buildCollage` are still read by the botanical block).
   Mobile / reduced motion: touch swipe on the lightbox, thumbnails/preloading skipped on Save-Data, slideshow/animations as before.
   Moved verbatim from script.js (Migration Step 3). It runs in THREE steps so the original execution order is kept exactly:
     1. at load (this file's body)  = the old top-level block of script.js (first thing script.js ever did);
     2. enhance()                   = the old gallery section inside the "FX v2" IIFE; script.js calls it at that same spot;
     3. frame()                     = the old "Gallery v3" IIFE; script.js calls it at that same spot.
   The `let buildCollage` / `let updateLightbox` stubs are reassigned by enhance() exactly as before. */
MB.define('gallery.gallery', ['gallery.artworks'], function (data) {
    'use strict';
    const artworks = data.artworks;

    
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
        const file = img.dataset.file || img.getAttribute('src').replace(/^images\//, ''), art = artworks.find(a => a.file === file);
        if (!art) return;
        img.closest('.preview-item').dataset.art = file;
        if (!img.alt) img.alt = art.title;
    });
    document.getElementById('galleryPreview').onclick = e => {
        document.getElementById('galleryModal').classList.add('active'); document.body.style.overflow = 'hidden'; buildCollage();
        const it = e.target.closest('.preview-item[data-art]');
        if (it) openArtwork(it.dataset.art);
    };
    { const h = document.getElementById('galleryHint'); if (h) h.onclick = () => document.getElementById('galleryPreview').click(); }
    document.getElementById('galleryClose').onclick=()=>{document.getElementById('galleryModal').classList.remove('active');document.body.style.overflow='';};
    document.querySelectorAll('.gallery-modal-tab').forEach(t=>t.onclick=()=>{document.querySelectorAll('.gallery-modal-tab').forEach(x=>x.classList.remove('active'));t.classList.add('active');currentFilter=t.dataset.filter;buildCollage();});
    

    document.onkeydown=e=>{if(e.key==='Escape'){document.getElementById('galleryModal').classList.remove('active');document.getElementById('lightbox').classList.remove('active');document.body.style.overflow='';}};

    /* ---- step 2: the gallery section that used to sit inside the FX v2 IIFE (called from script.js at the same spot) ---- */
    function enhance() {
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
            /* Full-size files are fetched at low priority ahead of time (neighbours, hovered pieces, the first few once the
               section is near) and only the most recent ones stay decoded in memory. The thumbnail (already cached, ~60KB)
               is what makes a click instant: it paints immediately and the full file replaces it once decoded. */
            const keep = new Map(), KEEP_MAX = 14, thumbDone = new Set(), tpending = new Map(), dims = new Map();
            /* resolves once the file has loaded and (best effort, never longer than 500ms: decode() can stall in background tabs) decoded */
            const decoded = im => new Promise(res => { if (im.complete) res(); else im.onload = im.onerror = () => res(); })
                .then(() => im.decode ? Promise.race([im.decode().catch(() => {}), new Promise(r => setTimeout(r, 500))]) : 0);
            const saveData = !!(navigator.connection && navigator.connection.saveData);
            function preload(file, urgent){
                if (ready.has(file)) return Promise.resolve();
                if (pending.has(file)) return pending.get(file);
                const im = new Image(); im.decoding = 'async'; if ('fetchPriority' in im) im.fetchPriority = urgent ? 'high' : 'low'; im.src = 'images/' + file;
                const pr = decoded(im)
                    .catch(() => {}).then(() => {
                        pending.delete(file);
                        if (!im.naturalWidth) return;   /* failed: never mark it ready, the thumbnail simply stays */
                        ready.add(file); keep.delete(file); keep.set(file, im); while (keep.size > KEEP_MAX) keep.delete(keep.keys().next().value);
                    });
                pending.set(file, pr); return pr;
            }
            /* a thumbnail already on screen (grid tile, preview piece) counts as ready the moment it has loaded */
            function noteThumb(file, el){
                if (thumbDone.has(file) || !el || !el.complete || !el.naturalWidth) return;
                dims.set(file, el.naturalWidth / el.naturalHeight); if (!palette.has(file)) palette.set(file, artPalette(el)); thumbDone.add(file);
            }
            /* thumbnail decoded + its palette and true aspect ratio, so the backdrop and the frame are right before the first paint */
            function thumbReady(file){
                if (thumbDone.has(file)) return Promise.resolve();
                if (tpending.has(file)) return tpending.get(file);
                const im = new Image(); im.decoding = 'async'; im.src = thumbOf(file);
                const pr = decoded(im)
                    .catch(() => {}).then(() => { tpending.delete(file); if (im.naturalWidth){ dims.set(file, im.naturalWidth / im.naturalHeight); if (!palette.has(file)) palette.set(file, artPalette(im)); } thumbDone.add(file); });
                tpending.set(file, pr); return pr;
            }

            /* small copies (about 70KB) for the grid; the full-size file is only fetched for the lightbox */
            const thumbOf = f => 'images/thumbs/' + f.replace(/\.[^.]+$/, '') + '.jpg';
            /* "All" is shown as an even blend of the categories (proportional round-robin) instead of 13 mandalas in a row */
            const mixedArt = (() => {
                const by = {}; artworks.forEach(a => (by[a.category] = by[a.category] || []).push(a));
                return Object.values(by).flatMap(list => list.map((a, i) => ({ a, k: (i + 0.5) / list.length }))).sort((x, y) => x.k - y.k).map(o => o.a);
            })();
            const idle = fn => (window.requestIdleCallback ? requestIdleCallback(fn, { timeout: 2500 }) : setTimeout(fn, 400));
            /* the gallery is near: thumbnails of every piece in small idle batches, then full files for the first few preview pieces */
            const warm = () => {
                if (warm.done) return; warm.done = true;
                const files = mixedArt.map(a => a.file); let i = 0;
                const batch = () => { files.slice(i, i + 6).forEach(f => thumbReady(f)); i += 6; if (i < files.length) idle(batch); else if (!saveData) primeFull(); };
                batch();
            };
            function primeFull(){
                const first = [...document.querySelectorAll('#galleryPreview .preview-item[data-art]')].slice(0, 6).map(el => el.dataset.art);
                const next = () => { const f = first.shift(); if (f) preload(f).then(() => idle(next)); }; next();
            }
            const gsec = document.getElementById('gallery');
            if (gsec && 'IntersectionObserver' in window) new IntersectionObserver((es, o) => { if (es.some(e => e.isIntersecting)) { warm(); o.disconnect(); } }, { rootMargin: '1200px 0px' }).observe(gsec); else setTimeout(warm, 2500);
            /* a hover or touch on a preview piece starts fetching its full file before the click lands */
            const pv = document.getElementById('galleryPreview');
            if (pv && !saveData){ const hot = e => { const it = e.target.closest && e.target.closest('.preview-item[data-art]'); if (it){ preload(it.dataset.art, true); noteThumb(it.dataset.art, it.querySelector('img')); thumbReady(it.dataset.art); } }; pv.addEventListener('pointerover', hot, { passive: true }); pv.addEventListener('touchstart', hot, { passive: true }); }
            buildCollage = function(){
                const g = document.getElementById('galleryCollage'); g.innerHTML = '';
                const base = artView || mixedArt; filteredArtworks = currentFilter === 'all' ? base : base.filter(a => a.category === currentFilter);
                const d = document.createElement('div'); d.className = 'collage-grid';
                filteredArtworks.forEach((a, i) => {
                    const item = document.createElement('div'); item.className = 'collage-item'; item.style.setProperty('--i', Math.min(i, 30));
                    item.innerHTML = '<img decoding="async" src="' + thumbOf(a.file) + '" onerror="this.onerror=null;this.src=\'images/' + a.file + '\'" alt="' + a.title + '"><div class="collage-item-title">' + a.title + '</div>';
                    const ti = item.querySelector('img'); if (ti.complete) noteThumb(a.file, ti); else ti.addEventListener('load', () => noteThumb(a.file, ti), { once: true });
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
                on.style.backgroundImage = 'url("' + thumbOf(file) + '")';   /* blurred 60px anyway: the small copy is plenty */
                on.classList.add('on'); off.classList.remove('on');
            }
            const thumbs = document.createElement('div'); thumbs.className = 'lb-thumbs'; lb.appendChild(thumbs);
            const play = document.createElement('button'); play.className = 'lb-play'; play.innerHTML = ICON_PLAY + ' Slideshow'; lb.appendChild(play);
            const prog = document.createElement('div'); prog.className = 'lb-progress'; lb.appendChild(prog);
            let lastIdx = 0, playing = null, thumbsFor = null, req = 0;
            const CAT = { mandala: 'Mandala', digital: 'Digital Art', calligraphy: 'Calligraphy', fineart: 'Fine Art' };
            function buildThumbs(){
                if (thumbsFor === filteredArtworks) return; thumbsFor = filteredArtworks; thumbs.innerHTML = '';
                filteredArtworks.forEach((a, k) => { const t = document.createElement('img'); t.src = thumbOf(a.file); t.width = t.height = 48; t.alt = ''; t.decoding = 'async'; t.onerror = () => { t.onerror = null; t.src = 'images/' + a.file; }; t.onclick = e => { e.stopPropagation(); currentLightboxIndex = k; updateLightbox(); }; thumbs.appendChild(t); });
            }
            /* the frame is sized from the artwork's real aspect ratio before the image paints, so swapping thumbnail -> full file never moves anything */
            let curAR = 1;
            function fitImg(ar){
                if (ar) curAR = ar;
                const mob = innerWidth <= 768, maxW = innerWidth * (mob ? 0.92 : 0.78), maxH = innerHeight * (mob ? 0.62 : 0.70), w = Math.min(maxW, maxH * curAR);
                img.style.width = Math.round(w) + 'px'; img.style.height = Math.round(w / curAR) + 'px';
            }
            addEventListener('resize', () => { if (lb.classList.contains('active')) fitImg(); });
            updateLightbox = function(){
                buildThumbs();
                const idx = currentLightboxIndex, a = filteredArtworks[idx], open = lb.classList.contains('active'), my = ++req;
                document.getElementById('lightboxTitle').textContent = a.title;
                document.getElementById('lightboxCat').textContent = CAT[a.category] || a.category;
                document.getElementById('lightboxCounter').textContent = (idx + 1) + ' / ' + filteredArtworks.length;
                [...thumbs.children].forEach((t, k) => t.classList.toggle('on', k === idx));
                const on = thumbs.children[idx]; if (on) on.scrollIntoView({ inline: 'center', block: 'nearest', behavior: open ? 'smooth' : 'auto' });
                img.classList.remove('zoomed');
                const dir = idx >= lastIdx ? 'swap-r' : 'swap-l'; lastIdx = idx;
                /* everything for this piece lands in one step: frame, picture (full file if decoded, else its thumbnail), backdrop colors */
                const apply = () => {
                    if (my !== req) return;
                    fitImg(dims.get(a.file));
                    img.alt = a.title; img.src = ready.has(a.file) ? 'images/' + a.file : thumbOf(a.file);
                    setBackdrop(a.file);
                    requestAnimationFrame(() => img.classList.remove('swap-l', 'swap-r', 'loading'));
                    if (!ready.has(a.file)) preload(a.file, true).then(() => { if (my === req && ready.has(a.file)) img.src = 'images/' + a.file; });
                };
                if (open) img.classList.add(dir); else if (!thumbDone.has(a.file)) img.classList.add('loading');
                if (open) setTimeout(() => thumbReady(a.file).then(apply), 80);
                else if (thumbDone.has(a.file)) apply(); else thumbReady(a.file).then(apply);
                /* next three and previous two, full size, at low priority */
                if (!saveData){ const n = filteredArtworks.length; [1, 2, -1, 3, -2].forEach(k => { const f = filteredArtworks[(idx + k + n) % n].file; thumbReady(f); preload(f); }); }
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
    }

    /* ---- step 3: the "Gallery v3" rainbow frame around the preview (called from script.js at the same spot) ---- */
    function frame() {
        /* rainbow frame around the preview + hint */
        const prev = document.getElementById('galleryPreview'), sec = document.getElementById('gallery');
        if (prev && !prev.parentElement.classList.contains('gallery-frame')){
            const fr = document.createElement('div'); fr.className = 'gallery-frame'; prev.parentNode.insertBefore(fr, prev); fr.appendChild(prev);
        }
    }

    /* buildCollage is reassigned inside enhance(): hand out a forwarder so legacy readers always reach the current one */
    return { openArtwork, buildCollage: function () { return buildCollage.apply(this, arguments); }, enhance, frame };
});
