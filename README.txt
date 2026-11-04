HDB RESALE FINDER
IS216 Web Application Development II, G8 Group 7
==========================================================================================

Buying a resale HDB flat usually starts with "which area can we afford, and what is near it?".
Listing sites show asking prices one flat at a time. Our app shows what blocks actually sold for in
the last 12 months, so buyers can compare areas, check what they can afford, and keep a shortlist.

What you can do:
  - search blocks by town, street, block or postal code, and filter by budget, flat type and lease
  - rank flats by what matters to you (schools, MRT, hawker centres, parks)
  - see each block's recent sales, a price chart and the nearest amenities
  - see every block on a map, including a 4 km circle around your parents (for the PHG grant)
  - work out a maximum budget with HDB grants and an HDB loan, then search with it
  - save flats, add notes, and compare 2 to 3 of them side by side

Built with:
  Front end   Vue 3 (Vite), Vue Router, Pinia, axios, Bootstrap 5, Leaflet (map), Chart.js (chart)
  Back end    Node.js, Express 5, Mongoose, JWT + bcrypt for login
  Data store  MongoDB (local, or MongoDB Atlas)
  APIs        data.gov.sg (HDB resale prices), OneMap (address search and walking routes),
              OpenStreetMap (map tiles)


------------------------------------------------------------------------------------------
1. LINKS
------------------------------------------------------------------------------------------

Deployed app:   [fill in]
Git repository: https://github.com/philbert-wong/WAD-G8-Group-7-project
Video:          [fill in]


------------------------------------------------------------------------------------------
2. SET UP (once)
------------------------------------------------------------------------------------------

You need Node.js 22 or newer, pnpm (npm install -g pnpm) and MongoDB (on your computer or Atlas).

The app has two parts:
  server/   the API       http://localhost:8000
  client/   the website   http://localhost:5173

1. Install the server
     cd server
     pnpm install

2. Make the settings file
     Copy server/config.env.example to server/config.env and fill it in:
       DB=...               MongoDB Atlas connection string (leave out to use MongoDB on this computer)
       JWT_SECRET=...       any long random text
       PORT=8000
       ONEMAP_EMAIL=...     a free OneMap account (onemap.gov.sg). Needed to search places and postal
       ONEMAP_PASSWORD=...  codes that are not in our data, and for the parents' postal code (PHG).
     config.env is in .gitignore, so it is never uploaded.

3. Load the data (still in server/)
     pnpm seed
   This loads 1,306 block + flat type records (974 blocks, all 26 HDB towns) and 930 amenities.

4. Install the website
     cd ../client
     pnpm install


------------------------------------------------------------------------------------------
3. RUN
------------------------------------------------------------------------------------------

Terminal 1:   cd server  then  pnpm dev
              wait for "Server running at http://localhost:8000/"
Terminal 2:   cd client  then  pnpm dev
              open http://localhost:5173  (the first page is the Search page)

Pages:
  /            Search
  /map         Map
  /CPFCal      Affordability calculator
  /compare     Compare saved flats (needs an account)
  /shortlist   Saved flats with notes (needs an account)
  /profile     Your saved answers (needs an account)
  /login       Log in or create an account


------------------------------------------------------------------------------------------
4. ACCOUNTS
------------------------------------------------------------------------------------------

There is no built-in account. Create one on the Login page with any email and a password of at
least 8 characters.

Demo account on the deployed app:   email [fill in]   password [fill in]
OneMap account for marking:         [fill in, or use your own free account]


------------------------------------------------------------------------------------------
5. TESTING
------------------------------------------------------------------------------------------

There are three kinds of tests, as in Week 10.

A. Unit and component tests (Vitest + Vue Test Utils) - client
     cd client
     pnpm test
   103 tests in client/src/**/__tests__/ :
     utils:       affordability maths (18), priorities (7), score words (5)
     components:  BlockCard (11), BlockCard + MatchScore together (7), FilterPanel (15),
                  PreferencesPanel (8), ProfileForm (13), SearchBar (5), CollapsiblePanel (6), PhgCard (8)

B. Server tests (Vitest + Supertest) - API
     cd server
     pnpm test
   71 tests in server/tests/. They start their own MongoDB in memory and our server on port 8001,
   so they never touch your real database. (The first run downloads MongoDB, so it is slower.)
     auth (23)           register, login, wrong password, preferences, profile
     blocks (21)         search, every filter, wrong input (400), nearby, sales, amenities, 404s
     shortlist (11)      no token (401), create, read, change note, delete, duplicates (409)
     score (11)          priority score maths and weights
     affordability (5)   save and load the calculator answers, refuse wrong values (400)

C. End-to-end tests (Playwright) - the whole app in a real browser
     First start the server and the website (section 3). Then:
       cd e2e
       pnpm install
       pnpm exec playwright install chromium     (once)
       pnpm exec playwright test
       pnpm exec playwright show-report          (opens the results in the browser)
   33 tests in e2e/tests/. Each test has three parts: setup, actions, assert.
   They run in Chrome at laptop size (1280 x 720), and the tests in tests/mobile/ at phone size
   (iPhone 6, 375 x 667).

     auth.spec.js           create an account; common password refused; passwords do not match;
                            wrong password; log in with an existing account; after a logout
     search.spec.js         search a town; 4-room filter; nothing found; the account message
                            for visitors who press Save
     shortlist.spec.js      save a flat; keep a note; remove a flat
     compare.spec.js        compare two saved flats; ask for 2 saved flats first
     calculator.spec.js     max price and Apply Budget to Search; income needed; saved answers for a
                            logged-in user; PHG checker (list, not found, empty box)
     map.spec.js            open the map; "Show on map" from a flat
     price-details.spec.js  open and close a flat's price details
     profile.spec.js        save new answers; visitors are sent to log in
     mobile/                filter drawer, card buttons, compare and PHG checker on a phone

   Four tests (the PHG checker lists and the "nothing found" search) look up places on OneMap,
   so they need the OneMap account in server/config.env.

D. Manual check (both terminals running)
     1. Search "Bishan", move the budget slider, pick 4-Rm: the flats update.
     2. Open a flat's price details: recent sales, median and chart.
     3. Press Save while logged out: you are asked to log in. Log in and save 2 flats.
     4. Compare: tick both flats.
     5. Affordability: fill in step 1, go to step 3, press Apply Budget to Search.
     6. Map: click a dot to see the block; switch the colours to Priority score.
     7. Refresh: you stay logged in. Logout: the shortlist count goes away.


------------------------------------------------------------------------------------------
6. FOLDERS
------------------------------------------------------------------------------------------

client/src/
  views/          the pages (Search, Map, CPFCal, Compare, Shortlist, Profile, Login)
  components/     parts of pages (NavBar, FilterPanel, BlockCard, PriceDetails, PhgChecker, ...)
  stores/         Pinia stores: auth, shortlist, filters, mapFocus
  router/         the routes, and the guard for pages that need an account
  utils/          matchScore.js, affordability.js, affordabilityRules.js (every grant and loan number,
                  with its source)
server/
  server.js       starts Express and MongoDB
  routes/, controllers/, models/, middleware/   same layout as the class's Express + MongoDB example
  data/           blocks.json and amenities.json
  seed.js         loads data/ into MongoDB
  tests/          server tests
e2e/              Playwright tests
prep/             one-time scripts that built server/data/ from data.gov.sg and OneMap


------------------------------------------------------------------------------------------
7. API (http://localhost:8000)
------------------------------------------------------------------------------------------

Errors look like { "message": "..." }. [login] = needs the header Authorization: Bearer <token>.

GET    /api/blocks                 search. Query: q, flatType, maxPrice, minLease
GET    /api/blocks/area            town names
GET    /api/blocks/nearby          blocks near lat, lng (radius in metres)
GET    /api/blocks/place           OneMap place search. Query: q
GET    /api/blocks/:id             one block
GET    /api/blocks/:id/sales       its recent sales
GET    /api/blocks/:id/live-sales  its sales from data.gov.sg (falls back to the stored ones)
GET    /api/blocks/:id/amenities   nearest MRT, hawker centre, park and school
GET    /api/blocks/:id/estimate    price from our regression model. Query: storey, area
GET    /api/amenities              amenities for the map. Query: category
POST   /api/auth/register          { email, password }
POST   /api/auth/login             { email, password }
GET    /api/auth/preferences       [login] saved priorities
PUT    /api/auth/preferences       [login]
GET    /api/auth/profile           [login] saved answers (town, parents' postal code, filters)
PUT    /api/auth/profile           [login]
GET    /api/affordability          [login] saved calculator answers
PUT    /api/affordability          [login]
GET    /api/shortlist              [login] saved flats
POST   /api/shortlist              [login] { blockId, note }
PATCH  /api/shortlist/:id          [login] { note }
DELETE /api/shortlist/:id          [login]


------------------------------------------------------------------------------------------
8. DATA AND LIMITS
------------------------------------------------------------------------------------------

Data: HDB resale sales from the last 12 months (data.gov.sg), the 40 busiest blocks in each of the
26 towns. Coordinates from OneMap; MRT/LRT stations, hawker centres, parks and schools from
data.gov.sg. The scripts in prep/ built server/data/ once (see the comment at the top of each
script); after rebuilding, run pnpm seed again.

Limits:
  - Not every block in Singapore, only the 40 busiest per town.
  - The walk to the MRT is a real walking route; schools, hawker centres and parks use straight-line
    distance.
  - Grant and loan numbers were checked against hdb.gov.sg / cpf.gov.sg in Nov 2026 (sources in
    client/src/utils/affordabilityRules.js). The calculator gives an estimate, not an HFE letter.
  - Login lasts 7 days.


------------------------------------------------------------------------------------------
9. USE OF AI TOOLS
------------------------------------------------------------------------------------------

[each member: fill in]
