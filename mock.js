// Demo data in the same shape as the Tjek API, used when TILBUD_MOCK=1.
// Lets the app run without network access (development / offline demo).
import { normOffer, normCatalog, normStore } from './lib.js';

const DEALERS = [
  { id: 'd-netto', name: 'Netto', color: 'ffd400' },
  { id: 'd-fotex', name: 'føtex', color: '00205b' },
  { id: 'd-bilka', name: 'Bilka', color: '0071ce' },
  { id: 'd-lidl', name: 'Lidl', color: '0050aa' },
  { id: 'd-rema', name: 'REMA 1000', color: '002f6c' },
  { id: 'd-coop365', name: 'Coop 365discount', color: 'e2001a' },
  { id: 'd-meny', name: 'MENY', color: 'c8102e' },
  { id: 'd-superbrugsen', name: 'SuperBrugsen', color: 'd6001c' },
];

// heading, unit symbol, size, SI factor, si symbol, base price
const PRODUCTS = [
  ['Arla Letmælk', 'l', 1, 1, 'l', 12.95],
  ['Lurpak Smør', 'g', 200, 0.001, 'kg', 24.95],
  ['Gevalia Kaffe', 'g', 400, 0.001, 'kg', 49.95],
  ['Merrild Kaffe', 'g', 500, 0.001, 'kg', 54.95],
  ['Hakket oksekød 8-12%', 'g', 500, 0.001, 'kg', 45],
  ['Kyllingebryst', 'g', 900, 0.001, 'kg', 79],
  ['Æg fra fritgående høns', 'pcs', 10, 1, 'pcs', 32],
  ['Rugbrød', 'g', 1000, 0.001, 'kg', 22],
  ['Bananer', 'kg', 1, 1, 'kg', 18],
  ['Æbler Pink Lady', 'kg', 1, 1, 'kg', 25],
  ['Coca-Cola', 'l', 1.5, 1, 'l', 20],
  ['Pasta Barilla', 'g', 500, 0.001, 'kg', 15],
  ['Hvidvin Chardonnay', 'cl', 75, 0.01, 'l', 69],
  ['Tuborg Grøn 24-pak', 'cl', 33, 0.01, 'l', 149],
  ['Toiletpapir 8 ruller', 'pcs', 8, 1, 'pcs', 39],
  ['Laks fileter', 'g', 250, 0.001, 'kg', 49],
  ['Danbo ost 45+', 'g', 450, 0.001, 'kg', 39.95],
  ['Skyr naturel', 'g', 1000, 0.001, 'kg', 24],
];

const BASE_LAT = 55.6761;
const BASE_LNG = 12.5683;

function rand(seed) {
  let s = 0;
  for (const ch of seed) s = (s * 31 + ch.charCodeAt(0)) >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

function week() {
  const now = new Date();
  const from = new Date(now);
  from.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const till = new Date(from);
  till.setDate(from.getDate() + 6);
  return { run_from: from.toISOString(), run_till: till.toISOString() };
}

const img = (text, color) => `/mock-img/${encodeURIComponent(`${color}|${text}`)}`;

function buildOffers() {
  const offers = [];
  const w = week();
  for (const d of DEALERS) {
    const r = rand(d.id);
    PRODUCTS.forEach(([heading, unit, size, factor, si, base], i) => {
      if (r() < 0.35) return;
      const price = Math.round(base * (0.6 + r() * 0.5) * 4) / 4 - 0.05;
      const pre = r() < 0.6 ? Math.round(base * 1.15) : null;
      offers.push({
        id: `${d.id}-${i}`,
        heading,
        description: r() < 0.5 ? 'Max 2 stk. pr. kunde' : 'Flere varianter',
        pricing: { price: Math.max(price, 4.95), pre_price: pre, currency: 'DKK' },
        quantity: {
          unit: { symbol: unit, si: { symbol: si, factor } },
          size: { from: size, to: size },
          pieces: { from: heading.includes('24-pak') ? 24 : 1, to: heading.includes('24-pak') ? 24 : 1 },
        },
        images: { thumb: img(heading, d.color), view: img(heading, d.color), zoom: img(heading, d.color) },
        dealer_id: d.id,
        catalog_id: `c-${d.id}`,
        catalog_page: 1 + (i % 8),
        branding: { name: d.name, color: d.color, logo: null },
        popularity: r(),
        ...w,
      });
    });
  }
  return offers;
}

const OFFERS = buildOffers();

export const mockApi = {
  async geocode(q) {
    const text = (q.get('q') || '').trim();
    if (!text) return [];
    return [
      { label: `${text}, 1550 København V, Danmark`, lat: BASE_LAT, lng: BASE_LNG },
      { label: `${text}, 8000 Aarhus C, Danmark`, lat: 56.1572, lng: 10.2107 },
    ];
  },
  async reverse(q) {
    return { label: `Demo address (${Number(q.get('lat')).toFixed(4)}, ${Number(q.get('lng')).toFixed(4)})` };
  },
  async search(q) {
    const words = (q.get('q') || '').toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    return OFFERS.filter((o) => words.every((w) => `${o.heading} ${o.description}`.toLowerCase().includes(w))).map(normOffer);
  },
  async offers(q) {
    const ids = q.get('dealer_ids')?.split(',');
    const offset = Number(q.get('offset')) || 0;
    const limit = Number(q.get('limit')) || 48;
    return OFFERS.filter((o) => !ids || ids.includes(o.dealer_id))
      .sort((a, b) => b.popularity - a.popularity)
      .slice(offset, offset + limit)
      .map(normOffer);
  },
  async catalogs() {
    const w = week();
    return DEALERS.map((d) => normCatalog({
      id: `c-${d.id}`,
      label: `${d.name} tilbudsavis uge ${Math.ceil(new Date().getDate() / 7)}`,
      page_count: 8,
      offer_count: OFFERS.filter((o) => o.dealer_id === d.id).length,
      dealer_id: d.id,
      images: { thumb: img(`${d.name} avis`, d.color), view: img(`${d.name} avis`, d.color) },
      branding: { name: d.name, color: d.color },
      ...w,
    }));
  },
  async pages(id) {
    const d = DEALERS.find((x) => `c-${x.id}` === id) || DEALERS[0];
    return Array.from({ length: 8 }, (_, i) => {
      const u = img(`${d.name} – side ${i + 1}`, d.color);
      return { thumb: u, view: u, zoom: u };
    });
  },
  async stores(q) {
    const lat = Number(q.get('lat')) || BASE_LAT;
    const lng = Number(q.get('lng')) || BASE_LNG;
    return DEALERS.map((d, i) => normStore({
      id: `s-${d.id}`,
      dealer_id: d.id,
      street: `Demovej ${i + 3}`,
      city: 'København',
      zip_code: '1550',
      latitude: lat + 0.002 * (i + 1),
      longitude: lng + 0.003 * ((i % 3) - 1),
      branding: { name: d.name, color: d.color },
    }));
  },
  image(spec) {
    const [color, ...rest] = spec.split('|');
    const text = rest.join('|').replace(/[<>&"]/g, '');
    return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
<rect width="400" height="300" fill="#${/^[0-9a-f]{6}$/i.test(color) ? color : '888888'}"/>
<text x="200" y="160" font-family="sans-serif" font-size="24" fill="#fff" text-anchor="middle" stroke="#000" stroke-width="0.5">${text}</text></svg>`;
  },
};
