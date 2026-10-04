#!/usr/bin/env python3
"""Static server for verification work (not part of the site).

  python3 tools/serve.py [--dir DIR] [--port 8080] [--save-dir DIR]

* Serves DIR (default: the repo root) with no-cache headers, so edits show immediately.
* Works from any cwd (does not call os.getcwd(), which some sandboxes forbid).
* With --save-dir, `POST /__save/<name>.json` writes the request body to <save-dir>/<name>.json.
  This is how tools/smoke.js and tools/style-snapshot.js hand their results back to disk.
"""
import argparse, functools, http.server, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class Handler(http.server.SimpleHTTPRequestHandler):
    save_dir = None

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()

    def log_message(self, *a):
        pass

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.end_headers()

    def do_POST(self):
        m = re.fullmatch(r'/__save/([\w.-]+\.json)', self.path)
        if not (m and self.save_dir):
            self.send_error(404)
            return
        body = self.rfile.read(int(self.headers.get('Content-Length', 0)))
        with open(os.path.join(self.save_dir, m.group(1)), 'wb') as f:
            f.write(body)
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b'saved')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dir', default=ROOT)
    ap.add_argument('--port', type=int, default=8080)
    ap.add_argument('--save-dir')
    a = ap.parse_args()
    Handler.save_dir = os.path.abspath(a.save_dir) if a.save_dir else None
    if Handler.save_dir:
        os.makedirs(Handler.save_dir, exist_ok=True)
    handler = functools.partial(Handler, directory=os.path.abspath(a.dir))
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', a.port), handler)
    print(f'serving {os.path.abspath(a.dir)} on http://localhost:{a.port}', file=sys.stderr)
    srv.serve_forever()


if __name__ == '__main__':
    main()
