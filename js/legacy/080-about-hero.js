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

