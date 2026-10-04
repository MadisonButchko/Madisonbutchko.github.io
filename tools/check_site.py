#!/usr/bin/env python3
"""Two checks the classic-script architecture depends on.

  python3 tools/check_site.py paths
      GitHub Pages is case-sensitive, macOS is not. Verifies that every local src/href in index.html, and every
      `file:'...'` artwork name in the scripts, matches a tracked/untracked-not-ignored file with EXACTLY the same case.
      Also prints the script manifest (tag order = load order) and flags type="module" / async.

  python3 tools/check_site.py globals [--url URL] [--baseline tools/baseline/globals.json] [--save]
      Loads the page in headless Chrome, lists the non-standard properties on `window` (compared with a blank page) and diffs
      them with the baseline: NEW names fail (no accidental globals; `MB` is the one allowed addition), removed names are
      reported (expected as code moves into MB modules). --save writes the list as the baseline instead of comparing.
      Only enumerable window properties are visible: top-level const/let are not window properties (see ARCHITECTURE section 4).
Exit code 0 = pass.
"""
import argparse, json, os, re, subprocess, sys, tempfile, time, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'tools'))
ALLOWED_NEW = {'MB'}


def tracked():
    out = subprocess.run(['git', '-C', ROOT, 'ls-files', '-c', '-o', '--exclude-standard'], capture_output=True, text=True, check=True).stdout
    return set(out.splitlines())


def paths():
    files = tracked()
    lower = {f.lower(): f for f in files}
    html = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()
    bad, refs = [], []
    for tag in re.findall(r'<(?:script|link|img|source)\b[^>]*>', html, flags=re.I):
        for attr in re.findall(r'\b(?:src|href)=["\']([^"\']+)["\']', tag, flags=re.I):
            if re.match(r'(?:https?:)?//|data:|#|mailto:|tel:', attr):
                continue
            refs.append((tag, attr.split('?')[0].split('#')[0]))
    for _, ref in refs:
        if not ref:
            continue
        if ref.startswith('/'):
            bad.append((ref, 'absolute path (breaks file:// and project-subpath hosting)'))
        elif ref not in files:
            bad.append((ref, f'case mismatch: tracked file is {lower[ref.lower()]!r}' if ref.lower() in lower else 'file not found'))
    # artwork names used by the gallery (images/<file>)
    names = set()
    for js in sorted(f for f in files if f.endswith('.js')):          # every tracked script: js/**, ecosystem.js, ...
        p = os.path.join(ROOT, js)
        if os.path.exists(p):
            names |= set(re.findall(r"file:\s*'([^']+\.(?:jpe?g|png|gif|webp|PNG|JPG))'", open(p, encoding='utf-8').read()))
    for n in sorted(names):
        ref = 'images/' + n
        if ref not in files:
            bad.append((ref, f'case mismatch: tracked file is {lower[ref.lower()]!r}' if ref.lower() in lower else 'file not found'))
    print(f'checked {len(refs)} references in index.html and {len(names)} artwork files')
    print('script manifest (tag order = load order):')
    for tag in re.findall(r'<script\b[^>]*\bsrc=[^>]*>', html, flags=re.I):
        src = re.search(r'src=["\']([^"\']+)', tag).group(1)
        flags = [f for f in ('defer', 'async') if re.search(r'\b' + f + r'\b', tag)] + (['MODULE'] if 'type="module"' in tag or "type='module'" in tag else [])
        print('   ', src, flags or '')
        if 'MODULE' in flags or 'async' in flags:
            bad.append((src, 'type=module / async is not allowed (breaks file:// or the load-order contract)'))
    for ref, why in bad:
        print('FAIL', ref, '-', why)
    print('paths: ' + ('PASS' if not bad else f'{len(bad)} problem(s)'))
    return 1 if bad else 0


def window_names(url, port=9480):
    import capture as C
    prof = tempfile.mkdtemp(prefix='cap-profile-')
    proc = subprocess.Popen([C.CHROME, '--headless=new', f'--remote-debugging-port={port}', '--remote-allow-origins=*', f'--user-data-dir={prof}',
                             '--no-first-run', '--mute-audio', 'about:blank'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        ws = None
        for _ in range(60):
            try:
                ws = next(t['webSocketDebuggerUrl'] for t in json.load(urllib.request.urlopen(f'http://127.0.0.1:{port}/json')) if t['type'] == 'page')
                break
            except Exception:
                time.sleep(0.25)
        c = C.CDP(ws)
        c.call('Page.enable'); c.call('Runtime.enable')
        blank = set(c.eval('Object.getOwnPropertyNames(window)', False))
        c.call('Page.navigate', url=url + C.DEBUG_QS)
        c.pump(9)
        now = set(c.eval('Object.getOwnPropertyNames(window)', False))
        return sorted(now - blank)
    finally:
        proc.terminate()


def globals_check(a):
    url = a.url or 'file://' + os.path.join(ROOT, 'index.html')
    names = window_names(url)
    if a.save:
        json.dump({'url': url, 'names': names}, open(a.baseline, 'w'), indent=1)
        print(f'saved {len(names)} window names to {a.baseline}')
        return 0
    base = set(json.load(open(a.baseline))['names'])
    new, gone = sorted(set(names) - base), sorted(base - set(names))
    print(f'window names: baseline {len(base)}, now {len(names)}')
    for n in new:
        print(('allowed new: ' if n in ALLOWED_NEW else 'FAIL new global: ') + n)
    for n in gone:
        print('removed (ok if its code moved into an MB module): ' + n)
    bad = [n for n in new if n not in ALLOWED_NEW]
    print('globals: ' + ('PASS' if not bad else f'{len(bad)} accidental global(s)'))
    return 1 if bad else 0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('check', choices=['paths', 'globals'])
    ap.add_argument('--url')
    ap.add_argument('--baseline', default=os.path.join(ROOT, 'tools/baseline/globals.json'))
    ap.add_argument('--save', action='store_true')
    a = ap.parse_args()
    sys.exit(paths() if a.check == 'paths' else globals_check(a))


if __name__ == '__main__':
    main()
