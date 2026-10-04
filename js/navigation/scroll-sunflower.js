/* js/navigation/scroll-sunflower.js
   Purpose : the corner sunflower: scroll indicator (a bud that grows and blooms as you scroll) and the back-to-top button.
   Owns    : the .to-top button, its drawing and its scroll-driven animation loop.
   Uses    : nothing.   Used by: js/main.js calls init() at the position the old code ran (the module itself no longer runs at definition).
   Mobile / reduced motion: drawn closed/open from scroll progress; reduced motion handled inside (sfReduce) exactly as before; tap/click scrolls to the top.
   Moved verbatim from the legacy files (Migration Step 7); behaviour, order and timing unchanged. */
MB.define('navigation.scroll-sunflower', [], function () {
    'use strict';

    function init() {
    /* v4c: scroll indicator + back to top: a sunflower on its own little pad. At the top of the page it is a small
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
    }

    return { init };
});
