// Environment-agnostic core: Tjek API client + data normalisation.
// Runs both in the browser (static GitHub Pages build) and in Node (server.js, scripts/collect.js).
// Tjek (squid-api.tjek.com) is the public API behind etilbudsavis.dk.

export const DEFAULT_TJEK_BASE = 'https://squid-api.tjek.com/v2';

// ---------- tiny TTL cache ----------
function memo({ ttlMs = 10 * 60 * 1000, max = 500 } = {}) {
  const cache = new Map();
  return async (key, fn) => {
    const hit = cache.get(key);
    if (hit && hit.expires > Date.now()) return hit.value;
    const value = await fn();
    if (cache.size >= max) cache.delete(cache.keys().next().value);
    cache.set(key, { value, expires: Date.now() + ttlMs });
    return value;
  };
}

// ---------- normalisation ----------
const hex = (c) => (c ? (String(c).startsWith('#') ? c : `#${c}`) : null);

function branding(o) {
  const b = o.branding || o.dealer?.branding || {};
  return {
    name: b.name || o.dealer?.name || 'Unknown',
    color: hex(b.color || o.dealer?.color) || '#555555',
    logo: b.logo || o.dealer?.logo || null,
  };
}

// Price per kg / litre / piece, using the SI factor Tjek provides (g -> kg = 0.001).
export function unitPrice(price, quantity) {
  if (price == null || !quantity) return null;
  const si = quantity.unit?.si;
  const size = quantity.size?.from;
  if (!si?.factor || !size) return null;
  const pieces = quantity.pieces?.from || 1;
  const symbol = si.symbol;
  const amount = symbol === 'pcs' ? size : size * si.factor * pieces;
  if (!amount) return null;
  return { value: price / amount, per: symbol === 'pcs' ? 'pc' : symbol };
}

function quantityLabel(q) {
  if (!q) return '';
  const parts = [];
  const pieces = q.pieces;
  if (pieces?.from > 1) {
    parts.push(pieces.to && pieces.to !== pieces.from ? `${pieces.from}-${pieces.to} pcs` : `${pieces.from} pcs`);
  }
  const size = q.size;
  const sym = q.unit?.symbol;
  if (size?.from && sym && sym !== 'pcs') {
    const s = size.to && size.to !== size.from ? `${size.from}-${size.to}` : `${size.from}`;
    parts.push(`${s} ${sym}`);
  }
  return parts.join(' × ');
}

export function normOffer(o) {
  const price = o.pricing?.price ?? null;
  const prePrice = o.pricing?.pre_price ?? null;
  return {
    id: o.id,
    heading: o.heading || '',
    description: o.description || '',
    price,
    prePrice,
    currency: o.pricing?.currency || 'DKK',
    savings: price != null && prePrice ? Math.max(0, prePrice - price) : null,
    quantity: quantityLabel(o.quantity),
    unitPrice: unitPrice(price, o.quantity),
    image: o.images?.zoom || o.images?.view || o.images?.thumb || null,
    thumb: o.images?.thumb || o.images?.view || null,
    runFrom: o.run_from || null,
    runTill: o.run_till || null,
    dealerId: o.dealer_id || o.dealer?.id || null,
    catalogId: o.catalog_id || null,
    catalogPage: o.catalog_page ?? null,
    dealer: branding(o),
  };
}

export function normCatalog(c) {
  return {
    id: c.id,
    label: c.label || c.name || '',
    runFrom: c.run_from || null,
    runTill: c.run_till || null,
    pageCount: c.page_count || 0,
    offerCount: c.offer_count || 0,
    dealerId: c.dealer_id || null,
    storeId: c.store_id || null,
    cover: c.images?.view || c.images?.thumb || null,
    dealer: branding(c),
  };
}

export function normStore(s) {
  return {
    id: s.id,
    dealerId: s.dealer_id,
    street: s.street || '',
    city: s.city || '',
    zip: s.zip_code || '',
    lat: s.latitude,
    lng: s.longitude,
    dealer: branding(s),
  };
}

// ---------- API ----------
function geo(q) {
  const lat = Number(q.get('lat'));
  const lng = Number(q.get('lng'));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    const err = new Error('lat and lng are required');
    err.status = 400;
    throw err;
  }
  const radius = Math.min(Math.max(Number(q.get('radius')) || 5000, 500), 50000);
  return { r_lat: lat, r_lng: lng, r_radius: radius };
}

const clampLimit = (v, d = 48) => Math.min(Math.max(Number(v) || d, 1), 100);

// Every method takes URLSearchParams (the same shape as the server's /api/* query strings).
export function createApi({ fetchJson, tjekBase = DEFAULT_TJEK_BASE, apiKey = '' }) {
  const cached = memo();

  function tjek(path, params) {
    const url = new URL(tjekBase + path);
    for (const [k, v] of Object.entries(params || {})) {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
    }
    // Only send the key header when configured: a custom header forces a CORS preflight in browsers.
    const headers = apiKey ? { 'X-Api-Key': apiKey } : {};
    return cached(url.toString(), () => fetchJson(url, headers));
  }

  return {
    async geocode(q) {
      const text = (q.get('q') || '').trim();
      if (!text) return [];
      const url = new URL('https://nominatim.openstreetmap.org/search');
      url.search = new URLSearchParams({ q: text, format: 'jsonv2', countrycodes: 'dk', limit: '6', addressdetails: '0', 'accept-language': 'da' });
      const rows = await cached(url.toString(), () => fetchJson(url));
      return rows.map((r) => ({ label: r.display_name, lat: Number(r.lat), lng: Number(r.lon) }));
    },

    async reverse(q) {
      const url = new URL('https://nominatim.openstreetmap.org/reverse');
      url.search = new URLSearchParams({ lat: q.get('lat'), lon: q.get('lng'), format: 'jsonv2', zoom: '17', 'accept-language': 'da' });
      const r = await cached(url.toString(), () => fetchJson(url));
      return { label: r.display_name || `${q.get('lat')}, ${q.get('lng')}` };
    },

    async search(q) {
      const query = (q.get('q') || '').trim();
      if (!query) return [];
      const rows = await tjek('/offers/search', {
        query,
        ...geo(q),
        limit: clampLimit(q.get('limit'), 100),
        offset: Number(q.get('offset')) || 0,
      });
      return rows.map(normOffer);
    },

    async offers(q) {
      const rows = await tjek('/offers', {
        ...geo(q),
        dealer_ids: q.get('dealer_ids') || undefined,
        catalog_ids: q.get('catalog_ids') || undefined,
        order_by: q.get('order_by') || '-popularity',
        limit: clampLimit(q.get('limit')),
        offset: Number(q.get('offset')) || 0,
      });
      return rows.map(normOffer);
    },

    async catalogs(q) {
      const rows = await tjek('/catalogs', { ...geo(q), order_by: 'distance', limit: 100 });
      return rows.map(normCatalog);
    },

    async pages(id) {
      const rows = await tjek(`/catalogs/${encodeURIComponent(id)}/pages`);
      return rows.map((p) => ({ thumb: p.thumb, view: p.view, zoom: p.zoom || p.view }));
    },

    async stores(q) {
      const rows = await tjek('/stores', { ...geo(q), order_by: 'distance', limit: 100 });
      return rows.map(normStore);
    },
  };
}
