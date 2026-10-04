#!/usr/bin/env python3
"""Prove a CSS split changed nothing: the local stylesheets, concatenated in <link> order,
must equal the baseline style.css byte for byte.

  python3 tools/css_concat_check.py [--ref pre-modular:style.css] [--html index.html]

Reads the local <link rel="stylesheet"> tags from the HTML (remote URLs such as Google Fonts are skipped,
a trailing ?v=NN is ignored). Exit code 0 = identical, 1 = differs (first difference is printed).
Only valid for a *pure cut* (Phase E1). Once rules are regrouped (E2) use tools/style-snapshot.js instead.
"""
import argparse, os, re, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--ref', default='pre-modular:style.css')
    ap.add_argument('--html', default='index.html')
    a = ap.parse_args()

    html = open(os.path.join(ROOT, a.html), encoding='utf-8').read()
    hrefs = []
    for tag in re.findall(r'<link\b[^>]*>', html, flags=re.I):
        if not re.search(r'rel=["\']stylesheet["\']', tag, flags=re.I):
            continue
        m = re.search(r'href=["\']([^"\']+)["\']', tag, flags=re.I)
        if m and not re.match(r'(?:https?:)?//', m.group(1)):
            hrefs.append(m.group(1).split('?')[0])
    if not hrefs:
        sys.exit('no local stylesheets found in ' + a.html)

    new = b''.join(open(os.path.join(ROOT, h), 'rb').read() for h in hrefs)
    old = subprocess.run(['git', '-C', ROOT, 'show', a.ref], capture_output=True, check=True).stdout

    print('stylesheets in link order:', ', '.join(hrefs))
    print(f'baseline {a.ref}: {len(old)} bytes   current concatenation: {len(new)} bytes')
    if new == old:
        print('IDENTICAL: the split is a pure cut.')
        return 0
    i = next((k for k, (x, y) in enumerate(zip(old, new)) if x != y), min(len(old), len(new)))
    line = old[:i].count(b'\n') + 1
    print(f'DIFFERENT: first difference at byte {i} (baseline line {line}).')
    print('  baseline:', old[i:i + 80])
    print('  current :', new[i:i + 80])
    return 1


if __name__ == '__main__':
    sys.exit(main())
