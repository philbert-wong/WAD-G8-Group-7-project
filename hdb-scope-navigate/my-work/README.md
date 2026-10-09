# My work — Back-end, API, integration, deployment & tests

**My role:** Express API structure and API contract · block search and filter endpoints
(geospatial queries) · amenity distance and personalised score computation · deployment ·
integration · test setup.

This folder does **not** hold the app's code — that stays where it is, so the app keeps
working. It holds three things:

| File / folder | What it is |
|---|---|
| [`files-to-code.md`](files-to-code.md) | **Which files I need to code** — every file in my role, marked NEW or EXISTS, with the order to write them |
| [`checklist.md`](checklist.md) | **What I need to do** — tasks in order, with tick boxes |
| [`request-path.md`](request-path.md) | A guided read of the one path that matters, with questions to answer as I go |
| [`exercises/`](exercises/) | **What I need to make** — three things to write myself. Tests are given, answers are not |
| [`deploy.md`](deploy.md) | Step-by-step deployment to Render, and what to check afterwards |

## My files in the app

| Responsibility | Where it lives |
|---|---|
| **Express API structure** | [`server/app.js`](../server/app.js) · [`server/routes/`](../server/routes/) · [`server/middleware/auth.js`](../server/middleware/auth.js) · [`server/config/db.js`](../server/config/db.js) |
| **API contract** | README → *The API contract* · [`server/lib/toApiShape.js`](../server/lib/toApiShape.js) · [`tests/unit/toApiShape.test.js`](../tests/unit/toApiShape.test.js) · [`client/src/api/`](../client/src/api/) |
| **Block search & filter endpoints** | [`server/routes/listings.js`](../server/routes/listings.js) · [`server/models/Block.js`](../server/models/Block.js) (the 2dsphere index) · [`server/routes/blocks.js`](../server/routes/blocks.js) |
| **Amenity distance** | [`server/lib/geo.js`](../server/lib/geo.js) · [`server/services/amenityAccess.js`](../server/services/amenityAccess.js) · [`scripts/compute-amenity-access.js`](../scripts/compute-amenity-access.js) · [`server/models/Amenity.js`](../server/models/Amenity.js) · [`server/routes/amenities.js`](../server/routes/amenities.js) |
| **Personalised score** | [`client/src/lib/score.js`](../client/src/lib/score.js) · `SCORE_CATEGORIES` in [`client/src/lib/constants.js`](../client/src/lib/constants.js) |
| **Deployment** | [`package.json`](../package.json) scripts · the static serving at the bottom of [`server/app.js`](../server/app.js) · [`.env.example`](../.env.example) |
| **Integration** | [`client/src/stores/listings.js`](../client/src/stores/listings.js) · [`client/vite.config.js`](../client/vite.config.js) · [`client/src/api/client.js`](../client/src/api/client.js) |
| **Test setup** | [`tests/unit/`](../tests/unit/) · [`tests/api/`](../tests/api/) (empty — mine to fill) · [`cypress.config.js`](../cypress.config.js) |

## Not mine

The Vue pages and components, the regression (`regression.js`, `trends.js`) and the
real-data seed scripts belong to teammates. I only need to understand them at the level of
"what goes in, what comes out".

## Commands

```bash
npm run my-work       # run my exercise tests (they FAIL at first — that's the point)
npm run test:unit     # the app's own unit tests (should always pass)
npm run dev           # API on :3001 (the PORT in .env)
npm --prefix client run dev   # app on :5173
```
