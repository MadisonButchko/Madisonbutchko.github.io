/* js/garden/hud.js
   Purpose : the garden's feedback: badges (the BADGES list, award, the unlock toast queue, the badge shelf), the HUD line (flash messages, pest/stage messages, hudText), the stats/meter/stage update (updateHud, where "full bloom" is reached) and the celebration burst.
   Owns    : BADGES, toast queue (toastQ/toasting/toastT), award, notice, flash, updateHud, celebrate, PEST_MSG, STAGE_MSG, hudText.
   Uses    : core.utils, plants.plants (act, FLI, burstAt); the garden API `ga` (state S/badges/flashMsg/..., bed, tip, txt, meter, stats, shelf, P, C, count, stageOf, GOAL, save, setHTML).
   Used by : garden/garden.js (create(ga) once, before the saved state is loaded); critters, deer and weather call ga.flash / ga.award / ga.updateHud.
   Mobile / reduced motion: unchanged (act is "tap" on touch devices).
   Moved verbatim from legacy/140-side-vines-and-garden.js (Migration Step 14; only shared-state access was rewritten to go through the garden-facing API object `ga`); behaviour, order and timing unchanged. */
MB.define('garden.hud', ['plants.plants'], function (plants) {
    'use strict';
    const { act, FLI, burstAt } = plants;

    function create(ga) {
        const BADGES = {
            sprout: ['first sprout', 'plant your first flower', 'fl-bloom', '#8db36a'],
            thumb: ['green thumb', 'plant 25 flowers by hand', 'fl-leaf', '#6e9a4c'],
            full: ['full bloom', 'grow the garden to full bloom', 'fl-bloom', '#f4a7bf'],
            care: ['caretaker', 'water 5 thirsty plants', 'fl-daisy', '#7fbfdc'],
            rain: ['rainmaker', act + ' a cloud to make it rain', 'fl-daisy', '#9fbde6'],
            guard: ['garden guardian', 'shoo away 5 hungry visitors', 'fl-forsythia', '#f2c230'],
            rare: ['starbloom finder', 'grow a rare starbloom', 'fl-bloom', '#f79cc0'],
            pollen: ['pollinator pal', 'let a butterfly sprout a seedling', 'fl-daisy', '#c9b2ec'],
            deer: ['brave gardener', 'chase a deer out of the garden', 'fl-forsythia', '#d9a877'],
            regrow: ['second spring', 'regrow to full bloom after a deer visit', 'fl-bloom', '#e9789f']
        };
        /* --- badges --- */
        const toastQ = []; Object.assign(ga, { toasting: false, toastT: 0 });
        function award(k){ if (ga.badges.has(k)) return; ga.badges.add(k); toastQ.push(`<span class="g-badge">${FLI}</span><span>badge unlocked: <b>${BADGES[k][0]}</b></span>`); runToast(); ga.save(); }
        function notice(html){ toastQ.unshift(html); runToast(); }
        function runToast(){
            if (ga.toasting || !toastQ.length) return; ga.toasting = true;
            ga.toast.innerHTML = toastQ.shift();
            ga.toast.classList.remove('show'); void ga.toast.offsetWidth; ga.toast.classList.add('show');
            ga.toastT = setTimeout(() => { ga.toast.classList.remove('show'); ga.toastT = setTimeout(() => { ga.toasting = false; runToast(); }, 450); }, 2700);
        }
        function checkBadges(){ if (ga.S.planted >= 1) award('sprout'); if (ga.S.planted >= 25) award('thumb'); if (ga.S.watered >= 5) award('care'); if (ga.S.shooed >= 5) award('guard'); }
        function renderShelf(){
            ga.setHTML(ga.shelf, Object.keys(BADGES).map(k => {
                const b = BADGES[k], on = ga.badges.has(k);
                return `<span class="g-bdg${on ? ' on' : ''}" role="listitem" title="${b[0]}: ${b[1]}" aria-label="${b[0]}, ${on ? 'unlocked' : 'locked'}: ${b[1]}" style="--bc:${b[3]}"><svg viewBox="-50 -50 100 100" aria-hidden="true"><use href="#${b[2]}" x="-50" y="-50" width="100" height="100"/></svg></span>`;
            }).join(''));
        }

        /* --- HUD: urgent things (deer, pests, events, thirst) win over the progress story --- */
        function flash(msg, ms){ ga.flashMsg = msg; clearTimeout(ga.flashT); ga.flashT = setTimeout(() => { ga.flashMsg = ''; updateHud(); }, ms || 3000); updateHud(); }
        const PEST_MSG = {
            bunny: `a hungry bunny hopped in — <b>${act} it</b> before it starts nibbling`,
            bird: `a bird swooped down for a snack — <b>${act} it</b> to scare it off`,
            snail: `a snail is creeping toward your flowers — <b>${act} it</b> to shoo it`,
            caterpillar: `a caterpillar is inching in for lunch — <b>${act} it</b> to shoo it`
        };
        const STAGE_MSG = [
            () => `fresh soil ${FLI} ${act} anywhere to plant your first seeds`,
            n => `first sprouts are up — keep planting <b>${n}</b> / ${ga.GOAL}`,
            n => `the garden is filling in <b>${n}</b> / ${ga.GOAL}`,
            n => `it's getting lush — <b>${ga.GOAL - n}</b> more for full bloom`,
            () => `full bloom ${FLI} keep it watered and watch for hungry visitors`,
            () => `overflowing with flowers ${FLI} the butterflies are thrilled`
        ];
        function hudText(n, st){
            if (ga.deer && ga.deer.state !== 'leaving'){
                const t = ga.deer.hp + ' more time' + (ga.deer.hp === 1 ? '' : 's');
                return ga.deer.state === 'coming' || ga.deer.state === 'eyeing' ? `a little visitor is here — a hungry deer! <b>${act} it ${t}</b> to chase it off` : `the deer is nibbling its way through the garden — <b>${act} it ${t}</b>`;
            }
            const pest = ga.C.find(c => c.pest && c.kind !== 'deer' && c.state !== 'leaving');
            if (pest) return PEST_MSG[pest.kind];
            if (ga.flashMsg) return ga.flashMsg;
            const thirsty = ga.P.filter(p => p.state === 'thirsty').length;
            if (thirsty) return `${thirsty === 1 ? 'a plant is' : thirsty + ' plants are'} thirsty — <b>${act} the drooping ${thirsty === 1 ? 'one' : 'ones'}</b> to water`;
            if (ga.cloud) return ga.cloud.raining ? `rain! everything underneath is getting a drink ${FLI}` : `a little cloud is drizzling — <b>${act} it</b> for a proper shower`;
            if (ga.regrowing && n < ga.GOAL) return `the deer left a bare patch — replant to bring it back <b>${n}</b> / ${ga.GOAL}`;
            return STAGE_MSG[st](n);
        }
        function updateHud(){
            checkBadges();
            const n = ga.count(), st = ga.stageOf(n);
            if (ga.bed.dataset.stage !== String(st)) ga.bed.dataset.stage = st;
            if (!ga.fullReached && n >= ga.GOAL && ga.started && !ga.restoring){ ga.fullReached = true; award('full'); const again = ga.regrowing; if (ga.regrowing){ ga.regrowing = false; award('regrow'); } celebrate(again); ga.save(); }
            ga.meter.style.width = Math.min(100, n / ga.GOAL * 100) + '%';
            ga.setHTML(ga.stats, `growing <b>${n}</b> &middot; planted <b>${ga.S.planted}</b>`);
            ga.setHTML(ga.statsMore, `watered <b>${ga.S.watered}</b> &middot; shooed <b>${ga.S.shooed}</b> &middot; starblooms <b>${ga.S.rare}</b> &middot; lost <b>${ga.S.lost}</b>`);
            renderShelf();
            ga.tip.classList.toggle('alert', ga.C.some(c => c.pest && c.state !== 'leaving'));
            ga.setHTML(ga.txt, hudText(n, st));
        }
        function celebrate(again){
            const r = ga.bed.getBoundingClientRect();
            for (let k = 0; k < 5; k++) setTimeout(() => burstAt(r.left + r.width * (0.15 + k * 0.175), r.top + r.height * 0.45, 9), k * 160);
            flash(again ? `second spring ${FLI} the garden is back in full bloom` : `full bloom ${FLI} your garden is complete — keep it safe from hungry visitors`, 5000);
        }
        Object.assign(ga, { BADGES, award, flash, notice, toastQ, updateHud });
    }

    return { create };
});
