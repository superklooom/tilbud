// Weekly snapshot of every offer around a location -> data/offers-<year>-W<week>.json
//
//   node scripts/collect.js --lat 55.6761 --lng 12.5683 --radius 10000
//   node scripts/collect.js --address "Vesterbrogade 1, København"
//
// Run it from cron (e.g. every Wednesday morning, when most new catalogs start) to build a price history.
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { liveApi } from '../lib.js';

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : fallback;
}

function isoWeek(d) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return { year: t.getUTCFullYear(), week: Math.ceil(((t - yearStart) / 86400000 + 1) / 7) };
}

async function main() {
  let lat = Number(arg('lat'));
  let lng = Number(arg('lng'));
  const radius = Number(arg('radius', 10000));
  const address = arg('address');

  if (address) {
    const [hit] = await liveApi.geocode(new URLSearchParams({ q: address }));
    if (!hit) throw new Error(`Address not found: ${address}`);
    ({ lat, lng } = hit);
    console.log(`Geocoded to ${hit.label}`);
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error('Pass --lat and --lng, or --address');
  }

  const geo = { lat, lng, radius };
  const catalogs = await liveApi.catalogs(new URLSearchParams(geo));
  const offers = [];
  for (let offset = 0; offset < 5000; offset += 100) {
    const page = await liveApi.offers(new URLSearchParams({ ...geo, limit: 100, offset }));
    offers.push(...page);
    process.stdout.write(`\r${offers.length} offers…`);
    if (page.length < 100) break;
  }

  const { year, week } = isoWeek(new Date());
  const dir = fileURLToPath(new URL('../data/', import.meta.url));
  await mkdir(dir, { recursive: true });
  const file = `${dir}offers-${year}-W${String(week).padStart(2, '0')}.json`;
  await writeFile(file, JSON.stringify({ collectedAt: new Date().toISOString(), location: geo, catalogs, offers }, null, 1));
  console.log(`\nSaved ${offers.length} offers from ${catalogs.length} catalogs to ${file}`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
