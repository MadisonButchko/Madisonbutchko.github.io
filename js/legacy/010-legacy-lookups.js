/* Life: one director for every wandering creature (js/core/scheduler.js). */
const Life = MB.use('core.scheduler').Life;
window.Life = Life;

/* The world's small memory (js/core/state.js). */
const WorldState = MB.use('core.state').WorldState;

        /* the gallery lives in js/gallery/gallery.js; these names are still read by the botanical block below */
        const artworks = MB.use('gallery.artworks').artworks;
        const { openArtwork, buildCollage } = MB.use('gallery.gallery');

