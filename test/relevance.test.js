import { test } from 'node:test';
import assert from 'node:assert/strict';
import { relevance, TIER } from '../public/relevance.js';

const oliveOil = ['olivenolie', 'olive oil'];
const o = (heading, description = '') => ({ heading, description });

test('the product itself is an exact match, also inside Danish compounds', () => {
  assert.equal(relevance(o('Olivo ekstra jomfru olivenolie', '1000 ml. Literpris 99,00.'), oliveOil), TIER.EXACT);
  assert.equal(relevance(o('PRIMADONNA Spansk ekstra jomfruolivenolie', '1 l.'), oliveOil), TIER.EXACT);
  assert.equal(relevance(o('Extra virgin olive oil'), oliveOil), TIER.EXACT);
});

test('close variants rank as partial matches', () => {
  assert.equal(relevance(o('Le Terrazze Pomace olie', '1 liter.'), oliveOil), TIER.PARTIAL);
  assert.equal(relevance(o('Kalamata olivenoliedressing'), oliveOil), TIER.PARTIAL);
});

test('products that only mention it in the description come after', () => {
  const tomatoes = o('Irma vitendo tomater', 'Holland, kl. I. 400 g. De er særligt velegnede til en tomatsalat med hvid ost, olivenolie og frisk basilikum.');
  assert.equal(relevance(tomatoes, oliveOil), TIER.MENTION);
  assert.equal(relevance(o('Ansjoser', 'i olivenolie, 50 g'), oliveOil), TIER.MENTION);
});

test('unrelated results rank last', () => {
  assert.equal(relevance(o('Coca-Cola Zero', '1,5 l'), oliveOil), TIER.OTHER);
});

test('plurals and short words', () => {
  assert.equal(relevance(o('Tomat cherry', '250 g'), ['tomater', 'tomatoes']), TIER.EXACT);
  assert.equal(relevance(o('Castello Cheddar ost'), ['ost', 'cheese']), TIER.EXACT);
  assert.equal(relevance(o('Hvidløgsost'), ['ost']), TIER.EXACT);
  assert.equal(relevance(o('Frost pizza'), ['ost']), TIER.OTHER);
  assert.equal(relevance(o('Ostehaps'), ['ost']), TIER.PARTIAL);
  assert.equal(relevance(o('Hakket oksekød 8-12%'), ['hakket oksekød', 'minced beef']), TIER.EXACT);
});
