import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fold, toDanish } from '../public/dictionary.js';

test('fold ignores case and Danish letters', () => {
  assert.equal(fold('Smør'), 'smor');
  assert.equal(fold('Æbler'), 'aebler');
  assert.equal(fold('Coca-Cola'), 'coca cola');
});

test('translates English words and phrases to Danish', () => {
  assert.equal(toDanish('Cheese'), 'ost');
  assert.equal(toDanish('red wine'), 'rødvin');
  assert.equal(toDanish('minced beef'), 'hakket oksekød');
  assert.equal(toDanish('organic milk'), 'organic mælk');
});

test('handles simple plurals', () => {
  assert.equal(toDanish('carrots'), 'gulerødder');
  assert.equal(toDanish('lemons'), 'citroner');
});

test('leaves Danish words and brands alone', () => {
  assert.equal(toDanish('smør'), null);
  assert.equal(toDanish('Coca-Cola'), null);
  assert.equal(toDanish(''), null);
});
