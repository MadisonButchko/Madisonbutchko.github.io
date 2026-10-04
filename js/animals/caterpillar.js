/* js/animals/caterpillar.js
   Purpose : the caterpillar's story: a caterpillar on a twig by the About photo becomes a chrysalis (while out of sight, hanging on the left vine when vines show), later a jade-and-gold butterfly visits near the contact photo. Nothing announces it.
   Owns    : the .w-story element and its stages (WorldState.story / storyAt), advance() (called by the world heartbeat and World.note), the one-time jade butterfly flight, and the chrysalis drawn on the left vine (vineChrysalis).
   Uses    : core.utils ($, f1, reduce), core.state (WorldState), core.scheduler (Life), core.safe-zones (inView, whenUnseen), animals.animals; the vine hooks window.__onVineTick / window.__onVineLayout (set by the vine code).
   Used by : legacy/200-little-world.js (start() at the spot the block ran, advance() from the heartbeat and World.note; replaces window.__story) and legacy/210-v11-polish.js (vineChrysalis(), at the spot that block ran).
   Mobile / reduced motion: unchanged: no butterfly flight under prefers-reduced-motion; stages advance by exploration and sight only.
   Moved verbatim from legacy/200 and legacy/210 (Migration Step 10e); behaviour, order and timing unchanged. */
MB.define('animals.caterpillar', ['core.utils', 'core.state', 'core.scheduler', 'core.safe-zones', 'animals.animals'], function (utils, state, scheduler, zones, animals) {
    'use strict';
    const { $, f1, reduce } = utils, { Life } = scheduler, { inView, whenUnseen } = zones;
    const W = state.WorldState.get(), WorldState = state.WorldState;
    const save = () => WorldState.save();
    let advanceStory = null;                       /* set by start() when the About photo exists (was window.__story.advance) */

    /* ------------------------------------------------------------------
       The caterpillar's story: it lives on a twig by the About photo.
       With enough exploring it becomes a chrysalis (while out of sight),
       later the chrysalis is gone, and a butterfly with the same jade and
       gold appears down by the contact section. Nothing announces it.
       ------------------------------------------------------------------ */
    function start() {
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
        advanceStory = () => { advance(); if (contact) jade(); };
    }

    /* ------------------------------------------------------------------
       The chrysalis hangs on the left vine (the caterpillar's own vine)
       rather than on the twig by the photo, whenever vines are showing.
       It appears only once that stretch of vine has grown in, so it is
       found, not announced. Same jade and gold as the butterfly later.
       ------------------------------------------------------------------ */
    function vineChrysalis() {
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
        window.__onVineTick = update;
        const prev = window.__onVineLayout; window.__onVineLayout = () => { if (prev) prev(); draw(); };
        new MutationObserver(draw).observe(story, { attributes: true, attributeFilter: ['data-stage'] });
        let q = 0; addEventListener('scroll', () => { if (!q) q = requestAnimationFrame(() => { q = 0; update(); }); }, { passive: true });
        draw();
    }

    return animals.register('caterpillar', { start, advance: () => { if (advanceStory) advanceStory(); }, vineChrysalis });
});
