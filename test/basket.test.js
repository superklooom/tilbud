import { test } from 'node:test';
import assert from 'node:assert/strict';
import { endStatus, snapshot, summarize } from '../public/basket.js';

const now = new Date(2026, 9, 2, 12, 0); // Fri 2 Oct 2026, noon local time
const item = (id, dealer, price, runTill, extra = {}) => ({
  ...snapshot({ id, heading: id, price, runTill, dealer: { name: dealer, color: '#000' }, ...extra }),
  ...extra,
});

test('end status: days left, last days and expired', () => {
  assert.equal(endStatus(new Date(2026, 9, 9, 23, 59).toISOString(), now).label, 'Ends Fri 9 Oct · 7 days left');
  assert.equal(endStatus(new Date(2026, 9, 9, 23, 59).toISOString(), now).level, 'ok');
  assert.equal(endStatus(new Date(2026, 9, 3, 23, 59).toISOString(), now).label, 'Ends Sat 3 Oct · ends tomorrow');
  assert.equal(endStatus(new Date(2026, 9, 2, 23, 59).toISOString(), now).level, 'soon');
  assert.equal(endStatus(new Date(2026, 9, 1, 23, 59).toISOString(), now).level, 'expired');
  assert.equal(endStatus(null, now).level, 'unknown');
});

test('summarize groups by chain and totals by quantity', () => {
  const s = summarize([
    item('kaffe', 'Netto', 35, new Date(2026, 9, 9).toISOString(), { prePrice: 45, qty: 2 }),
    item('smør', 'Lidl', 20, new Date(2026, 9, 6).toISOString()),
    item('mælk', 'Netto', 10, new Date(2026, 9, 4).toISOString()),
  ], now);
  assert.equal(s.total, 35 * 2 + 20 + 10);
  assert.equal(s.count, 4);
  assert.equal(s.savings, 20);
  assert.deepEqual(s.groups.map((g) => [g.dealer.name, g.subtotal]), [['Netto', 80], ['Lidl', 20]]);
  assert.deepEqual(s.groups[0].items.map((i) => i.id), ['mælk', 'kaffe']); // soonest-ending first
});

test('expired offers are listed but not counted', () => {
  const s = summarize([
    item('a', 'Netto', 10, new Date(2026, 9, 1).toISOString()),
    item('b', 'Netto', 5, new Date(2026, 9, 5).toISOString()),
  ], now);
  assert.equal(s.total, 5);
  assert.equal(s.expired, 1);
  assert.equal(s.groups[0].items.length, 2);
});
