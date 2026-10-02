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
