# Tilbud Radar 🏷️

A web app that compares this week's Danish supermarket offers near you.
Data comes from the **Tjek API** (`squid-api.tjek.com`), the public backend behind [etilbudsavis.dk](https://etilbudsavis.dk/).
It is the same data as the weekly catalogs from Netto, føtex, Bilka, Lidl, REMA 1000, Coop 365, MENY, SuperBrugsen and others.

**Web version:** https://superklooom.github.io/tilbud/ (once GitHub Pages is enabled, see below)

## Features

| Tab | What it does |
|---|---|
| 🔍 **Compare prices** | Search a product in English or Danish ("cheese" or "ost"), or tap a quick button. English searches are translated to Danish and searched in both languages. Suggestions appear as you type ("Coc" → Coca-Cola, Coca-Cola Zero…), taken from products on offer nearby, brands and the dictionary. Sort by price per kg/L, by price or by discount, or show only the cheapest offer per chain. |
| 🏷️ **All deals** | Every offer from every chain nearby, with chain filters, quick text filter and sorting. |
| 📰 **Catalogs** | This week's catalogs nearby, with a page viewer and the nearest store (distance and a Google Maps link). |
| 🧺 **My Basket** | Tap **+ Add to basket** on any offer. The basket groups your picks by chain, shows when each offer ends (and warns when it ends today or tomorrow), lets you set quantities, and shows the total cost and savings at the top. Saved in your browser. **Share** sends it as a WhatsApp message (or copies it, or saves it as an image); the link at the end of the message opens the same basket on any phone or computer – the basket is encoded in the link itself, nothing is stored online. |
| 🛒 **Shopping list** | Saved in your browser. One click compares the whole basket across chains: the best single chain, and the total if you buy each item where it is cheapest. |

### Setting your location
- Type an address or postcode (autocomplete via OpenStreetMap).
- Tap **📍 My location** (GPS, which needs HTTPS or localhost).
- Paste coordinates (`55.6761, 12.5683`) or a Google Maps / Apple Maps link.
- **Share a location as a link:** `…/?lat=55.67&lng=12.56&r=5000` or `…/?q=<address or maps link>`.
- Installed as an app on Android ("Add to Home screen"), it appears in the share sheet, so you can share a place from Google Maps straight into it.

## Web version (GitHub Pages)

The `public/` folder is a complete static site. In the browser it calls the Tjek API and OpenStreetMap directly, so no server is needed.
The workflow `.github/workflows/pages.yml` publishes it on every push to `main`.

One-time setup:
1. Repo **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. Push to `main`, or run the workflow manually from the **Actions** tab.
3. Open https://superklooom.github.io/tilbud/

## Running locally (optional)

Needs Node.js 18+. There are no dependencies to install.

```bash
cd tilbud
npm start            # live data via a local proxy, http://localhost:3000
npm run dev          # generated demo data (works offline)
npm test             # unit tests
```

When the app is served by `server.js`, it uses the server's `/api` proxy, which caches responses for 10 minutes.
On a static host it calls the APIs directly.

Optional environment variables: `PORT` (default 3000), `TJEK_API_KEY` (sent as `X-Api-Key` if Tjek ever requires one), `TILBUD_MOCK=1` (demo data).

## Weekly snapshots (price history)

```bash
npm run collect -- --address "Vesterbrogade 1, København" --radius 10000
npm run collect -- --lat 55.6761 --lng 12.5683 --radius 10000
```

This saves every offer nearby to `data/offers-<year>-W<week>.json`. Run it weekly from cron, e.g. on Wednesday mornings:

```
0 7 * * 3  cd /path/to/tilbud && npm run collect -- --address "..." >> collect.log 2>&1
```

## Project layout

```
.
├── public/             the web app (static, no build step)
│   ├── core.js         Tjek API client, normalisation, unit prices (shared with Node)
│   ├── dictionary.js   English→Danish product words, Danish terms and brands
│   ├── translate.js    dictionary first, MyMemory online translation for unknown words
│   ├── relevance.js    ranks the product itself above products that only mention it
│   ├── basket.js       My Basket totals, grouping by chain and offer end dates
│   ├── stores.js       which chains are supermarkets and which offers are non-food
│   └── app.js          UI
├── server.js           optional local server: static files + /api proxy
├── lib.js              Node wrapper around public/core.js
├── mock.js             demo data
├── scripts/collect.js  weekly snapshot
└── test/               unit tests
```

## Notes
- The Tjek API is not officially documented for public use, and its format may change. All mapping lives in `public/core.js`.
- eTilbudsavis also carries clothing, home and DIY chains, and hypermarkets sell non-food. Search results, All deals and the shopping-list comparison show supermarket groceries first; other stores and non-food items (detected by sizes, fabrics, bed dimensions and similar words) are behind a "Show results from other stores" button.
- Catalog products are in Danish. Danish search terms give the most results.
- English searches use the built-in dictionary (~360 words). Words it doesn't know are translated with the free [MyMemory](https://mymemory.translated.net/) API: only the search term is sent, and the result is cached in the browser.
- This is meant for personal use. Please respect the terms of etilbudsavis/Tjek and the OpenStreetMap Nominatim usage policy.
