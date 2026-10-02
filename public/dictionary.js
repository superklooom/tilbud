// Search vocabulary: English -> Danish product words, plus Danish terms and brands for autocomplete.
// Catalog offers are written in Danish, so English searches are translated before querying.

export const EN_TO_DA = {
  // dairy & eggs
  milk: 'mælk', 'skimmed milk': 'skummetmælk', 'semi-skimmed milk': 'letmælk', 'whole milk': 'sødmælk',
  'chocolate milk': 'kakaomælk', butter: 'smør', cheese: 'ost', 'cream cheese': 'flødeost', 'grated cheese': 'revet ost',
  'sliced cheese': 'skiveost', cream: 'fløde', 'whipping cream': 'piskefløde', 'sour cream': 'creme fraiche',
  yoghurt: 'yoghurt', yogurt: 'yoghurt', egg: 'æg', eggs: 'æg', margarine: 'margarine', buttermilk: 'kærnemælk',
  // meat & fish
  meat: 'kød', beef: 'oksekød', 'minced beef': 'hakket oksekød', 'ground beef': 'hakket oksekød', 'minced meat': 'hakket kød',
  pork: 'svinekød', 'minced pork': 'hakket svinekød', chicken: 'kylling', 'chicken breast': 'kyllingebryst',
  'chicken thighs': 'kyllingelår', turkey: 'kalkun', lamb: 'lam', veal: 'kalv', steak: 'bøf', ham: 'skinke',
  bacon: 'bacon', sausage: 'pølse', sausages: 'pølser', 'hot dog': 'hotdog', 'meat balls': 'frikadeller',
  meatballs: 'frikadeller', 'liver pate': 'leverpostej', 'cold cuts': 'pålæg', salami: 'salami', duck: 'and',
  fish: 'fisk', salmon: 'laks', 'smoked salmon': 'røget laks', cod: 'torsk', tuna: 'tun', shrimp: 'rejer',
  prawns: 'rejer', herring: 'sild', mackerel: 'makrel', 'fish fingers': 'fiskefrikadeller',
  // bakery & dry goods
  bread: 'brød', 'rye bread': 'rugbrød', 'white bread': 'franskbrød', rolls: 'boller', buns: 'boller',
  toast: 'toastbrød', croissant: 'croissant', cake: 'kage', cookies: 'småkager', biscuits: 'kiks', crackers: 'knækbrød',
  flour: 'mel', sugar: 'sukker', salt: 'salt', pepper: 'peber', rice: 'ris', pasta: 'pasta', spaghetti: 'spaghetti',
  noodles: 'nudler', oats: 'havregryn', oatmeal: 'havregryn', cereal: 'morgenmadsprodukt', muesli: 'müsli',
  cornflakes: 'cornflakes', honey: 'honning', jam: 'syltetøj', 'peanut butter': 'peanutbutter', nutella: 'nutella',
  oil: 'olie', 'olive oil': 'olivenolie', vinegar: 'eddike', ketchup: 'ketchup', mustard: 'sennep', mayonnaise: 'mayonnaise',
  mayo: 'mayonnaise', 'tomato sauce': 'tomatsauce', 'canned tomatoes': 'hakkede tomater', beans: 'bønner', lentils: 'linser',
  soup: 'suppe', spices: 'krydderier', nuts: 'nødder', almonds: 'mandler', raisins: 'rosiner', 'baking powder': 'bagepulver',
  yeast: 'gær',
  // fruit & vegetables
  fruit: 'frugt', vegetables: 'grøntsager', apple: 'æbler', apples: 'æbler', banana: 'bananer', bananas: 'bananer',
  orange: 'appelsiner', oranges: 'appelsiner', lemon: 'citron', lemons: 'citroner', lime: 'lime', pear: 'pærer', pears: 'pærer',
  grapes: 'vindruer', strawberries: 'jordbær', strawberry: 'jordbær', raspberries: 'hindbær', blueberries: 'blåbær',
  melon: 'melon', watermelon: 'vandmelon', pineapple: 'ananas', mango: 'mango', kiwi: 'kiwi', avocado: 'avocado',
  plums: 'blommer', cherries: 'kirsebær', potato: 'kartofler', potatoes: 'kartofler', 'sweet potato': 'søde kartofler',
  tomato: 'tomater', tomatoes: 'tomater', cucumber: 'agurk', carrot: 'gulerødder', carrots: 'gulerødder', onion: 'løg',
  onions: 'løg', garlic: 'hvidløg', lettuce: 'salat', salad: 'salat', cabbage: 'kål', broccoli: 'broccoli',
  cauliflower: 'blomkål', peppers: 'peberfrugt', 'bell pepper': 'peberfrugt', mushrooms: 'champignon', spinach: 'spinat',
  corn: 'majs', peas: 'ærter', leek: 'porre', zucchini: 'squash', courgette: 'squash', herbs: 'krydderurter',
  // frozen & snacks
  frozen: 'frost', 'frozen vegetables': 'frosne grøntsager', pizza: 'pizza', 'ice cream': 'is', fries: 'pommes frites',
  chips: 'chips', crisps: 'chips', popcorn: 'popcorn', candy: 'slik', sweets: 'slik', chocolate: 'chokolade',
  licorice: 'lakrids', liquorice: 'lakrids', gum: 'tyggegummi',
  // drinks
  water: 'vand', 'sparkling water': 'danskvand', juice: 'juice', 'orange juice': 'appelsinjuice', 'apple juice': 'æblejuice',
  soda: 'sodavand', 'soft drink': 'sodavand', lemonade: 'saft', squash: 'saft', coffee: 'kaffe', 'coffee beans': 'kaffebønner',
  'instant coffee': 'pulverkaffe', tea: 'te', beer: 'øl', wine: 'vin', 'red wine': 'rødvin', 'white wine': 'hvidvin',
  'rose wine': 'rosévin', champagne: 'champagne', 'sparkling wine': 'mousserende vin', cider: 'cider', spirits: 'spiritus',
  vodka: 'vodka', whisky: 'whisky', gin: 'gin', rum: 'rom', 'energy drink': 'energidrik',
  // household & personal care
  'toilet paper': 'toiletpapir', 'kitchen roll': 'køkkenrulle', 'paper towels': 'køkkenrulle', tissues: 'servietter',
  napkins: 'servietter', detergent: 'vaskemiddel', 'washing powder': 'vaskepulver', 'laundry detergent': 'vaskemiddel',
  'fabric softener': 'skyllemiddel', 'dish soap': 'opvaskemiddel', 'washing up liquid': 'opvaskemiddel',
  'dishwasher tablets': 'opvasketabs', 'cleaning': 'rengøring', 'bin bags': 'affaldsposer', 'trash bags': 'affaldsposer',
  'aluminium foil': 'sølvpapir', 'cling film': 'film', batteries: 'batterier', candles: 'stearinlys', 'light bulb': 'pære',
  shampoo: 'shampoo', conditioner: 'balsam', soap: 'sæbe', 'shower gel': 'showergel', toothpaste: 'tandpasta',
  toothbrush: 'tandbørste', deodorant: 'deodorant', 'razor': 'barberskraber', diapers: 'bleer', nappies: 'bleer',
  'baby food': 'babymad', 'wet wipes': 'vådservietter', 'cat food': 'kattemad', 'dog food': 'hundemad', flowers: 'blomster',
};

// Danish product words people commonly search for (shown as suggestions with an English hint).
export const DA_TERMS = [
  'agurk', 'appelsinjuice', 'bacon', 'bananer', 'bleer', 'blomkål', 'boller', 'brød', 'bøf', 'chips', 'chokolade',
  'cola', 'danskvand', 'flødeost', 'fløde', 'frikadeller', 'gulerødder', 'havregryn', 'hakket oksekød', 'hvidvin',
  'is', 'juice', 'kaffe', 'kaffebønner', 'kakaomælk', 'kartofler', 'kylling', 'kyllingebryst', 'laks', 'leverpostej',
  'letmælk', 'løg', 'mælk', 'oksekød', 'olivenolie', 'ost', 'pasta', 'pizza', 'pålæg', 'pølser', 'rejer', 'ris',
  'rugbrød', 'rødvin', 'salat', 'skinke', 'skyr', 'slik', 'smør', 'sodavand', 'spegepølse', 'sukker', 'syltetøj',
  'te', 'tomater', 'toiletpapir', 'torsk', 'vaskemiddel', 'vin', 'yoghurt', 'æbler', 'æg', 'øl',
];

// Brands sold in Danish supermarkets.
export const BRANDS = [
  'Coca-Cola', 'Coca-Cola Zero', 'Pepsi', 'Pepsi Max', 'Fanta', 'Sprite', 'Faxe Kondi', 'Schweppes', 'Red Bull', 'Monster',
  'Cocio', 'Carlsberg', 'Tuborg', 'Heineken', 'Royal Unibrew', 'Albani', 'Mikkeller', 'Somersby', 'Rynkeby', 'God Morgen',
  'Arla', 'Lurpak', 'Kærgården', 'Castello', 'Cheasy', 'Thise', 'Øllingegaard', 'Lærkevang', 'Apetina', 'Buko',
  'Gevalia', 'Merrild', 'BKI', 'Nescafé', 'Lavazza', 'Pickwick', 'Lipton', 'Kelloggs', 'Quaker', 'Nutella',
  'Barilla', 'Uncle Ben\'s', 'Knorr', 'Heinz', 'Stryhns', 'Gøl', 'Tulip', 'Danish Crown', 'Steff Houlberg', '3-Stjernet',
  'Hatting', 'Schulstad', 'Kohberg', 'Lantmännen', 'Haribo', 'Toms', 'Marabou', 'Anthon Berg', 'Galle & Jessen',
  'Kims', 'Pringles', 'Ben & Jerry\'s', 'Magnum', 'Hansen\'s Is', 'Frisko', 'Carte d\'Or', 'Dr. Oetker', 'Findus', 'Frosta',
  'Ariel', 'Neutral', 'Omo', 'Persil', 'Bio-tex', 'Finish', 'Fairy', 'Lambi', 'Lotus', 'Pampers', 'Libero',
  'Colgate', 'Zendium', 'Sensodyne', 'Oral-B', 'Gillette', 'Nivea', 'Dove', 'Head & Shoulders', 'Sanex', 'Rexona',
  'Whiskas', 'Felix', 'Pedigree', 'Purina', 'Valsemøllen', 'Dan Sukker', 'Urtekram', 'Änglamark', 'Øko',
];

// Fold for accent/case-insensitive matching: "Smør" -> "smor", "Æble" -> "aeble".
export function fold(s) {
  return String(s)
    .toLowerCase()
    .replace(/æ/g, 'ae').replace(/ø/g, 'o').replace(/å/g, 'aa')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const FOLDED_EN = new Map(Object.entries(EN_TO_DA).map(([en, da]) => [fold(en), da]));
const DA_TO_EN = new Map();
for (const [en, da] of Object.entries(EN_TO_DA)) if (!DA_TO_EN.has(da)) DA_TO_EN.set(da, en);
export const englishFor = (da) => DA_TO_EN.get(da) || null;

function lookup(word) {
  return FOLDED_EN.get(word) ?? (word.endsWith('s') ? FOLDED_EN.get(word.slice(0, -1)) : undefined);
}

// "cheese" -> "ost", "red wine" -> "rødvin", "organic milk" -> "organic mælk". Returns null when nothing translates.
export function toDanish(query) {
  const f = fold(query);
  if (!f) return null;
  const whole = lookup(f);
  if (whole) return whole;
  const words = f.split(' ');
  let changed = false;
  const out = [];
  for (let i = 0; i < words.length; i++) {
    const pair = i + 1 < words.length && lookup(`${words[i]} ${words[i + 1]}`);
    if (pair) { out.push(pair); i++; changed = true; continue; }
    const single = lookup(words[i]);
    if (single) changed = true;
    out.push(single || words[i]);
  }
  return changed ? out.join(' ') : null;
}
