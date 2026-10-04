        MB.use('effects.scroll-effects').reveal();   /* the .reveal observer (js/effects/scroll-effects.js) */
        (()=>{const secs=[...document.querySelectorAll('section[id]')],links=[...document.querySelectorAll('.nav a, .m-menu a')];let tk=false,cur='';addEventListener('scroll',()=>{if(tk)return;tk=true;requestAnimationFrame(()=>{tk=false;let c='about';for(const s of secs){if(s.id!=='home'&&scrollY>=s.offsetTop-200)c=s.id;}if(c===cur)return;cur=c;links.forEach(l=>{const on=l.getAttribute('href')==='#'+c;if(l.classList.contains('active')!==on)l.classList.toggle('active',on);});});},{passive:true});})();
        
        /* v10: in-page links and interest shortcuts are handled in explore.js */

