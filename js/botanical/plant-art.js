/* js/botanical/plant-art.js
   Purpose : the plant drawings and geometry of an open plant: the 400x380 viewBox, ring() placement, the Experience bud art, the Skills pressed-piece art.
   Owns    : VW, VH, HC, ring, pct, budArt, PIECE, pieceArt.   Uses: botanical.content (f1, rng).   Used by: botanical/stage.js.
   Mobile / reduced motion: pure drawing helpers.
   Moved verbatim from legacy/190-botanical.js (Migration Step 13); behaviour, order and timing unchanged. */
MB.define('botanical.plant-art', ['botanical.content'], function (content) {
    'use strict';
    const { f1, rng } = content;
    /* ------------------------------------------------------------------
       Shared geometry for an open plant (viewBox 400 x 380)
       ------------------------------------------------------------------ */
    const VW = 400, VH = 380, HC = { x: 200, y: 186 };
    function ring(n, seed, organic) {
        const R = rng(seed);
        const span = n <= 1 ? [270, 270] : n === 2 ? [234, 306] : n === 3 ? [214, 326] : n <= 5 ? [198, 342] : n <= 7 ? [186, 354] : [178, 362];
        const r0 = organic ? 148 : 138;
        return Array.from({ length: n }, (_, i) => {
            const t = n === 1 ? 0.5 : i / (n - 1);
            const a = span[0] + (span[1] - span[0]) * t + (organic ? (R() - 0.5) * 7 : 0);
            const r = r0 + (organic ? (R() - 0.5) * 22 : (i % 2 ? 9 : -6));
            const rad = a * Math.PI / 180;
            return { x: HC.x + Math.cos(rad) * r, y: HC.y + Math.sin(rad) * r * (organic ? 0.97 : 1.45) + (organic ? 0 : 55), a, rad };
        });
    }
    const pct = (v, of) => f1(v / of * 100) + '%';

    /* closed bud that opens into a six-petalled flower (Experience) */
    function budArt() {
        let pet = ''; for (let k = 0; k < 6; k++) pet += '<ellipse cx="0" cy="-10" rx="6.4" ry="10.4" transform="rotate(' + k * 60 + ')"/>';
        return '<svg class="gb-art" viewBox="-24 -24 48 48" aria-hidden="true"><g class="b-sepals"><path d="M0 3 C-8 5 -12 12 -11 19 C-6 15 -2 10 0 3Z"/><path d="M0 3 C8 5 12 12 11 19 C6 15 2 10 0 3Z"/></g>'
            + '<g class="b-pet">' + pet + '</g><circle class="b-core" r="4.4"/><path class="b-spark" d="M12 -15 l1.3 3.4 3.4 1.3 -3.4 1.3 -1.3 3.4 -1.3 -3.4 -3.4 -1.3 3.4 -1.3Z"/></svg>';
    }
    /* one piece of a pressed specimen (Skills); drawn pointing up, rotated outward by the caller */
    const PIECE = {
        fern: () => { let s = '<path class="p-rib" d="M0 20 L0 -21"/>'; for (let k = 0; k < 6; k++) { const y = 14 - k * 6.4, r = 6.2 - k * 0.7; s += '<ellipse cx="' + f1(-r * 0.9) + '" cy="' + f1(y) + '" rx="' + f1(r) + '" ry="2.2" transform="rotate(28 ' + f1(-r * 0.9) + ' ' + f1(y) + ')"/><ellipse cx="' + f1(r * 0.9) + '" cy="' + f1(y - 2) + '" rx="' + f1(r) + '" ry="2.2" transform="rotate(-28 ' + f1(r * 0.9) + ' ' + f1(y - 2) + ')"/>'; } return s; },
        umbel: () => { let s = '<path class="p-rib" d="M0 20 L0 -6"/>'; for (let k = 0; k < 7; k++) { const a = -Math.PI / 2 + (k - 3) * 0.42, x = Math.cos(a) * 11, y = -6 + Math.sin(a) * 11; s += '<path class="p-rib thin" d="M0 -6 L' + f1(x) + ' ' + f1(y) + '"/><circle cx="' + f1(x) + '" cy="' + f1(y) + '" r="3.4"/>'; } return s + '<circle class="p-core" cx="0" cy="-6" r="2"/>'; },
        eucalyptus: () => '<path class="p-rib" d="M0 21 L0 -19"/><circle cx="0" cy="-10" r="9.5"/><circle cx="-6" cy="8" r="6"/><circle cx="6" cy="10" r="5"/><path class="p-vein" d="M0 -19 V0 M-6 3 V13 M6 6 V15"/>',
        geometric: () => '<path d="M0 -21 L9 -5 L0 19 L-9 -5Z"/><path class="p-vein" d="M0 -21 V19 M-9 -5 H9"/>',
        blossom: () => { let s = '<path class="p-rib" d="M0 21 L0 -2"/>'; for (let k = 0; k < 5; k++) { const a = k * 72 * Math.PI / 180; s += '<circle cx="' + f1(Math.sin(a) * 6.5) + '" cy="' + f1(-9 - Math.cos(a) * 6.5) + '" r="5.6"/>'; } return s + '<circle class="p-core" cx="0" cy="-9" r="3"/>'; },
        frilled: () => '<path d="M0 19 C-11 8 -11 -12 -5.5 -20 L-2.4 -15.5 L0 -20.5 L2.4 -15.5 L5.5 -20 C11 -12 11 8 0 19Z"/><path class="p-vein" d="M0 17 V-14"/>',
        wheat: () => { let s = '<path class="p-rib" d="M0 21 L0 -20"/>'; for (let k = 0; k < 4; k++) { const y = 8 - k * 7; s += '<ellipse cx="-3.4" cy="' + y + '" rx="2.8" ry="4.8" transform="rotate(-24 -3.4 ' + y + ')"/><ellipse cx="3.4" cy="' + (y - 2) + '" rx="2.8" ry="4.8" transform="rotate(24 3.4 ' + (y - 2) + ')"/>'; } return s + '<ellipse cx="0" cy="-20" rx="2.6" ry="4.2"/>'; },
        wildflower: () => { let s = '<path class="p-rib" d="M0 21 L0 -2"/><ellipse class="p-leaf" cx="-5" cy="11" rx="5" ry="2" transform="rotate(-30 -5 11)"/>'; for (let k = 0; k < 5; k++) { const a = k * 72 * Math.PI / 180; s += '<circle cx="' + f1(Math.sin(a) * 6) + '" cy="' + f1(-9 - Math.cos(a) * 6) + '" r="5.4"/>'; } return s + '<circle class="p-core gold" cx="0" cy="-9" r="3.2"/>'; }
    };
    const pieceArt = (plant, rot) => '<svg class="gb-art" viewBox="-24 -24 48 48" aria-hidden="true"><g transform="rotate(' + f1(rot) + ')">' + (PIECE[plant] || PIECE.blossom)() + '</g></svg>';

    return { VW, VH, HC, ring, pct, budArt, PIECE, pieceArt };
});
