#!/usr/bin/env python3
"""
build_ed_section.py - rebuild the `ed` section of dashboard/data.json from the
emergency-department repository's pipeline outputs.

    python tools/build_ed_section.py              # fetch outputs at main, rewrite the ed section
    python tools/build_ed_section.py --check      # report drift, exit 1 if stale; writes nothing
    python tools/build_ed_section.py --ref 774dd23
    python tools/build_ed_section.py --outputs path/to/ed-throughput-analytics/outputs

Why this exists: the script that first assembled data.json was never committed.
When the ED pipeline fixed its weighted quantiles on 2026-08-11 (774dd23), nothing
noticed, and the dashboard showed the pre-fix 3.9x spread ratio - against 3.56x on
every resume - until 2026-09-10.

This is a reconstruction of the original transform, and it is PROVEN rather than
assumed: run on the outputs at 3b1e28a, the commit the dashboard was built from,
it reproduces the 2026-08-05 ed section exactly - 0 differing values - so its
output on newer commits can be trusted.

Only the ed section is rewritten. The other four round-trip byte for byte: the
file is written back compact, ASCII-escaped, with no trailing newline, which is
the format it was created in.

Standard library only.
"""
import argparse
import csv
import io
import json
import os
import sys
import time
import urllib.request

REPO = 'adapapavandharma/ed-throughput-analytics'
FILES = ('metrics.json', 'hourly_throughput.csv', 'acuity_throughput.csv',
         'payer_lwbs.csv', 'hospital_variation.csv')
DATA = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                     '..', 'dashboard', 'data.json'))


# ── inputs ──────────────────────────────────────────────────────────────────

def fetch(ref):
    out = {}
    for name in FILES:
        url = 'https://raw.githubusercontent.com/%s/%s/outputs/%s' % (REPO, ref, name)
        for attempt in range(3):
            try:
                req = urllib.request.Request(url, headers={'User-Agent': 'build_ed_section'})
                out[name] = urllib.request.urlopen(req, timeout=30).read().decode('utf-8')
                break
            except Exception as e:                      # network hiccup: retry twice
                if attempt == 2:
                    sys.exit('could not fetch %s: %s' % (url, e))
                time.sleep(2)
    return out


def local(folder):
    return {n: io.open(os.path.join(folder, n), encoding='utf-8').read() for n in FILES}


# ── the transform (proven against 3b1e28a - do not change without re-proving) ─

def _b(v):
    return str(v).strip().lower() == 'true'


def _r(v, n):
    return round(float(v), n)


def _rows(text):
    return list(csv.DictReader(io.StringIO(text, newline='')))


def _find(d, *needles):
    """First key in d whose name contains every needle."""
    for k in d:
        if all(n in k for n in needles):
            return d[k]
    raise KeyError('no key containing %s in %s' % (needles, list(d)))


def build(files):
    m = json.loads(files['metrics.json'])
    nat, pk, bd = m['national'], m['peak_vs_overnight'], m['boarding']

    ed = {}
    ed['source'] = m['source']
    ed['sample_visits'] = m['sample_visits']
    ed['national_visits'] = m['national_ed_visits']
    ed['kpi'] = {
        'median_wait':     nat['median_door_to_provider_min'],
        'p90_wait':        nat['p90_door_to_provider_min'],
        'lwbs_pct':        nat['lwbs_pct']['value'],
        'lwbs_ci':         [nat['lwbs_pct']['ci_low'], nat['lwbs_pct']['ci_high']],
        'admit_pct':       nat['admit_pct']['value'],
        'admit_ci':        [nat['admit_pct']['ci_low'], nat['admit_pct']['ci_high']],
        'median_lov':      nat['median_length_of_visit_min'],
        'median_boarding': nat['median_boarding_min'],
    }
    ed['boarding'] = {k: bd[k] for k in ('n', 'median_min', 'p75_min', 'p90_min', 'p99_min')}
    ed['hourly'] = [{
        'hour': int(x['hour']),
        'visits_m': _r(float(x['visits_weighted']) / 1e6, 3),
        'median': _r(x['median_door_to_provider'], 1),
        'p90': _r(x['p90_door_to_provider'], 1),
        'lwbs': _r(x['lwbs_pct'], 2),
        'n': int(x['n']),
    } for x in _rows(files['hourly_throughput.csv'])]
    ed['acuity'] = [{
        'level': x['acuity'],
        'median': _r(x['median_wait'], 1),
        'p90': _r(x['p90_wait'], 1),
        'lwbs': _r(x['lwbs_pct'], 2),
        'n': int(x['n']),
        'reliable': _b(x['reliable']),
    } for x in _rows(files['acuity_throughput.csv'])]
    ed['payer'] = [{
        'payer': x['payer'],
        'lwbs': _r(x['lwbs_pct'], 2),
        'lo': _r(float(x['ci_low']) * 100, 2),
        'hi': _r(float(x['ci_high']) * 100, 2),
        'n': int(x['n']),
        'reliable': _b(x['reliable']),
    } for x in _rows(files['payer_lwbs.csv'])]
    ed['hospitals'] = [{
        'median': _r(x['median_wait'], 1),
        'p90': _r(x['p90_wait'], 1),
        'lwbs': _r(x['lwbs_pct'], 2),
        'admit': _r(x['admit_pct'], 2),
        'n': int(x['n']),
    } for x in _rows(files['hospital_variation.csv'])]
    ed['decomposition'] = m['variation_decomposition']
    ed['peak_test'] = {
        'median_peak':  pk['median_wait_peak_min'],
        'median_night': pk['median_wait_overnight_min'],
        'wait_p':       pk['mean_wait_difference_test']['p_value'],
        'lwbs_peak':    pk['lwbs_peak_pct']['value'],
        'lwbs_night':   _find(pk, 'lwbs', 'overnight', 'pct')['value'],
        'lwbs_p':       _find(pk, 'lwbs', 'test')['p_value'],
    }
    return ed


def diff(a, b, path='ed', out=None):
    out = [] if out is None else out
    if isinstance(a, dict) and isinstance(b, dict):
        for k in list(a) + [k for k in b if k not in a]:
            if k not in a:
                out.append((path + '.' + k, '<missing>', b[k]))
            elif k not in b:
                out.append((path + '.' + k, a[k], '<missing>'))
            else:
                diff(a[k], b[k], path + '.' + k, out)
    elif isinstance(a, list) and isinstance(b, list):
        if len(a) != len(b):
            out.append((path, 'len %d' % len(a), 'len %d' % len(b)))
        for i, (x, y) in enumerate(zip(a, b)):
            diff(x, y, '%s[%d]' % (path, i), out)
    elif a != b:
        out.append((path, a, b))
    return out


# ── main ────────────────────────────────────────────────────────────────────

def main():
    ap = argparse.ArgumentParser(description='Rebuild the ed section of dashboard/data.json.')
    src = ap.add_mutually_exclusive_group()
    src.add_argument('--ref', default='main',
                     help='commit or branch of %s to read outputs from (default: main)' % REPO)
    src.add_argument('--outputs', help='read a local outputs/ directory instead of fetching')
    ap.add_argument('--check', action='store_true',
                    help='report drift and exit 1 if the section is stale; write nothing')
    a = ap.parse_args()

    files = local(a.outputs) if a.outputs else fetch(a.ref)
    where = a.outputs or '%s@%s' % (REPO, a.ref)

    data = json.loads(io.open(DATA, 'rb').read())
    fresh = build(files)
    changes = diff(data['ed'], fresh)

    if not changes:
        print('ed section is current with %s' % where)
        return 0

    print('%d value(s) in the ed section differ from %s:' % (len(changes), where))
    for p, x, y in changes[:40]:
        print('  %-46s %s -> %s' % (p, x, y))
    if len(changes) > 40:
        print('  ... and %d more' % (len(changes) - 40))

    if a.check:
        print('\nStale. Run without --check to rewrite it.')
        return 1

    data['ed'] = fresh
    io.open(DATA, 'wb').write(json.dumps(data, separators=(',', ':'), ensure_ascii=True).encode('utf-8'))
    print('\nRewrote the ed section of dashboard/data.json. The other four sections are untouched.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
