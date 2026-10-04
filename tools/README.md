# tools/: verification aids for the modular migration

Not part of the site (nothing in `index.html` references them). They exist so every migration step can be checked against the
`pre-modular` baseline instead of by eye. See [MIGRATION_PLAN.md](../MIGRATION_PLAN.md) for when each is used.
Note: GitHub Pages publishes the whole repo, so `tools/` (≈ 2.4 MB with screenshots) is publicly reachable; move or remove it
when the migration ends if that matters.

| Tool | Purpose | Needs |
|---|---|---|
| `capture.py` | Headless-Chrome run over 5 profiles → console log, computed-style snapshot, section screenshots, smoke fingerprint | Chrome, Python 3, `websocket-client` |
| `smoke.js` | Page-side smoke test + fingerprint (scroll, gallery/lightbox, Experience + Skills open/close, debug hooks, DOM leak check) | run by `capture.py` or pasted in a console |
| `style-snapshot.js` | Computed styles of ~46 structural selectors | same |
| `compare_json.py` | Diff two fingerprint/style JSON files with numeric tolerance and an ignore list | Python 3 |
| `css_concat_check.py` | Proves a CSS split is a pure cut (concatenation in `<link>` order == baseline `style.css`) | Python 3, git |
| `js_concat_check.py` | Proves the Step 5 legacy slice is a pure cut (concatenation minus `import`/`export` == baseline `script.js`) | Python 3, git |
| `check_site.py` | `paths`: every `src`/`href` and gallery image name matches a file with exactly the same case (GitHub Pages is case-sensitive) and the script manifest has no `module`/`async`; `globals`: diff `window` against `baseline/globals.json` (only `MB` may be new) | Python 3, git, Chrome |
| `serve.py` | Static no-cache server that works from any cwd (`--dir`), optional `POST /__save/<n>.json` | Python 3 |

## Run a check against the baseline

```bash
# serve the site you want to test (current tree here; for the pristine baseline serve a `git archive pre-modular` copy)
python3 tools/serve.py --port 8097
```
```bash
# capture the same 5 profiles into a scratch folder (never into tools/baseline)
python3 tools/capture.py --url http://localhost:8097/index.html --out /tmp/after            # or --only desktop,phone
```
```bash
# compare (documented noise ignored)
python3 tools/compare_json.py tools/baseline/styles.desktop.json /tmp/after/styles.desktop.json
python3 tools/compare_json.py tools/baseline/fingerprint.desktop.json /tmp/after/fingerprint.desktop.json \
  --ignore worldState,gardenState,storage,idleDrift,idleA,idleB,nodes,scatter
```
Then look at `/tmp/after/screenshots/<profile>/*.jpg` next to `tools/baseline/screenshots/<profile>/*.jpg`, and read `console.<profile>.json`.

Pure-cut proofs:
```bash
python3 tools/css_concat_check.py                                   # Phase E1
python3 tools/js_concat_check.py --ref-file <copy of script.js saved just before the slice> --files js/legacy/*.js   # Step 5 (done; byte-identical)
```

## What is expected to differ vs. the baseline
- **Styles:** must be **identical** (0 differences) in any step that is not a deliberate CSS change. The default selectors are structural and deterministic (verified: two runs gave 0 differences).
- **Fingerprint:** counts of random decorations (`scatter`, `dandelions`, birds…), `worldState`, `gardenState`, `storage` sizes and DOM-node totals vary run to run (that is what `--ignore` lists). Everything else must match: section/flower/specimen counts, gallery tile counts per filter (54 / 13 / 21 / 11 / 9), `lightbox*`/`modal*` booleans, Experience 6 buds, Skills 7 buds, every debug hook `ok`.
- **Leak check:** `domNodes.idleDrift` (node count change over 3 idle seconds) should not be strongly positive (> ~ +100 means something keeps appending). It is normally slightly negative as creatures leave.
- **`window.* globals present`** in the fingerprint is the migration-debt list; entries are *expected* to disappear as steps remove them (see ARCHITECTURE §4). Debug hooks (`__garden`, `__world`, `__dand`, `__vineDebug`) must remain.
- **Console:** zero errors/warnings on load and during the run, in every profile.

## Verify in all three serving modes: `file://`, local server, GitHub-Pages-style
The site is opened by double-clicking `index.html`, so `file://` is the primary mode.
```bash
python3 tools/capture.py --url "file://$PWD/index.html" --only desktop,phone --out /tmp/after-file
python3 tools/compare_json.py tools/baseline/styles.desktop.json /tmp/after-file/styles.desktop.json --ignore url
```
Browsers refuse `type="module"` scripts on `file://`; an http-only check cannot catch that (this broke the first Step 1 attempt).
GitHub-Pages-style = serve a clean export of only the repo's files, e.g. copy `git ls-files -c -o --exclude-standard` to a scratch folder and `python3 tools/serve.py --dir <folder> --port 8095`, then run `capture.py` against it; plus `python3 tools/check_site.py paths` (case-sensitive names) and `python3 tools/check_site.py globals`.

## Profiles (what `capture.py` emulates)
`desktop` 1440×900 fine pointer · `desktop-rm` same with `prefers-reduced-motion: reduce` (smoke only) · `laptop` 1024×768 · `tablet` 768×1024 · `phone` 390×844 mobile + touch (coarse pointer, `maxTouchPoints` 5, DPR 2).
Each profile starts from an empty browser profile (first visit). The page runs *visible* (`document.hidden === false`); the in-app browser pane does not, so scroll/IntersectionObserver/heartbeat behaviour **cannot** be verified there.

## Manual smoke test (what the tools do NOT cover)
Run after steps marked high-risk and at the end of each phase (full list: MIGRATION_PLAN "T2 full smoke checklist"). Specifically manual:
- Real **touch gestures**: swipe in the lightbox and in a stage note, drag a seed to a bird, tap the dandelion/vine, tap-for-hover equivalents (emulation reports touch, but there is no finger).
- **Cursor-driven effects** with a real mouse: ring, rainbow glow, butterfly cursor, sunlight lean, wind from fast passes, magnetic hovers.
- **Timed/rare behaviour:** waiting for natural events (birds, rain, nest growth while out of view), saved-garden restore after reload, a revisit showing a new bud.
- **Visual judgement:** screenshots are compared by eye (random decorations differ); animation quality, easing and timing.
- **Reduced motion visuals:** `desktop-rm` proves it runs without errors; look at it by eye too (Chrome DevTools → Rendering → emulate prefers-reduced-motion).
- Real-device checks (iOS Safari address-bar resize, notch/safe areas) when a step touches layout or vines.
