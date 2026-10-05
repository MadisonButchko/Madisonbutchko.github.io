/* js/animals/berries.js
   Purpose : five hidden "fruit + animal" garden moments (strawberry → frog, blueberry → hedgehog, raspberry → bunny, blackberry → baby bear, cherry → chipmunk), all driven by ONE small state machine and a per-pair config. Click 1: the fruit wiggles. Click 2: the animal steps out from the leafy tuft beside the fruit. Click 3: it walks over and eats / grabs it, says a line in a small hand-drawn bubble, can be tapped for more lines or a tiny reaction, says goodbye, goes back behind the tuft, and the fruit pops back so it can all happen again.
   Owns    : the .bf units (a tuft + fruit + animal, placed in open space in a section), the five configs (art, hide/approach/movement style, eating style, three dialogue categories, reactions), the state machine (idle → primed → emerging → ready → eating → talk → leaving → idle), the bubble and its placement, and re-layout on load/resize/section height change.
   Uses    : core.utils, core.particles (FX budget for the few sparkles), core.safe-zones (contentRects, navBottom). Read-only geometry of other features (never mutated): .vine, .wild, .snail, .bn, .guide-bird, .pinwheel, .hero-flowers .bloom, .about-bloom.
   Used by : js/main.js (start()). No timer/loop of its own besides short per-interaction timeouts and Web Animations; no scheduler, global pointer listener or rAF.
   Placement: each unit has a list of sections (the first with room wins) and an anchor; the anchor is tried first, then the nearest clear spot found by scanning outward. A spot must clear all text, images, controls and other decorations and stay out of the side-vine band. No clear spot: that unit stays hidden. The animal only ever moves inside its unit (about 140 x 50 px). The bubble picks above / below / left / right (and clamps) so it stays on screen and off text.
   Mobile / reduced motion: unit drawn at 0.72x under 700 px, placed independently. Tap = click (no hover needed). Under prefers-reduced-motion nothing hops, wiggles or sparkles: the animal just appears, jumps to the fruit, and the bubble fades. Debug: none. */
MB.define('animals.berries', ['core.utils', 'core.particles', 'core.safe-zones'], function (utils, particles, zones) {
    'use strict';
    const { $, $$, rand, pick, clamp, f1, reduce } = utils, { FX } = particles, { contentRects, navBottom } = zones;
    const CANCEL = { cancel: true };

    /* ------------------------------------------------------------------
       Art (all drawn facing right; mirrored in CSS-free JS when the unit faces left)
       ------------------------------------------------------------------ */
    const O = (c, w) => ' stroke="' + c + '" stroke-width="' + (w || .9) + '"';
    const dots = (pts, r, c, hi) => pts.map(p => '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="' + r + '" fill="' + c + '"/><circle cx="' + (p[0] - r * .3) + '" cy="' + (p[1] - r * .35) + '" r="' + r * .28 + '" fill="' + hi + '" opacity=".7"/>').join('');
    const CAP = '<path d="M17 11 C14 7.4 10 7.8 8.6 10.2 C10.8 11 13 11.4 15 11.6 C13 12.6 11.6 13.8 11.4 15 C13.6 14.8 15.8 13.4 17 11.8 C18.2 13.4 20.4 14.8 22.6 15 C22.4 13.8 21 12.6 19 11.6 C21 11.4 23.2 11 25.4 10.2 C24 7.8 20 7.4 17 11Z" fill="#79bf68"/><path d="M17 10.6 C17 8 17.8 6 19.4 4.8" stroke="#79bf68" stroke-width="1.6" fill="none" stroke-linecap="round"/>';
    const FRUIT = {
        strawberry: '<svg viewBox="0 0 32 34" aria-hidden="true"><path d="M16 32.5 C7 28 3.5 19.5 5 13.5 C6.5 9.5 12 9 16 11 C20 9 25.5 9.5 27 13.5 C28.5 19.5 25 28 16 32.5Z" fill="#f2677f"' + O('rgba(120,40,60,.3)', .8) + '/><path d="M9.5 14.5 C10 13 11.5 12.5 13 13" stroke="#fff" stroke-opacity=".55" stroke-width="1.7" fill="none" stroke-linecap="round"/><g fill="#ffe7a3"><ellipse cx="11" cy="19" rx=".8" ry="1.3"/><ellipse cx="17" cy="17.5" rx=".8" ry="1.3"/><ellipse cx="22" cy="20" rx=".8" ry="1.3"/><ellipse cx="14" cy="24" rx=".8" ry="1.3"/><ellipse cx="20" cy="25" rx=".8" ry="1.3"/><ellipse cx="16.5" cy="29" rx=".8" ry="1.2"/></g>' + CAP + '</svg>',
        blueberry: '<svg viewBox="0 0 32 34" aria-hidden="true"><circle cx="16" cy="21" r="12.2" fill="#7b8fd8"' + O('rgba(60,70,140,.35)', .8) + '/><ellipse cx="16" cy="25" rx="9" ry="6" fill="#6679c6" opacity=".45"/><path d="M16 12.4 l1.7 2.6 3 .3 -2.3 2.1 .6 3 -3-1.6 -3 1.6 .6-3 -2.3-2.1 3-.3z" fill="#4a5ba9"/><path d="M8.6 17 C9.6 13.6 12.4 11.6 15 11.4" stroke="#fff" stroke-opacity=".5" stroke-width="1.8" fill="none" stroke-linecap="round"/><ellipse cx="16" cy="19" rx="11" ry="10" fill="#c9d3f5" opacity=".18"/></svg>',
        raspberry: '<svg viewBox="0 0 32 34" aria-hidden="true"><ellipse cx="17" cy="20" rx="10" ry="12" fill="#c93c64"/>' + dots([[12, 14], [17, 13.5], [22, 15], [9, 19], [14, 18.5], [19, 18.5], [24, 20], [10.5, 24], [15.5, 24], [20.5, 24], [13, 29], [18, 29]], 3.6, '#ea5a80', '#ffd0dc') + CAP + '</svg>',
        blackberry: '<svg viewBox="0 0 32 34" aria-hidden="true"><ellipse cx="17" cy="20.5" rx="10.5" ry="12" fill="#3d2557"/>' + dots([[11.5, 14], [16.5, 13.5], [21.5, 14.5], [8.5, 19], [13.5, 18.6], [18.5, 18.6], [23.5, 19.6], [10, 24], [15, 24], [20, 24], [24, 25], [12.5, 29], [17.5, 29.4]], 3.8, '#5d3b82', '#b79ad6') + CAP + '</svg>',
        cherry: '<svg viewBox="0 0 32 34" aria-hidden="true"><path d="M10.5 19 C11 12.4 14 7.6 17 4.8 M22 20.6 C21 13.6 19 8.6 17 4.8" stroke="#6b8f4e" stroke-width="1.4" fill="none" stroke-linecap="round"/><path d="M17 4.8 C20 1.4 26 2.2 27.4 5.2 C24.4 7.4 19.6 7.4 17 4.8Z" fill="#79bf68"/><circle cx="10.5" cy="25.6" r="7" fill="#e03d5a"' + O('rgba(110,20,40,.3)', .8) + '/><circle cx="22" cy="27" r="6.6" fill="#e9526d"' + O('rgba(110,20,40,.3)', .8) + '/><path d="M6.6 23.6 C7.2 22 8.6 21.2 10 21.2 M18.6 25 C19 23.8 20 23.2 21.2 23.2" stroke="#fff" stroke-opacity=".6" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>'
    };
    const spikes = (cx, cy, rx, ry, n, c, k) => { let d = 'M' + f1(cx - rx) + ' ' + cy; for (let i = 1; i < n * 2; i++) { const a = Math.PI + Math.PI * i / (n * 2), r = i % 2 ? 1 : k; d += ' L' + f1(cx + Math.cos(a) * rx * r) + ' ' + f1(cy + Math.sin(a) * ry * r); } return '<path d="' + d + ' L' + f1(cx + rx) + ' ' + cy + 'Z" fill="' + c + '"/>'; };
    const EYE = (x, y, r) => '<circle class="bf-eye" cx="' + x + '" cy="' + y + '" r="' + r + '" fill="#3a2b33"/>';
    const ANIMAL = {
        frog: '<svg viewBox="0 0 48 44" aria-hidden="true"><g' + O('rgba(50,90,50,.32)') + '><ellipse cx="18" cy="31" rx="15" ry="10.5" fill="#86c97c"/><ellipse cx="9" cy="39.4" rx="8" ry="3.6" fill="#78bb6e"/><ellipse cx="33" cy="40.4" rx="6.5" ry="3" fill="#78bb6e"/><ellipse cx="31" cy="27" rx="13" ry="10" fill="#92d388"/><circle cx="27" cy="16.4" r="5.6" fill="#92d388"/><circle cx="37" cy="17.4" r="5.2" fill="#92d388"/></g><ellipse cx="33" cy="33" rx="9" ry="4.4" fill="#f4f1c8"/><circle cx="28" cy="16.4" r="3.6" fill="#fff"/><circle cx="37.6" cy="17.4" r="3.4" fill="#fff"/>' + EYE(29, 16.6, 2) + EYE(38.6, 17.6, 1.9) + '<path d="M22.6 14.6 Q27.6 11 33 14.8 Z M33 15.6 Q37.6 12.4 42 16.2 Z" fill="#92d388" opacity=".9"/><path d="M30 30 Q37 34.4 44 29.6" stroke="#4d7a49" stroke-width="1.3" fill="none" stroke-linecap="round"/><ellipse cx="41" cy="25.6" rx="2.6" ry="1.8" fill="#f9b4c4" opacity=".7"/></svg>',
        hedgehog: '<svg viewBox="0 0 48 44" aria-hidden="true"><g' + O('rgba(90,60,40,.3)') + '><ellipse cx="15" cy="41.6" rx="5" ry="2.4" fill="#e6c0a4"/><ellipse cx="29" cy="41.8" rx="5" ry="2.4" fill="#e6c0a4"/>' + spikes(19, 38, 18.5, 24, 10, '#9d7a5e', .84) + '</g>' + spikes(19, 38, 13, 15, 8, '#b8957a', .86) + '<g' + O('rgba(90,60,40,.3)') + '><ellipse cx="36" cy="34" rx="10" ry="8.4" fill="#f3d6bd"/><ellipse cx="42" cy="35.4" rx="5" ry="4" fill="#f3d6bd"/><circle cx="31" cy="27.6" r="3" fill="#e6c0a4"/></g><circle cx="46" cy="34.6" r="1.9" fill="#3a2b33"/>' + EYE(38.4, 31.4, 1.5) + '<path d="M40 38.6 Q43 40 45 38" stroke="#8a5f48" stroke-width="1" fill="none" stroke-linecap="round"/><ellipse cx="35" cy="37" rx="2.6" ry="1.7" fill="#f4a9bb" opacity=".65"/></svg>',
        bunny: '<svg viewBox="0 0 48 44" aria-hidden="true"><g' + O('rgba(120,80,70,.32)') + '><circle cx="6" cy="33.4" r="4.2" fill="#fff"/><ellipse cx="20" cy="32.4" rx="14" ry="9.6" fill="#fff3ec"/><ellipse cx="10" cy="40.6" rx="7" ry="3.2" fill="#fff3ec"/><ellipse cx="33" cy="41" rx="6" ry="2.8" fill="#fff3ec"/><ellipse cx="30" cy="8" rx="3.4" ry="9.2" fill="#fff3ec" transform="rotate(-8 30 15)"/><ellipse cx="37.4" cy="8.4" rx="3.2" ry="8.6" fill="#fff3ec" transform="rotate(10 37 16)"/><circle cx="34" cy="24" r="9.4" fill="#fff6f0"/></g><ellipse cx="30" cy="8.6" rx="1.6" ry="6.4" fill="#f9bfd0" transform="rotate(-8 30 15)"/><ellipse cx="37.4" cy="9" rx="1.5" ry="6" fill="#f9bfd0" transform="rotate(10 37 16)"/><circle cx="42.8" cy="25" r="1.6" fill="#f08aa4"/>' + EYE(38, 21.6, 1.7) + '<path d="M41 28 Q42.6 29.4 44.4 27.8" stroke="#b9807a" stroke-width="1" fill="none" stroke-linecap="round"/><ellipse cx="37.4" cy="28" rx="2.8" ry="1.9" fill="#f9b4c4" opacity=".7"/></svg>',
        bear: '<svg viewBox="0 0 48 44" aria-hidden="true"><g' + O('rgba(100,60,35,.3)') + '><ellipse cx="14" cy="41.4" rx="5.4" ry="2.8" fill="#b98458"/><ellipse cx="29.5" cy="41.6" rx="5.4" ry="2.8" fill="#b98458"/><circle cx="21" cy="31" r="12.5" fill="#c8966d"/><circle cx="24.4" cy="12" r="4.4" fill="#c8966d"/><circle cx="37.4" cy="11" r="4.4" fill="#c8966d"/><circle cx="31" cy="21.6" r="11" fill="#d3a37b"/></g><circle cx="24.6" cy="12.4" r="2.2" fill="#e8c4a0"/><circle cx="37.2" cy="11.4" r="2.2" fill="#e8c4a0"/><ellipse cx="37" cy="25.6" rx="6.2" ry="4.8" fill="#f3ddc0"/><ellipse cx="40.2" cy="23.4" rx="2.4" ry="1.7" fill="#3a2b33"/>' + EYE(34, 19, 1.6) + '<path d="M36 28 Q38.6 30 41 27.8" stroke="#8a5f48" stroke-width="1" fill="none" stroke-linecap="round"/><ellipse cx="30" cy="25.6" rx="2.6" ry="1.8" fill="#f4a9bb" opacity=".6"/><ellipse cx="32.6" cy="34.6" rx="4.8" ry="3.6" fill="#c8966d"' + O('rgba(100,60,35,.3)') + '/><path d="M30.6 35.6 V37 M33 36 V37.4" stroke="#8a5f48" stroke-width=".8" stroke-linecap="round"/></svg>',
        chipmunk: '<svg viewBox="0 0 48 44" aria-hidden="true"><g' + O('rgba(100,60,35,.3)') + '><path d="M10 37 C-1.4 35 -1.6 15 8 11 C10.4 16.6 9.4 22 12.6 28 Z" fill="#dc9561"/><ellipse cx="21" cy="32.4" rx="12.5" ry="9.2" fill="#dc9561"/><ellipse cx="14" cy="41.4" rx="5.4" ry="2.4" fill="#c9824f"/><ellipse cx="30" cy="41.6" rx="4.6" ry="2.3" fill="#c9824f"/><circle cx="28.4" cy="14.8" r="3.1" fill="#dc9561"/><circle cx="37.6" cy="14.8" r="3.1" fill="#dc9561"/><circle cx="33" cy="23.4" r="9.2" fill="#e6a672"/></g><path d="M11 29.4 Q20 22.8 31 27.8 M12.6 33.6 Q21.4 27.4 30.4 32" stroke="#6b4a38" stroke-width="1.7" fill="none" stroke-linecap="round"/><path d="M11.8 31.5 Q20.6 25 30.6 29.9" stroke="#fbe6c8" stroke-width="1.6" fill="none" stroke-linecap="round"/><path d="M3.4 24 C4 19 5.4 15.6 7.6 13.6" stroke="#6b4a38" stroke-width="1.2" fill="none" stroke-linecap="round" opacity=".6"/><path d="M30.6 17.4 Q36 16.4 41 21.2" stroke="#6b4a38" stroke-width=".9" fill="none" stroke-linecap="round" opacity=".7"/><ellipse cx="37" cy="27.8" rx="5.4" ry="4.2" fill="#f8e3c8"/><circle cx="42.6" cy="24.4" r="1.5" fill="#3a2b33"/>' + EYE(37.2, 21.8, 1.6) + '<path d="M38.6 30.4 Q40.6 31.6 42.4 30" stroke="#8a5f48" stroke-width="1" fill="none" stroke-linecap="round"/></svg>'
    };
    const leaf = (x, h, w, rot, c) => '<g transform="rotate(' + rot + ' ' + x + ' 42)"><path d="M' + x + ' 42 C' + (x - w) + ' ' + f1(42 - h * .35) + ' ' + f1(x - w * .6) + ' ' + f1(42 - h * .85) + ' ' + x + ' ' + (42 - h) + ' C' + f1(x + w * .6) + ' ' + f1(42 - h * .85) + ' ' + (x + w) + ' ' + f1(42 - h * .35) + ' ' + x + ' 42Z" fill="' + c + '"/><path d="M' + x + ' 41 V' + f1(42 - h * .8) + '" stroke="rgba(255,255,255,.35)" stroke-width=".9" fill="none"/></g>';
    const bloom = (x, y, c) => '<g transform="translate(' + x + ' ' + y + ')">' + [0, 72, 144, 216, 288].map(a => '<ellipse cx="0" cy="-3.2" rx="2.2" ry="3.2" fill="' + c + '" transform="rotate(' + a + ')"/>').join('') + '<circle r="1.7" fill="#ffd95a"/></g>';
    const tuft = (leaves, blooms) => '<svg viewBox="0 0 56 42" aria-hidden="true"><ellipse cx="28" cy="40" rx="27" ry="6.5" fill="#86c474"/>' + leaves.map(l => leaf(...l)).join('') + (blooms || []).map(b => bloom(...b)).join('') + '</svg>';
    const G1 = '#79bf68', G2 = '#8ccb7a', G3 = '#6aae5e', G4 = '#9bd486';
    const TUFT = {
        leaf: tuft([[12, 34, 9, -22, G1], [24, 30, 8, -34, G4], [30, 40, 11, -2, G2], [44, 36, 9, 18, G3], [38, 28, 7, 32, G4]], [[48, 31, '#f9b8cf']]),
        grass: tuft([[7, 30, 3.6, -26, G3], [13, 36, 3.8, -14, G1], [19, 40, 4, -4, G2], [26, 34, 3.6, 4, G4], [32, 40, 4, 10, G1], [38, 33, 3.6, 18, G3], [45, 36, 3.8, 26, G2], [50, 28, 3.4, 34, G4]]),
        clover: tuft([[11, 28, 8, -22, G1], [28, 36, 9, 0, G2], [45, 28, 8, 22, G1], [20, 24, 6, -38, G4], [37, 24, 6, 38, G4]], [[15, 22, '#fff'], [31, 17, '#f9b8cf'], [46, 24, '#fff']]),
        fern: tuft([[8, 28, 6, -42, G3], [15, 36, 7, -24, G1], [23, 40, 8, -8, G2], [31, 40, 8, 8, G4], [40, 36, 7, 24, G1], [48, 28, 6, 42, G3], [28, 32, 6, 0, G3]]),
        daisy: tuft([[11, 32, 8, -22, G2], [24, 38, 9, -6, G1], [38, 34, 8, 14, G3], [47, 27, 6, 30, G4]], [[20, 24, '#fff6c8'], [41, 22, '#fff']])
    };

    /* ------------------------------------------------------------------
       The five pairs
       move: steps (hops/waddle steps over the whole walk) · lift px · ms per step · wob (lean, deg) · alt (lean alternates: waddle) · ease
       eat : mode nibble (small bites) | hold (picks it up first) | grab (one quick gulp) · bites · ms per bite · reach (how far the nose overlaps the fruit)
       ------------------------------------------------------------------ */
    const REMEMBER = 'I’ll put it back.', CANT = 'Actually, I cannot explain.', ICAN = 'I can explain.', HES = 'You hesitated.', MIST = 'That was your first mistake.', EVENT = '…eventually.';
    const AFTER = { [CANT]: ICAN, [EVENT]: REMEMBER, [MIST]: HES };   /* a line that only follows one particular line */
    const PAIRS = [
        {
            id: 'frog', fruit: 'strawberry', tuft: 'leaf', secs: ['#home', '#contact'], at: [[0.08, 0.7], [0.93, 0.78], [0.07, 0.38]], dir: 1,
            label: 'A strawberry', move: { steps: 3, lift: 15, ms: 300, wob: 6 }, eat: { mode: 'grab', ms: 260, reach: 8 }, wait: 1500,
            react: ['bounce', 'tilt', 'hop'],
            say: {
                eat: ['Berry nice of you.', 'Strawberry? Don’t mind if I do.', 'Well, well, well… what have we here?', 'Hopportunity accepted.', 'Five stars. No notes.', 'Absolutely ribbeting.', 'Toad-ally worth it.', 'A fruitful discovery.'],
                click: ['I have excellent taste.', 'This changes everything.', 'Oh, this is going in my memoir.', 'A fine specimen.', 'I’m feeling rather hoppy about this.', 'I’ll be thinking about this for at least seven minutes.'],
                leave: ['You didn’t see anything.', 'I came. I saw. I croaked.', 'Another successful expedition.', 'Consider it… un-frog-gettable.', 'I regret precisely nothing.', 'Nature provides.']
            }
        },
        {
            id: 'hedgehog', fruit: 'blueberry', tuft: 'grass', secs: ['#about'], at: [[0.92, 0.82], [0.07, 0.8], [0.93, 0.4]], dir: -1,
            label: 'A blueberry', move: { steps: 6, lift: 2.5, ms: 380, wob: 5, alt: true }, eat: { mode: 'nibble', bites: 3, ms: 340, reach: 10 }, wait: 1600,
            react: ['tilt', 'surprise', 'hop'],
            say: {
                eat: ['A berry small snack.', 'Small berry. Big day.', 'I have been rewarded.', 'Excellent. Just excellent.', 'Worth the waddle.', 'Blue-tiful.', 'A snack of exceptional roundness.', 'This is exactly what I was hoping would happen today.'],
                click: ['I knew following my nose would pay off.', 'Please hold my appointments.', 'A most excellent berry.', 'I’m having a very productive day.', 'No crumbs. Literally.', 'I would like another.'],
                leave: ['Was that the last one?', 'Hmm. I may need to investigate further.', 'I walked all the way over here for this.', 'A little treat for a little gentleman.', 'Good things come in small blueberries.', 'This will do nicely.']
            }
        },
        {
            id: 'bunny', fruit: 'raspberry', tuft: 'clover', secs: ['#experience', '#home', '#contact', '#about'], at: [[0.07, 0.5], [0.93, 0.34], [0.06, 0.8]], dir: 1,
            label: 'A raspberry', move: { steps: 4, lift: 11, ms: 270, wob: 4 }, eat: { mode: 'nibble', bites: 4, ms: 230, reach: 8 }, wait: 1500,
            react: ['hop', 'tilt', 'surprise'],
            say: {
                eat: ['Oh! Was this yours?', 'Just one little nibble.', 'How unfortunate. It’s gone.', ICAN, 'Berry polite of you.', 'A hare-raisingly good snack.', 'It practically hopped into my mouth.', 'Technically, I found it.'],
                click: [CANT, 'I thought it was communal.', 'Surely you weren’t using it.', 'One nibble became several.', 'I appear to have eaten the evidence.', 'You have excellent raspberries.', REMEMBER],
                leave: [EVENT, 'I’m only borrowing it.', 'Please accept my sincerest apologies.', 'I’ll apologize after dessert.', 'No further questions.']
            }
        },
        {
            id: 'bear', fruit: 'blackberry', tuft: 'fern', secs: ['#skills'], at: [[0.93, 0.5], [0.07, 0.55], [0.92, 0.22]], dir: -1,
            label: 'A blackberry', move: { steps: 6, lift: 3.5, ms: 330, wob: 8, alt: true }, eat: { mode: 'hold', bites: 3, ms: 330, reach: 2 }, wait: 1600,
            react: ['bounce', 'tilt', 'hop'],
            say: {
                eat: ['Bear-y good.', 'Now THAT’S a berry.', 'Compliments to the bush.', 'Excellent mouthfeel.', 'A bold little berry.', 'Five paws.', 'Chef’s kiss.', 'Rich. Complex. Slightly stolen.'],
                click: ['I’m detecting notes of… blackberry.', 'A very sophisticated snack.', 'This berry has range.', 'I have no constructive criticism.', 'A flawless performance.', 'This is peak berry.'],
                leave: ['I’d order this again.', 'Someone tell the chef.', 'I should probably sample another.', 'For scientific accuracy.', 'I came for research purposes.', 'Quality control complete.']
            }
        },
        {
            id: 'chipmunk', fruit: 'cherry', tuft: 'daisy', secs: ['#gallery'], at: [[0.07, 0.6], [0.93, 0.5], [0.08, 0.3]], dir: 1,
            label: 'A cherry', move: { steps: 2, lift: 4, ms: 120, wob: 3, ease: 'linear' }, eat: { mode: 'grab', ms: 140, reach: 8, puff: true }, wait: 900,
            react: ['surprise', 'hop', 'bounce'],
            say: {
                eat: ['Cherry-o!', 'Mine now!', 'Aaaaaand gone.', 'Nothing to see here.', HES, 'Cherry picked.', 'Fastest snack in the west.', 'Finders eaters.'],
                click: [MIST, 'This transaction is complete.', 'Excellent doing business with you.', 'I’ll send a receipt.', 'Put it on my tab.', 'Business is booming.', 'Consider this a withdrawal.'],
                leave: ['Catch me if you can.', 'I have places to be.', 'Gotta stash!', 'No time to explain!', 'I saw an opportunity.']
            }
        }
    ];

    /* motion of the little reactions (the animal's body; never a lasting change) */
    const REACT = {
        hop: { ms: 420, kf: [{ transform: 'none' }, { transform: 'translateY(-7px) scale(.96,1.05)', offset: .4 }, { transform: 'translateY(0) scale(1.05,.94)', offset: .75 }, { transform: 'none' }] },
        tilt: { ms: 650, kf: [{ transform: 'rotate(0)' }, { transform: 'rotate(-10deg)', offset: .3 }, { transform: 'rotate(8deg)', offset: .65 }, { transform: 'rotate(0)' }] },
        bounce: { ms: 560, kf: [{ transform: 'none' }, { transform: 'translateY(-4px) scale(1.04,.98)', offset: .25 }, { transform: 'translateY(0)', offset: .45 }, { transform: 'translateY(-3px)', offset: .7 }, { transform: 'none' }] },
        surprise: { ms: 520, kf: [{ transform: 'none' }, { transform: 'translateY(-8px) scale(.92,1.12)', offset: .25 }, { transform: 'scale(1.08,.94)', offset: .55 }, { transform: 'none' }] }
    };
    const FRUITFX = [
        [{ transform: 'rotate(0)' }, { transform: 'rotate(-9deg)', offset: .2 }, { transform: 'rotate(8deg)', offset: .45 }, { transform: 'rotate(-5deg)', offset: .7 }, { transform: 'rotate(0)' }, 540],
        [{ transform: 'none' }, { transform: 'translateY(-8px) scale(.94,1.08)', offset: .35 }, { transform: 'scale(1.1,.9)', offset: .65 }, { transform: 'none' }, 460],
        [{ transform: 'none' }, { transform: 'scale(1.18,.82)', offset: .3 }, { transform: 'scale(.92,1.1)', offset: .62 }, { transform: 'none' }, 480],
        [{ transform: 'none', filter: 'brightness(1)' }, { transform: 'scale(1.1)', filter: 'brightness(1.3)', offset: .45 }, { transform: 'none', filter: 'brightness(1)' }, 700, true]
    ];
    const SPARK = '#fff6c8,#ffd9e6,#e6dcff,#d6f2e4,#d4ecfa'.split(',');

    /* ------------------------------------------------------------------
       Geometry (section coordinates), as the pinwheels do it
       ------------------------------------------------------------------ */
    const units = [];
    let started = false, lastW = innerWidth;
    const small = () => innerWidth < 700;
    const vineBand = () => innerWidth >= 1240 ? 160 : innerWidth >= 700 ? 70 : 52;
    const margin = () => small() ? 8 : 22;   /* phones: a compact unit in the few gaps there are */
    const scale = () => small() ? .72 : 1;
    const boxOf = u => ({ l: u.x, t: u.y, r: u.x + u.W, b: u.y + u.H });
    const hit = (b, rs, m) => rs.some(r => r.l < b.r + m && r.r > b.l - m && r.t < b.b + m && r.b > b.t - m);

    function obstacles(u) {
        const sr = u.sec.getBoundingClientRect();
        const rel = (r, m) => ({ l: r.left - sr.left - m, r: r.right - sr.left + m, t: r.top - sr.top - m, b: r.bottom - sr.top + m });
        const out = contentRects(u.sec).map(r => rel(r, 0));
        $$('.vine, .wild, .snail:not([hidden]), .bn, .guide-bird, .hero-flowers .bloom, .about-bloom').forEach(v => { const r = v.getBoundingClientRect(); if (r.width) out.push(rel(r, small() ? 6 : 10)); });
        $$('.pinwheel:not([hidden])').forEach(v => { const r = v.getBoundingClientRect(); if (r.width) out.push(rel(r, small() ? 14 : 30)); });
        units.forEach(o => { if (o !== u && !o.el.hidden) { const r = o.el.getBoundingClientRect(); out.push(rel(r, small() ? 36 : 70)); } });
        const vb = vineBand(), W = document.documentElement.clientWidth;
        out.push({ l: -sr.left - 999, r: vb - sr.left, t: -99999, b: 99999 }, { l: W - vb - sr.left, r: W - sr.left + 999, t: -99999, b: 99999 });
        return out;
    }
    const inBounds = (u, b) => {
        const sr = u.sec.getBoundingClientRect(), W = document.documentElement.clientWidth;
        return sr.left + b.l >= 8 && sr.left + b.r <= W - 8 && b.t >= (u.sec.id === 'home' ? 110 : 20) && b.b <= sr.height - 4;   /* room above for hops, clear of the fixed nav pill in the hero */
    };
    const valid = u => { const b = boxOf(u); return inBounds(u, b) && !hit(b, obstacles(u), margin()); };

    function findSpot(u) {
        const sr = u.sec.getBoundingClientRect(), W = document.documentElement.clientWidth, blocks = obstacles(u), vb = vineBand(), m = margin();
        const at = (fx, fy) => ({ l: vb + fx * (W - 2 * vb) - sr.left - u.W / 2, t: sr.height * fy - u.H / 2 });
        for (const [fx, fy] of u.cfg.at) {
            const p = at(fx, fy), b = { l: p.l, t: p.t, r: p.l + u.W, b: p.t + u.H };
            if (inBounds(u, b) && !hit(b, blocks, m)) return { x: b.l, y: b.t };
        }
        const [fx, fy] = u.cfg.at[0], a = at(fx, fy), xs = [], step = small() ? 12 : 28;   /* nearest clear spot, scanning outward from the first anchor */
        for (let x = vb - sr.left; x <= W - vb - sr.left - u.W; x += step) xs.push(x);
        xs.sort((p, q) => Math.abs(p - a.l) - Math.abs(q - a.l));
        for (let d = 0; d <= sr.height; d += step) for (const sg of d ? [-1, 1] : [1]) {
            const y = a.t + sg * d;
            for (const x of xs) { const b = { l: x, t: y, r: x + u.W, b: y + u.H }; if (inBounds(u, b) && !hit(b, blocks, m)) return { x, y }; }
        }
        return null;
    }
    function put(u, spot) { u.x = Math.round(spot.x); u.y = Math.round(spot.y); u.el.style.left = u.x + 'px'; u.el.style.top = u.y + 'px'; }

    /* ------------------------------------------------------------------
       Small helpers: the animal's transform, the cancellable animation step, timers
       ------------------------------------------------------------------ */
    const tr = (u, x, y, rot) => 'translate(' + f1(u.dir > 0 ? x : u.W - u.A - x) + 'px,' + f1(-y) + 'px) rotate(' + f1(u.dir * (rot || 0)) + 'deg)';   /* x counts from the tuft side */
    const sleep = (u, t, ms) => new Promise((res, rej) => { const id = setTimeout(() => { u.t = u.t.filter(i => i !== id); t === u.tok ? res() : rej(CANCEL); }, ms); u.t.push(id); });
    function commit(el, last) { if (last.transform != null) el.style.transform = last.transform; if (last.opacity != null) el.style.opacity = last.opacity; }
    /* o.keep: the last frame stays · o.fx: purely decorative (skipped under reduced motion) */
    async function anim(u, t, el, kf, o) {
        if (t !== u.tok) throw CANCEL;
        const last = kf[kf.length - 1];
        if (reduce) { if (o.fx) return; if (o.keep) commit(el, last); return sleep(u, t, 120); }
        const a = el.animate(kf, { duration: o.ms, easing: o.easing || 'ease-in-out', fill: 'forwards' });
        try { await a.finished; } catch (e) { throw CANCEL; }
        if (t !== u.tok) throw CANCEL;
        if (o.keep) commit(el, last);
        a.cancel();
    }
    async function go(u, fn) {
        const t = ++u.tok;
        try { await fn(u, t); } catch (e) { if (e !== CANCEL && t === u.tok) { console.warn(e); hardReset(u); } }
    }
    const arm = (u, ms, fn) => { clearTimeout(u.timer); u.timer = setTimeout(fn, ms); };

    /* walk / hop from one x to another (a single animation of linked hops), optionally fading in or out */
    function travel(u, t, from, to, fade) {
        const m = u.cfg.move, n = Math.max(1, Math.round(m.steps * Math.abs(to - from) / (u.stop - u.peek))), kf = [], d = to - from;
        for (let i = 0; i < n; i++) {
            const x0 = from + d * i / n, xm = from + d * (i + .5) / n, lean = m.wob * (m.alt ? (i % 2 ? 1 : -1) : 1);
            kf.push({ offset: i / n, transform: tr(u, x0, 0, 0), opacity: i === 0 && fade === 'in' ? 0 : 1, easing: m.ease || 'ease-out' });
            kf.push({ offset: (i + .5) / n, transform: tr(u, xm, m.lift, lean), opacity: 1, easing: m.ease || 'ease-in' });
        }
        kf.push({ offset: 1, transform: tr(u, to, 0, 0), opacity: fade === 'out' ? 0 : 1 });
        return anim(u, t, u.an, kf, { ms: n * m.ms, easing: 'linear', keep: true });
    }
    const body = (u, t, name) => { const r = REACT[name]; return anim(u, t, u.body, r.kf, { ms: r.ms, fx: true, easing: 'ease-in-out' }); };
    const blink = u => { if (reduce) return; $$('.bf-eye', u.an).forEach(e => e.animate([{ transform: 'scaleY(1)' }, { transform: 'scaleY(.1)' }, { transform: 'scaleY(1)' }], { duration: 200 })); };

    /* a few sparkles around the fruit, from the shared particle budget */
    function sparkle(u) {
        if (reduce) return;
        const n = FX.room(small() ? 3 : 4), cx = u.fx + u.F / 2, cy = u.H - u.F * .55;
        for (let i = 0; i < n; i++) {
            const s = document.createElement('span'), a = rand(0, Math.PI * 2), dist = rand(16, 32);
            s.className = 'bf-bit'; s.setAttribute('aria-hidden', 'true'); s.style.setProperty('--bc', pick(SPARK)); s.style.left = f1(cx - 4) + 'px'; s.style.top = f1(cy - 4) + 'px';
            u.el.appendChild(s);
            const an = s.animate([
                { transform: 'translate(0,0) scale(.3)', opacity: 0 },
                { transform: 'translate(' + f1(Math.cos(a) * dist * .6) + 'px,' + f1(Math.sin(a) * dist * .6 - 4) + 'px) scale(1)', opacity: 1, offset: .35 },
                { transform: 'translate(' + f1(Math.cos(a) * dist) + 'px,' + f1(Math.sin(a) * dist) + 'px) scale(.2)', opacity: 0 }
            ], { duration: rand(800, 1200), easing: 'ease-out', fill: 'forwards' });
            FX.track(s, an, 1600);
        }
    }

    /* ------------------------------------------------------------------
       Dialogue: three categories, never the exact line twice in a row, a few lines that only follow one particular line
       ------------------------------------------------------------------ */
    function line(u, cat) {
        const pool = u.cfg.say[cat].filter(l => l !== u.last && (!AFTER[l] || AFTER[l] === u.last));
        const follow = pool.filter(l => AFTER[l]), plain = pool.filter(l => !AFTER[l]);
        return u.last = follow.length && Math.random() < .75 ? pick(follow) : pick(plain.length ? plain : pool);
    }

    /* the bubble: above / below / right / left of the animal, whichever is on screen and clear of text; always clamped to the viewport */
    function dismissSay(u, now) {
        clearTimeout(u.sayT);
        const el = u.bubble; u.bubble = null;
        if (!el) return;
        if (now) el.remove(); else { el.classList.add('is-out'); setTimeout(() => el.remove(), 260); }
    }
    function say(u, text, ms) {
        dismissSay(u, true);
        const el = document.createElement('div'); el.className = 'bf-say'; el.setAttribute('role', 'status'); el.textContent = text;
        const blocks = contentRects(u.sec);   /* measured before the bubble exists, so its own text is not an obstacle */
        el.style.visibility = 'hidden'; u.el.appendChild(el);
        const a = u.an.getBoundingClientRect(), ur = u.el.getBoundingClientRect(), vw = document.documentElement.clientWidth, vh = innerHeight;
        const bw = el.offsetWidth, bh = el.offsetHeight, G = 9, top0 = navBottom() + 6;
        const cx = a.left + a.width / 2, cy = a.top + a.height / 2;
        const cands = [
            { s: 't', x: cx - bw / 2, y: a.top - bh - G }, { s: 'b', x: cx - bw / 2, y: a.bottom + G },
            { s: 'r', x: a.right + G, y: cy - bh / 2 }, { s: 'l', x: a.left - bw - G, y: cy - bh / 2 }
        ].map(c => {
            const horiz = c.s === 't' || c.s === 'b', x = horiz ? clamp(c.x, 8, vw - 8 - bw) : c.x, y = horiz ? c.y : clamp(c.y, top0, vh - 8 - bh);
            const b = { l: x, t: y, r: x + bw, b: y + bh };
            const off = (b.l < 8 || b.r > vw - 8 || b.t < top0 || b.b > vh - 8) ? 100 : 0;
            return { s: c.s, x, y, score: off + blocks.filter(r => r.left < b.r + 3 && r.right > b.l - 3 && r.top < b.b + 3 && r.bottom > b.t - 3).length * 10 };
        });
        const best = cands.reduce((p, c) => c.score < p.score ? c : p);
        el.classList.add('is-' + best.s);
        el.style.setProperty('--tx', f1(clamp((best.s === 't' || best.s === 'b' ? cx - best.x : cy - best.y), 14, (best.s === 't' || best.s === 'b' ? bw : bh) - 14)) + 'px');
        el.style.left = f1(best.x - ur.left) + 'px'; el.style.top = f1(best.y - ur.top) + 'px'; el.style.visibility = '';
        u.bubble = el; u.sayT = setTimeout(() => dismissSay(u), ms);
    }

    /* ------------------------------------------------------------------
       The interaction
       idle → primed (click 1) → emerging → ready (click 2) → eating (click 3) → talk → leaving → idle
       ------------------------------------------------------------------ */
    function wiggleFruit(u) {
        const f = pick(FRUITFX), shimmer = f[f.length - 1] === true, ms = shimmer ? f[f.length - 2] : f[f.length - 1], kf = f.filter(x => typeof x === 'object');
        if (shimmer) sparkle(u);
        if (!reduce) u.fb.animate(kf, { duration: ms, easing: 'ease-in-out' });
    }
    function tap(u, who) {
        if (u.state === 'idle') { u.state = 'primed'; wiggleFruit(u); arm(u, 9000, () => { if (u.state === 'primed') u.state = 'idle'; }); }
        else if (u.state === 'primed') go(u, emerge);
        else if (u.state === 'ready') go(u, eat);
        else if (u.state === 'talk' && who === 'animal') chat(u);
    }
    async function emerge(u, t) {
        u.state = 'emerging'; clearTimeout(u.timer); sparkle(u);
        await travel(u, t, u.hide, u.peek, 'in');
        blink(u); u.an.classList.add('is-live'); u.state = 'ready';
        arm(u, 14000, () => { if (u.state === 'ready') go(u, retreat); });   /* never clicked: it goes back */
    }
    async function retreat(u, t) {
        u.state = 'leaving'; u.an.classList.remove('is-live');
        await travel(u, t, u.peek, u.hide, 'out');
        u.state = 'idle';
    }
    async function eat(u, t) {
        const e = u.cfg.eat, fb = u.fb, dir = u.dir;
        u.state = 'eating'; clearTimeout(u.timer); u.an.classList.remove('is-live');
        await travel(u, t, u.peek, u.stop, null);
        if (e.mode === 'hold') {   /* picks it up and brings it to its mouth first */
            await anim(u, t, fb, [{ transform: 'none' }, { transform: 'translate(' + f1(-dir * 11 * u.s) + 'px,' + f1(-12 * u.s) + 'px) scale(.9)' }], { ms: 380, keep: true });
            await sleep(u, t, 120);
        }
        const base = e.mode === 'hold' ? 'translate(' + f1(-dir * 11 * u.s) + 'px,' + f1(-12 * u.s) + 'px) ' : '';
        if (e.mode === 'grab') {
            blink(u);
            await anim(u, t, fb, [{ transform: 'none', opacity: 1 }, { transform: 'translate(' + f1(-dir * (u.F + 2) * .7) + 'px,' + f1(-5 * u.s) + 'px) scale(.2)', opacity: .2 }], { ms: e.ms, keep: true, easing: 'ease-in' });
            fb.style.opacity = '0';
            await anim(u, t, u.body, [{ transform: 'none' }, { transform: e.puff ? 'scale(1.1,.94)' : 'scale(1.12,.88)', offset: .35 }, { transform: 'scale(.97,1.05)', offset: .7 }, { transform: 'none' }], { ms: e.puff ? 420 : 320, fx: true });
        } else {
            for (let k = 1; k <= e.bites; k++) {
                const sc = f1(1 - k / (e.bites + .6) * .85);
                anim(u, t, u.body, [{ transform: 'none' }, { transform: 'translateY(2px) scale(1.04,.93) rotate(' + (6 * dir) + 'deg)', offset: .4 }, { transform: 'none' }], { ms: e.ms * .8, fx: true }).catch(() => { });
                await anim(u, t, fb, [{ transform: base + 'scale(1)' }, { transform: base + 'scale(' + sc + ')' }], { ms: e.ms * .5, keep: true });   /* a bite: the fruit gets smaller */
                await sleep(u, t, e.ms * .5);
            }
            fb.style.opacity = '0';
        }
        u.state = 'talk'; u.an.classList.add('is-live');
        say(u, line(u, 'eat'), 3400);
        u.talkEnd = performance.now() + 7000; u.talkCap = performance.now() + 13000;
        arm(u, 7000, () => go(u, leave));
    }
    function chat(u) {
        const now = performance.now();
        u.talkEnd = Math.min(u.talkEnd + 1800, u.talkCap); arm(u, Math.max(1500, u.talkEnd - now), () => go(u, leave));
        const name = pick(u.cfg.react.filter(n => n !== u.lastReact)); u.lastReact = name;
        if (!reduce && !u.reacting) { u.reacting = true; blink(u); body(u, u.tok, name).catch(() => { }).then(() => { u.reacting = false; }); }
        say(u, line(u, 'click'), 2800);
    }
    async function leave(u, t) {
        u.state = 'leaving'; clearTimeout(u.timer); u.an.classList.remove('is-live');
        say(u, line(u, 'leave'), 2300);
        await sleep(u, t, u.cfg.wait + 700);
        await travel(u, t, u.stop, u.hide, 'out');
        dismissSay(u);
        u.an.style.opacity = '0';
        await anim(u, t, u.fb, [{ transform: 'scale(0)', opacity: 0 }, { transform: 'scale(1.14)', opacity: 1, offset: .65 }, { transform: 'scale(1)', opacity: 1 }], { ms: 480, keep: true });
        u.fb.style.transform = ''; u.fb.style.opacity = '';
        sparkle(u); u.state = 'idle';
    }
    function hardReset(u) {
        u.tok++; u.t.forEach(clearTimeout); u.t = []; clearTimeout(u.timer); dismissSay(u, true);
        [u.an, u.body, u.fb].forEach(el => { el.getAnimations().forEach(a => a.cancel()); });
        $$('.bf-eye', u.an).forEach(e => e.getAnimations().forEach(a => a.cancel()));
        $$('.bf-bit', u.el).forEach(b => b.remove());
        u.fb.style.transform = ''; u.fb.style.opacity = ''; u.an.style.opacity = '0'; u.an.style.transform = tr(u, u.hide, 0, 0);
        u.an.classList.remove('is-live'); u.reacting = false; u.state = 'idle';
    }

    /* ------------------------------------------------------------------
       Building, sizing and placing the units
       ------------------------------------------------------------------ */
    function make(sec, cfg) {
        const el = document.createElement('div'), mk = (tag, cls, html) => { const n = document.createElement(tag); n.className = cls; if (html) n.innerHTML = html; el.appendChild(n); return n; };
        el.className = 'bf bf-' + cfg.id; el.hidden = true;
        const tuft = mk('div', 'bf-tuft', TUFT[cfg.tuft]);
        const fruit = mk('div', 'bf-fruit'), fb = document.createElement('span'); fb.className = 'bf-fb'; fb.innerHTML = FRUIT[cfg.fruit]; fruit.appendChild(fb);
        fruit.setAttribute('role', 'button'); fruit.setAttribute('tabindex', '0'); fruit.setAttribute('aria-label', cfg.label + ' in the garden. Press to see what happens');
        const an = mk('div', 'bf-an'), flip = document.createElement('span'), bodyEl = document.createElement('span');
        flip.className = 'bf-flip'; bodyEl.className = 'bf-body'; bodyEl.innerHTML = ANIMAL[cfg.id]; flip.appendChild(bodyEl); an.appendChild(flip);
        an.setAttribute('role', 'button'); an.setAttribute('aria-label', 'Tap the ' + cfg.id);
        const u = { cfg, id: cfg.id, sec, el, tuft, fruit, fb, an, flip, body: bodyEl, dir: cfg.dir, s: 0, x: 0, y: 0, state: 'idle', tok: 0, t: [], timer: 0, sayT: 0, bubble: null, last: '', lastReact: '', reacting: false, talkEnd: 0, talkCap: 0 };
        fruit.addEventListener('click', () => tap(u, 'fruit'));
        fruit.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tap(u, 'fruit'); } });
        an.addEventListener('click', () => { if (u.state === 'ready') tap(u, 'fruit'); else tap(u, 'animal'); });
        an.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); an.click(); } });
        sec.appendChild(el);
        return u;
    }
    function resize(u) {   /* sizes in px at the current scale; the unit is reset because every position changes */
        const s = scale();
        u.s = s; u.W = Math.round(140 * s); u.H = Math.round(50 * s); u.A = Math.round(42 * s); u.F = Math.round(26 * s);
        const tw = Math.round(54 * s);
        u.el.style.setProperty('--s', s);
        u.el.style.width = u.W + 'px'; u.el.style.height = u.H + 'px';
        u.fx = u.dir > 0 ? u.W - u.F : 0;   /* the fruit's left edge */
        u.fruit.style.left = u.fx + 'px'; u.tuft.style.left = (u.dir > 0 ? 0 : u.W - tw) + 'px';
        u.flip.style.transform = u.dir > 0 ? '' : 'scaleX(-1)';
        u.hide = 4 * s; u.peek = 32 * s; u.stop = u.W - u.F - u.A + u.cfg.eat.reach * s;
        hardReset(u);
    }
    function layout() {
        PAIRS.forEach(cfg => {
            const secs = cfg.secs.map(q => $(q)).filter(Boolean); if (!secs.length) return;
            let u = units.find(o => o.cfg === cfg);
            if (!u) { u = make(secs[0], cfg); units.push(u); }
            if (u.s !== scale()) resize(u);
            if (u.state !== 'idle') return;
            if (!u.el.hidden && valid(u)) return;
            u.el.hidden = true;
            for (const sec of secs) {   /* the first section with a clear spot */
                if (u.sec !== sec) { u.sec = sec; sec.appendChild(u.el); }
                const spot = findSpot(u);
                if (spot) { put(u, spot); u.el.hidden = false; break; }
            }
        });
    }
    function start() {
        if (started) return; started = true;
        layout();
        if (document.readyState !== 'complete') addEventListener('load', () => setTimeout(layout, 600), { once: true });
        setTimeout(layout, 4200);   /* plants, images and the pinwheels settle a moment after load */
        let rt = 0; const relayout = () => { clearTimeout(rt); rt = setTimeout(layout, 500); };
        addEventListener('resize', () => { if (innerWidth === lastW) return; lastW = innerWidth; relayout(); });
        if (window.ResizeObserver) { const ro = new ResizeObserver(relayout), seen = new Set(); PAIRS.forEach(p => p.secs.forEach(q => { const sec = $(q); if (sec && !seen.has(sec)) { seen.add(sec); ro.observe(sec); } })); }
    }

    return { start };
});
