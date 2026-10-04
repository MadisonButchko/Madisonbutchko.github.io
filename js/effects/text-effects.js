/* js/effects/text-effects.js
   Purpose : text effects: animated section titles (letters + squiggles), the letters/words "settle" after their entrance, hover colours on text, and the rainbow letters on headings/labels.
   Owns    : titles(), hoverSettle(), hoverColor(), rainbowLetters() (its `rainbow(el, host)` is exported; was window.__rainbow). Each is called by a legacy file at the spot its code used to run: titles before hoverSettle (it needs the .t-ch letters).
   Uses    : core.utils ($, $$).   Used by: js/legacy/090, 100, 180, 210 (until Phase D wiring); botanical/stage.js reads rainbow().
   Mobile / reduced motion: hover colours are CSS-driven; a tap equivalent for headings exists elsewhere (legacy 210 tap handlers). Nothing here reads prefers-reduced-motion.
   Moved verbatim from the legacy files (Migration Step 6); behaviour, order and timing unchanged. */
MB.define('effects.text-effects', ['core.utils'], function (utils) {
    'use strict';
    let rainbowFn = null;   /* set by rainbowLetters(); was window.__rainbow */
    const { $, $$ } = utils;

    function titles() {
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
    }

    function hoverSettle() {
        const HC = ['#c2457e', '#8a63b8', '#4f7a34', '#c98a06', '#d96b93', '#3f8fb0'];
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
    }

    function hoverColor() {
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
    }

    function rainbowLetters() {
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
    rainbowFn = rainbow;
    rainbow($('.about-hello .hello-ink'), $('.about-hello'));
    $$('.nav a').forEach(a => rainbow(a));
    $$('.g-cat').forEach(b => rainbow($('.g-name', b), b));
    $$('.h-spec').forEach(b => rainbow($('.h-name', b), b));
    $$('.hero-tag').forEach(a => rainbow(a));
    /* the hero name already has its own letters (.ltr): the whole name washes into colour too */
    const h1 = $('.hero h1'); if (h1) h1.classList.add('rb-host', 'rb-h1');
    }

    /* touch screens have no hover: a tap on a heading gives the same colour change for a moment (was in legacy/210) */
    function tapHover() {
        document.addEventListener('pointerdown', e => {
            if (e.pointerType === 'mouse') return;
            const h = e.target.closest && e.target.closest('.rb-host'); if (!h) return;
            h.classList.add('is-tapped'); clearTimeout(h.__tap); h.__tap = setTimeout(() => h.classList.remove('is-tapped'), 1600);
        }, { passive: true });
    }

    return { titles, hoverSettle, hoverColor, rainbowLetters, tapHover, rainbow: (el, host) => { if (rainbowFn) return rainbowFn(el, host); } };
});
