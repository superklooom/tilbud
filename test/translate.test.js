import { test } from 'node:test';
import assert from 'node:assert/strict';
import { danishFor, knownDanish } from '../public/translate.js';
import { toDanish } from '../public/dictionary.js';
import { relevance, TIER } from '../public/relevance.js';

const fakeFetch = (reply, calls = []) => async (url) => {
  calls.push(url);
  return { ok: true, json: async () => reply };
};

test('walnut and other nuts are in the dictionary', () => {
  assert.equal(toDanish('walnut'), 'valnød');
  assert.equal(toDanish('Walnuts'), 'valnød');
  assert.equal(toDanish('hazelnuts'), 'hasselnød');
  assert.equal(toDanish('fish fingers'), 'fiskepinde');
});

test('dictionary words never go online', async () => {
  const calls = [];
  assert.equal(await danishFor('cheese', fakeFetch({}, calls)), 'ost');
  assert.equal(calls.length, 0);
});

test('unknown English words are translated online and cached', async () => {
  const calls = [];
  const f = fakeFetch({ responseStatus: 200, responseData: { translatedText: 'Kildevand.' } }, calls);
  assert.equal(await danishFor('spring water bottle', f), 'kildevand');
  assert.equal(await danishFor('spring water bottle', f), 'kildevand');
  assert.equal(calls.length, 1);
  assert.match(calls[0], /langpair=en\|da/);
  assert.equal(knownDanish('spring water bottle'), 'kildevand');
});

test('Danish words, brands and service errors are not used', async () => {
  const calls = [];
  const f = fakeFetch({ responseStatus: 200, responseData: { translatedText: 'x' } }, calls);
  assert.equal(await danishFor('valnød', f), null);
  assert.equal(await danishFor('kylling', f), null);
  assert.equal(await danishFor('Coca-Cola', f), null);
  assert.equal(calls.length, 0);
  const quota = fakeFetch({ responseStatus: 429, responseData: { translatedText: 'MYMEMORY WARNING: YOU USED ALL AVAILABLE FREE TRANSLATIONS' } });
  assert.equal(await danishFor('lemongrass', quota), null);
  const same = fakeFetch({ responseStatus: 200, responseData: { translatedText: 'Quinoa' } });
  assert.equal(await danishFor('quinoa', same), null);
  const offline = async () => { throw new Error('offline'); };
  assert.equal(await danishFor('kohlrabi', offline), null);
});

test('Danish plurals count as exact matches', () => {
  assert.equal(relevance({ heading: 'Valnødder', description: '200 g' }, ['valnød', 'walnut']), TIER.EXACT);
  assert.equal(relevance({ heading: 'Californiske valnøddekerner' }, ['valnød']), TIER.PARTIAL);
  assert.equal(relevance({ heading: 'Hasselnødder ristede' }, ['hasselnød']), TIER.EXACT);
});
