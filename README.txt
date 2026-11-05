HDB RESALE FINDER
IS216 Web Application Development II, Section G8, Group 7
==========================================================================================

Helps HDB resale buyers decide WHERE to look, using real transacted prices (last 12 months)
instead of asking prices. You search blocks (not listings), filter them, compare cards with a
personal priority score, look at each block's recent sales and nearby amenities, keep a shortlist
with notes, work out an affordable budget, and see every block on a map.

Data store:     MongoDB Atlas (cloud), with Mongoose. A local MongoDB also works for development.
External APIs:  OneMap (Singapore Land Authority): place search and walking routes to the nearest MRT.
                data.gov.sg: live HDB resale prices for a block's price details.
                OpenStreetMap: the map tiles on the Map page.
Front end:      Vue 3 (Vite), Vue Router, Pinia, axios, Bootstrap 5, Leaflet (map), Chart.js (price chart)
Back end:       Node.js, Express 5, Mongoose, JSON Web Tokens + bcrypt (login)


------------------------------------------------------------------------------------------
1. LINKS
------------------------------------------------------------------------------------------

Deployed app:   https://wad-g8-group-7-project-2.onrender.com
                (on Render's free plan the API sleeps when nobody uses it: the first search after a quiet
                 spell can take up to a minute, then it is fast. The API is at
                 https://wad-g8-group-7-project-1.onrender.com/api/health)
Git repository: https://github.com/philbert-wong/WAD-G8-Group-7-project   [TODO: confirm it is shared with the teaching team]
Video:          [TODO: add the YouTube link]


------------------------------------------------------------------------------------------
2. SET UP (once)
------------------------------------------------------------------------------------------

You need:
  - Node.js 22 or newer
  - pnpm  (install it once with:  npm install -g pnpm)
  - a MongoDB Atlas database (the team's cluster, or your own free one), or MongoDB running on your own computer

The project has two parts, each in its own folder with its own package.json:
  server/   the Express API      (http://localhost:8000)
  client/   the Vue website      (http://localhost:5173)

Step 1. Install the server
    cd server
    pnpm install

Step 2. Settings for the server
    In the server folder, copy config.env.example to a new file called config.env, then edit it:
      DB=...              MongoDB Atlas connection string (the team's cluster, or your own free one),
                          with the database name (check-in) before the "?", e.g.
                          mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/check-in?retryWrites=true
                          Only if you leave DB out does the server use MongoDB on this computer
                          (mongodb://127.0.0.1:27017/check-in).
      JWT_SECRET=...      any long random text (used to sign login tokens)
      PORT=8000           port for the API (default 8000)
      ONEMAP_EMAIL=...    a OneMap account (free at onemap.gov.sg). Needed for places and postal codes
      ONEMAP_PASSWORD=... in the search box and the map's address and PHG search. Without it, those place
                          searches show an error. (The walking routes are already saved in the data.)
    The other lines are optional. config.env is never committed to git (it is in .gitignore).

Step 3. Load the data into MongoDB
    (still in the server folder)
    pnpm seed
    This loads server/data/blocks.json and amenities.json into the database in DB (MongoDB Atlas):
    1,306 block + flat type cards (974 blocks) in all 26 HDB towns, and 930 amenities.
    It replaces the blocks and amenities already there, and gives the blocks new ids, so saved
    shortlist items stop matching their blocks. On the team's shared cluster the data is already
    loaded: only run it after the data files change, and tell the team first.

Step 4. Install the website
    cd ../client
    pnpm install

Step 5. Install the end-to-end tests (only needed to run them, see section 5)
    cd ../e2e
    pnpm install
    pnpm exec playwright install chromium     (downloads the Chromium browser Playwright drives)


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
    /            Search: one search box (town, street, block address, postal code or any place: our own
                 data first, then OneMap for flats within 1 km of a place), filters (budget, flat type,
                 remaining lease), Your Priorities and the priority score, block cards with price details,
                 nearest amenities and "Show on map". Sort: priority score first or cheapest first.
                 12 cards a page; below 992 px (phones and tablets) 6 a page, and the filters move into
                 a "☰ Filters" drawer. The filters stay after a page refresh;
                 "Clear all" removes every filter (any budget, any flat type, any lease, PHG off)
    /map         Map: one dot per block, coloured by price (band number 1-4 inside each dot) or by
                 priority score ("Colour dots by"), with the same filters and Your Priorities as Search;
                 amenity layers (MRT / LRT, hawker,
                 park, school); an address search; the PHG (Proximity Housing Grant) layer (type your
                 parents' postal code to see only blocks within 4 km); "Show": all flats or only your
                 shortlist; click a dot for a popup with its flat types and a Save button for each (a visitor
                 without an account is asked to log in), and its nearest amenities in the "Selected block" card
    /CPFCal      Affordability: calculator for a maximum budget, grants, PHG checker, "use this budget";
                 a refresh keeps the step you were on
    /compare     Compare 2 or 3 shortlisted flats side by side (needs login); the ticks stay after a refresh
    /shortlist   Your saved flats with notes (needs login); "Note saved" shows once a note is stored
    /profile     Your presets (town, parents' postal code, starting filters) and your 3 security
                 questions (needs login)
    /login       Log in or create an account (/createaccount opens the same page on "Create account")
    /forgot-password   Choose a new password by answering the 3 security questions

    A first-time visitor gets a presets popup ("Skip for now" closes it), and a guided tour starts by itself
    the first time each page is opened. The round "?" button in the bottom-right corner starts it again.


------------------------------------------------------------------------------------------
4. ACCOUNTS AND PASSWORDS
------------------------------------------------------------------------------------------

There are no built-in accounts. Create one on the Login page (any email, password of at least
8 characters, and answers to the 3 security questions). The shortlist, Compare and saved "What matters
to you?" choices need an account.

OneMap: place search and walking routes need a OneMap login in server/config.env (see section 2).



------------------------------------------------------------------------------------------
5. TEST
------------------------------------------------------------------------------------------

There are 3 layers of automated tests, 223 tests in all, from fastest to closest to a real user:

    Layer                         Folder                        Tests   Command
    1. Server API                 server/tests/                   76    cd server  then  pnpm test
    2. Client components + utils  client/src/**/__tests__/       113    cd client  then  pnpm test
    3. End-to-end (browser)       e2e/tests/                      34    cd e2e     then  pnpm exec playwright test

Layers 1 and 2 need nothing running. Layer 3 needs both terminals of section 3 running.
Last local run (5 Nov 2026): 76 of 76, 113 of 113 and 34 of 34 passed.

1. Server API tests (Vitest + Supertest)
    cd server
    pnpm test

    Before the tests, the test setup (server/tests/start-test-server.js) starts a throwaway MongoDB
    in memory and starts our real server.js on port 8001 pointed at it, so the tests never touch the
    database in DB and can run while pnpm dev is running. (The first run may take a while: it
    downloads a MongoDB program for the in-memory database.)

    What they cover:
      auth.test.js       (33)  register, login, duplicate email (409), wrong password (401), unknown
                               email gets the same message, email rules, password rules (8+ characters,
                               not only spaces, not a very common password, not the email, 72-byte
                               bcrypt limit), saved preferences, forgot password (only with all 3
                               right security answers; same answer for a wrong answer or an unknown
                               email), adding / changing the security answers
      blocks.test.js     (21)  search by text and postal code, every filter, wrong input (400), nearby
                               search (geospatial), one block, 404s, sales summary and price per m2,
                               nearest amenities
      shortlist.test.js  (11)  no token (401), create, read, update note, delete, no duplicates (409),
                               missing blockId (400), unknown ids (404), note too long (400)
      score.test.js      (11)  match score maths, preference weights, remaining lease, distance

2. Client tests: components and utils (Vitest + Vue Test Utils + jsdom)
    cd client
    pnpm test

    jsdom gives Vitest a pretend browser, so Vue components are mounted without opening one.
    Unit tests check one function; component tests mount one component, give it props and check
    what it shows and which events it sends to its page; the integration test mounts two together.
    Each test file sits in a __tests__ folder next to the code it tests (settings: client/vitest.config.js).

    What they cover (in client/src/):
      components/__tests__/BlockCard.spec.js            (11)  what the card shows, saved / not saved,
                                                              events for Save and Show on map
      components/__tests__/BlockCardIntegration.spec.js  (7)  BlockCard and MatchScore together
                                                              (Excellent / Fair / no score)
      components/__tests__/FilterPanel.spec.js          (15)  budget, lease and flat type chips, the
                                                              parents (PHG) section, events to the page
      components/__tests__/ProfileForm.spec.js          (13)  its questions, where Your Priorities start,
                                                              what is sent on save, postal code check
      components/__tests__/PreferencesPanel.spec.js      (8)  categories, tick boxes, importance levels
      components/__tests__/SearchBar.spec.js             (5)  typing and submitting
      components/map/__tests__/CollapsiblePanel.spec.js  (6)  open / close, content kept while closed
      components/map/__tests__/PhgCard.spec.js           (8)  radius text, place found, block count,
                                                              search and clear
      components/map/__tests__/SelectedBlockCard.spec.js (10)  a Save button per flat type, the click sent
                                                              up, the log-in line for a visitor, a
                                                              problem from the shortlist
      utils/__tests__/affordability.spec.js             (18)  monthly repayment, loan for a repayment,
                                                              monthly cost, household totals and type
      utils/__tests__/priorities.spec.js                 (7)  reading saved priorities, broken or
                                                              partly saved data
      utils/__tests__/scoreWord.spec.js                  (5)  Excellent / Good / Fair / Weak cut-offs

3. End-to-end tests (Playwright, in Chromium)
    Real user journeys in a real browser: Playwright opens the website, clicks and types like a user,
    and checks what appears on the page.

    Before running them:
      - Install them once (section 2, Step 5).
      - Start the API and the website (section 3, both terminals). Playwright does not start them.
      - The data must be loaded (pnpm seed, section 2). Some tests use the seed data, e.g. postal
        code 761672 is Blk 672A Yishun Ave 4.
      - calculator.spec.js and the phone PHG test look up postal codes on OneMap, so they need the
        OneMap login in server/config.env.
      - The tests use the database in DB (not an in-memory one). Each test that needs an account
        creates a new one (e2e-<time>-<random number>@example.com), so the tests can be run again
        and again, and these test accounts are left in the database.

    Run them:
      cd e2e
      pnpm exec playwright test                       all 34 tests (both screen sizes)
      pnpm exec playwright test --project=desktop     only the 29 desktop tests (1280 x 720)
      pnpm exec playwright test --project=iphone-6    only the 5 phone tests in tests/mobile/ (375 x 667)
      pnpm exec playwright test tests/search.spec.js  one file
      pnpm exec playwright show-report                open the report of the last run in the browser

    By default they test http://localhost:5173. To test the deployed app instead:
      BASE_URL=https://<deployed app> pnpm exec playwright test

    Both screen sizes run in Chromium, because the app is marked in Chrome (brief FAQ 5). The phone
    size is the iPhone 6, the smallest screen in the responsive check (brief FAQ 17).

    How each test is written: 3 stages, (1) setup: open the page, (2) actions: what the user does,
    (3) assert: what the user sees. Every test starts in a fresh browser, so its setup first closes
    the first-visit popup and the page tour. The tests find things the way a user does (by role and
    visible name, e.g. the "Logout" button) or by a fixed id (e.g. #login-email), not by layout or CSS.

    Two examples of the tests doing their job:
      Test first:  the register password rules were written as failing tests before the code (the 7
                   "rejects" tests in server/tests/auth.test.js) and fail until register() checks them.
      A real bug:  writing the Search browser tests exposed a race condition (an older, slower search
                   could arrive after a newer one and replace its results). It was reproduced with a
                   delayed request, fixed with a request counter (latestSearch in SearchView.vue), and
                   checked before and after the fix.

    What they cover (in e2e/tests/):
      auth.spec.js           (6)  create an account, a very common password is refused, the two
                                  passwords do not match, unknown account, logout, a forgotten
                                  password is only reset with the right security answers
      search.spec.js         (5)  search a town, the 4-Rm filter, clear message when nothing matches,
                                  saving a flat needs an account (one message, not two)
      shortlist.spec.js      (3)  save a flat when logged in, keep a note on it ("Note saved" shows),
                                  remove it
      compare.spec.js        (2)  compare two saved flats; asks for at least 2 saved flats
      price-details.spec.js  (2)  open a flat's price details, and hide them again
      map.spec.js            (5)  open the map from the menu, Show on map, log in offer for My shortlist,
                                  save a flat from the dot popup when logged in, a visitor is asked to
                                  log in from the popup
      calculator.spec.js     (6)  PHG blocks near the parents a page at a time, postal code not found,
                                  empty box, max flat price sent to Search, income needed first,
                                  household details remembered for a logged-in user
      mobile/compare-mobile.spec.js  (2)  compare on a phone; the Compare tour step does not cover
                                          the first card
      mobile/phg-mobile.spec.js      (1)  PHG blocks near the parents 5 at a time on a phone
      mobile/search-mobile.spec.js   (2)  filter from the filter drawer; map and street view buttons
                                          on a flat card

Manual check of the main user journeys (with both terminals running):
    1. Search: type "Bishan", change the budget slider and flat type, press Search: cards update.
    2. Same search box: type "Blk 314 Ang Mo Kio Ave 3" (its card), then "560314" or "Bishan MRT":
       flats within 1 km of that place appear, still following the filters (needs OneMap login).
    3. Open a card's price details: recent sales, median price, chart; nearest amenities and walk time.
       Search "Ang Mo Kio" with Sort: Priority score and only Transport ticked: the "min walk" goes up down the list.
    4. Click Shortlist while logged out: you are sent to Login; log in: you come back to Shortlist.
    5. On Search press Save on 2 flats: the navbar shows "Shortlist (2)". Add a note on Shortlist.
    6. Compare: tick the 2 flats and see them side by side.
    7. Affordability: fill in the steps, then "use this budget": Search opens with that budget.
    8. Map: dots coloured by price. Click 4-Rm in the filters: the dots change. Click a dot: its popup
       and the "Selected block" card (flat types, median, lease); "Show nearest amenities" lists them.
       Logged in, press "+ Save" in the popup: it turns into "✓ Saved" and the card and "My shortlist (1)"
       agree. Logged out, "+ Save" asks you to log in or create an account.
    9. Map: tick "MRT / LRT stations": blue squares appear; untick: they go. Switch "Colour dots by" to
       Colour dots by Priority score: dots change colour (red = weak ... blue/purple = excellent), using Your Priorities.
   10. Map: type "560314" in the PHG box: a 4 km circle, and only the blocks inside it remain.
       Type "Bishan MRT" in the search bar above the map: the map jumps there with a marker.
   11. Refresh the page: you stay logged in. Logout: the shortlist count disappears.


------------------------------------------------------------------------------------------
6. FOLDERS
------------------------------------------------------------------------------------------

client/                     the website (made with pnpm create vue@latest, like class)
  index.html, vite.config.js, package.json
  src/main.js               starts Vue: Bootstrap, our design (assets/cosy.css), Pinia, the router
  src/App.vue               page shell: navbar + <RouterView />
  src/router/index.js       the pages, and the navigation guard for pages that need a login
  src/stores/               Pinia stores: auth.js (who is logged in), shortlist.js (saved flats),
                            filters.js (flat type, budget and lease, shared by Search, the Map and Compare),
                            mapFocus.js (the block "Show on map" should zoom to)
  src/views/                SearchView, MapView, CPFCalView, CompareView, ShortlistView, LoginView,
                            ProfileView, ForgotPasswordView
  src/components/           NavBar, SearchBar, FilterPanel, PreferencesPanel, BlockCard, PriceDetails,
                            MatchScore, ShortlistItem, PhgChecker, ProfileModal (first-visit presets),
                            ProfileForm, GuideTour (the "?" tour), BackToTop
  src/components/map/       the map page's parts: MapSearchBar, MapToolbar, MapKey, SelectedBlockCard,
                            MapLegend, CollapsiblePanel, PhgCard
  src/utils/                matchScore.js (match score), affordability.js (calculator maths),
                            affordabilityRules.js (every grant / loan number, with its source),
                            priorities.js (saved priorities), securityQuestions.js, tourSteps.js
                            (the tour's steps), focusTrap.js (keeps Tab inside a popup), distance.js
  src/assets/cosy.css       the site's design
  src/**/__tests__/         client tests (pnpm test), next to the code they test
  vitest.config.js          settings for the client tests

server/                    the API (same layout as the class's blog-with-mongodb server)
  server.js                 starts everything: config.env, Express, cors, routes, MongoDB, listen
  routes/                   which address runs which function (blocks-, shortlist-, auth-, amenities-,
                            affordability-routes.js)
  controllers/              the functions behind each address (blocks-, shortlist-, auth-, amenities-controller.js)
  models/                   MongoDB data shapes: block-, amenity-, shortlist-, user-, affordability-model.js
  middleware/               requireAuth.js (login check), errorHandler.js (last safety net)
  data/                     blocks.json and amenities.json (the real data)
  seed.js                   loads data/ into MongoDB (pnpm seed)
  tests/                    automated tests (pnpm test)
  config.env.example        settings template (copy to config.env)

e2e/                        end-to-end tests (Playwright; its own small project, see section 5)
  playwright.config.js      website address, the desktop and iphone-6 screen sizes, the HTML report
  tests/                    one file per user journey; tests/mobile/ runs at phone size

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
                                     q matches a town, street or block, or a full address such as
                                     "Blk 314 Ang Mo Kio Avenue 3" (full street words like Avenue / Bukit
                                     also match HDB's short forms AVE / BT).
                                     Returns { total, results: [card] }, cheapest first
GET    /api/blocks/area              the town names (for the search suggestions)
GET    /api/blocks/nearby            blocks near a point. Query: lat, lng (required), radius in metres
                                     (default 1000, max 5000), limit (default 20, max 50), and the
                                     optional filters flatType, maxPrice, minLease (same as the search).
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
GET    /api/blocks/:id/walk-to-mrt   (no page uses it now: the walks are saved in the data by prep/addWalks.js)
                                     OneMap walking route to the nearest MRT:
                                     { minutes, metres, source: "onemap" }, or { minutes, source: "estimate" }
GET    /api/blocks/:id/estimate      price estimate from the regression model (prep/priceRegression.ipynb,
                                     saved in server/data/priceModel.json). Query: storey (1 to 75) and
                                     area in sqm (30 to 250), both optional (default: the block's latest sale).
                                     Returns { blockId, estimate } rounded to $1,000. 400 for an invalid
                                     value or an unsupported flat type, 404 if there are no sales.
GET    /api/amenities                every MRT station/LRT Station, hawker centre, park and primary school (for the map).
                                     Query: category (optional: mrt, hawker, park or school; anything else 400).
                                     Returns { total, results: [{ name, category, lat, lng }] }
POST   /api/auth/register            body { email, password (8+ characters), securityAnswers: [3 answers] }.
                                     Returns { token, user: { id, email } } (201)
POST   /api/auth/login               body { email, password }. Returns { token, user: { id, email } }
GET    /api/auth/preferences         [login] the saved "What matters to you?" choices: { preferences }
PUT    /api/auth/preferences         [login] replace them. Body { preferences: { panel, sortBy } }
POST   /api/auth/reset-password      Forgot password. Body { email, securityAnswers: [3 answers], password }.
                                     401 (same message) if the email is unknown or any answer is wrong
GET    /api/auth/security-questions  [login] { hasAnswers }: whether the 3 answers are saved (never the answers)
PUT    /api/auth/security-questions  [login] add or change them. Body { securityAnswers: [3 answers] }
GET    /api/auth/profile             [login] the presets { profile: { town, parentsPostal, flatType, maxPrice,
                                     minLease, showPhg } }, or { profile: null } if never answered
PUT    /api/auth/profile             [login] save them. Body { profile: { ... } }, or { profile: { skipped: true } }
                                     ("Skip for now": remember they were asked, so the popup does not come back)
GET    /api/affordability            [login] the saved calculator details (household, flat type, loan years...)
PUT    /api/affordability            [login] save them, so the calculator is filled in on any device
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
  The walk to the nearest MRT / LRT is a REAL walking route: prep/addWalks.js asked OneMap's walking
  routes once for every block (to its nearest station, and to the second-nearest when that is almost
  as close) and saved the shortest walk in blocks.json. The seed turns it into the station name,
  the walking minutes (walking metres / 80 metres per minute) and the MRT distance of the priority score,
  so all three come from the same walk. (A block without a route falls back to straight-line x 1.3.)

Priority score ("Your Priorities"; called matchScore in the code)
  The seed script stores the distance from each block to its nearest school, hawker centre and park
  (straight line) and MRT / LRT station (walking route, see above). The browser scores every card itself
  (client/src/utils/matchScore.js), so changing the panel updates the scores straight away.
    Sub-score per category = 100 x (max - distance) / max, or 0 if further than max
    Max distances: school 1000 m, MRT 1300 m walking (about 1000 m in a straight line), hawker 800 m, park 800 m
    Weights: not ticked 0, Low 1, Moderate 2, Important 3, Very 4, Extremely 5
    Score = (sum of weight x sub-score) / (sum of weights), rounded. All weights 0 = no score

The map (Leaflet + OpenStreetMap tiles)
  Search and the map share their filters (flat type, budget, lease) through the Pinia filters store, so a
  change on one page also applies on the other. The map loads the blocks with them (no search text: it
  always shows the whole island), then groups the cards by address, so each
  block is ONE dot (its flat types would otherwise sit on top of each other). A dot's colour is the
  price band of its cheapest flat type (with the band number 1-4 printed inside, so colour is not the only
  clue), or its priority score on a rainbow scale (red 0 ... purple 100).
  A dot's popup is plain HTML for Leaflet, not a Vue component, so its Save buttons cannot use @click:
  the map listens for clicks on itself and finds the flat from the button's data-id. The popup text is a
  function, so popup.update() redraws the buttons whenever the shortlist changes (here or in the card).
  The PHG layer looks up the parents' address with OneMap and keeps only the blocks within 4 km
  (Leaflet's map.distance, straight-line), on top of the filters. Amenities come from /api/amenities
  and are drawn as small squares in their own layer.

Login and shared state
  Register / login return a token (JWT, valid 7 days). The Pinia auth store keeps it in the
  browser's localStorage (so a refresh keeps you logged in) and sends it with every request.
  The Pinia shortlist store is shared by Search, Shortlist, Compare and the navbar count, and the
  filters store by Search, the Map and Compare (Compare reads the Max budget from it). The shortlist is
  kept in MongoDB, not in localStorage. The filters store also saves the filters in localStorage, so a
  refresh keeps them; logging out goes back to the starting filters.
  A navigation guard sends logged-out users from /shortlist, /compare and /profile to /login and back.
  The server checks the token again on every shortlist and preferences request.


------------------------------------------------------------------------------------------
9. DATA AND REFRESHING IT (optional)
------------------------------------------------------------------------------------------

Real HDB resale sales from the last 12 months (data.gov.sg), grouped per block and flat type,
for up to the 40 busiest blocks in each of the 26 HDB towns of Singapore: 7,154 sales in all, picked from the
243,874 records in the CSV (Jan 2017 onwards, as of 2 Nov 2026). The price model uses the 156,183 of them
since Jan 2021.
Coordinates come from OneMap; MRT stations, hawker centres, parks and primary schools from data.gov.sg.
LRT stations (Punggol, Sengkang and Bukit Panjang LRT) are stored with the MRT stations (category "mrt"), so the
nearest-station walk and the priority score's Transport part count them too.

The prep/ scripts built the two JSON files once. To rebuild them:
    cd prep
    pnpm install
    node makeData.js "/path/to/resale-prices.csv"   rebuilds both files from the resale CSV
                                                     (download it from data.gov.sg). Looks up coordinates
                                                     on OneMap (cached in prep/geocode-cache.json).
    node addSales.js "/path/to/resale-prices.csv"   only refreshes the sales and price ranges of the
                                                     blocks already in blocks.json (no OneMap calls)
    node addLrt.js                                  adds the Punggol, Sengkang and Bukit Panjang LRT stations to
                                                     amenities.json (run it again after makeData.js)
    node addWalks.js                                measures each block's real walk to its nearest station
                                                     with OneMap walking routes (needs the OneMap login in
                                                     server/config.env; about 30 minutes the first time,
                                                     cached in prep/walk-cache.json). Run it last.
Then run  pnpm seed  in the server folder.


------------------------------------------------------------------------------------------
10. KNOWN LIMITS
------------------------------------------------------------------------------------------

- Only the 40 busiest blocks in each of the 26 towns (974 blocks), not every block in Singapore.
- The priority score uses straight-line distances for schools, hawker centres and parks (only the MRT uses a
  real walking route). Walking routes end at the station's centre point, not its nearest exit.
- Distances to an amenity are measured to ONE point per amenity (from the NParks / data.gov.sg
  datasets). Big parks are split into a few sections with their own points (e.g. Bishan-Ang Mo Kio
  Park), but a block on a park's edge can still be closer to the park than the distance shown.
- The login token lasts 7 days; after that, log in again. The website does not log you out by itself: until
  you do, the pages that need an account show a "Please log in" message.
- Forgot password uses the 3 security questions set at sign-up, not an email link (Render's free plan blocks
  outgoing email).
- On Render's free plan the API sleeps when nobody uses it, so the first request can take up to a minute.
- The affordability numbers (grants, loan limits) must be checked against hdb.gov.sg / cpf.gov.sg;
  each one is listed with its source in client/src/utils/affordabilityRules.js.
- OneMap features need a OneMap account in server/config.env.


------------------------------------------------------------------------------------------
11. AI USE DECLARATION (brief FAQ 20)
------------------------------------------------------------------------------------------


Philbert (back end, deployment, tests)
Used Claude Code (Anthropic) for:
- Explaining concepts and reviewing my own back-end code (search and geospatial endpoints, score). I wrote
  the core endpoint logic myself.
- Test cases: some server, client component and Playwright end-to-end tests, which I ran and checked.
- The Save button inside the map popups and the "Note saved" message on the Shortlist page.
- Some front end bugs when changing from different view ports
- The Search race-condition fix.

Wing Yee (front end, back end)
Used Claude Code (Anthropic) for:
- Ideation for frontend desgin and theme
- To explain and give hints on how to do certain logics

Ji Hao (Affordability, front end)
I used Claude and OpenAI Codex to assist with research summaries, UI/UX design exploration, and review of existing work. 
I independently researched housing grants, including the CPF Housing Grant (CPFHG), Proximity Housing Grant (PHG), Enhanced CPF Housing Grant (EHG),etc 
and identified the relevant websites. I then asked Claude to summarise the information from those sources. 
I wrote the affordability calculation logic and grant eligibility rules myself. After completing these functions, 
I asked Claude to review them and suggest ways to streamline or shorten parts of the code.

For the frontend, I provided my own ideas and consulted my groupmate about how to present the information. 
AI helped explore layouts and suggest improvements to the presentation. After the team completed its respective parts, 
I used Codex to review individual components and pages for intuitiveness, and Claude to suggest and make UI refinements based on the feedback.

I also asked Codex to evaluate user journeys through simulated personas representing different age groups and levels of technical familiarity, 
using phone and tablet scenarios. These AI-generated assessments provided suggestions for improving the interface; they were not usability tests conducted with actual participants.

The core affordability calculations and grant eligibility logic were developed by me, with subsequent AI assistance used for review and simplification suggestions. 
I take responsibility for my submitted work and the assistance disclosed above.

[Other members: add your own entry below, in the same way.]
