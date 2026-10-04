/* js/effects/flower-fx.js
   Purpose : click blooms (a flower stamps where you click) and little flower pops around photos on hover.
   Owns    : the click-bloom stamp and the photo flower pops (each with its own cooldown).
   Uses    : nothing.   Used by: js/main.js calls init() at the position the old code ran (the module itself no longer runs at definition).
   Mobile / reduced motion: skipped entirely under prefers-reduced-motion; pops are mouseenter-based (no hover on touch, so none there).
   Moved verbatim from the legacy files (Migration Step 6); behaviour, order and timing unchanged. */
MB.define('effects.flower-fx', [], function () {
    'use strict';

    function init() {
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduce) return;
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
    }

    return { init };
});
