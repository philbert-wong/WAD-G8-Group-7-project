# Exercise 2 — URL filters → MongoDB query

**Make:** `buildListingsFilter(query)` in [`listingsFilter.js`](listingsFilter.js).
**Real version, for after:** the top half of [`server/routes/listings.js`](../../../server/routes/listings.js)

A browser sends `/api/listings?flatType=4%20ROOM&maxPrice=600000&minLease=60`. Express gives
you `req.query` — an object where **every value is a string**:

```js
{ flatType: "4 ROOM", maxPrice: "600000", minLease: "60" }
```

Turn it into what the route needs to call MongoDB.

## Return value
```js
{ filter, limit, maxPriceAfterShaping }
```
- `filter` — the object you'd pass to `Block.find(filter)`
- `limit` — how many blocks to return at most
- `maxPriceAfterShaping` — a number, or `null` (see the price rule below)

## Rules (the tests check each one)
| Query | Effect |
|---|---|
| (always) | `filter["location.coordinates"] = { $ne: [0, 0] }` — `[0,0]` means "not geocoded yet" |
| `lat`, `lng` **and** `radius > 0` | `filter.location = { $near: { $geometry: { type: "Point", coordinates: [lng, lat] }, $maxDistance: radius } }` and `limit = 300` |
| otherwise | no `location` filter, whole island, `limit = 12000` |
| `town` | `filter.town` = the town **uppercased** |
| `minLease` | `filter.remainingLeaseYears = { $gte: minLease }` |
| `maxWalkMin` | `filter["nearestMrt.walkMinutes"] = { $lte: maxWalkMin }` |
| `flatType` | `filter["stats.<flatType>"] = { $exists: true }` |
| `maxPrice` **and** `flatType` | `filter["stats.<flatType>.medianPrice"] = { $lte: maxPrice }` |
| `maxPrice` **without** `flatType` | no filter; return `maxPriceAfterShaping = maxPrice` instead |

Numbers must be real numbers (`600000`), not strings (`"600000"`). Anything missing, empty or
not a number is simply ignored — never put `NaN` in a query.

## Hints
- `Number("abc")` is `NaN`; `Number.isFinite(x)` is how to check.
- GeoJSON order is `[longitude, latitude]` — **lng first**. This is the most common bug in the whole project.
- Build `filter` up one `if` at a time.
- Why can't "price without flat type" go in MongoDB? Because *which* price to compare depends on which flat type — read `toApiShape.js`.

## Done when
1. `npx vitest run my-work/exercises/2-listings-filter` is green.
2. **Then wire it in:** replace the inline `filter` code in `server/routes/listings.js` with a call to your function (copy your file to `server/lib/listingsFilter.js` and import it). Keep `npm run test:unit` green and check `curl "localhost:3000/api/listings?flatType=4%20ROOM"` still answers.

## After
Why is the route now easier to test? (No database needed to test the filter logic.)
That is the lesson: **keep logic in plain functions; keep routes thin.**
