# Exercise 1 — distance between two points

**Make:** `haversineM(a, b)` in [`haversine.js`](haversine.js).
**Real version, for after:** [`server/lib/geo.js`](../../../server/lib/geo.js)

Given two points `{ lat, lng }` (degrees), return the straight-line distance over the Earth's
surface **in metres**.

## Why it exists
Every block needs "how far is the nearest park / school / clinic?". The database can find
nearby things, but for the *score* we want the number of metres, computed offline once per block.

## The idea
The Earth is (roughly) a sphere of radius **6,371,000 m**. The distance between two points on
a sphere is `radius × angle between them`. The haversine formula finds that angle:

```
dLat = lat2 − lat1        dLng = lng2 − lng1        (all in RADIANS)
h    = sin²(dLat/2) + cos(lat1) · cos(lat2) · sin²(dLng/2)
dist = 2 · R · asin(√h)
```

## Hints
- JavaScript's `Math.sin` etc. want **radians**. Degrees → radians is `deg × π / 180`.
- `x ** 2` squares a number.
- Why `cos(lat1) · cos(lat2)`? Lines of longitude squeeze together away from the equator.
- Check by hand: one degree of latitude is about 111 km, so `{lat: 0, lng: 0}` to `{lat: 1, lng: 0}` ≈ 111,000 m.

## Done when
`npx vitest run my-work/exercises/1-haversine` is green.

## After
Open the real file. Is it the same? Then, bonus: write `nearestByType(point, amenities)`
(finds the closest amenity of each kind) and read its tests in `tests/unit/geo.test.js`.
