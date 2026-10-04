    /* Flower FX (a): hero name letters, hover wave */
    (function(){
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
    })();

