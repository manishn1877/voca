#!/usr/bin/env python3
"""Optional helper for using VoiceStudio from a website (e.g. GitHub Pages).

Websites can only talk to a local program if that program sends CORS headers.
This tiny bridge listens on http://localhost:3901 and forwards everything to
VoiceStudio (default http://localhost:3900), adding the headers browsers need.

Usage:   python3 voicestudio-bridge.py            (Windows: python voicestudio-bridge.py)
Then in Voca: Settings > Voice > VoiceStudio, address = http://localhost:3901
Only standard-library Python is used. Stop with Ctrl+C.
"""
import sys, urllib.request, urllib.error
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

TARGET = (sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:3900').rstrip('/')
PORT = int(sys.argv[2]) if len(sys.argv) > 2 else 3901
CORS = {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Private-Network': 'true', 'Access-Control-Max-Age': '600'}

class H(BaseHTTPRequestHandler):
    def _send(self, code, body=b'', ctype='text/plain'):
        self.send_response(code)
        for k, v in CORS.items(): self.send_header(k, v)
        self.send_header('Content-Type', ctype); self.send_header('Content-Length', str(len(body)))
        self.end_headers(); self.wfile.write(body)
    def do_OPTIONS(self): self._send(204)
    def _proxy(self):
        n = int(self.headers.get('Content-Length') or 0); data = self.rfile.read(n) if n else None
        req = urllib.request.Request(TARGET + self.path, data=data, method=self.command)
        for k in ('Content-Type', 'Authorization'):
            if self.headers.get(k): req.add_header(k, self.headers[k])
        try:
            with urllib.request.urlopen(req, timeout=120) as r: self._send(r.status, r.read(), r.headers.get('Content-Type', 'application/octet-stream'))
        except urllib.error.HTTPError as e: self._send(e.code, e.read(), e.headers.get('Content-Type', 'text/plain'))
        except Exception as e: self._send(502, ('VoiceStudio is not reachable at %s: %s' % (TARGET, e)).encode())
    do_GET = do_POST = _proxy
    def log_message(self, *a): pass

print('Bridge running on http://localhost:%d  ->  %s   (Ctrl+C to stop)' % (PORT, TARGET))
ThreadingHTTPServer(('127.0.0.1', PORT), H).serve_forever()
