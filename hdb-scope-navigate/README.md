# HDB Scope & Navigate

HDB resale prices, remaining lease and real walking times to the MRT, on one map.

IS216 Web Application Development 2 — AY2026/27 Term 1, Group \_\_\_\_.

> **Every feature in the proposal is built and runs on the sample data.** What is
> left is loading the *real* data (below), checking the grant figures against HDB,
> and the final QA/E2E pass — see the TODO list at the end.

## What's in the app

| Page / feature | Where |
|---|---|
| **Explore map** — every block, clustered, coloured by median price per sqm; filters for flat type, town, budget, remaining lease, walk to MRT, search area | `/explore` |
| **Search** by postal code / address (OneMap) or **drop a pin**; optional radius around the pin | `SearchBox`, `MapView` |
| **Personal score** — sliders for transport, food, greenery, healthcare, schools, eldercare; presets; live ranking; colour-by-score; min-score cut-off | `ScorePanel`, `lib/score.js` |
| **Amenity layers** — schools, parks, hawker centres, clinics, eldercare, for the area on screen | `AmenityToggles` |
| **Proximity Housing Grant layer** — enter a parent's address, blocks within 4 km are highlighted or isolated | `PhgPanel` |
| **Block sidebar** — price by flat type, lease bar, real walking route to the MRT drawn on the map, amenity access, town trend, price chart, transactions | `BlockSidebar` |
| **Price trends** — $/year per town and flat type, from a multiple linear regression | `/trends` |
| **Lease decay** — what one remaining lease year is worth per sqm | `/trends` |
| **Affordability calculator** — loan (MSR/TDSR), dearest flat, downpayment split, CPF/EHG/PHG grants; "use as map budget" | `/affordability` |
| **Accounts** — register, sign in (bcrypt + JWT), saved filters / priorities / layers | `/register`, `/login` |
| **Shortlist** (full CRUD with notes) and **side-by-side compare** (up to 4) | `/shortlist`, `/compare` |
| **Responsive** — Bootstrap 5; checked at 375 (iPhone 6), 768 and 1400 px | everywhere |

---

## Get it running in 10 minutes

You need **Node 20+** and a free **MongoDB Atlas** cluster.

```bash
git clone <your repo url>
cd hdb-scope-navigate

npm install
npm --prefix client install

cp .env.example .env      # then open .env and fill it in
```

Fill in `.env`:

| Variable | Where to get it | Needed for |
|---|---|---|
| `MONGODB_URI` | [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) — free M0 cluster | everything |
| `JWT_SECRET` | make one up, any long random string | login |
| `ONEMAP_EMAIL` / `ONEMAP_PASSWORD` | [OneMap register](https://www.onemap.gov.sg/apidocs/register) — free | search, geocoding, walk times |
| `LTA_ACCOUNT_KEY` | [LTA DataMall](https://datamall.lta.gov.sg/content/datamall/en/request-for-api.html) — free | optional, MRT station list |

Then:

```bash
npm run seed:sample       # 15 blocks of INVENTED data, so the map works immediately
npm run dev               # API on :3000

# in a second terminal
npm --prefix client run dev   # app on :5173
```

Open **http://localhost:5173/explore**, search `560406`, and you should see markers.

> **Port already in use?** If another project is using `:3000`, set `PORT=3001` in `.env`.
> The API listens on `PORT` and the Vite proxy (`client/vite.config.js`) reads the same
> value, so nothing else needs changing. (`curl localhost:3001/api/health` to check.)

### Why two terminals?

Two `package.json` files, two processes in development:

- **Vite** serves the Vue app on `:5173` with hot reload.
- **Express** serves the API on `:3000`.
- Vite proxies `/api/*` through to Express (see `client/vite.config.js`), so
  frontend code never mentions a port.

In production there is only one process: `npm run build` compiles the Vue app into
`client/dist/`, and Express serves it. That's what `npm start` does.

---

## Loading the real data

The sample seed is fake. The real pipeline is three steps, in order, and the middle
one takes hours.

```bash
npm run seed          # ~5 min   downloads 240,000 real transactions
npm run geocode       # HOURS    gives every block coordinates, via OneMap
npm run walk-times    # HOURS    real walking routes to the nearest MRT
```

**Start `npm run geocode` in the evening and leave it.** It's safe to stop and
restart — it only processes blocks that don't have coordinates yet, so it resumes
where it left off. Do this well before the Week 9 pitch; a live geocoding run
during a demo is the most avoidable failure in this project.

Then the amenities and the models, which the score, layers and trends depend on:

```bash
npm run seed:amenities    # ~5 min   real hawker/park/clinic/eldercare/primary-school data,
                          #          then measures every block's distance to each kind
npm run fit-models        # seconds  refits the price-trend and lease-decay regressions
npm run seed:grants       # instant  writes the grant/loan rules the calculator reads
```

`seed:amenities` has two safety switches: `--dry-run` downloads, parses and validates
everything but writes nothing, and `--no-schools` skips the slow school geocoding.
It **replaces** all amenities, including the sample ones — run it *after*
`npm run geocode`, because distances are measured from each block's coordinates.

Afterwards, `npm run refresh` tops up with new transactions (follow it with
`npm run fit-models`). That's the weekly job.

---

## Tests

```bash
npm run test:unit     # pure functions — fast, no database
npm run test:api      # routes against an in-memory MongoDB
npm run test:e2e      # Cypress; both dev servers must be running
```

E2E specs stub the government APIs with `cy.intercept`, so tests never depend on
OneMap being up and never consume rate limit. Every element a test touches has a
`data-cy` attribute — **never select on a CSS class**, because styling changes.

---

## External APIs — what's real, what it costs

| API | Auth | Notes |
|---|---|---|
| **data.gov.sg** resale prices | none | Dataset `d_8b84c4ee58e3cfc0ece0d773c8ca6abc`, ~240,600 rows, updated daily. Bulk download for the seed; `datastore_search` (100 rows/page, ~5 req/min) for top-ups. |
| **OneMap** search / routing | **token required** | Register free. See the warning below. |
| **LTA DataMall** | account key | Free. Only needed for the full MRT station list. |
| **OpenStreetMap** tiles | none | Free, but respect the [tile usage policy](https://operations.osmfoundation.org/policies/tiles/) — fine for a student project. |

### ⚠️ OneMap gotchas — read before touching `server/services/onemap.js`

1. **Every endpoint needs a token now, including Search.** It used to be open.
   Most tutorials online are out of date.
2. **The header is `Authorization: <token>`, not `Bearer <token>`.**
3. **Failures come back as HTTP 200.** A missing, expired or invalid token returns
   status `200` with an `error` field and an empty `results` array. `if (!res.ok)`
   will *not* catch it. All OneMap calls go through `callOneMap()`, which checks
   the body and retries once with a fresh token.
4. Tokens last **3 days**. The service caches one in memory and renews it
   automatically.

---

## Where things live, and who owns them

| Path | Owner | What |
|---|---|---|
| `client/src/api/` | Lead | ★ The only frontend code that calls our server |
| `client/src/styles/`, `App.vue`, `views/Login.vue` | Shell & UI | Layout, filters, auth pages, responsive |
| `client/src/components/BlockSidebar.vue`, `PriceChart.vue`, `views/Trends.vue`, `Shortlist.vue`, `Compare.vue` | Data Views | Charts, tables, comparison |
| `client/src/components/MapView.vue`, `SearchBox.vue`, `PhgPanel.vue`, `views/Affordability.vue`, `lib/affordability.js` | Maps | Leaflet, clustering, geocoding, grant layer, calculator |
| `client/src/stores/` | Shell & UI / Maps | Pinia: filters, map, score, listings, shortlist, trends, preferences |
| `server/lib/regression.js`, `trends.js`, `amenityParsers.js` | Data & QA | The maths and parsers — pure, unit-tested |
| `server/routes/`, `server/models/` | Backend | Endpoints, schemas, auth |
| `server/services/` | Maps + Data | ★ The only code that knows external APIs |
| `scripts/` | Data + Maps | Run by hand, never by a web request |
| `tests/`, `cypress/` | Data & QA | QA owns E2E; everyone unit-tests their own code |

**The two ★ folders are the point.** No component calls `axios` directly, and no
file outside `server/services/` knows that OneMap calls its field `LATITUDE`. When
a government API changes, one file changes.

---

## The API contract

Agreed in Week 5. Changing any of this means telling the whole team.

```
GET    /api/health
GET    /api/geocode?q=560406
GET    /api/listings?lat&lng&radius&flatType&town&maxPrice&minLease&maxWalkMin
GET    /api/blocks/:id
GET    /api/amenities?types=school,park&west&south&east&north
GET    /api/trends?flatType=4 ROOM         GET /api/trends/lease
GET    /api/grants
POST   /api/auth/register        POST /api/auth/login
GET    /api/me/preferences       PUT  /api/me/preferences          (signed in)
GET    /api/shortlist            POST /api/shortlist               (signed in)
PATCH  /api/shortlist/:id        DELETE /api/shortlist/:id         (signed in)
```

`/api/listings` with no `lat`/`lng`/`radius` (or `radius=0`) searches the **whole
island**; with all three it is a `$near` query sorted by distance and capped at 300.
It always returns:

`/api/listings` always returns:

```json
{
  "count": 42,
  "blocks": [{
    "id": "66f0a1...",
    "block": "406",
    "streetName": "ANG MO KIO AVE 10",
    "town": "ANG MO KIO",
    "lat": 1.3620,
    "lng": 103.8540,
    "medianPrice": 528000,
    "medianPsm": 5739,
    "txnCount": 37,
    "remainingLeaseYears": 52,
    "nearestMrt": { "name": "Ang Mo Kio", "walkMinutes": 8 },
    "amenityAccess": { "school": 293, "park": 416, "hawker": 942, "healthcare": 147, "eldercare": 1191 }
  }]
}
```

`amenityAccess` is metres to the nearest of each kind (`null` where unknown) and was
added for the personal score. With no `flatType` filter, `medianPrice`/`medianPsm`
report **4 ROOM** (falling back to the busiest type) so blocks compare like for like.

`tests/unit/toApiShape.test.js` fails if anyone changes that shape, on purpose.

---

## Traps we have already hit

- **GeoJSON is `[longitude, latitude]`.** Backwards puts every flat off the coast
  of Africa. `toApiShape` has a test for this.
- **The resale dataset has no coordinates.** Block number and street name only.
  That's the whole reason `npm run geocode` exists.
- **`remaining_lease` is `"52 years 04 months"`,** not a number.
- **Everything from data.gov.sg is a string,** including `resale_price`.
- **Postal codes in the MOE schools file lose their leading zero** (`088256` → `88256`).
  `amenityParsers.js` puts it back; without that, three primary schools vanish.
- **data.gov.sg rate-limits downloads to about one per 10 seconds** (HTTP 429).
- **The regression drops "remaining lease" for a group whose blocks all share one
  lease start date** — inside one block, lease left is exactly "minus the sale date",
  so the two can't be separated. The result says so (`leaseControlled: false`).
- **Don't put the Leaflet map in a `ref()`.** Vue will try to make its internals
  reactive and the map gets very slow. Keep it in a plain variable.

---

## Deploy

1. `npm run build`
2. Set the same env vars on the host (Render / Railway / Fly.io free tier).
3. `npm start` — Express serves both the API and the built client.
4. **Pick a tier that doesn't cold-sleep**, or add an uptime ping. Verify the link
   the morning of submission.

---

## TODO before submission

- [ ] **Run the real pipeline** — `seed` → `geocode` → `walk-times` → `seed:amenities` → `fit-models`
      — and check the map, trends and score on the deployed app. Sample data must not appear in the demo.
- [ ] **Check the grant figures against HDB** (`server/lib/grantDefaults.js`, last checked 2026-08-20).
      HDB publishes only the max, ceiling and end-points of the EHG, so the bands in between are
      *interpolated* — paste in HDB's table if you have it, then `npm run seed:grants`.
- [ ] Full MRT station list from LTA DataMall (`Maps`) — `compute-walk-times.js` still has 8 stations
- [ ] E2E-02 … E2E-08 for the new features (`Data & QA`) — only E2E-01 (search) exists
- [ ] API tests (`tests/api` is empty) — the routes were checked by hand against a live database
- [ ] Real-data scale check: the island-wide listing returns every block (~10,000); confirm the map stays smooth
- [ ] Record the video: max 12 minutes, 720p or better, upload to YouTube
