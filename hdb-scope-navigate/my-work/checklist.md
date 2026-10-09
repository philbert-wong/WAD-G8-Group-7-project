# What I need to do

Work top to bottom. Tick a box only when I could **explain it to a teammate without looking**.

## 1. Understand what exists
- [ ] Read [`request-path.md`](request-path.md) and answer every question in my own words
- [ ] Run the app, open `/explore`, and watch the Network tab: find the `/api/listings` call and read its response
- [ ] Explain, out loud, why `[longitude, latitude]` is the order in MongoDB (README → *Traps*)
- [ ] Explain what the `2dsphere` index on `Block.location` is for, and what breaks without it

## 2. Make things myself (see [`exercises/`](exercises/))
- [ ] **Exercise 1** — write `haversineM` (distance between two points)
- [ ] **Exercise 2** — write `buildListingsFilter` (turn URL filters into a MongoDB query), then wire it into `routes/listings.js`
- [ ] **Exercise 3** — write the personal score on the server (`categoryScore`, `personalScore`)
- [ ] Decide: should the score stay in the browser, or get a server endpoint? Write the reason down in two sentences

## 3. API contract
- [ ] Re-read README → *The API contract*; confirm every route listed exists in `server/routes/`
- [ ] Confirm `tests/unit/toApiShape.test.js` fails if I rename a field (try it, then undo)
- [ ] Agree any change to the contract with the team *before* making it

## 4. Test setup
- [ ] Write `server/createApp.js` (skeleton given) so the app can be tested, and shrink `server/app.js` to use it
- [ ] Write `tests/api/setup.js`, then turn the `it.todo` lines in `tests/api/listings.test.js` into real tests
- [ ] Turn the todos in `tests/api/blocks.test.js`, `auth.test.js` and `contract.test.js` into real tests
- [ ] `npm run test:unit` and `npm run test:api` both pass from a clean clone
- [ ] Run the one Cypress spec (`npm run test:e2e`) with both servers up

**Notes for API tests.** `mongodb-memory-server` and `supertest` are already installed. The
first run downloads a MongoDB binary, so it needs internet and a minute. Pattern: start an
in-memory database, connect Mongoose to it, insert two or three `Block` documents, then use
`supertest` against the Express `app` (exported from `server/app.js` — you will need to
stop it connecting to Atlas and listening when under test). That last point is a real design
problem worth solving: split app creation from `app.listen`.

## 5. Deployment — see [`deploy.md`](deploy.md)
- [ ] Deploy to Render with the real `.env` values
- [ ] Open `/api/health` on the live URL
- [ ] Load the real data (`seed`, `geocode`, `walk-times`, `seed:amenities`, `fit-models`) against the live database
- [ ] Check the live site on a phone, and check it again the morning of the demo (free tiers sleep)

## 6. Integration (ongoing)
- [ ] When a teammate changes an API call, check it still matches the contract
- [ ] Keep one list of environment variables (`.env.example`) up to date
- [ ] Before the demo: run the whole app from a fresh clone, following only the README
