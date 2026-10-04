# Baseline: `pre-modular`

Captured from the **exact tagged tree** (served from `git archive pre-modular`, not the working directory) so later runs compare against the site as it was
before any refactor.

| | |
|---|---|
| Git tag | `pre-modular` (annotated) → commit `9b824c4` ("updates") |
| Site files at the tag | `index.html`, `script.js` (4,653 lines), `ecosystem.js` (155), `style.css` (2,769), `images/` |
| Captured | 2026-10-03, Google Chrome 154.0.8037.97 headless (`tools/capture.py`), fresh profile per run (first visit) |
| Page URL | `/index.html?gardendebug&worlddebug&v11debug` (debug hooks on) |
| Restore | `git checkout pre-modular` (read-only inspection) or `git diff pre-modular -- index.html script.js ecosystem.js style.css` |

## Files here
- `console.<profile>.json`: every console message/exception/browser log entry during load and the run. **All five profiles: 0 entries.**
- `styles.<profile>.json`: computed styles of 46 structural selectors (desktop, laptop, tablet, phone). Re-captured twice: **0 differences** between runs (deterministic).
- `fingerprint.<profile>.json`: smoke result for desktop, desktop-rm, phone.
- `screenshots/<profile>/{home,about,experience,skills,gallery,contact,footer}.jpg`: one viewport screenshot per section after scrolling to it (JPEG q60).

## Measured facts (baseline values to preserve)
| Profile | Viewport | Doc height | Pointer / touch | Reduced motion | Console |
|---|---|---|---|---|---|
| desktop | 1440×900 | 4670 px | fine / 0 | no | 0 |
| desktop-rm | 1440×900 | 4670 px | fine / 0 | **yes** | 0 |
| laptop | 1024×768 | 4882 px | fine / 0 | no | 0 |
| tablet | 768×1024 | 5659 px | fine / 0 | no | 0 |
| phone | 390×844 | 6015 px | coarse / 5 | no | 0 |

Smoke (desktop, phone and desktop-rm all passed with `errorsDuringRun: []`):
- Gallery: modal opens; tiles all 54 / mandala 13 / digital 21 / calligraphy 11 / fine art 9; clicking a tile opens the lightbox ("Tulips"); Next → "2 / 54"; Escape closes lightbox then modal; body scroll lock restored.
- Experience: 5 flowers, opens (stage visible), 6 buds, Escape closes. Skills: 8 specimens, opens, 7 buds, Escape closes.
- Debug hooks all run without throwing: `__world.seed/steal/rain/nestVisit`, `__story.advance`, `__garden.spawnPest/spawnDeer`.
- Structure: 6 sections, 2 petal canvases, 2 vines (desktop/phone; **0 vines under reduced motion**), 1 garden bed, 1 guide bird, 1 bouquet, 36 gallery preview items, 19 SVG symbols, 2 templates, 14 `.ltr` letters.
- Storage keys after a run: localStorage `mb-world-v1`, `mb-garden-v1`; sessionStorage `mb-visits-v1`, `mb-discoveries-v2`, `mb-grown-v1` (`mb-found-items-v1` did not appear in these runs).
- Idle DOM growth (3 s): slightly negative in every profile (no accumulating nodes).

## Known noise between two identical runs
Count of `.scatter` blooms (6 vs 7), garden plants/critters, world-state fields, storage sizes, DOM-node totals; screenshots differ in random decorations (petals, birds, blooms).

## Limits of this baseline
Captured with headless Chrome emulation (no real touch, no real cursor, no Safari/iOS). Natural rare events were forced through debug hooks, not waited for.
