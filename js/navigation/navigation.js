/* js/navigation/navigation.js
   Purpose : the top navigation: scroll-spy (which link is active), the sliding nav pill, and the flower nav (a flower per link and a butterfly that flies to your section).
   Owns    : scrollSpy(), pill(), flowerNav(). Each is called by a legacy file at the spot its code used to run (scroll-spy first, then the pill, then the flower nav: the flower nav and pill both watch the .nav classes that scroll-spy sets).
   Uses    : nothing.   Used by: js/legacy/020, 110, 120 (until Phase D wiring).
   Mobile / reduced motion: there is no hamburger menu (the pill nav is used at every width); the nav shrinks after 80px of scroll; the flower nav butterfly is part of the page decoration and respects the existing CSS reduced-motion rules.
   Moved verbatim from the legacy files (Migration Step 7); behaviour, order and timing unchanged. */
MB.define('navigation.navigation', [], function () {
    'use strict';

    function scrollSpy() {
        (()=>{const secs=[...document.querySelectorAll('section[id]')],links=[...document.querySelectorAll('.nav a, .m-menu a')];let tk=false,cur='';addEventListener('scroll',()=>{if(tk)return;tk=true;requestAnimationFrame(()=>{tk=false;let c='about';for(const s of secs){if(s.id!=='home'&&scrollY>=s.offsetTop-200)c=s.id;}if(c===cur)return;cur=c;links.forEach(l=>{const on=l.getAttribute('href')==='#'+c;if(l.classList.contains('active')!==on)l.classList.toggle('active',on);});});},{passive:true});})();
    }

    function pill() {
        const nav = document.querySelector('.nav');
        if (nav){
            const pill = document.createElement('span'); pill.className = 'nav-pill'; nav.prepend(pill);
            const place = () => { const a = nav.querySelector('a.active') || nav.querySelector('a'); pill.style.left = a.offsetLeft + 'px'; pill.style.width = a.offsetWidth + 'px'; };
            place(); new MutationObserver(place).observe(nav, { subtree: true, attributes: true, attributeFilter: ['class'] }); addEventListener('resize', place);
            document.fonts && document.fonts.ready.then(place);
        }
    }

    function flowerNav() {
        const NS = 'http://www.w3.org/2000/svg', reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

        /* ---------- flower nav ---------- */
        const NAVFL = [['fl-bloom','#f4a7bf','#f2c230'],['fl-daisy','#b9a2de','#fbe7a1'],['fl-forsythia','#f2c230','#d99a12'],['fl-bloom','#8db36a','#fff1cc'],['fl-daisy','#e9789f','#f2c230']];
        function navFlower(k){ const f = NAVFL[k % NAVFL.length]; const s = document.createElementNS(NS, 'svg'); s.setAttribute('class', 'nav-fl'); s.setAttribute('aria-hidden', 'true'); s.setAttribute('focusable', 'false'); s.setAttribute('viewBox', '-50 -50 100 100'); s.style.color = f[1]; s.style.setProperty('--center', f[2]); s.innerHTML = '<use href="#' + f[0] + '" x="-50" y="-50" width="100" height="100"/>'; return s; }
        document.querySelectorAll('.nav a').forEach((a, idx) => {
            a.prepend(navFlower(idx));
        });
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
    }

    return { scrollSpy, pill, flowerNav };
});
