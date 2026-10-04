/* =====================================================================
   Botanical interface
   Experience is a living garden: choose a flower, it travels to the
   centre, grows branches, and each bud is one experience.
   Skills is a pressed-specimen collection: choose a specimen, it lifts
   onto the page, separates into pieces, and each piece is one skill.
   Both read their content from <template> blocks in index.html, show one
   note at a time (so every category has the same footprint), remember
   what the visitor explored this session, and feed the discovery bouquet.
   ===================================================================== */
/* The code now lives in js/botanical/*, js/animals/butterflies.js and js/easter-eggs/easter-eggs.js; this file runs it in the original order
   (stages, then the bouquet, then the ways in and the seed packet, then the hidden moments). */
(function () {
    'use strict';
    MB.use('botanical.stage').create();                  /* the Experience / Skills stages, Escape, the linger easter egg */
    const bouquet = MB.use('botanical.bouquet');
    bouquet.create(); bouquet.markAll(); bouquet.draw(); /* the visitor's bouquet and the "visited" marks */
    MB.use('botanical.links').start();                   /* ways in + a seed of curiosity */
    MB.use('easter-eggs.easter-eggs').start();           /* small hidden moments, footer year */
})();
