import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isGrocery, isSupermarket, looksNonFood } from '../public/stores.js';

test('supermarket chains are recognised', () => {
  for (const n of ['Netto', 'føtex', 'Bilka', 'Lidl', 'REMA 1000', 'Coop 365discount', 'Kvickly', 'SuperBrugsen', "Dagli'Brugsen", 'MENY', 'SPAR', 'Min Købmand', 'Løvbjerg Supermarked']) {
    assert.ok(isSupermarket(n), n);
  }
  for (const n of ['JYSK', 'Søstrene Grene', 'BAUHAUS', 'Elgiganten', 'Sport 24', 'Normal', 'Sparekassen']) {
    assert.ok(!isSupermarket(n), n);
  }
});

const offer = (heading, description = '', dealer = 'Bilka') => ({ heading, description, dealer: { name: dealer } });

test('walnut-coloured textiles and clothes are not groceries', () => {
  assert.ok(looksNonFood(offer('Sengetøj i farven valnød', '140x200 cm. 100% bomuld')));
  assert.ok(looksNonFood(offer('Dynebetræk valnød', 'Flere farver')));
  assert.ok(looksNonFood(offer('Strikbluse', 'Str. S-XL. Farve: valnød')));
  assert.ok(looksNonFood(offer('Plaid', '130 x 170 cm')));
  assert.ok(looksNonFood(offer('Herre t-shirt', 'Flere farver')));
});

test('food stays food', () => {
  for (const [h, d] of [
    ['Valnødder', '200 g'], ['Californiske valnøddekerner', '150 g. Pr. kg 133,00'], ['Skovbær', '300 g, frost'],
    ['Lagkagebunde', '3 stk'], ['Hørfrø', '500 g'], ['Pizza', 'Ø 30 cm'], ['Top Mix nødder', '250 g'],
  ]) assert.ok(!looksNonFood(offer(h, d)), h);
});

test('groceries are supermarket food only', () => {
  assert.ok(isGrocery(offer('Valnødder', '200 g', 'Netto')));
  assert.ok(!isGrocery(offer('Valnødder', '200 g', 'Søstrene Grene')));
  assert.ok(!isGrocery(offer('Sengetøj valnød', '140x200 cm', 'Bilka')));
});
