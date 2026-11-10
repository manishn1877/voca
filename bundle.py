#!/usr/bin/env python3
"""Bundles public/ into ONE self-contained file: dist/index.html  (upload just this file to GitHub Pages)"""
import re, base64, json, pathlib
r = pathlib.Path(__file__).parent / 'public'
h = (r/'index.html').read_text()
b64 = lambda p: base64.b64encode((r/p).read_bytes()).decode()
svg = 'data:image/svg+xml;base64,' + b64('icon.svg')
man = json.loads((r/'manifest.json').read_text())
man['icons'] = [{'src': svg, 'sizes': 'any', 'type': 'image/svg+xml', 'purpose': 'any maskable'}]
mdata = 'data:application/manifest+json;base64,' + base64.b64encode(json.dumps(man).encode()).decode()
h = h.replace('href="manifest.json"', f'href="{mdata}"')
h = re.sub(r'<link rel="icon" href="icon.svg"><link rel="icon" type="image/png"[^>]*><link rel="apple-touch-icon" href="icon-180.png">',
  f'<link rel="icon" href="{svg}"><link rel="apple-touch-icon" href="data:image/png;base64,{b64("icon-180.png")}">', h)
h = h.replace('<link rel="stylesheet" href="style.css">\n<link rel="stylesheet" href="site.css">', '<style>\n' + (r/'style.css').read_text() + '\n' + (r/'site.css').read_text() + '\n</style>')
def inl(m):
    src = (r/m.group(1)).read_text(); assert '</script' not in src.lower(), m.group(1)
    return '<script>\n' + src + '\n</script>'
h = re.sub(r'<script src="([^"]+)"></script>', inl, h)
h = h.replace("manifest-src 'self'", "manifest-src data:").replace("img-src 'self' data: blob:", "img-src 'self' data: blob:")
h = h.replace("fetch('sw.js', { method: 'HEAD' }).then((r) => r.ok && navigator.serviceWorker.register('sw.js')).catch(() => {});", '')
d = pathlib.Path(__file__).parent / 'dist'; d.mkdir(exist_ok=True)
(d/'index.html').write_text(h); (d/'.nojekyll').write_text('')
print('dist/index.html', len(h)//1024, 'KB')
