# check-in: HDB Resale Finder

Search HDB resale flats in a card layout, filter them, and keep a personal shortlist.

- **Filters:** budget, flat type, remaining lease (closeness to MRT is in the "What matters to you?" panel)
- **Shortlist:** create, read, update (note) and delete
- **What matters to you?** tick and weight schools, MRT, hawker centres and parks; each card shows a match score
  and you can sort by best match
- **Extras:** nearby search (geospatial), nearest amenities, price range with each recent sale

Built with Vue 3 (Vite, `.vue` components), Bootstrap 5, Express and MongoDB (Mongoose).

**Data:** real HDB resale sales from the last 12 months, grouped per block and flat type (price range, median,
and each sale's month, storey, floor area and price per m²) for four towns:
Ang Mo Kio, Bishan, Punggol and Tampines. Coordinates come from OneMap; MRT stations, hawker centres,
parks and primary schools come from data.gov.sg. The app itself never calls those APIs: it reads two
JSON files in `server/data/`.

## Run it

You need Node 22+, pnpm (`npm install -g pnpm` once) and a MongoDB (Atlas or local).

```bash
pnpm install             # installs the server AND client/ (see pnpm-workspace.yaml)
pnpm format              # tidies the client code with Prettier
pnpm seed                # loads server/data/*.json into MongoDB
pnpm dev                 # website: http://localhost:5173   API: http://localhost:3030
pnpm test                # runs the tests (uses a temporary in-memory database)
```

With no `.env` file the app uses a MongoDB running on your own computer. To use Atlas instead,
copy `.env.example` to `.env` and put your `MONGODB_URI` in it.

`pnpm dev` starts two things: Vite (the Vue site, port 5173, with hot reload) and Express (the API, port 3030).
Vite passes every `/api/...` request on to Express, so the Vue code never mentions a port.

## Folders

```
client/                 the website (Vue + Bootstrap)
  src/App.vue           owns the shortlist, switches between the two pages
  src/api.js            all fetch() calls to the API
  src/views/            SearchView.vue, ShortlistView.vue  (the two pages)
  src/components/       NavBar, SearchBar, FilterPanel, PreferencesPanel, BlockCard, ShortlistItem
  src/matchScore.js     the "What matters to you?" match score (runs in the browser)
server/                 the API
  index.js              starts the server
  app.js                sets up Express and mounts the routes
  routes/               blocks.js, shortlist.js
  models/               what a Block, Amenity and Shortlist item look like in MongoDB
  lib/                  small helpers (filter, lease, nearest amenities...)
  data/                 blocks.json and amenities.json (the real data)
  seed.js               loads the JSON files into MongoDB
prep/                   one-time script that BUILT the JSON files (you do not need to run it)
tests/                  automated tests
```

## API contract

Errors always look like `{ "error": "message" }`.
`400` = a value is wrong (e.g. `maxPrice=abc`), `404` = not found, `409` = already exists.

| Method | URL | What it does |
|---|---|---|
| GET | `/api/health` | `{ "status": "ok" }` |
| GET | `/api/blocks` | Search + filter. Query: `q`, `flatType`, `maxPrice`, `minLease`. Returns `{ total, results: [card] }`, cheapest first. Each card has `distances: { school, mrt, hawker, park }` in metres |
| GET | `/api/blocks/nearby` | Blocks near a point. Query: `lat`, `lng` (required), `radius` in metres (default 1000, max 5000), `limit`. Each result has `distance` in metres |
| GET | `/api/blocks/:id` | One block |
| GET | `/api/blocks/:id/sales` | The recent sales behind the price range. Returns `{ count, lowest, highest, medianPrice, medianPricePerSqm, sales: [{ month, storey, areaSqm, price, pricePerSqm }] }`, newest first |
| GET | `/api/blocks/:id/amenities` | Nearest `mrt`, `hawker`, `park`, `school` with `distance` in metres |
| GET | `/api/shortlist` | All saved items, newest first |
| POST | `/api/shortlist` | Save a block. Body: `{ "blockId": "...", "note": "optional" }` |
| PATCH | `/api/shortlist/:id` | Change the note. Body: `{ "note": "text" }` |
| DELETE | `/api/shortlist/:id` | Remove an item (204, no body) |

A block card looks like:

```json
{
  "id": "6711...", "block": "233C", "street": "SUMANG LANE", "town": "PUNGGOL",
  "flatType": "4 ROOM", "price": 680000, "priceLow": 650000, "priceHigh": 720000, "salesCount": 3,
  "remainingLease": 91,
  "mrtName": "Punggol MRT", "mrtWalkMinutes": 4, "lat": 1.405, "lng": 103.903
}
```

## How the geospatial part works

Every block and amenity stores its position as a GeoJSON point `[longitude, latitude]` with a `2dsphere` index.
MongoDB's `$geoNear` then sorts by distance for us:

- `/api/blocks/nearby` uses `$geoNear` on **blocks** with a `maxDistance`.
- `/api/blocks/:id/amenities` uses `$geoNear` on **amenities** (once per category, `$limit: 1`).

Walking minutes to the nearest MRT are worked out once, when seeding
(straight-line distance x 1.3 / 80 metres per minute) and shown on each card.

## Match score ("What matters to you?")

The seed script stores the straight-line distance from each block to its nearest school, MRT, hawker centre
and park (`block.distances`). The browser then scores every card itself (`client/src/matchScore.js`),
so changing the panel updates the scores straight away without calling the server.

- Sub-score per category: `100 x (max - distance) / max`, and 0 if the amenity is further than `max`
- Max distances: school 1000 m, MRT 1000 m, hawker 800 m, park 800 m
- Weights: unticked = 0, Low 1, Moderate 2, Important 3, Very 4, Extremely 5
- Score = (sum of weight x sub-score) / (sum of weights), rounded. All weights 0 = no score ("–")

## Refreshing the data (optional)

`node prep/makeData.js "/path/to/resale-prices.csv"` rebuilds the two JSON files from the resale CSV
(download it from data.gov.sg). It looks up coordinates on OneMap and takes a few minutes. Answers are cached
in `prep/geocode-cache.json`, so a second run is quick. Change `TOWNS` at the top of the script for other towns.

`node prep/addSales.js "/path/to/resale-prices.csv"` only refreshes the sales and price ranges of the blocks
already in `blocks.json` (same blocks, same 12 months, no OneMap calls). Run `pnpm seed` afterwards.

`price` (used by the budget filter and sorting) is still the median; the card shows the range.

## Known limits

- The shortlist is shared by everyone who opens the site (there are no user accounts).
- Only four towns, and the 40 busiest blocks in each. Walking time is a straight-line estimate, not a real route.
