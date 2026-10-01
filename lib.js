// Node wrapper around the shared core (used by server.js and scripts/collect.js).
import { createApi, DEFAULT_TJEK_BASE } from './public/core.js';

export { normOffer, normCatalog, normStore, unitPrice } from './public/core.js';

const USER_AGENT = 'TilbudRadar/1.0 (personal price comparison app)';

export async function fetchJson(url, headers = {}) {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json', ...headers },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    const err = new Error(`Upstream ${res.status} for ${url}: ${body.slice(0, 200)}`);
    err.status = 502;
    throw err;
  }
  return res.json();
}

export const liveApi = createApi({
  fetchJson,
  tjekBase: process.env.TJEK_BASE || DEFAULT_TJEK_BASE,
  apiKey: process.env.TJEK_API_KEY || '',
});
