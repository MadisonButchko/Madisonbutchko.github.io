#!/usr/bin/env python3
"""Capture a verification baseline (or a "current" run to compare against it) with headless Chrome.

  python3 tools/serve.py --dir <site dir> --port 8097          # in another terminal (or: any static server)
  python3 tools/capture.py --url http://localhost:8097/index.html --out tools/baseline [--only desktop,phone]

For each profile it opens a FRESH browser profile (empty storage, like a first visit), applies the viewport / touch /
reduced-motion emulation, loads the page with the debug hooks (?gardendebug&worlddebug&v11debug) and records:
  console.<profile>.json       every console message, exception and browser log entry raised during load + the run
  styles.<profile>.json        tools/style-snapshot.js (stable structural computed styles)      [not for reduced-motion]
  screenshots/<profile>/*.jpg  one viewport screenshot per section after scrolling to it       [not for reduced-motion]
  fingerprint.<profile>.json   tools/smoke.js (scroll, gallery, Experience/Skills, debug hooks, DOM-node leak check)
Compare a later run with the baseline using tools/compare_json.py.

Needs: Google Chrome, Python 3, the `websocket-client` package. Headless Chrome is *visible* to the page
(document.hidden === false), which the in-app browser pane is not, so IntersectionObservers, rAF and the heartbeat run.
Randomised decorations (petals, birds, blooms) differ between runs: compare counts with tolerance, screenshots by eye.
"""
import argparse, json, os, shutil, subprocess, sys, tempfile, time, urllib.request

import websocket  # pip install websocket-client

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
DEBUG_QS = '?gardendebug&worlddebug&v11debug'
SECTIONS = ['#home', '#about', '#experience', '#skills', '#gallery', '#contact', 'footer']

PROFILES = {
    'desktop':    dict(width=1440, height=900,  mobile=False, rm=False, dpr=1, styles=True,  shots=True,  smoke=True),
    'desktop-rm': dict(width=1440, height=900,  mobile=False, rm=True,  dpr=1, styles=False, shots=False, smoke=True),
    'laptop':     dict(width=1024, height=768,  mobile=False, rm=False, dpr=1, styles=True,  shots=True,  smoke=False),
    'tablet':     dict(width=768,  height=1024, mobile=False, rm=False, dpr=1, styles=True,  shots=True,  smoke=False),
    'phone':      dict(width=390,  height=844,  mobile=True,  rm=False, dpr=2, styles=True,  shots=True,  smoke=True),
}


class CDP:
    def __init__(self, ws_url):
        self.ws = websocket.create_connection(ws_url, timeout=600, suppress_origin=True)
        self.n = 0
        self.events = []

    def call(self, method, **params):
        self.n += 1
        mid = self.n
        self.ws.send(json.dumps({'id': mid, 'method': method, 'params': params}))
        while True:
            msg = json.loads(self.ws.recv())
            if msg.get('id') == mid:
                if 'error' in msg:
                    raise RuntimeError(f'{method}: {msg["error"]}')
                return msg.get('result', {})
            if 'method' in msg:
                self.events.append(msg)

    def pump(self, seconds):
        end = time.time() + seconds
        self.ws.settimeout(0.25)
        try:
            while time.time() < end:
                try:
                    msg = json.loads(self.ws.recv())
                    if 'method' in msg:
                        self.events.append(msg)
                except websocket.WebSocketTimeoutException:
                    pass
        finally:
            self.ws.settimeout(600)

    def eval(self, expr, await_promise=True):
        r = self.call('Runtime.evaluate', expression=expr, awaitPromise=await_promise, returnByValue=True)
        if 'exceptionDetails' in r:
            raise RuntimeError('page script failed: ' + json.dumps(r['exceptionDetails'])[:400])
        return r['result'].get('value')


def console_report(events):
    out = []
    for e in events:
        m, p = e['method'], e.get('params', {})
        if m == 'Runtime.consoleAPICalled':
            text = ' '.join(str(a.get('value', a.get('description', ''))) for a in p.get('args', []))
            out.append({'kind': 'console.' + p['type'], 'text': text[:300]})
        elif m == 'Runtime.exceptionThrown':
            d = p['exceptionDetails']
            out.append({'kind': 'exception', 'text': (d.get('exception', {}).get('description') or d.get('text', ''))[:300], 'line': d.get('lineNumber')})
        elif m == 'Log.entryAdded':
            en = p['entry']
            out.append({'kind': 'log.' + en['level'], 'text': en.get('text', '')[:200], 'url': en.get('url', '')[-80:]})
    return out


def run_profile(name, cfg, url, outdir, port):
    prof = tempfile.mkdtemp(prefix='cap-profile-')
    proc = subprocess.Popen([CHROME, '--headless=new', f'--remote-debugging-port={port}', '--remote-allow-origins=*',
                             f'--user-data-dir={prof}', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
                             '--mute-audio', '--hide-scrollbars', 'about:blank'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        ws_url = None
        for _ in range(60):
            try:
                tabs = json.load(urllib.request.urlopen(f'http://127.0.0.1:{port}/json'))
                ws_url = next(t['webSocketDebuggerUrl'] for t in tabs if t['type'] == 'page')
                break
            except Exception:
                time.sleep(0.25)
        if not ws_url:
            raise RuntimeError('Chrome did not start')
        c = CDP(ws_url)
        for d in ('Page', 'Runtime', 'Log'):
            c.call(d + '.enable')
        c.call('Emulation.setDeviceMetricsOverride', width=cfg['width'], height=cfg['height'], deviceScaleFactor=cfg['dpr'], mobile=cfg['mobile'])
        if cfg['mobile']:
            c.call('Emulation.setTouchEmulationEnabled', enabled=True, maxTouchPoints=5)
        if cfg['rm']:
            c.call('Emulation.setEmulatedMedia', features=[{'name': 'prefers-reduced-motion', 'value': 'reduce'}])

        c.call('Page.navigate', url=url + DEBUG_QS)
        c.pump(10)                                          # load + intro animations settle (auto margins resolve a few seconds after load)
        env = c.eval('({w: innerWidth, h: innerHeight, hidden: document.hidden, fine: matchMedia("(hover: hover) and (pointer: fine)").matches,'
                     ' touch: navigator.maxTouchPoints, rm: matchMedia("(prefers-reduced-motion: reduce)").matches, docH: document.documentElement.scrollHeight})',
                     await_promise=False)
        print(f'[{name}] env {env}')
        load_events = list(c.events)

        os.makedirs(outdir, exist_ok=True)
        if cfg['styles']:
            res = c.eval(open(os.path.join(ROOT, 'tools/style-snapshot.js')).read())
            json.dump(res, open(os.path.join(outdir, f'styles.{name}.json'), 'w'), indent=1)
            print(f'[{name}] styles: {len(res["styles"])} selectors')
        if cfg['shots']:
            import base64
            sd = os.path.join(outdir, 'screenshots', name)
            os.makedirs(sd, exist_ok=True)
            for sel in SECTIONS:
                c.eval(f'(() => {{ const e = document.querySelector("{sel}"); if (e) scrollTo(0, e.getBoundingClientRect().top + scrollY); }})()', await_promise=False)
                c.pump(2.2)
                shot = c.call('Page.captureScreenshot', format='jpeg', quality=60)
                open(os.path.join(sd, sel.strip('#') + '.jpg'), 'wb').write(base64.b64decode(shot['data']))
            c.eval('scrollTo(0, 0)', await_promise=False)
            c.pump(1.5)
            print(f'[{name}] screenshots: {len(SECTIONS)}')
        if cfg['smoke']:
            res = c.eval(open(os.path.join(ROOT, 'tools/smoke.js')).read())
            json.dump(res, open(os.path.join(outdir, f'fingerprint.{name}.json'), 'w'), indent=1)
            print(f'[{name}] smoke: errors during run {len(res["errorsDuringRun"])}, dom drift {res["domNodes"]["idleDrift"]}')
        c.pump(0.5)
        rep = {'env': env, 'duringLoad': console_report(load_events), 'duringRun': console_report(c.events[len(load_events):])}
        json.dump(rep, open(os.path.join(outdir, f'console.{name}.json'), 'w'), indent=1)
        bad = [m for m in rep['duringLoad'] + rep['duringRun'] if m['kind'] in ('exception', 'console.error', 'console.warning', 'log.error', 'log.warning')]
        print(f'[{name}] console: {len(bad)} error/warning entries')
        for m in bad[:10]:
            print('    ', m)
    finally:
        proc.terminate()
        try:
            proc.wait(5)
        except Exception:
            proc.kill()
        shutil.rmtree(prof, ignore_errors=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--url', required=True, help='page URL without query string, e.g. http://localhost:8097/index.html')
    ap.add_argument('--out', default=os.path.join(ROOT, 'tools/baseline'))
    ap.add_argument('--only', default='', help='comma list of: ' + ','.join(PROFILES))
    a = ap.parse_args()
    names = [n for n in (a.only.split(',') if a.only else PROFILES) if n]
    for i, n in enumerate(names):
        run_profile(n, PROFILES[n], a.url, a.out, 9340 + i)


if __name__ == '__main__':
    main()
