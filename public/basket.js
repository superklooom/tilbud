// "My Basket": offers the user picked, grouped by chain, with totals and offer end dates.
// Pure logic only (no DOM, no storage) so it can be unit tested.

const DAY = 24 * 60 * 60 * 1000;

// What we keep of an offer. Offers can't be re-fetched by id later, so store everything the basket shows.
export function snapshot(o) {
  return {
    id: o.id,
    heading: o.heading,
    quantity: o.quantity || '',
    price: o.price,
    prePrice: o.prePrice ?? null,
    unitPrice: o.unitPrice ?? null,
    thumb: o.thumb || o.image || null,
    runFrom: o.runFrom || null,
    runTill: o.runTill || null,
    dealer: { name: o.dealer.name, color: o.dealer.color },
    catalogId: o.catalogId || null,
    catalogPage: o.catalogPage ?? null,
    qty: 1,
    addedAt: Date.now(),
  };
}

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
const part = (d, opt) => d.toLocaleDateString('en-GB', opt);
const fmt = (d) => `${part(d, { weekday: 'short' })} ${d.getDate()} ${part(d, { month: 'short' })}`; // "Fri 9 Oct"

// level: 'expired' | 'soon' (ends today or tomorrow) | 'ok' | 'unknown'
export function endStatus(runTill, now = new Date()) {
  const end = runTill ? new Date(runTill) : null;
  if (!end || Number.isNaN(end.getTime())) return { level: 'unknown', label: 'End date not listed', daysLeft: null };
  if (end < now) return { level: 'expired', label: `Offer ended ${fmt(end)}`, daysLeft: -1 };
  const daysLeft = Math.round((startOfDay(end) - startOfDay(now)) / DAY);
  const left = daysLeft === 0 ? 'last day today' : daysLeft === 1 ? 'ends tomorrow' : `${daysLeft} days left`;
  return { level: daysLeft <= 1 ? 'soon' : 'ok', label: `Ends ${fmt(end)} · ${left}`, daysLeft };
}

// Expired offers stay visible but are left out of the totals.
export function summarize(items, now = new Date()) {
  const groups = new Map();
  let total = 0;
  let savings = 0;
  let count = 0;
  let expired = 0;
  for (const item of items) {
    const status = endStatus(item.runTill, now);
    const line = (item.price ?? 0) * item.qty;
    const g = groups.get(item.dealer.name) || { dealer: item.dealer, items: [], subtotal: 0, count: 0 };
    g.items.push({ ...item, status, line });
    if (status.level === 'expired') {
      expired += 1;
    } else {
      g.subtotal += line;
      g.count += item.qty;
      total += line;
      count += item.qty;
      if (item.prePrice && item.price != null) savings += Math.max(0, item.prePrice - item.price) * item.qty;
    }
    groups.set(item.dealer.name, g);
  }
  const endTime = (i) => (i.runTill ? new Date(i.runTill).getTime() : Infinity);
  for (const g of groups.values()) g.items.sort((a, b) => endTime(a) - endTime(b)); // soonest-ending first
  return {
    groups: [...groups.values()].sort((a, b) => b.subtotal - a.subtotal || a.dealer.name.localeCompare(b.dealer.name, 'da')),
    total,
    savings,
    count,
    expired,
  };
}

// ---------- sharing ----------
const money = (v) => (v == null ? '' : new Intl.NumberFormat('da-DK', { style: 'currency', currency: 'DKK' }).format(v));
const shortEnd = (status) => (status.level === 'unknown' ? '' : status.label.replace(/^Ends /, 'ends ').replace(/ · .*$/, ''));

// A WhatsApp-friendly message (*bold*), grouped by chain like the basket page.
export function basketText(items, { link = '', now = new Date() } = {}) {
  const s = summarize(items, now);
  const lines = ['*My Tilbud Radar basket*'];
  lines.push(`Total: ${money(s.total)} · ${s.count} item${s.count === 1 ? '' : 's'}${s.savings > 0 ? ` · you save ${money(s.savings)}` : ''}`);
  const expired = [];
  for (const g of s.groups) {
    const live = g.items.filter((i) => i.status.level !== 'expired');
    expired.push(...g.items.filter((i) => i.status.level === 'expired'));
    if (!live.length) continue;
    lines.push('', `*${g.dealer.name}* · ${money(g.subtotal)}`);
    for (const i of live) {
      const name = `${i.qty > 1 ? `${i.qty} × ` : ''}${i.heading}${i.quantity ? `, ${i.quantity}` : ''}`;
      const end = shortEnd(i.status);
      lines.push(`• ${name} · ${money(i.line)}${end ? ` · ${end}` : ''}`);
    }
  }
  if (expired.length) {
    lines.push('', 'Offer ended (not in total):');
    for (const i of expired) lines.push(`• ${i.heading} (${i.dealer.name})`);
  }
  if (link) lines.push('', 'Open this basket in Tilbud Radar:', link);
  return lines.join('\n');
}

// Basket <-> compact string for a share link (#basket=...). Compressed when the browser supports it.
const FIELDS = ['id', 'heading', 'quantity', 'price', 'prePrice', 'thumb', 'runFrom', 'runTill', 'dealerName', 'dealerColor', 'catalogId', 'catalogPage', 'qty'];
const MAX_ITEMS = 200;

const b64url = (bytes) => {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const fromB64url = (str) => Uint8Array.from(atob(str.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));

async function pipe(bytes, Stream) {
  return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new Stream('deflate-raw'))).arrayBuffer());
}

export async function encodeBasket(items) {
  const rows = items.slice(0, MAX_ITEMS).map((i) => FIELDS.map((f) => (
    f === 'dealerName' ? i.dealer.name : f === 'dealerColor' ? i.dealer.color : i[f] ?? null)));
  const bytes = new TextEncoder().encode(JSON.stringify(rows));
  if (typeof CompressionStream === 'function') return `z${b64url(await pipe(bytes, CompressionStream))}`;
  return `j${b64url(bytes)}`;
}

// The string comes from a link, i.e. from anyone: validate every field and drop anything odd.
const str = (v, max = 300) => (typeof v === 'string' ? v.slice(0, max) : '');
const num = (v) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 && v < 1e6 ? v : null);
const httpsUrl = (v) => (typeof v === 'string' && /^https:\/\/[^\s"'<>]+$/.test(v) ? v.slice(0, 500) : null);
const color = (v) => (typeof v === 'string' && /^#[0-9a-f]{3,8}$/i.test(v) ? v : '#555555');
const date = (v) => (typeof v === 'string' && !Number.isNaN(new Date(v).getTime()) ? v.slice(0, 40) : null);

export async function decodeBasket(encoded) {
  try {
    const kind = encoded[0];
    let bytes = fromB64url(encoded.slice(1));
    if (kind === 'z') bytes = await pipe(bytes, DecompressionStream);
    else if (kind !== 'j') return null;
    const rows = JSON.parse(new TextDecoder().decode(bytes));
    if (!Array.isArray(rows)) return null;
    const items = [];
    const seen = new Set();
    for (const row of rows.slice(0, MAX_ITEMS)) {
      if (!Array.isArray(row)) continue;
      const r = Object.fromEntries(FIELDS.map((f, k) => [f, row[k]]));
      const heading = str(r.heading);
      const id = str(r.id, 100) || `shared-${items.length}`;
      if (!heading || seen.has(id)) continue;
      seen.add(id);
      items.push({
        id,
        heading,
        quantity: str(r.quantity, 60),
        price: num(r.price),
        prePrice: num(r.prePrice),
        unitPrice: null,
        thumb: httpsUrl(r.thumb),
        runFrom: date(r.runFrom),
        runTill: date(r.runTill),
        dealer: { name: str(r.dealerName, 60) || 'Unknown', color: color(r.dealerColor) },
        catalogId: str(r.catalogId, 100) || null,
        catalogPage: Number.isInteger(r.catalogPage) && r.catalogPage > 0 && r.catalogPage < 1000 ? r.catalogPage : null,
        qty: Number.isInteger(r.qty) && r.qty >= 1 && r.qty <= 99 ? r.qty : 1,
        addedAt: Date.now(),
      });
    }
    return items.length ? items : null;
  } catch {
    return null;
  }
}

// Merge shared items into a basket: same offer -> keep the higher quantity.
export function mergeBaskets(current, incoming) {
  const out = current.map((i) => ({ ...i }));
  for (const item of incoming) {
    const existing = out.find((i) => i.id === item.id);
    if (existing) existing.qty = Math.max(existing.qty, item.qty);
    else out.push(item);
  }
  return out;
}
