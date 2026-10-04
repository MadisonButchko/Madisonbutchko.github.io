    /* FX v2a: animated titles (js/effects/text-effects.js) */
    MB.use('effects.text-effects').titles();

        /* gallery preview tilt + gallery modal / lightbox (js/gallery/gallery.js) */
        MB.use('gallery.gallery').enhance();

    /* FX v2c: hero photos: keep rotating naturally (pause briefly only after a click) */
    (function(){
        const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduce) return;
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

