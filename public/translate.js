// English -> Danish for search: the built-in dictionary first, then a free online translator
// (MyMemory) for words it doesn't know, e.g. "walnut" -> "valnød". Online results are cached in the
// browser; if the service is unreachable the search simply runs without a translation.
import { BRANDS, DA_TERMS, EN_TO_DA, fold, toDanishDetailed } from './dictionary.js';

const LS_KEY = 'tilbud.translations';
const ENDPOINT = 'https://api.mymemory.translated.net/get';

const KNOWN_DANISH = new Set([...DA_TERMS, ...Object.values(EN_TO_DA), ...BRANDS].map(fold));

let cache = {};
try { cache = JSON.parse(globalThis.localStorage?.getItem(LS_KEY)) || {}; } catch { cache = {}; }
const save = () => { try { globalThis.localStorage?.setItem(LS_KEY, JSON.stringify(cache)); } catch { /* private mode */ } };

// Only plain English-looking words go online: not Danish (æøå or a known Danish word), not a brand, not a number.
function worthTranslating(query, key) {
  return key.length >= 3 && key.split(' ').length <= 4 && !/[æøå]/i.test(query) && !/\d/.test(key) && !KNOWN_DANISH.has(key);
}

function clean(text, key) {
  if (!text || /MYMEMORY|QUERY LENGTH|INVALID/i.test(text)) return null;
  const t = text.toLowerCase().replace(/[.,;:!?"“”()]/g, '').trim();
  if (!t || fold(t) === key || t.split(/\s+/).length > 4) return null;
  return t;
}

// Synchronous: dictionary or a translation fetched earlier (used for hints in the UI).
export function knownDanish(query) {
  const dict = toDanishDetailed(query);
  if (dict?.complete) return dict.text;
  return cache[fold(query)] ?? dict?.text ?? null;
}

// A full dictionary translation wins; otherwise ask online (whole phrase) and fall back to a partial one.
export async function danishFor(query, fetchImpl = globalThis.fetch) {
  const dict = toDanishDetailed(query);
  if (dict?.complete) return dict.text;
  const online = await lookupOnline(query, fetchImpl);
  return online ?? dict?.text ?? null;
}

async function lookupOnline(query, fetchImpl) {
  const key = fold(query);
  if (!worthTranslating(query, key)) return null;
  if (key in cache) return cache[key];
  try {
    const url = `${ENDPOINT}?q=${encodeURIComponent(query.trim())}&langpair=en|da`;
    const res = await fetchImpl(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    const data = await res.json();
    const ok = Number(data?.responseStatus) === 200;
    const result = ok ? clean(data?.responseData?.translatedText, key) : null;
    cache[key] = result; // remember misses too, so the same word isn't looked up again
    save();
    return result;
  } catch {
    return null; // offline / blocked / timeout: don't cache, try again next time
  }
}
