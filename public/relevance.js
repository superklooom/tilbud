// How well an offer matches what the user searched for, so the actual product ranks above
// products that only mention it (olive oil before "tomatoes, great with olive oil").
import { fold } from './dictionary.js';

export const TIER = { EXACT: 0, PARTIAL: 1, MENTION: 2, OTHER: 3 };

const words = (s) => fold(s).split(' ').filter(Boolean);

// Drop common Danish plural/definite endings so "tomat" ~ "tomater" and "æble" ~ "æbler".
const stem = (w) => (w.length > 4 ? w.replace(/(erne|ene|er|e|r)$/, '') : w);

// Danish compounds put the actual product last: "jomfruolivenolie" is olive oil, "smøreost" is cheese.
// A prefix of at least 3 letters avoids false hits like "frost" for "ost".
// Plural/definite endings after a singular search term: "valnød" -> "valnødder", "tomat" -> "tomaterne".
const ENDINGS = '(?:d?(?:er|erne|e|ene)|n|en|et|s)?';

function isHead(word, term) {
  const w = stem(word);
  const t = stem(term);
  if (w === t || (w.endsWith(t) && w.length - t.length >= 3)) return true;
  return new RegExp(`^(?:[a-z0-9]{3,})?${term.replace(/[^a-z0-9]/g, '')}${ENDINGS}$`).test(word);
}

function headingTier(headWords, term) {
  const tw = words(term);
  if (!tw.length || !headWords.length) return TIER.OTHER;
  if (tw.every((t) => headWords.some((w) => isHead(w, t)))) return TIER.EXACT;
  const last = tw[tw.length - 1];
  const partial =
    tw.some((t) => t.length >= 3 && headWords.some((w) => w.startsWith(t) || isHead(w, t))) || // "olivenoliedressing", one of several words
    headWords.some((w) => w.length >= 4 && last.endsWith(w)); // "olie" for "olivenolie"
  return partial ? TIER.PARTIAL : TIER.OTHER;
}

// terms: everything that was searched, e.g. ["olivenolie", "olive oil"]. Best tier across terms wins.
export function relevance(offer, terms) {
  const headWords = words(offer.heading || '');
  const descWords = words(offer.description || '');
  const inDesc = (term) => {
    const tw = words(term);
    return tw.length > 0 && tw.every((t) => descWords.some((w) => isHead(w, t) || w.startsWith(t)));
  };
  let best = TIER.OTHER;
  for (const term of terms) {
    let tier = headingTier(headWords, term);
    if (tier === TIER.OTHER && inDesc(term)) tier = TIER.MENTION;
    best = Math.min(best, tier);
  }
  return best;
}
