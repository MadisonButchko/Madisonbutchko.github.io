    /* v6: vine stems + near-bloom, vine butterflies */
    (function(){
        const NS = 'http://www.w3.org/2000/svg', reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
        const rand = (a, b) => a + Math.random() * (b - a);
        const BF = '<svg viewBox="-24 -20 48 40"><g class="bf-wing-l"><path d="M-1 -2 C-10 -20 -26 -16 -21 -3 C-18 4 -8 3 -1 0Z" fill="{C1}"/><path d="M-1 1 C-9 3 -18 10 -13 16 C-8 19 -3 10 -1 3Z" fill="{C2}"/></g><g class="bf-wing-r"><path d="M1 -2 C10 -20 26 -16 21 -3 C18 4 8 3 1 0Z" fill="{C1}"/><path d="M1 1 C9 3 18 10 13 16 C8 19 3 10 1 3Z" fill="{C2}"/></g><rect x="-1.5" y="-8" width="3" height="20" rx="1.5" fill="#5a4366"/></svg>';

        /* --- vines: give each flower a little stem that grows with it; gentle grow when cursor is near --- */
        function addStems(){ return;   /* the vine stays one clean line; only click-grown sprigs carry stems */
            document.querySelectorAll('.vine').forEach(v => {
                v.querySelectorAll('.vine-item.spin').forEach(it => {
                    const g = it.parentNode; if (g.querySelector('.vine-bud-stem')) return;
                    const st = document.createElementNS(NS, 'path'); st.setAttribute('class', 'vine-bud-stem'); st.setAttribute('d', 'M0 0 Q -4 6 0 10'); st.setAttribute('pathLength', '1'); g.insertBefore(st, it);
                });
            });
        }
        addStems(); addEventListener('resize', () => setTimeout(addStems, 50));
        if (!reduce && matchMedia('(hover: hover)').matches){
            let q = false, ev;
            addEventListener('mousemove', e => { ev = e; if (q) return; q = true; requestAnimationFrame(() => { q = false;
                if (ev.clientX > 130 && ev.clientX < innerWidth - 130){
                    /* the cursor left the vines: let any flower it was touching settle back */
                    document.querySelectorAll('.vine-item.near').forEach(it => { it.classList.remove('near'); if (window.__spin) window.__spin.set(it.firstElementChild, false); });
                    return;
                }
                document.querySelectorAll('.vine-item.on').forEach(it => {
                    const r = it.getBoundingClientRect(), near = Math.hypot(r.left + r.width / 2 - ev.clientX, r.top + r.height / 2 - ev.clientY) < 60;
                    if (it.classList.contains('near') === near) return;
                    it.classList.toggle('near', near);
                    /* a flower the cursor reaches spins up, and eases back when it leaves */
                    if (window.__spin && it.classList.contains('spin')) window.__spin.set(it.firstElementChild, near);
                });
            }); }, { passive: true });
        }

    })();

