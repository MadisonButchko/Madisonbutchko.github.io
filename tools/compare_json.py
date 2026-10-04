#!/usr/bin/env python3
"""Diff two JSON files written by tools/smoke.js or tools/style-snapshot.js.

  python3 tools/compare_json.py tools/baseline/fingerprint.desktop.json /path/to/new.json [--ignore key,key] [--tolerance 0.02]

Prints every path whose value differs. Numbers are compared with a relative tolerance (default 2 %) so
random layout jitter does not drown real changes; strings and booleans must match exactly.
Exit code 0 = no differences.
"""
import argparse, json, sys


def walk(a, b, path, diffs, tol, ignore):
    if path.split('.')[-1] in ignore:
        return
    if isinstance(a, dict) and isinstance(b, dict):
        for k in sorted(set(a) | set(b)):
            if k not in a:
                diffs.append((f'{path}.{k}', '<missing>', b[k]))
            elif k not in b:
                diffs.append((f'{path}.{k}', a[k], '<missing>'))
            else:
                walk(a[k], b[k], f'{path}.{k}', diffs, tol, ignore)
    elif isinstance(a, list) and isinstance(b, list):
        if len(a) != len(b):
            diffs.append((path + '[len]', len(a), len(b)))
        for i, (x, y) in enumerate(zip(a, b)):
            walk(x, y, f'{path}[{i}]', diffs, tol, ignore)
    elif isinstance(a, (int, float)) and isinstance(b, (int, float)) and not isinstance(a, bool):
        if abs(a - b) > tol * max(abs(a), abs(b), 1):
            diffs.append((path, a, b))
    elif a != b:
        diffs.append((path, a, b))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('old')
    ap.add_argument('new')
    ap.add_argument('--ignore', default='')
    ap.add_argument('--tolerance', type=float, default=0.02)
    a = ap.parse_args()
    old, new = json.load(open(a.old)), json.load(open(a.new))
    diffs = []
    walk(old, new, '$', diffs, a.tolerance, set(filter(None, a.ignore.split(','))))
    for p, x, y in diffs[:200]:
        print(f'{p}\n    baseline: {x}\n    current : {y}')
    print(f'{len(diffs)} difference(s)')
    return 1 if diffs else 0


if __name__ == '__main__':
    sys.exit(main())
