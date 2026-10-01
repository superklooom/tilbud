// Tilbud Radar – frontend (vanilla JS, no build step).
// Works as a static site (GitHub Pages) by calling the Tjek API directly from the browser,
// or through server.js's /api proxy when that is available.
import { createApi } from './core.js';

const $ = (sel) => document.querySelector(sel);
const LS_LOC = 'tilbud.location';
const LS_LIST = 'tilbud.list';

// English label -> Danish search term. Catalogs are in Danish, so English searches are translated.
const PRODUCTS = [
  ['☕ Coffee', 'kaffe'], ['🥛 Milk', 'mælk'], ['🧈 Butter', 'smør'], ['🥚 Eggs', 'æg'],
  ['🍗 Chicken', 'kylling'], ['🥩 Minced beef', 'hakket oksekød'], ['🧀 Cheese', 'ost'], ['🍞 Bread', 'brød'],
  ['🍌 Bananas', 'bananer'], ['🍎 Apples', 'æbler'], ['🐟 Salmon', 'laks'], ['🍝 Pasta', 'pasta'],
  ['🍺 Beer', 'øl'], ['🍷 Wine', 'vin'], ['🥤 Cola', 'cola'], ['🧻 Toilet paper', 'toiletpapir'],
  ['🥣 Yoghurt', 'yoghurt'], ['🍚 Rice', 'ris'], ['🥔 Potatoes', 'kartofler'], ['🍅 Tomatoes', 'tomater'],
];
const EN_TO_DA = Object.fromEntries(PRODUCTS.map(([en, da]) => [en.replace(/^\S+\s/, '').toLowerCase(), da]));
Object.assign(EN_TO_DA, {
  'chicken breast': 'kyllingebryst', beef: 'oksekød', pork: 'svinekød', oil: 'olie', 'olive oil': 'olivenolie',
  sugar: 'sukker', flour: 'mel', water: 'vand', diapers: 'bleer', nappies: 'bleer', chocolate: 'chokolade',
  egg: 'æg', apple: 'æbler', banana: 'bananer', potato: 'kartofler', tomato: 'tomater', ham: 'skinke',
  sausages: 'pølser', fish: 'fisk', juice: 'juice', tea: 'te', cereal: 'morgenmad', oats: 'havregryn',
  'washing powder': 'vaskemiddel', detergent: 'vaskemiddel', onions: 'løg', carrots: 'gulerødder',
  cucumber: 'agurk', strawberries: 'jordbær', 'ice cream': 'is', soda: 'sodavand', crisps: 'chips',
});

const state = {
  loc: null, // { lat, lng, label, radius }
  catalogs: [],
  stores: [],
  compare: { query: '', results: [], dealers: new Set() },
  deals: { items: [], offset: 0, done: false, loading: false, dealers: new Set(), loaded: false },
  list: loadJson(LS_LIST, []),
  activeTab: 'compare',
};

// ---------- utils ----------
function loadJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
function saveJson(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode */ }
}
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const kr = new Intl.NumberFormat('da-DK', { style: 'currency', currency: 'DKK' });
const money = (v) => (v == null ? '' : kr.format(v));
const shortDate = (iso) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '');
const dateRange = (from, till) => `${shortDate(from)} – ${shortDate(till)}`;
const UNIT_LABEL = { kg: 'kg', l: 'L', pc: 'pc' };

function toast(msg, ms = 3500) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { t.hidden = true; }, ms);
}

// ---------- data source ----------
// With server.js running we use its /api proxy (server-side cache, no CORS concerns).
// On a static host (GitHub Pages) there is no /api, so the browser calls the public APIs directly.
async function browserFetchJson(url, headers = {}) {
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${new URL(url).host}`);
  return res.json();
}

const backend = (async () => {
  try {
    const res = await fetch('api/health', { signal: AbortSignal.timeout(3000) });
    if (res.ok && (await res.json()).ok) return null;
  } catch { /* static hosting */ }
  return createApi({ fetchJson: browserFetchJson });
})();

const DIRECT_ROUTES = {
  '/api/geocode': 'geocode', '/api/reverse': 'reverse', '/api/search': 'search',
  '/api/offers': 'offers', '/api/catalogs': 'catalogs', '/api/stores': 'stores',
};

async function api(path, params = {}) {
  const query = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') query.set(k, v);
  const direct = await backend;
  if (direct) {
    const pages = path.match(/^\/api\/catalogs\/(.+)\/pages$/);
    if (pages) return direct.pages(decodeURIComponent(pages[1]));
    return direct[DIRECT_ROUTES[path]](query);
  }
  const url = new URL(path.slice(1), location.href);
  url.search = query;
  const res = await fetch(url);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}
const geoParams = () => ({ lat: state.loc.lat, lng: state.loc.lng, radius: state.loc.radius });

function distanceKm(a, b) {
  const R = 6371;
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Accepts "55.67, 12.56", Google/Apple Maps links (…@55.67,12.56… / ?q=55.67,12.56 / ll=…), geo: URIs.
function parseCoords(text) {
  const m = String(text).match(/(-?\d{1,2}\.\d{2,})\s*(?:,|%2C|\s)\s*(-?\d{1,3}\.\d{2,})/i);
  if (!m) return null;
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  return Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null;
}

function placeholder(n = 8) {
  return Array.from({ length: n }, () => '<div class="skeleton"></div>').join('');
}
const needLocation = () => '<div class="empty">📍 Enter an address or tap "My location" to get started</div>';
const errorBox = (e) => `<div class="empty error">Could not load data: ${esc(e.message)}</div>`;

// ---------- sorting helpers ----------
const unitVal = (o) => o.unitPrice?.value ?? Infinity;
const SORTERS = {
  unit: (a, b) => unitVal(a) - unitVal(b) || (a.price ?? Infinity) - (b.price ?? Infinity),
  price: (a, b) => (a.price ?? Infinity) - (b.price ?? Infinity),
  savings: (a, b) => (b.savings ?? 0) - (a.savings ?? 0),
  dealer: (a, b) => a.dealer.name.localeCompare(b.dealer.name, 'da') || SORTERS.unit(a, b),
  popular: () => 0,
};

// ---------- rendering: offers ----------
function offerCard(o, { best = false } = {}) {
  const unit = o.unitPrice ? `${money(o.unitPrice.value)} / ${UNIT_LABEL[o.unitPrice.per] || o.unitPrice.per}` : '';
  const img = o.thumb || o.image;
  return `
  <article class="card${best ? ' is-best' : ''}">
    ${best ? '<span class="card__badge">Best value</span>' : ''}
    <div class="card__img">${img ? `<img loading="lazy" src="${esc(img)}" alt="">` : '🛒'}</div>
    <div class="card__body">
      <div class="card__dealer"><span class="chip__dot" style="background:${esc(o.dealer.color)}"></span>${esc(o.dealer.name)}</div>
      <div class="card__title">${esc(o.heading)}</div>
      ${o.description ? `<div class="card__desc">${esc(o.description.slice(0, 90))}</div>` : ''}
      ${o.quantity ? `<div class="unit" dir="ltr">${esc(o.quantity)}</div>` : ''}
      <div class="card__price">
        <span class="price">${money(o.price)}</span>
        ${o.prePrice ? `<span class="pre">${money(o.prePrice)}</span>` : ''}
      </div>
      ${unit ? `<div class="unit">${unit}</div>` : ''}
      ${o.runTill ? `<div class="dates">Valid ${dateRange(o.runFrom, o.runTill)}</div>` : ''}
      ${o.catalogId ? `<button class="card__link" data-catalog="${esc(o.catalogId)}" data-page="${o.catalogPage ?? 1}" data-title="${esc(o.dealer.name)}">📰 In catalog${o.catalogPage ? ` · p. ${o.catalogPage}` : ''}</button>` : ''}
    </div>
  </article>`;
}

function dealerChips(container, offers, selected, onChange) {
  const counts = new Map();
  for (const o of offers) {
    const key = o.dealer.name;
    const c = counts.get(key) || { n: 0, color: o.dealer.color };
    c.n += 1;
    counts.set(key, c);
  }
  const names = [...counts.keys()].sort((a, b) => a.localeCompare(b, 'da'));
  container.innerHTML = names.length > 1
    ? `<button class="chip${selected.size ? '' : ' is-active'}" data-all="1">All chains</button>` +
      names.map((n) => `<button class="chip${selected.has(n) ? ' is-active' : ''}" data-dealer="${esc(n)}"><span class="chip__dot" style="background:${esc(counts.get(n).color)}"></span>${esc(n)} <small>${counts.get(n).n}</small></button>`).join('')
    : '';
  container.onclick = (e) => {
    const b = e.target.closest('.chip');
    if (!b) return;
    if (b.dataset.all) selected.clear();
    else if (selected.has(b.dataset.dealer)) selected.delete(b.dataset.dealer);
    else selected.add(b.dataset.dealer);
    onChange();
  };
}

// ---------- location ----------
async function setLocation(loc, { silent = false } = {}) {
  state.loc = { radius: Number($('#radiusSelect').value), ...state.loc, ...loc };
  $('#radiusSelect').value = String(state.loc.radius);
  if (state.loc.label) $('#addressInput').value = state.loc.label;
  saveJson(LS_LOC, state.loc);
  updateStatus();

  state.deals = { ...state.deals, items: [], offset: 0, done: false, loaded: false };
  await loadArea();
  if (state.activeTab === 'deals') loadDeals(true);
  if (state.compare.query) runSearch(state.compare.query);
  if (!silent) toast('Location updated ✔');
}

function updateStatus(extra = '') {
  if (!state.loc) {
    $('#locationStatus').textContent = 'No location selected yet';
    return;
  }
  const km = state.loc.radius / 1000;
  $('#locationStatus').textContent = `📍 ${state.loc.label || `${state.loc.lat.toFixed(4)}, ${state.loc.lng.toFixed(4)}`} · within ${km} km ${extra}`;
}

async function loadArea() {
  $('#catalogResults').innerHTML = placeholder(4);
  try {
    const [catalogs, stores] = await Promise.all([api('/api/catalogs', geoParams()), api('/api/stores', geoParams()).catch(() => [])]);
    state.catalogs = catalogs;
    state.stores = stores;
    updateStatus(`· ${catalogs.length} catalog${catalogs.length === 1 ? "" : "s"} nearby`);
    renderCatalogs();
    renderDealsDealerChips();
  } catch (e) {
    $('#catalogResults').innerHTML = errorBox(e);
  }
}

async function resolveAddress(text) {
  const coords = parseCoords(text);
  if (coords) {
    const { label } = await api('/api/reverse', coords).catch(() => ({ label: '' }));
    return setLocation({ ...coords, label: label || `${coords.lat}, ${coords.lng}` });
  }
  const rows = await api('/api/geocode', { q: text });
  if (!rows.length) return toast('No matching address found in Denmark');
  return setLocation(rows[0]);
}

function initLocation() {
  const input = $('#addressInput');
  const list = $('#addressSuggestions');
  let timer;
  let rows = [];

  const hide = () => { clearTimeout(timer); list.hidden = true; };
  input.addEventListener('input', () => {
    clearTimeout(timer);
    const text = input.value.trim();
    if (text.length < 3 || parseCoords(text)) return hide();
    timer = setTimeout(async () => {
      try {
        rows = await api('/api/geocode', { q: text });
        if (input.value.trim() !== text || document.activeElement !== input) return;
        list.innerHTML = rows.map((r, i) => `<li data-i="${i}">${esc(r.label)}</li>`).join('');
        list.hidden = !rows.length;
      } catch { hide(); }
    }, 450);
  });
  list.addEventListener('mousedown', (e) => {
    const li = e.target.closest('li');
    if (!li) return;
    e.preventDefault();
    hide();
    setLocation(rows[Number(li.dataset.i)]);
  });
  input.addEventListener('blur', () => setTimeout(hide, 150));
  $('#locationForm').addEventListener('submit', (e) => {
    e.preventDefault();
    hide();
    input.blur();
    if (input.value.trim()) resolveAddress(input.value.trim()).catch((err) => toast(err.message));
  });
  $('#radiusSelect').addEventListener('change', () => {
    if (state.loc) setLocation({ radius: Number($('#radiusSelect').value) });
  });
  $('#gpsBtn').addEventListener('click', () => {
    if (!navigator.geolocation) return toast('Your browser does not support geolocation');
    toast('Finding your location…');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        const { label } = await api('/api/reverse', coords).catch(() => ({ label: '' }));
        setLocation({ ...coords, label: label || 'My location' });
      },
      (err) => toast(`Could not get your location: ${err.message}`),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  });
}

// ---------- compare ----------
function translateQuery(q, { notify = true } = {}) {
  const da = EN_TO_DA[q.trim().toLowerCase()];
  if (!da) return q;
  if (notify) toast(`Searching for "${da}" (Danish for "${q.trim()}")`);
  return da;
}

async function runSearch(raw) {
  const q = translateQuery(raw);
  state.compare.query = q;
  $('#searchInput').value = q;
  if (!state.loc) {
    $('#compareResults').innerHTML = needLocation();
    return;
  }
  $('#compareResults').innerHTML = placeholder();
  try {
    state.compare.results = await api('/api/search', { q, ...geoParams() });
    state.compare.dealers.clear();
    renderCompare();
  } catch (e) {
    $('#compareResults').innerHTML = errorBox(e);
  }
}

function renderCompare() {
  const { results, dealers } = state.compare;
  dealerChips($('#compareDealerChips'), results, dealers, renderCompare);
  const sortKey = $('#compareSort').value;
  let rows = results.filter((o) => !dealers.size || dealers.has(o.dealer.name)).sort(SORTERS[sortKey]);
  if ($('#cheapestPerChain').checked) {
    const best = new Map();
    for (const o of [...rows].sort(SORTERS.unit)) if (!best.has(o.dealer.name)) best.set(o.dealer.name, o);
    rows = [...best.values()].sort(SORTERS[sortKey]);
  }
  const bestId = [...rows].sort(SORTERS.unit)[0]?.id;
  $('#compareCount').textContent = results.length ? `${rows.length} offers` : '';
  $('#compareResults').innerHTML = rows.length
    ? rows.map((o) => offerCard(o, { best: o.id === bestId && rows.length > 1 })).join('')
    : `<div class="empty">No offers for "${esc(state.compare.query)}" nearby. Try another word (Danish works best) or a bigger radius.</div>`;
}

function initCompare() {
  $('#quickChips').innerHTML = PRODUCTS.map(([he, da]) => `<button class="chip" data-q="${esc(da)}">${esc(he)}</button>`).join('');
  $('#quickChips').addEventListener('click', (e) => {
    const b = e.target.closest('[data-q]');
    if (b) runSearch(b.dataset.q);
  });
  $('#searchForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const q = $('#searchInput').value.trim();
    if (q) runSearch(q);
  });
  $('#compareSort').addEventListener('change', renderCompare);
  $('#cheapestPerChain').addEventListener('change', renderCompare);
  $('#compareResults').innerHTML = '<div class="empty">Search for a product or pick one above to compare prices across chains</div>';
}

// ---------- all deals ----------
function renderDealsDealerChips() {
  // Chips come from the catalogs in the area so every chain is selectable before offers load.
  const fake = state.catalogs.map((c) => ({ dealer: c.dealer, dealerId: c.dealerId }));
  const seen = new Set();
  const unique = fake.filter((o) => !seen.has(o.dealer.name) && seen.add(o.dealer.name));
  dealerChips($('#dealsDealerChips'), unique, state.deals.dealers, () => loadDeals(true));
  $('#dealsDealerChips').querySelectorAll('small').forEach((s) => s.remove());
}

function dealerIdsFor(names) {
  const ids = new Set(state.catalogs.filter((c) => names.has(c.dealer.name)).map((c) => c.dealerId).filter(Boolean));
  return [...ids].join(',');
}

async function loadDeals(reset = false) {
  if (!state.loc) {
    $('#dealsResults').innerHTML = needLocation();
    return;
  }
  const d = state.deals;
  if (d.loading) return;
  if (reset) Object.assign(d, { items: [], offset: 0, done: false });
  d.loading = true;
  d.loaded = true;
  renderDealsDealerChips();
  if (!d.items.length) $('#dealsResults').innerHTML = placeholder();
  $('#dealsMore').disabled = true;
  try {
    const limit = 100;
    const rows = await api('/api/offers', {
      ...geoParams(),
      limit,
      offset: d.offset,
      dealer_ids: d.dealers.size ? dealerIdsFor(d.dealers) : '',
    });
    const seen = new Set(d.items.map((o) => o.id));
    d.items.push(...rows.filter((o) => !seen.has(o.id)));
    d.offset += rows.length;
    d.done = rows.length < limit;
    renderDeals();
  } catch (e) {
    $('#dealsResults').innerHTML = errorBox(e);
  } finally {
    d.loading = false;
    $('#dealsMore').disabled = false;
  }
}

function renderDeals() {
  const d = state.deals;
  const words = $('#dealsFilter').value.toLowerCase().split(/\s+/).filter(Boolean);
  const rows = d.items
    .filter((o) => !d.dealers.size || d.dealers.has(o.dealer.name))
    .filter((o) => words.every((w) => `${o.heading} ${o.description} ${o.dealer.name}`.toLowerCase().includes(w)));
  const sorted = $('#dealsSort').value === 'popular' ? rows : [...rows].sort(SORTERS[$('#dealsSort').value]);
  $('#dealsCount').textContent = `${sorted.length} of ${d.items.length} loaded deals`;
  $('#dealsResults').innerHTML = sorted.length ? sorted.map((o) => offerCard(o)).join('') : '<div class="empty">No deals to show</div>';
  $('#dealsMore').hidden = d.done;
}

function initDeals() {
  $('#dealsFilter').addEventListener('input', renderDeals);
  $('#dealsSort').addEventListener('change', renderDeals);
  $('#dealsMore').addEventListener('click', () => loadDeals());
}

// ---------- catalogs + viewer ----------
function nearestStore(dealerId) {
  const stores = state.stores.filter((s) => s.dealerId === dealerId && s.lat != null);
  if (!stores.length) return null;
  const withDist = stores.map((s) => ({ ...s, km: distanceKm(state.loc, s) })).sort((a, b) => a.km - b.km);
  return withDist[0];
}

function renderCatalogs() {
  if (!state.catalogs.length) {
    $('#catalogResults').innerHTML = '<div class="empty">No catalogs found nearby. Try a bigger radius.</div>';
    return;
  }
  $('#catalogResults').innerHTML = state.catalogs.map((c) => {
    const s = nearestStore(c.dealerId);
    const store = s
      ? `<a class="catalog__store" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${s.lat},${s.lng}" onclick="event.stopPropagation()">📍 ${esc(s.street)}, ${esc(s.city)} · ${s.km.toFixed(1)} km</a>`
      : '';
    return `
    <div class="catalog" role="button" tabindex="0" data-catalog="${esc(c.id)}" data-page="1" data-title="${esc(c.label || c.dealer.name)}">
      ${c.cover ? `<img loading="lazy" src="${esc(c.cover)}" alt="">` : ''}
      <div class="catalog__body">
        <div class="card__dealer"><span class="chip__dot" style="background:${esc(c.dealer.color)}"></span>${esc(c.dealer.name)}</div>
        <div class="card__desc">${esc(c.label)}</div>
        <div class="dates">${dateRange(c.runFrom, c.runTill)} · ${c.pageCount} pages</div>
        ${store}
      </div>
    </div>`;
  }).join('');
}

const viewer = { pages: [], index: 0 };

async function openViewer(catalogId, page, title) {
  const dlg = $('#viewer');
  $('#viewerTitle').textContent = title || '';
  $('#viewerImg').removeAttribute('src');
  $('#viewerThumbs').innerHTML = '';
  $('#viewerPage').textContent = 'Loading…';
  dlg.showModal();
  try {
    viewer.pages = await api(`/api/catalogs/${encodeURIComponent(catalogId)}/pages`);
    $('#viewerThumbs').innerHTML = viewer.pages.map((p, i) => `<img loading="lazy" data-i="${i}" src="${esc(p.thumb || p.view)}" alt="${i + 1}">`).join('');
    showPage(Math.max(0, Math.min(Number(page) - 1 || 0, viewer.pages.length - 1)));
  } catch (e) {
    $('#viewerPage').textContent = `Error: ${e.message}`;
  }
}

function showPage(i) {
  if (!viewer.pages.length) return;
  viewer.index = (i + viewer.pages.length) % viewer.pages.length;
  const p = viewer.pages[viewer.index];
  $('#viewerImg').src = p.zoom || p.view;
  $('#viewerPage').textContent = `Page ${viewer.index + 1} of ${viewer.pages.length}`;
  $('#viewerThumbs').querySelectorAll('img').forEach((img, n) => {
    img.classList.toggle('is-active', n === viewer.index);
    if (n === viewer.index) img.scrollIntoView({ block: 'nearest', inline: 'center' });
  });
}

function initViewer() {
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-catalog]');
    if (el) openViewer(el.dataset.catalog, el.dataset.page, el.dataset.title);
  });
  document.addEventListener('keydown', (e) => {
    const el = e.target.closest?.('.catalog');
    if (el && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      openViewer(el.dataset.catalog, 1, el.dataset.title);
    }
    if (!$('#viewer').open) return;
    if (e.key === 'ArrowRight') showPage(viewer.index + 1);
    if (e.key === 'ArrowLeft') showPage(viewer.index - 1);
  });
  $('#viewerNext').addEventListener('click', () => showPage(viewer.index + 1));
  $('#viewerPrev').addEventListener('click', () => showPage(viewer.index - 1));
  $('#viewerClose').addEventListener('click', () => $('#viewer').close());
  $('#viewerThumbs').addEventListener('click', (e) => {
    const img = e.target.closest('img');
    if (img) showPage(Number(img.dataset.i));
  });
  $('#viewer').addEventListener('click', (e) => { if (e.target === $('#viewer')) $('#viewer').close(); });
}

// ---------- shopping list ----------
function renderList() {
  $('#listItems').innerHTML = state.list.length
    ? state.list.map((item, i) => `<li><span dir="auto">${esc(item)}</span><button data-i="${i}" aria-label="Remove">✕</button></li>`).join('')
    : '<li class="muted">Your list is empty – add some products</li>';
  $('#listCompare').disabled = !state.list.length;
}

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]).catch(() => []);
    }
  }));
  return out;
}

async function compareList() {
  if (!state.loc) {
    $('#listResults').innerHTML = needLocation();
    return;
  }
  const items = state.list;
  $('#listResults').innerHTML = '<div class="empty">Comparing prices…</div>';
  const results = await mapLimit(items, 4, (q) => api('/api/search', { q, ...geoParams() }));

  // cheapest[itemIndex][dealerName] = offer
  const cheapest = results.map((offers) => {
    const m = new Map();
    for (const o of offers) {
      if (o.price == null) continue;
      const cur = m.get(o.dealer.name);
      if (!cur || o.price < cur.price) m.set(o.dealer.name, o);
    }
    return m;
  });
  const dealers = new Map();
  for (const m of cheapest) for (const o of m.values()) dealers.set(o.dealer.name, o.dealer.color);
  if (!dealers.size) {
    $('#listResults').innerHTML = '<div class="empty">No offers found for any product on your list</div>';
    return;
  }

  const totals = [...dealers.keys()].map((name) => {
    let sum = 0;
    let found = 0;
    for (const m of cheapest) {
      const o = m.get(name);
      if (o) { sum += o.price; found += 1; }
    }
    return { name, color: dealers.get(name), sum, found };
  }).sort((a, b) => b.found - a.found || a.sum - b.sum);

  const rowBest = cheapest.map((m) => Math.min(...[...m.values()].map((o) => o.price)));
  let mixTotal = 0;
  let mixFound = 0;
  rowBest.forEach((v) => { if (Number.isFinite(v)) { mixTotal += v; mixFound += 1; } });
  const top = totals[0];

  const head = totals.map((t) => `<th><span class="chip__dot" style="display:inline-block;background:${esc(t.color)}"></span> ${esc(t.name)}</th>`).join('');
  const body = items.map((item, i) => `<tr><th dir="auto">${esc(item)}</th>${totals.map((t) => {
    const o = cheapest[i].get(t.name);
    if (!o) return '<td class="muted">—</td>';
    return `<td class="${o.price === rowBest[i] ? 'best' : ''}">${money(o.price)}<span class="item-name">${esc(o.heading)}${o.quantity ? ` · ${esc(o.quantity)}` : ''}</span></td>`;
  }).join('')}</tr>`).join('');
  const foot = `<tr><td>Total (found)</td>${totals.map((t) => `<td>${money(t.sum)}<span class="item-name">${t.found}/${items.length} items</span></td>`).join('')}</tr>`;

  $('#listResults').innerHTML = `
    <div class="summary">
      <div>🏆 <strong>Best single chain for your basket:</strong> ${esc(top.name)} – ${top.found}/${items.length} items on offer, total ${money(top.sum)}</div>
      <div>🧺 <strong>Buying each item where it is cheapest:</strong> ${money(mixTotal)} (${mixFound}/${items.length} items)</div>
      <div class="muted">Uses the cheapest matching offer per chain for each item. Check pack sizes.</div>
    </div>
    <div class="table-wrap"><table><thead><tr><th>Item</th>${head}</tr></thead><tbody>${body}</tbody><tfoot>${foot}</tfoot></table></div>`;
}

function initList() {
  renderList();
  $('#listForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const raw = $('#listInput').value.trim();
    if (!raw) return;
    const q = translateQuery(raw, { notify: false });
    if (!state.list.includes(q)) state.list.push(q);
    saveJson(LS_LIST, state.list);
    $('#listInput').value = '';
    renderList();
  });
  $('#listItems').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-i]');
    if (!b) return;
    state.list.splice(Number(b.dataset.i), 1);
    saveJson(LS_LIST, state.list);
    renderList();
  });
  $('#listCompare').addEventListener('click', compareList);
}

// ---------- tabs ----------
function initTabs() {
  document.querySelector('.tabs').addEventListener('click', (e) => {
    const t = e.target.closest('.tab');
    if (!t) return;
    state.activeTab = t.dataset.tab;
    document.querySelectorAll('.tab').forEach((x) => x.classList.toggle('is-active', x === t));
    document.querySelectorAll('.panel').forEach((p) => p.classList.toggle('is-active', p.id === `tab-${t.dataset.tab}`));
    if (state.activeTab === 'deals' && !state.deals.loaded) loadDeals(true);
    if (state.activeTab === 'catalogs' && !state.loc) $('#catalogResults').innerHTML = needLocation();
  });
}

// ---------- boot ----------
async function boot() {
  initTabs();
  initLocation();
  initCompare();
  initDeals();
  initViewer();
  initList();

  // A location can be shared as a link: ?lat=..&lng=..  or ?q=<address or maps link>
  const params = new URLSearchParams(location.search);
  const shared = params.get('q') || params.get('text') || params.get('url');
  const radius = Number(params.get('r'));
  if (radius) $('#radiusSelect').value = String(radius);
  try {
    if (params.get('lat') && params.get('lng')) {
      await resolveAddress(`${params.get('lat')},${params.get('lng')}`);
    } else if (shared) {
      $('#addressInput').value = shared;
      await resolveAddress(shared);
    } else {
      const saved = loadJson(LS_LOC, null);
      if (saved?.lat) await setLocation(saved, { silent: true });
      else {
        updateStatus();
        $('#catalogResults').innerHTML = needLocation();
      }
    }
  } catch (e) {
    toast(e.message);
  }
}

boot();
