// Tilbud Radar – small zero-dependency server.
// Proxies the public Tjek API (the data source behind etilbudsavis.dk),
// geocodes addresses via OpenStreetMap Nominatim and serves the web app.
//
//   node server.js                 -> live data
//   TILBUD_MOCK=1 node server.js   -> generated demo data (no network needed)

import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mockApi } from './mock.js';
import { liveApi } from './lib.js';

const PORT = Number(process.env.PORT) || 3000;
const MOCK = process.env.TILBUD_MOCK === '1';
const PUBLIC_DIR = join(fileURLToPath(new URL('.', import.meta.url)), 'public');

const api = MOCK ? mockApi : liveApi;

// ---------- HTTP ----------
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

function send(res, status, body, type = 'application/json; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}

async function route(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const q = url.searchParams;
  const p = url.pathname;

  if (p.startsWith('/api/')) {
    let data;
    const pages = p.match(/^\/api\/catalogs\/([\w-]+)\/pages$/);
    if (p === '/api/health') data = { ok: true, mock: MOCK };
    else if (p === '/api/geocode') data = await api.geocode(q);
    else if (p === '/api/reverse') data = await api.reverse(q);
    else if (p === '/api/search') data = await api.search(q);
    else if (p === '/api/offers') data = await api.offers(q);
    else if (p === '/api/catalogs') data = await api.catalogs(q);
    else if (pages) data = await api.pages(pages[1]);
    else if (p === '/api/stores') data = await api.stores(q);
    else return send(res, 404, { error: 'Not found' });
    return send(res, 200, data);
  }

  if (p.startsWith('/mock-img/') && MOCK) {
    return send(res, 200, mockApi.image(decodeURIComponent(p.slice(10))), MIME['.svg']);
  }

  const file = normalize(join(PUBLIC_DIR, p === '/' ? 'index.html' : p));
  if (!file.startsWith(PUBLIC_DIR)) return send(res, 403, 'Forbidden', 'text/plain');
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    send(res, 404, 'Not found', 'text/plain');
  }
}

http
  .createServer((req, res) => {
    route(req, res).catch((err) => {
      console.error(err.message);
      send(res, err.status || 500, { error: err.message });
    });
  })
  .listen(PORT, () => {
    console.log(`Tilbud Radar on http://localhost:${PORT}${MOCK ? '  (MOCK data)' : ''}`);
  });
