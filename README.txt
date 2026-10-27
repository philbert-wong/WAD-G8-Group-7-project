HDB RESALE FINDER
IS216 Web Application Development II, Section G8, Group 7
==========================================================================================

Helps HDB resale buyers decide WHERE to look, using real transacted prices (last 12 months)
instead of asking prices. You search blocks (not listings), filter them, compare cards with a
personal match score, look at each block's recent sales and nearby amenities, keep a shortlist
with notes, work out an affordable budget, and see every block on a map.

Data store:     MongoDB (with Mongoose). Local MongoDB or MongoDB Atlas.
External APIs:  OneMap (Singapore Land Authority): place search and walking routes to the nearest MRT.
                data.gov.sg: live HDB resale prices for a block's price details.
                OpenStreetMap: the map tiles on the Map page.
Front end:      Vue 3 (Vite), Vue Router, Pinia, axios, Bootstrap 5, Leaflet (map), Chart.js (price chart)
Back end:       Node.js, Express 5, Mongoose, JSON Web Tokens + bcrypt (login)


------------------------------------------------------------------------------------------
1. LINKS
------------------------------------------------------------------------------------------

Deployed app:   [TODO: add the URL of the first page once deployed]
Git repository: https://github.com/philbert-wong/WAD-G8-Group-7-project   [TODO: confirm it is shared with the teaching team]
Video:          [TODO: add the YouTube link]


------------------------------------------------------------------------------------------
2. SET UP (once)
------------------------------------------------------------------------------------------

You need:
  - Node.js 22 or newer
  - pnpm  (install it once with:  npm install -g pnpm)
  - MongoDB, either running on your own computer, or a free MongoDB Atlas database

The project has two parts, each in its own folder with its own package.json:
  server/   the Express API      (http://localhost:8000)
  client/   the Vue website      (http://localhost:5173)

Step 1. Install the server
    cd server
    pnpm install

Step 2. Settings for the server
    In the server folder, copy config.env.example to a new file called config.env, then edit it.
    Every line is optional:
      DB=...              MongoDB Atlas connection string. Leave it out to use MongoDB on this computer
                          (mongodb://127.0.0.1:27017/check-in).
      JWT_SECRET=...      any long random text (used to sign login tokens)
      PORT=8000           port for the API (default 8000)
      ONEMAP_EMAIL=...    a OneMap account (free at onemap.gov.sg). Needed for "search near a place"
      ONEMAP_PASSWORD=... and the walking time to the nearest MRT. Without it those two features show an error.
    config.env is never committed to git (it is in .gitignore).

Step 3. Load the data into MongoDB
    (still in the server folder)
    pnpm seed
    This loads server/data/blocks.json and amenities.json: 223 block + flat type cards in 4 towns,
    and 309 amenities. Running it again replaces the blocks and amenities (saved shortlist items
    then point to old blocks and stop showing).

Step 4. Install the website
    cd ../client
    pnpm install


------------------------------------------------------------------------------------------
3. RUN
------------------------------------------------------------------------------------------

Use two terminals.

Terminal 1 (API):
    cd server
    pnpm dev
    Wait for "MongoDB connected successfully" and "Server running at http://localhost:8000/".
    (pnpm dev uses nodemon, which restarts the server when a server file is saved.
     pnpm start runs it without nodemon.)

Terminal 2 (website):
    cd client
    pnpm dev
    Open http://localhost:5173

Pages:
    /            Search: search box, filters (budget, flat type, remaining lease), "search near a place",
                 "What matters to you?" match score, block cards with price details and nearest amenities
    /map         Map: every block coloured by price, and the PHG (Proximity Housing Grant) 4 km circle
    /CPFCal      Affordability: calculator for a maximum budget, grants, PHG checker, "use this budget"
    /compare     Compare 2 or 3 shortlisted flats side by side (needs login)
    /shortlist   Your saved flats with notes (needs login)
    /login       Log in or create an account


------------------------------------------------------------------------------------------
4. ACCOUNTS AND PASSWORDS
------------------------------------------------------------------------------------------

There are no built-in accounts. Create one on the Login page (any email, password of at least
8 characters). The shortlist, Compare and saved "What matters to you?" choices need an account.

OneMap: place search and walking routes need a OneMap login in server/config.env (see section 2).
    [TODO (team decision): either give a shared OneMap account for marking here, or leave this
     note so markers use their own free account.]


------------------------------------------------------------------------------------------
5. TEST
------------------------------------------------------------------------------------------

Automated tests (server API):
    cd server
    pnpm test

    46 tests in server/tests/, run with Vitest and Supertest. Before the tests, the test setup
    (server/tests/start-test-server.js) starts a throwaway MongoDB in memory and starts our real
    server.js on port 8001 pointed at it, so the tests never touch your own database and can run
    while pnpm dev is running. (The first run may take a while: it downloads a MongoDB program for
    the in-memory database.)

    What they cover:
      blocks.test.js     (19)  search and every filter, wrong input (400), nearby search (geospatial),
                               one block, 404s, sales summary and price per m2, nearest amenities
      auth.test.js       (5)   register, duplicate email (409), short password (400),
                               login, wrong password (401)
      shortlist.test.js  (11)  no token (401), create, read, update note, delete, no duplicates (409),
                               missing blockId (400), unknown ids (404), note too long (400)
      score.test.js      (11)  match score maths, preference weights, remaining lease, distance

End-to-end tests:
    [TODO: Playwright end-to-end tests of the main user journeys, with the command to run them.]

Manual check of the main user journeys (with both terminals running):
    1. Search: type "Bishan", change the budget slider and flat type, press Search: cards update.
    2. Search near a place: type "Bishan MRT": blocks near the station appear (needs OneMap login).
    3. Open a card's price details: recent sales, median price, chart; nearest amenities and walk time.
    4. Click Shortlist while logged out: you are sent to Login; log in: you come back to Shortlist.
    5. On Search press Save on 2 flats: the navbar shows "Shortlist (2)". Add a note on Shortlist.
    6. Compare: tick the 2 flats and see them side by side.
    7. Affordability: fill in the steps, then "use this budget": Search opens with that budget.
    8. Map: dots coloured by price; pick a block in the PHG list to draw the 4 km circle.
    9. Refresh the page: you stay logged in. Logout: the shortlist count disappears.


------------------------------------------------------------------------------------------
6. FOLDERS
------------------------------------------------------------------------------------------

client/                     the website (made with pnpm create vue@latest, like class)
  index.html, vite.config.js, package.json
  src/main.js               starts Vue: Bootstrap, our design (assets/cosy.css), Pinia, the router
  src/App.vue               page shell: navbar + <RouterView />
  src/router/index.js       the pages, and the navigation guard for pages that need a login
  src/stores/               Pinia stores: auth.js (who is logged in), shortlist.js (saved flats)
  src/views/                SearchView, MapView, CPFCalView, CompareView, ShortlistView, LoginView
  src/components/           NavBar, SearchBar, FilterPanel, PreferencesPanel, BlockCard, PriceDetails,
                            ShortlistItem, PhgChecker, GuidePet
  src/utils/                matchScore.js (match score), affordability.js (calculator maths),
                            affordabilityRules.js (every grant / loan number, with its source)
  src/assets/cosy.css       the site's design

server/                     the API (same layout as the class's blog-with-mongodb server)
  server.js                 starts everything: config.env, Express, cors, routes, MongoDB, listen
  routes/                   which address runs which function (blocks-, shortlist-, auth-routes.js)
  controllers/              the functions behind each address (blocks-, shortlist-, auth-controller.js)
  models/                   MongoDB data shapes: block-, amenity-, shortlist-, user-model.js
  middleware/               requireAuth.js (login check), errorHandler.js (last safety net)
  data/                     blocks.json and amenities.json (the real data)
  seed.js                   loads data/ into MongoDB (pnpm seed)
  tests/                    automated tests (pnpm test)
  config.env.example        settings template (copy to config.env)

prep/                       one-time scripts that BUILT server/data/*.json from data.gov.sg + OneMap
                            (its own small project; the app does not run these, see section 9)


------------------------------------------------------------------------------------------
7. API (server, http://localhost:8000)
------------------------------------------------------------------------------------------

Errors always look like  { "message": "..." }
  400 = a value is wrong (e.g. maxPrice=abc)   401 = not logged in   404 = not found
  409 = already exists   500 = something went wrong on the server
[login] = needs the header  Authorization: Bearer <token>  (the token comes from register / login)

GET    /api/health                   { status: "ok" }
GET    /api/blocks                   search + filter. Query: q, flatType, maxPrice, minLease.
                                     Returns { total, results: [card] }, cheapest first
GET    /api/blocks/area              the town names (for the search suggestions)
GET    /api/blocks/nearby            blocks near a point. Query: lat, lng (required), radius in metres
                                     (default 1000, max 5000), limit (default 20, max 50).
                                     Each result also has distance (metres)
GET    /api/blocks/place             OneMap place search. Query: q (address, postal code or place).
                                     Returns { name, lat, lng }. 404 if nothing is found
GET    /api/blocks/:id               one block card
GET    /api/blocks/:id/sales         the stored recent sales: { count, lowest, highest, medianPrice,
                                     medianPricePerSqm, sales: [{ month, storey, areaSqm, price,
                                     pricePerSqm }] }, newest first
GET    /api/blocks/:id/live-sales    the same, fetched live from data.gov.sg; source is "live", or
                                     "stored" when data.gov.sg cannot be reached
GET    /api/blocks/:id/amenities     nearest MRT, hawker centre, park and school with distance (metres)
GET    /api/blocks/:id/walk-to-mrt   OneMap walking route to the nearest MRT:
                                     { minutes, metres, source: "onemap" }, or { minutes, source: "estimate" }
POST   /api/auth/register            body { email, password (8+ characters) }. Returns { token, user: { id, email } } (201)
POST   /api/auth/login               body { email, password }. Returns { token, user: { id, email } }
GET    /api/auth/preferences         [login] the saved "What matters to you?" choices: { preferences }
PUT    /api/auth/preferences         [login] replace them. Body { preferences: { panel, sortBy } }
GET    /api/shortlist                [login] your saved items, newest first: [{ id, note, createdAt, block: card }]
POST   /api/shortlist                [login] save a block. Body { blockId, note (optional) } (201)
PATCH  /api/shortlist/:id            [login] change the note. Body { note }
DELETE /api/shortlist/:id            [login] remove an item (204, no body)

A block card looks like:
  { id, block: "233C", street: "SUMANG LANE", town: "PUNGGOL", flatType: "4 ROOM",
    price: 680000 (median), priceLow: 650000, priceHigh: 720000, salesCount: 3,
    remainingLease: 91, mrtName: "Punggol MRT", mrtWalkMinutes: 4,
    distances: { school, mrt, hawker, park } (metres), lat: 1.405, lng: 103.903 }


------------------------------------------------------------------------------------------
8. HOW SOME PARTS WORK
------------------------------------------------------------------------------------------

Geospatial search
  Every block and amenity stores its position as a GeoJSON point [longitude, latitude] with a
  2dsphere index, so MongoDB's $geoNear can sort by distance:
    /api/blocks/nearby uses $geoNear on blocks (with a maximum distance),
    /api/blocks/:id/amenities uses $geoNear on amenities (the closest one of each category).
  The walking minutes shown on each card are worked out once when seeding
  (straight-line distance x 1.3 / 80 metres per minute). The block's price details also ask OneMap
  for a real walking route (/walk-to-mrt).

Match score ("What matters to you?")
  The seed script stores the straight-line distance from each block to its nearest school, MRT,
  hawker centre and park. The browser scores every card itself (client/src/utils/matchScore.js),
  so changing the panel updates the scores straight away without calling the server.
    Sub-score per category = 100 x (max - distance) / max, or 0 if further than max
    Max distances: school 1000 m, MRT 1000 m, hawker 800 m, park 800 m
    Weights: not ticked 0, Low 1, Moderate 2, Important 3, Very 4, Extremely 5
    Score = (sum of weight x sub-score) / (sum of weights), rounded. All weights 0 = no score

Login and shared state
  Register / login return a token (JWT, valid 7 days). The Pinia auth store keeps it in the
  browser's localStorage (so a refresh keeps you logged in) and sends it with every request.
  The Pinia shortlist store is shared by Search, Shortlist, Compare and the navbar count.
  A navigation guard sends logged-out users from /shortlist and /compare to /login and back.
  The server checks the token again on every shortlist and preferences request.


------------------------------------------------------------------------------------------
9. DATA AND REFRESHING IT (optional)
------------------------------------------------------------------------------------------

Real HDB resale sales from the last 12 months (data.gov.sg), grouped per block and flat type,
for the 40 busiest blocks in each of 4 towns: Ang Mo Kio, Bishan, Punggol and Tampines.
Coordinates come from OneMap; MRT stations, hawker centres, parks and primary schools from data.gov.sg.

The prep/ scripts built the two JSON files once. To rebuild them:
    cd prep
    pnpm install
    node makeData.js "/path/to/resale-prices.csv"   rebuilds both files from the resale CSV
                                                     (download it from data.gov.sg). Looks up coordinates
                                                     on OneMap (cached in prep/geocode-cache.json).
    node addSales.js "/path/to/resale-prices.csv"   only refreshes the sales and price ranges of the
                                                     blocks already in blocks.json (no OneMap calls)
Then run  pnpm seed  in the server folder.


------------------------------------------------------------------------------------------
10. KNOWN LIMITS
------------------------------------------------------------------------------------------

- Only 4 towns, and the 40 busiest blocks in each.
- The match score and the walking minutes on the cards use straight-line distances.
- The login token lasts 7 days; after that, log in again.
- The affordability numbers (grants, loan limits) must be checked against hdb.gov.sg / cpf.gov.sg;
  each one is listed with its source in client/src/utils/affordabilityRules.js.
- OneMap features need a OneMap account in server/config.env.


------------------------------------------------------------------------------------------
11. AI USE DECLARATION (brief FAQ 20)
------------------------------------------------------------------------------------------

[TODO: each member writes the parts they relied on AI/LLM for.]
