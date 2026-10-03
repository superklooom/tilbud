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

import { basketText, decodeBasket, encodeBasket, mergeBaskets } from '../public/basket.js';

const sample = () => [
  { ...item('k1', 'Netto', 35, new Date(2026, 9, 6, 23, 59).toISOString(), { prePrice: 45 }), heading: 'Gevalia Kaffe', quantity: '400 g', thumb: 'https://img.tjek.com/a.jpg' },
  { ...item('c1', 'Netto', 15, new Date(2026, 9, 6, 23, 59).toISOString(), { qty: 2 }), heading: 'Coca-Cola Zero', quantity: '1,5 l' },
  { ...item('b1', 'Bilka', 129, new Date(2026, 9, 6, 23, 59).toISOString()), heading: 'Coca-Cola 24 x 33 cl' },
  { ...item('x1', 'Lidl', 10, new Date(2026, 8, 30).toISOString()), heading: 'Old offer' },
];

test('WhatsApp text: grouped by chain, totals, end dates, expired listed separately, link last', () => {
  const text = basketText(sample(), { link: 'https://example.test/#basket=abc', now }).replace(/\u00a0/g, ' ');
  assert.equal(text, [
    '*My Tilbud Radar basket*',
    'Total: 194,00 kr. · 4 items · you save 10,00 kr.',
    '',
    '*Bilka* · 129,00 kr.',
    '• Coca-Cola 24 x 33 cl · 129,00 kr. · ends Tue 6 Oct',
    '',
    '*Netto* · 65,00 kr.',
    '• Gevalia Kaffe, 400 g · 35,00 kr. · ends Tue 6 Oct',
    '• 2 × Coca-Cola Zero, 1,5 l · 30,00 kr. · ends Tue 6 Oct',
    '',
    'Offer ended (not in total):',
    '• Old offer (Lidl)',
    '',
    'Open this basket in Tilbud Radar:',
    'https://example.test/#basket=abc',
  ].join('\n'));
});

test('share link round-trips the basket', async () => {
  const items = sample();
  const encoded = await encodeBasket(items);
  assert.match(encoded, /^[zj][A-Za-z0-9_-]+$/);
  const back = await decodeBasket(encoded);
  assert.deepEqual(back.map((i) => [i.id, i.heading, i.price, i.qty, i.dealer.name, i.thumb]),
    items.map((i) => [i.id, i.heading, i.price, i.qty, i.dealer.name, i.thumb ?? null]));
});

test('share links are validated: bad fields are dropped, garbage is rejected', async () => {
  const evil = [{ ...sample()[0], heading: '<img src=x onerror=alert(1)>', thumb: 'javascript:alert(1)', qty: 5000, price: -3,
    dealer: { name: 'Netto', color: 'red;background:url(https://evil.test)' } }];
  const [i] = await decodeBasket(await encodeBasket(evil));
  assert.equal(i.thumb, null);
  assert.equal(i.qty, 1);
  assert.equal(i.price, null);
  assert.equal(i.dealer.color, '#555555');
  assert.equal(i.heading, '<img src=x onerror=alert(1)>'); // kept as text; the page escapes it when rendering
  assert.equal(await decodeBasket('not-a-basket'), null);
  assert.equal(await decodeBasket('zAAAA'), null);
});

test('merging keeps existing items and the higher quantity', () => {
  const [a, b] = sample();
  const merged = mergeBaskets([{ ...a, qty: 1 }], [{ ...a, qty: 3 }, b]);
  assert.deepEqual(merged.map((i) => [i.id, i.qty]), [['k1', 3], ['c1', 2]]);
});
