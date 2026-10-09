# The one path to understand

When someone opens the map, one request goes from the browser to the database and back.
Read these in order. Answer the questions in **your own words** (write them below each, or in a notebook).

## 1. [`client/src/views/Explore.vue`](../client/src/views/Explore.vue)
Find the `watch(...)` and `onMounted(...)`.
- When does the page ask for blocks? What changes make it ask again?
- Why is there a 200 ms delay (`setTimeout`) before it asks?

## 2. [`client/src/stores/listings.js`](../client/src/stores/listings.js) — `load()`
- What does `token` / `mine` protect against? (Hint: two requests, the slow one finishes last.)
- When are `lat` and `lng` added to the request, and when are they left out?
- Why is `blocks` a `shallowRef` and not a normal `ref`?

## 3. [`client/src/api/client.js`](../client/src/api/client.js) and [`api/listings.js`](../client/src/api/listings.js)
- Where does the login token get attached to requests? Why only there?
- What happens to an error from the server before the page sees it?
- How does `/api/...` reach the API port (`PORT` in `.env`, 3001 here) when the page is on 5173? ([`vite.config.js`](../client/vite.config.js))

## 4. [`server/routes/listings.js`](../server/routes/listings.js)
- What does `$near` do, and why does it need the 2dsphere index?
- What is the difference between a "near" search and an "island" search?
- Why is the price filter applied in MongoDB when a flat type is chosen, but in JavaScript when it isn't?
- Why does it exclude `[0, 0]` coordinates?
- Why `.lean()` and `.select("-nearestMrt.geometry")`?

## 5. [`server/models/Block.js`](../server/models/Block.js)
- Why are summaries (`stats`, `amenityAccess`) stored on the block instead of calculated per request?
- What is `key` for?

## 6. [`server/lib/toApiShape.js`](../server/lib/toApiShape.js) and its [test](../tests/unit/toApiShape.test.js)
- Why does the app have a "contract" at all? What does the test protect?
- Why does it report 4 ROOM when no flat type is chosen?

## 7. Back in the browser
- Open DevTools → Network → `listings`. Compare the JSON with `toApiShape`. Can you match every field?
- Change a slider and watch the request parameters change.

## Check yourself
Without looking: draw the path as boxes and arrows — *slider → store → api client → Express
route → MongoDB → toApiShape → store → map*. Label what travels along each arrow.
