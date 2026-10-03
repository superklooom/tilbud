// Which offers are supermarket groceries. eTilbudsavis/Tjek also carries clothing, home and DIY
// chains, and hypermarkets (Bilka, føtex, Kvickly) sell bedding and clothes, so "walnut" (valnød)
// can match a walnut-coloured duvet cover. Groceries rank first; everything else is tucked away.
import { fold } from './dictionary.js';

// Danish supermarket / grocery chains, folded ("føtex" -> "fotex"). A dealer name matches when it
// equals or starts with one of these ("coop 365discount", "lovbjerg supermarked").
const SUPERMARKETS = [
  'netto', 'fotex', 'bilka', 'lidl', 'rema 1000', 'rema', '365discount', '365 discount', 'coop 365', 'coop',
  'kvickly', 'superbrugsen', 'dagli brugsen', 'daglibrugsen', 'daglig brugsen', 'brugsen', 'lokal brugsen', 'meny',
  'spar', 'kwik spar', 'eurospar', 'min kobmand', 'lovbjerg', 'abc lavpris', 'let kob', 'naerkob', 'irma', 'fakta',
  'aldi', 'kiwi', 'nemlig', 'salling super',
];

export function isSupermarket(dealerName) {
  const n = fold(dealerName || '');
  return SUPERMARKETS.some((s) => n === s || n.startsWith(`${s} `));
}

// Non-food words (folded). Prefix words also match compounds ("sengetøjssæt", "dynebetræk").
const NON_FOOD_PREFIX = [
  'sengetoj', 'sengesaet', 'sengelinned', 'dynebetraek', 'dyne', 'hovedpude', 'pudebetraek', 'lagen', 'haandklaede',
  'badelagen', 'plaid', 'gardin', 'bluse', 'skjorte', 'bukser', 'jeans', 'kjole', 'nederdel', 'jakke', 'frakke',
  'sweatshirt', 'hoodie', 'cardigan', 'strik', 'sokker', 'stromper', 'undertoj', 'boxershorts', 'trusser', 'pyjamas',
  'nattoj', 'leggings', 'stovler', 'sneakers', 'sandaler', 'handsker', 'halstorklaede', 'mobel', 'sofa', 'lampe',
  'reol', 'kommode', 'madras', 'spisebord', 'sofabord', 'tekstil',
];
const NON_FOOD_WORDS = new Set(['sko', 'hue', 'bh', 't shirt', 'tshirt', 'shorts', 'taeppe', 'taepper', 'stol', 'stole', 'skab', 'bomuld', 'polyester', 'viskose', 'elastan']);

// Signs in the raw text: clothing sizes, textile composition, bed/curtain dimensions.
const NON_FOOD_PATTERNS = [
  /\bstr\.?\s*(?:xxs|xs|s|m|l|xl|xxl|3xl|\d{2,3})\b/i, // "str. M", "str. 104"
  /\b\d{2,3}\s*[x×]\s*\d{2,3}\s*cm\b/i, // "140x200 cm"
  /\b100\s*%\s*(?:bomuld|polyester|hør|uld|viskose)\b/i,
  /\b(?:oeko-tex|øko-tex|oekotex)\b/i,
];

export function looksNonFood(offer) {
  const raw = `${offer.heading || ''} ${offer.description || ''}`;
  if (NON_FOOD_PATTERNS.some((re) => re.test(raw))) return true;
  const words = fold(raw).split(' ');
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (NON_FOOD_WORDS.has(w) || NON_FOOD_WORDS.has(`${w} ${words[i + 1] || ''}`)) return true;
    if (NON_FOOD_PREFIX.some((p) => w.startsWith(p))) return true;
  }
  return false;
}

export const isGrocery = (offer) => isSupermarket(offer.dealer?.name) && !looksNonFood(offer);
