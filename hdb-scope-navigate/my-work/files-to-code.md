# What I need to code

My role: **Back-end** — Express API structure and API contract · block search and filter
endpoints (geospatial queries) · amenity distance and personalised score computation ·
deployment · integration · test setup.

Each file is marked:

- **SKELETON** — a file with comments saying exactly what to write, in what order. I fill it in.
  Nothing is wired into the app yet, so the app keeps working until I do.
- **NEW** — doesn't exist yet; the code comes from an [exercise](exercises/). I copy it in once the tests pass.
- **EXISTS** — the app already has a working version. I must own it: understand it, be able to
  explain it, and be able to rewrite it from a blank file.

## Write these first

| Order | File | Why |
|---|---|---|
| 1 | [`server/createApp.js`](../server/createApp.js) — **SKELETON** | Lets the app be tested without Atlas (step 1 of test setup) |
| 2 | `server/lib/listingsFilter.js` — **NEW** | [Exercise 2](exercises/2-listings-filter/) |
| 3 | [`tests/api/setup.js`](../tests/api/setup.js) and [`tests/api/listings.test.js`](../tests/api/listings.test.js) — **SKELETON** | The biggest gap in my area: nothing tested the routes before |
| 4 | `server/lib/score.js` — **NEW** | [Exercise 3](exercises/3-score/) |
| 5 | Deploy using [`deploy.md`](deploy.md) | The live link is part of the submission |

---

## 1. Express API structure

| File | Status | What it does |
|---|---|---|
| [`server/app.js`](../server/app.js) | EXISTS | Wires the routes together, serves the built client, handles errors |
| [`server/createApp.js`](../server/createApp.js) | **SKELETON** | Builds the Express app **without** connecting to the database or calling `listen`. `app.js` then just calls it. API tests need this split. |
| [`server/routes/listings.js`](../server/routes/listings.js) | EXISTS | Search + filter blocks |
| [`server/routes/blocks.js`](../server/routes/blocks.js) | EXISTS | One block's full detail |
| [`server/routes/amenities.js`](../server/routes/amenities.js) | EXISTS | Amenities inside the map's visible area |
| [`server/routes/geocode.js`](../server/routes/geocode.js) | EXISTS | Postal code → coordinates |
| [`server/middleware/auth.js`](../server/middleware/auth.js) | EXISTS | Checks the login token |
| [`server/config/db.js`](../server/config/db.js) | EXISTS | Connects to MongoDB |
| [`server/middleware/validate.js`](../server/middleware/validate.js) | **SKELETON (optional)** | Rejects bad query values with a 400 instead of passing them to the database |

## 2. API contract

| File | Status | What it does |
|---|---|---|
| [`server/lib/toApiShape.js`](../server/lib/toApiShape.js) | EXISTS | Defines exactly what a block looks like in the response |
| [`tests/unit/toApiShape.test.js`](../tests/unit/toApiShape.test.js) | EXISTS | Fails if anyone changes that shape |
| [`client/src/api/`](../client/src/api/) | EXISTS | The only frontend code that calls the server |
| [`README.md`](../README.md) → *The API contract* | EXISTS | The list of routes the team agreed |
| `docs/api-contract.md` | **NEW (optional)** | One page the whole team checks against, instead of a README section |

## 3. Block search and filter endpoints (geospatial)

| File | Status | What it does |
|---|---|---|
| [`server/routes/listings.js`](../server/routes/listings.js) | EXISTS | The `$near` search and the whole-island search |
| `server/lib/listingsFilter.js` | **NEW** | [Exercise 2](exercises/2-listings-filter/) — the filter logic, pulled out of the route so it can be tested |
| [`server/models/Block.js`](../server/models/Block.js) | EXISTS | Holds the `2dsphere` index that `$near` depends on |

## 4. Amenity distance

| File | Status | What it does |
|---|---|---|
| [`server/lib/geo.js`](../server/lib/geo.js) | EXISTS | Haversine distance — [Exercise 1](exercises/1-haversine/) |
| [`server/services/amenityAccess.js`](../server/services/amenityAccess.js) | EXISTS | Works out each block's nearest distance to each amenity type and stores it |
| [`scripts/compute-amenity-access.js`](../scripts/compute-amenity-access.js) | EXISTS | Runs that offline (`npm run amenity-access`) |
| [`server/models/Amenity.js`](../server/models/Amenity.js) | EXISTS | The amenity data and its index |
| [`tests/unit/geo.test.js`](../tests/unit/geo.test.js) | EXISTS | Tests for the distance maths |

## 5. Personalised score

| File | Status | What it does |
|---|---|---|
| [`client/src/lib/score.js`](../client/src/lib/score.js) | EXISTS | Today's version — runs in the browser so sliders respond instantly |
| `server/lib/score.js` | **NEW** | [Exercise 3](exercises/3-score/) — the same maths on the server |
| [`server/routes/score.js`](../server/routes/score.js) and [`client/src/api/score.js`](../client/src/api/score.js) | **SKELETON — only if I decide the score belongs on the server** | e.g. `POST /api/score`, or a `weights` parameter on `/api/listings` |

> Decide and write down why: browser (instant, no requests per slider drag) or server
> (sorting/paging a large result, formula not exposed)? See the end of Exercise 3's README.

## 6. Test setup

| File | Status | What it does |
|---|---|---|
| [`tests/api/setup.js`](../tests/api/setup.js) | **SKELETON** | Starts an in-memory MongoDB and seeds a few blocks |
| [`tests/api/listings.test.js`](../tests/api/listings.test.js) | **SKELETON** | Tests for `GET /api/listings` — near search, island search, each filter |
| [`tests/api/blocks.test.js`](../tests/api/blocks.test.js) | **SKELETON** | `GET /api/blocks/:id` — found, and 404 for a bad id |
| [`tests/api/auth.test.js`](../tests/api/auth.test.js) | **SKELETON** | Register, duplicate email → 409, wrong password → 401 |
| [`tests/api/contract.test.js`](../tests/api/contract.test.js) | **SKELETON** | Checks the real responses match the contract — stops frontend and backend drifting apart |
| `vitest.config.js` | **NEW (optional)** | Points the API tests at `setup.js` |
| [`tests/unit/`](../tests/unit/) | EXISTS | The app's unit tests (`npm run test:unit`) |
| [`cypress.config.js`](../cypress.config.js) | EXISTS | End-to-end test config |

`supertest` and `mongodb-memory-server` are already installed. The first API test run
downloads a MongoDB binary, so it needs internet.

## 7. Deployment

| File | Status | What it does |
|---|---|---|
| [`package.json`](../package.json) | EXISTS | `build` and `start` scripts the host runs |
| [`.env.example`](../.env.example) | EXISTS | The list of environment variables to set on the host |
| [`server/app.js`](../server/app.js) | EXISTS | The bottom of the file serves the built client |
| [`render.yaml`](../render.yaml) | **GIVEN (check it)** | Describes the Render service so it can be recreated. Complete, but untested against Render. |
| [`deploy.md`](deploy.md) | EXISTS | My step-by-step checklist |

## 8. Integration

| File | Status | What it does |
|---|---|---|
| [`client/src/api/client.js`](../client/src/api/client.js) | EXISTS | The one axios instance; attaches the login token |
| [`client/src/stores/listings.js`](../client/src/stores/listings.js) | EXISTS | Where the browser asks the API for blocks |
| [`client/vite.config.js`](../client/vite.config.js) | EXISTS | Sends `/api` from port 5173 to Express on `PORT` (3001 here) |

---

## How I know I own an EXISTS file
I can do all of these without looking:
1. Say what goes in and what comes out.
2. Say what breaks if I delete it.
3. Rewrite the main function from a blank file.

If I can't, it goes back on the checklist.
