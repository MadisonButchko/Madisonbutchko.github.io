#!/usr/bin/env python3
"""Prove the legacy slice (MIGRATION_PLAN Step 5) changed nothing: the ordered segment files,
concatenated, must equal the baseline script, once the module plumbing is stripped from both sides.

  python3 tools/js_concat_check.py --files js/legacy/10-a.js js/legacy/20-b.js ... [--ref pre-modular:script.js]

Normalisation (applied to the segments only): whole-line `import ...` / `export {...}` statements are dropped and a
leading `export ` keyword (`export const`, `export function`, `export default`) is removed. Everything else, including
whitespace, must match exactly. Exit code 0 = identical.
Self-test: with --files script.js on an untouched tree it must report IDENTICAL.
"""
import argparse, os, re, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def normalise(text):
    out = []
    for line in text.split('\n'):
        if re.match(r'\s*import\b.*;?\s*$', line) and not re.match(r'\s*import\s*\(', line):
            continue
        if re.match(r'\s*export\s*\{.*\};?\s*$', line):
            continue
        out.append(re.sub(r'^(\s*)export\s+(default\s+)?', r'\1', line))
    return '\n'.join(out)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--ref', default='pre-modular:script.js')
    ap.add_argument('--ref-file', help='compare against this file instead of a git rev (e.g. a copy of script.js saved just before a slice)')
    ap.add_argument('--files', nargs='+', required=True)
    a = ap.parse_args()
    if a.ref_file:
        old = open(a.ref_file, encoding='utf-8').read()
    else:
        old = subprocess.run(['git', '-C', ROOT, 'show', a.ref], capture_output=True, check=True).stdout.decode('utf-8')
    new = ''.join(normalise(open(os.path.join(ROOT, f), encoding='utf-8').read()) for f in a.files)
    print(f'baseline {a.ref_file or a.ref}: {len(old)} chars   segments (normalised): {len(new)} chars')
    if new == old:
        print('IDENTICAL: the slice is a pure cut.')
        return 0
    i = next((k for k, (x, y) in enumerate(zip(old, new)) if x != y), min(len(old), len(new)))
    print(f'DIFFERENT: first difference at char {i} (baseline line {old[:i].count(chr(10)) + 1}).')
    print('  baseline:', repr(old[i:i + 100]))
    print('  current :', repr(new[i:i + 100]))
    return 1


if __name__ == '__main__':
    sys.exit(main())
