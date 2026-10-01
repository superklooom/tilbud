import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normOffer, unitPrice } from '../lib.js';

test('unit price converts grams to price per kg', () => {
  const q = { unit: { symbol: 'g', si: { symbol: 'kg', factor: 0.001 } }, size: { from: 500, to: 500 }, pieces: { from: 1, to: 1 } };
  assert.deepEqual(unitPrice(25, q), { value: 50, per: 'kg' });
});

test('unit price multiplies multipacks', () => {
  const q = { unit: { symbol: 'cl', si: { symbol: 'l', factor: 0.01 } }, size: { from: 33 }, pieces: { from: 24 } };
  assert.equal(unitPrice(79.2, q).value.toFixed(2), '10.00');
});

test('unit price per piece', () => {
  const q = { unit: { symbol: 'pcs', si: { symbol: 'pcs', factor: 1 } }, size: { from: 10 } };
  assert.deepEqual(unitPrice(30, q), { value: 3, per: 'pc' });
});

test('missing quantity gives no unit price', () => {
  assert.equal(unitPrice(10, null), null);
  assert.equal(unitPrice(10, { unit: { symbol: 'g' } }), null);
});

test('normOffer maps a Tjek offer', () => {
  const o = normOffer({
    id: 'abc',
    heading: 'Kaffe',
    pricing: { price: 40, pre_price: 55, currency: 'DKK' },
    quantity: { unit: { symbol: 'g', si: { symbol: 'kg', factor: 0.001 } }, size: { from: 400, to: 500 }, pieces: { from: 1, to: 1 } },
    images: { thumb: 't.jpg', zoom: 'z.jpg' },
    dealer_id: 'd1',
    catalog_id: 'c1',
    catalog_page: 3,
    branding: { name: 'Netto', color: 'ffd400' },
  });
  assert.equal(o.savings, 15);
  assert.equal(o.quantity, '400-500 g');
  assert.equal(o.unitPrice.value, 100);
  assert.equal(o.dealer.color, '#ffd400');
  assert.equal(o.dealer.name, 'Netto');
  assert.equal(o.catalogPage, 3);
});
