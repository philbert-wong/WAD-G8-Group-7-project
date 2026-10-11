# check-in: HDB Resale Finder

Search HDB resale flats in a card layout, filter them, and keep a personal shortlist.

- **Filters:** budget, flat type, remaining lease, maximum walking minutes to MRT
- **Shortlist:** create, read, update (note) and delete
- **Extras:** nearby search (geospatial), nearest amenities, personalised score out of 100

Built with Vue 3 (Vite, `.vue` components), Bootstrap 5, Express and MongoDB (Mongoose).

**Data:** real HDB resale prices (median of the last 12 months, per block and flat type) for four towns:
Ang Mo Kio, Bishan, Punggol and Tampines. Coordinates come from OneMap; MRT stations, hawker centres,
parks and primary schools come from data.gov.sg. The app itself never calls those APIs: it reads two
JSON files in `server/data/`.

## Run it

You need Node 20+ and a MongoDB (Atlas or local).

```bash
npm install
npm --prefix client install
cp .env.example .env     # then put your MONGODB_URI in .env
npm run seed             # loads server/data/*.json into MongoDB
npm run dev              # website: http://localhost:5173   API: http://localhost:3030
npm test                 # runs the tests (uses a temporary in-memory database)
```

`npm run dev` starts two things: Vite (the Vue site, port 5173, with hot reload) and Express (the API, port 3030).
Vite passes every `/api/...` request on to Express, so the Vue code never mentions a port.

## Folders

```
client/                 the website (Vue + Bootstrap)
  src/App.vue           owns the shortlist, switches between the two pages
  src/api.js            all fetch() calls to the API
  src/views/            SearchView.vue, ShortlistView.vue  (the two pages)
  src/components/       NavBar, SearchBar, FilterPanel, BlockCard, ShortlistItem
server/                 the API
  index.js              starts the server
  app.js                sets up Express and mounts the routes
  routes/               blocks.js, shortlist.js
  models/               what a Block, Amenity and Shortlist item look like in MongoDB
  lib/                  small helpers (filter, score, lease, nearest amenities...)
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
| GET | `/api/blocks` | Search + filter. Query: `q`, `flatType`, `maxPrice`, `minLease`, `maxWalk`, `limit`. Returns `{ total, results: [card] }`, cheapest first |
| GET | `/api/blocks/nearby` | Blocks near a point. Query: `lat`, `lng` (required), `radius` in metres (default 1000, max 5000), `limit`. Each result has `distance` in metres |
| GET | `/api/blocks/:id` | One block |
| GET | `/api/blocks/:id/amenities` | Nearest `mrt`, `hawker`, `park`, `school` with `distance` in metres |
| GET | `/api/blocks/:id/score` | Personalised score. Query: `budget`, and weights `mrt`, `hawker`, `park`, `school`, `price`, `lease` (0 to 5). Returns `{ score, breakdown, distances }`; score is 0 to 100, breakdown values are 0 to 1. Price only counts when `budget` is given |
| GET | `/api/shortlist` | All saved items, newest first |
| POST | `/api/shortlist` | Save a block. Body: `{ "blockId": "...", "note": "optional" }` |
| PATCH | `/api/shortlist/:id` | Change the note. Body: `{ "note": "text" }` |
| DELETE | `/api/shortlist/:id` | Remove an item (204, no body) |

A block card looks like:

```json
{
  "id": "6711...", "block": "233C", "street": "SUMANG LANE", "town": "PUNGGOL",
  "flatType": "4 ROOM", "price": 680000, "remainingLease": 91,
  "mrtName": "Punggol MRT", "mrtWalkMinutes": 4, "lat": 1.405, "lng": 103.903
}
```

## How the geospatial part works

Every block and amenity stores its position as a GeoJSON point `[longitude, latitude]` with a `2dsphere` index.
MongoDB's `$geoNear` then sorts by distance for us:

- `/api/blocks/nearby` uses `$geoNear` on **blocks** with a `maxDistance`.
- `/api/blocks/:id/amenities` uses `$geoNear` on **amenities** (once per category, `$limit: 1`).

Walking minutes to the nearest MRT are worked out once, when seeding
(straight-line distance x 1.3 / 80 metres per minute), so the "max walk" filter is just a number comparison.

## Score formula

Each factor becomes a number from 0 to 1, then we take a weighted average x 100.

| Factor | 0 | 1 |
|---|---|---|
| mrt / hawker / park / school | 2000 m or more | 300 m or less |
| price | at your budget | half your budget or less |
| lease | 40 years or less | 90 years or more |

## Deploy (Render, free)

1. Push this folder to its own GitHub repo (`.env` is ignored, so your password is not pushed).
2. On [render.com](https://render.com): **New > Web Service**, pick the repo.
3. Build command: `npm install && npm run build`   Start command: `npm start`
4. Under **Environment**, add `MONGODB_URI` (your Atlas string).
5. In Atlas **Network Access**, allow `0.0.0.0/0` so Render can connect.
6. Run `npm run seed` once on your own computer (it fills the same Atlas database).

Express serves the website and the API from the same address, so there is nothing else to configure.

## Refreshing the data (optional)

`node prep/makeData.js "/path/to/resale-prices.csv"` rebuilds the two JSON files from the resale CSV
(download it from data.gov.sg). It looks up coordinates on OneMap and takes a few minutes. Answers are cached
in `prep/geocode-cache.json`, so a second run is quick. Change `TOWNS` at the top of the script for other towns.

## Known limits

- The shortlist is shared by everyone who opens the site (there are no user accounts).
- Only four towns, and the 40 busiest blocks in each. Walking time is a straight-line estimate, not a real route.
