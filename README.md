# HDB Resale Finder

**Asking prices tell you what sellers hope for. Transacted prices tell you what buyers actually paid.**

A web app that helps HDB resale buyers decide **where** to look. Instead of listings and asking prices, it
uses real resale transactions from data.gov.sg: search blocks, filter by budget, flat type and lease, score
them against what matters to you, see each block's recent sales and a price-model estimate, check grants
and affordability, and see every block on a map.

**Course:** IS216 Web Application Development II, Section G8, Group 7 · **Live app:** _<link>_ · **Video:** _<link>_

### At a glance

| | |
|---|---|
| Coverage | **26 HDB towns**, up to 40 busiest blocks each: **974 blocks**, **1,306 block + flat type cards**, **930 amenities** |
| Prices | Real transacted prices from the last 12 months (data.gov.sg), plus a live data.gov.sg lookup per block |
| Price model | Multiple linear regression on log(price), trained on **156,183 sales** (Jan 2021 to Oct 2026) |
| Model accuracy | **R² 0.904** on unseen sales · average miss **$46,311** (7.8%) · **3.2x better** than guessing the median |
| Automated tests | **204 tests** in 3 layers: 70 server API + 103 client component/unit + 31 browser end-to-end |

---

## 1. Problem Statement

### The problem
A first-time HDB resale buyer usually starts on a listings site, where every price is an **asking price**
written by the seller or agent. Asking prices are often above what flats actually sell for, and listings
only show what is for sale today, not what a block normally goes for. That makes it hard to answer the
first question a buyer has: *"With my budget, which towns and blocks should I even be looking at?"*

The real answer already exists in HDB's public resale records, but as a CSV of hundreds of thousands of rows.

### Who experiences it
- First-time buyers (couples, singles, families) working out where they can afford to live
- Buyers who want to live near their parents, for the Proximity Housing Grant (PHG)
- Buyers trading off price against lease left, floor, size, and distance to MRT, hawker centres, parks and schools

### Why it is worth solving
A resale flat is the largest purchase most Singaporeans make. Choosing the wrong area to search in costs
weeks of viewings, and anchoring on an inflated asking price costs real money at negotiation.

### Risks without this app, and how it addresses them

| Risk | What happens without it | What the app does |
|---|---|---|
| **Anchoring on asking prices** | Buyer treats a high asking price as normal | Shows the median, lowest and highest **transacted** price per block and flat type |
| **Searching the wrong area** | Buyer views flats far outside their budget | Budget filter, cheapest first; the calculator's "use this budget" sends the budget straight to Search |
| **Ignoring lease decay** | Buyer pays similar money for 55 years left as for 90 | Remaining-lease filter; the price model puts a % on each year of lease (about 1% per year) |
| **Missing grants** | Buyer does not know what they qualify for | Affordability calculator with grant rules (each number has its source) and a PHG checker |
| **"Near MRT" claims** | Listing says 5 minutes; the real walk is 12 | Real OneMap walking route from each block to its nearest MRT / LRT station |
| **Losing track of options** | Notes scattered across chats and screenshots | Shortlist with notes, and a side-by-side Compare of 2 or 3 flats |

## 2. Solution Overview

The data is prepared **once, offline**, then loaded into MongoDB. The live app only reads from MongoDB,
except for place search (OneMap) and the live sales lookup (data.gov.sg).

### Architecture

```mermaid
flowchart TB
    subgraph OFF["Offline, run once (prep/)"]
        CSV[("HDB resale CSV<br/>data.gov.sg")]
        JS["Node prep scripts<br/>makeData, addSales, addPostal,<br/>addLrt, addWalks"]
        NB["Jupyter notebook<br/>priceRegression.ipynb<br/>(pandas + scikit-learn)"]
    end

    subgraph DATA["server/data/ (committed)"]
        B["blocks.json"]
        A["amenities.json"]
        PM["priceModel.json"]
    end

    DB[("MongoDB<br/>blocks, amenities,<br/>users, shortlist")]
    API["Express 5 API<br/>server/ :8000"]
    WEB["Vue 3 website<br/>client/ :5173"]
    USER(("Buyer"))

    OM["OneMap<br/>place search, walking routes"]
    GOV["data.gov.sg<br/>live resale prices"]
    OSM["OpenStreetMap<br/>map tiles"]

    CSV --> JS
    CSV --> NB
    OM -. coordinates + walks .-> JS
    JS --> B
    JS --> A
    NB --> PM
    B -->|pnpm seed| DB
    A -->|pnpm seed| DB
    DB <--> API
    PM --> API
    API <-->|REST + JWT| WEB
    API -.-> OM
    API -.-> GOV
    WEB -.-> OSM
    USER --> WEB
```

### Data pipeline (prep/)

```mermaid
flowchart LR
    CSV[("resale-prices.csv<br/>sales data since 2017")]
    MD["makeData.js<br/>group per block + flat type,<br/>40 busiest blocks per town,<br/>OneMap coordinates (cached)"]
    AS["addSales.js<br/>refresh sales + price range<br/>(no OneMap calls)"]
    AP["addPostal.js<br/>postal code per block"]
    AL["addLrt.js<br/>Punggol, Sengkang,<br/>Bukit Panjang LRT"]
    AW["addWalks.js<br/>real walk to nearest station<br/>(OneMap, cached)"]
    B["blocks.json"]
    A["amenities.json"]
    SEED["server: pnpm seed"]

    CSV --> MD
    MD --> B
    MD --> A
    CSV --> AS --> B
    AP --> B
    AL --> A
    AW --> B
    B --> SEED
    A --> SEED
```

### How one price estimate flows

```mermaid
sequenceDiagram
    participant U as Buyer
    participant C as BlockCard / PriceDetails
    participant S as Express API
    participant DB as MongoDB
    participant M as priceModel.json
    U->>C: clicks "Price details"
    C->>S: GET /api/blocks/:id/sales
    S->>DB: find block
    DB-->>S: recent sales
    S-->>C: count, median, lowest, highest, sales[]
    C->>S: GET /api/blocks/:id/estimate
    S->>M: intercept + weights x (storey, lease, month, log area) + town + flat type
    M-->>S: log(price)
    S-->>C: estimate (Math.exp, rounded to $1,000), factors, yearly %, trend
    C-->>U: chart of sales + model trend, and what pushes this price up or down
```

### Code map

Every box is a file or folder in this repo; colours group them by job (blue = website, amber = API,
green = data, rose = offline preparation, teal = tests, indigo = outside services). Generated with
[GitDiagram](https://gitdiagram.com/philbert-wong/wad-g8-group-7-project), then updated by hand: added the
price model (notebook → `priceModel.json` → estimate endpoint), the JSON files and `seed.js` between the prep
scripts and MongoDB, the amenity routes, and the three test layers.

```mermaid
%% Generated by https://gitdiagram.com/philbert-wong/wad-g8-group-7-project, then updated by hand to match the repo
flowchart TD

subgraph group_buyer_app["Website (client/)"]
  node_search["Search and filters<br/>[SearchView.vue]"]
  node_block_details["Price details and estimate chart<br/>[PriceDetails.vue]"]
  node_priority_scoring["Priority scoring<br/>[matchScore.js]"]
  node_map["Block map<br/>[MapView.vue]"]
  node_affordability["Affordability tools<br/>[CPFCalView.vue]"]
  node_affordability_math["Grant and loan calculations<br/>[affordability.js]"]
  node_comparison["Flat comparison<br/>[CompareView.vue]"]
  node_shortlist["Saved shortlist<br/>[shortlist.js]"]
  node_accounts["Login and preferences<br/>[auth.js]"]
  node_guide["Guided tour<br/>[GuideTour.vue]"]
end

subgraph group_api["API (server/)"]
  node_api_server["Express API<br/>[server.js]"]
  node_block_api["Block search, sales and estimate<br/>[blocks-controller.js]"]
  node_amenity_api["Amenity lookup<br/>[amenities-controller.js]"]
  node_auth_api["Accounts and preferences<br/>[auth-controller.js]"]
  node_shortlist_api["Shortlist CRUD<br/>[shortlist-controller.js]"]
  node_affordability_api["Affordability profile<br/>[affordability-routes.js]"]
  node_auth_guard["Token guard<br/>[requireAuth.js]"]
end

subgraph group_persistence["Data"]
  node_json[("Block and amenity data<br/>[blocks.json, amenities.json]")]
  node_price_json[("Price model weights<br/>[priceModel.json]")]
  node_block_store[("Blocks<br/>[block-model.js]")]
  node_amenity_store[("Amenities<br/>[amenity-model.js]")]
  node_user_store[("Users<br/>[user-model.js]")]
  node_shortlist_store[("Shortlist items<br/>[shortlist-model.js]")]
  node_affordability_store[("Affordability profiles<br/>[affordability-model.js]")]
  node_buyer_db[("MongoDB Atlas")]
end

subgraph group_preparation["Offline preparation (prep/), run once"]
  node_data_prep["Block data<br/>[makeData.js]"]
  node_sales_prep["Sales refresh<br/>[addSales.js]"]
  node_extra_prep["Postal codes and LRT<br/>[addPostal.js, addLrt.js]"]
  node_walk_prep["Walking routes<br/>[addWalks.js]"]
  node_amenity_prep["Amenity datasets<br/>[amenityFiles.js]"]
  node_notebook["Price model training<br/>[priceRegression.ipynb]"]
  node_seed["Data loader<br/>[server/seed.js]"]
end

subgraph group_tests["Tests"]
  node_server_tests["API tests, in-memory MongoDB<br/>[server/tests/]"]
  node_client_tests["Component and unit tests<br/>[client/src/**/__tests__/]"]
  node_e2e_tests["Browser journeys, Playwright<br/>[e2e/tests/]"]
end

node_buyer(("Buyer"))
node_hdb_data["HDB resale CSV<br/>data.gov.sg"]
node_onemap["OneMap"]
node_data_gov["data.gov.sg API"]
node_map_tiles["OpenStreetMap tiles"]

node_buyer -->|"searches blocks"| node_search
node_buyer -->|"explores blocks"| node_map
node_buyer -->|"checks affordability"| node_affordability
node_buyer -->|"saves options"| node_shortlist
node_buyer -->|"manages account"| node_accounts
node_guide -->|"guides first visit"| node_buyer
node_search -->|"scores blocks"| node_priority_scoring
node_search -->|"opens"| node_block_details
node_search -->|"requests results"| node_api_server
node_block_details -->|"requests sales and estimate"| node_api_server
node_map -->|"loads blocks and amenities"| node_api_server
node_map -.->|"displays map tiles"| node_map_tiles
node_affordability -->|"calculates budget"| node_affordability_math
node_affordability -.->|"saves profile"| node_api_server
node_comparison -->|"reads saved flats"| node_shortlist
node_comparison -->|"scores selected flats"| node_priority_scoring
node_comparison -->|"estimates repayments"| node_affordability_math
node_shortlist -.->|"syncs saved flats"| node_api_server
node_accounts -->|"sends login requests"| node_api_server

node_api_server -->|"block routes"| node_block_api
node_api_server -->|"amenity routes"| node_amenity_api
node_api_server -->|"account routes"| node_auth_api
node_api_server -->|"shortlist routes"| node_shortlist_api
node_api_server -->|"affordability routes"| node_affordability_api
node_block_api -->|"queries blocks"| node_block_store
node_block_api -->|"nearest amenities"| node_amenity_store
node_block_api -->|"reads weights"| node_price_json
node_block_api -.->|"live sales"| node_data_gov
node_block_api -.->|"place search"| node_onemap
node_amenity_api -->|"queries amenities"| node_amenity_store
node_auth_api -->|"reads and writes users"| node_user_store
node_shortlist_api -->|"checks login"| node_auth_guard
node_shortlist_api -->|"reads and writes items"| node_shortlist_store
node_shortlist_api -->|"loads block details"| node_block_store
node_affordability_api -->|"checks login"| node_auth_guard
node_affordability_api -->|"reads and writes profile"| node_affordability_store

node_hdb_data -->|"resale sales"| node_data_prep
node_hdb_data -->|"resale sales"| node_sales_prep
node_hdb_data -->|"156,183 sales since 2021"| node_notebook
node_data_prep -->|"downloads amenities"| node_amenity_prep
node_data_prep -.->|"coordinates"| node_onemap
node_walk_prep -.->|"walking routes"| node_onemap
node_data_prep -->|"writes"| node_json
node_sales_prep -->|"updates sales"| node_json
node_extra_prep -->|"adds postal codes and LRT"| node_json
node_walk_prep -->|"adds walks"| node_json
node_notebook -->|"exports weights"| node_price_json
node_json -->|"pnpm seed"| node_seed
node_seed -->|"loads"| node_block_store
node_seed -->|"loads"| node_amenity_store

node_block_store -.-> node_buyer_db
node_amenity_store -.-> node_buyer_db
node_user_store -.-> node_buyer_db
node_shortlist_store -.-> node_buyer_db
node_affordability_store -.-> node_buyer_db

node_server_tests -->|"calls every endpoint"| node_api_server
node_client_tests -->|"mounts components, checks utils"| node_priority_scoring
node_client_tests -->|"checks maths"| node_affordability_math
node_e2e_tests -->|"clicks and types like a buyer"| node_search

classDef toneBlue fill:#dbeafe,stroke:#2563eb,stroke-width:1.5px,color:#172554
classDef toneAmber fill:#fef3c7,stroke:#d97706,stroke-width:1.5px,color:#78350f
classDef toneMint fill:#dcfce7,stroke:#16a34a,stroke-width:1.5px,color:#14532d
classDef toneRose fill:#ffe4e6,stroke:#e11d48,stroke-width:1.5px,color:#881337
classDef toneIndigo fill:#e0e7ff,stroke:#4f46e5,stroke-width:1.5px,color:#312e81
classDef toneTeal fill:#ccfbf1,stroke:#0f766e,stroke-width:1.5px,color:#134e4a
class node_search,node_block_details,node_priority_scoring,node_map,node_affordability,node_affordability_math,node_comparison,node_shortlist,node_accounts,node_guide toneBlue
class node_api_server,node_block_api,node_amenity_api,node_auth_api,node_shortlist_api,node_affordability_api,node_auth_guard toneAmber
class node_json,node_price_json,node_block_store,node_amenity_store,node_user_store,node_shortlist_store,node_affordability_store,node_buyer_db toneMint
class node_data_prep,node_sales_prep,node_extra_prep,node_walk_prep,node_amenity_prep,node_notebook,node_seed toneRose
class node_server_tests,node_client_tests,node_e2e_tests toneTeal
class node_buyer,node_hdb_data,node_onemap,node_data_gov,node_map_tiles toneIndigo
```

| Folder | What is in it |
|---|---|
| `client/src/views/` | The pages: `SearchView`, `MapView`, `CPFCalView` (affordability), `CompareView`, `ShortlistView`, `LoginView`, `ProfileView`, `ForgotPasswordView` |
| `client/src/components/` | `BlockCard`, `PriceDetails` (sales chart + estimate), `FilterPanel`, `PreferencesPanel`, `MatchScore`, `PhgChecker`, `GuideTour`, `NavBar`, ...; `map/` holds the map sidebar parts |
| `client/src/stores/` | Pinia: `auth` (who is logged in), `shortlist`, `filters` (shared by Search and Map), `mapFocus` |
| `client/src/utils/` | `matchScore.js` (priority score), `affordability.js` + `affordabilityRules.js` (calculator maths and every grant number with its source) |
| `server/` | `server.js`, `routes/`, `controllers/`, `models/` (Mongoose), `middleware/` (`requireAuth`, `errorHandler`), `seed.js` |
| `server/data/` | `blocks.json`, `amenities.json`, `priceModel.json` |
| `prep/` | One-time data scripts and `priceRegression.ipynb` (its own small project; the app never runs these) |
| `server/tests/`, `client/src/**/__tests__/`, `e2e/` | The three test layers (Section 7, details in README.txt section 5) |

## 3. Key Features

- **Search** (`/`): one box for a town, street, block address, postal code or any place (our data first, then
  OneMap for flats within 1 km). Filters for budget, flat type and remaining lease. Block cards with price
  range, median, lease left and walk to MRT.
- **Your Priorities and the priority score:** tick and weight school, MRT, hawker centre and park; every card
  is scored in the browser, so changing a weight re-sorts instantly.
- **Price details:** the block's recent sales, median price and price per m², a chart, the model's estimate,
  and which factors (floor, lease, size, town) push the price up or down.
- **Map** (`/map`): one dot per block, coloured by price band or priority score; amenity layers (MRT/LRT,
  hawker, park, school); address search; a **PHG layer** that keeps only blocks within 4 km of the parents.
- **Affordability** (`/CPFCal`): maximum budget from income and loan, grants (including mixed couples and
  joint singles), stamp duty, PHG checker, and "use this budget" to search with it.
- **Accounts:** register / login (JWT + bcrypt), forgot password, saved priorities and household details.
- **Shortlist and Compare:** save flats with notes; compare 2 or 3 side by side.
- **Phone layout:** bottom tab bar, filter drawer, stacked Compare cards; a guided tour on first visit.

## 4. Price Model

The regression is trained offline in Python (`prep/priceRegression.ipynb`) and exported as a handful of
numbers to `server/data/priceModel.json`. The server then predicts in plain JavaScript with the same sum,
so the app needs no Python at run time.

```
log(price) = intercept
           + w1 x storey + w2 x lease_years + w3 x months_since_Jan_2021 + w4 x log(area)
           + town effect (Ang Mo Kio = 0) + flat type effect (2 ROOM = 0)
price      = e^(log(price))
```

| Step | Choice | Why |
|---|---|---|
| Data | 156,183 sales, all 26 towns, **Jan 2021 to Oct 2026**, 5 flat types | 2021 is the first year of the steady rise (2018 to 2020 were flat); 1-ROOM and MULTI-GENERATION dropped (too few sales) |
| Target | **log(price)** | Each weight becomes a % effect; skew falls from 0.97 to 0.06 |
| Features | storey (middle of the band), lease years left at sale, months since Jan 2021, **log(area)**, town and flat type as 0/1 columns | 33 features in total |
| Split | 80% train (124,946) / 20% test (31,237) | Test sales are never seen during training |

**Accuracy on the 31,237 unseen test sales**

| Metric | Result |
|---|---|
| R² (train / test) | 0.904 / 0.904, gap 0.0, so no overfitting |
| Average miss (MAE) | $46,311 (7.8% of the price) |
| Median miss | $34,893 |
| Within 10% of the real price | 70.5% |
| Baseline (guess the $560k median for every flat) | MAE $148,452, so the model is **3.2x better** |

**What the weights say** (all else equal, for a typical $560k flat)

| Effect | Size |
|---|---|
| One floor higher | +0.77% (about $4,300) |
| One more year of lease left (lease decay) | +1.0% (about $5,600) |
| Market trend | +7.1% per year (about $39,700) |
| 10% bigger flat | +8.2% |
| Most expensive towns vs Ang Mo Kio | Bukit Timah +31.5%, Central Area +27.2%, Marine Parade +22.9%, Bishan +16.6% |
| Cheapest towns vs Ang Mo Kio | Choa Chu Kang −25.8%, Sembawang −23.9%, Woodlands −23.1%, Jurong West −22.4% |

Flat type adds little on top of size (3-room +0.4%, 5-room +3.8%, Executive +15.5% vs 2-room of the same
area), because log(area) already carries most of the difference.

**Known limits of the model:** lease decay is one straight % per year (a real flat loses value faster as the
lease runs low); the trend is one straight line from 2021; no flat model, renovation or exact distance to MRT.

## 5. Tech Stack, External APIs & Datasets

| Layer | Technology | Used for |
|---|---|---|
| Front end | Vue 3 (Vite), Vue Router, Pinia, axios, Bootstrap 5 | Pages, shared state, API calls, layout |
| Map | Leaflet + OpenStreetMap tiles | Block dots, amenity layers, PHG circle |
| Charts | Chart.js | Sales and price-trend chart |
| Back end | Node.js, Express 5, Mongoose | REST API, validation, `{ "message": "..." }` errors |
| Database | MongoDB Atlas (cloud) | Blocks and amenities (with 2dsphere indexes for `$geoNear`), users, shortlist |
| Auth | JSON Web Tokens (7 days) + bcrypt | Login, protected shortlist / preferences routes |
| Price model | Python, pandas, NumPy, scikit-learn, matplotlib (Jupyter) | Training the regression offline |
| Data prep | Node.js, csv-parse | Building `blocks.json` and `amenities.json` |
| Testing | Vitest, Supertest, mongodb-memory-server, @vue/test-utils, jsdom, Playwright | Section 7 |
| Package manager | pnpm | Every sub-project |
| API: OneMap (SLA) | Search and routing | Geocoding, place search, walking routes to MRT |
| API: data.gov.sg | Datasets and live API | HDB resale prices; MRT stations, hawker centres, parks, primary schools |

## 6. Installation & Setup

Requires **Node.js 22+**, **pnpm** (`npm install -g pnpm`) and a **MongoDB Atlas** database (the team's
cluster, or your own free one). MongoDB running on your own computer also works.

```bash
git clone https://github.com/philbert-wong/WAD-G8-Group-7-project.git
cd WAD-G8-Group-7-project

# 1. API (terminal 1)
cd server
pnpm install
cp config.env.example config.env   # then fill it in (see below)
pnpm seed                          # loads 1,306 cards and 930 amenities into the database in DB
pnpm dev                           # http://localhost:8000

# 2. Website (terminal 2)
cd client
pnpm install
pnpm dev                           # http://localhost:5173

# 3. End-to-end tests (optional, once)
cd e2e
pnpm install
pnpm exec playwright install chromium
```

**`server/config.env`** (gitignored, never commit it):

| Setting | What to put |
|---|---|
| `DB` | MongoDB Atlas connection string, with the database name before the `?`: `mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/check-in?retryWrites=true`. Only if it is left out does the server use `mongodb://127.0.0.1:27017/check-in` on your computer. |
| `JWT_SECRET` | Any long random text (signs login tokens) |
| `PORT` | API port, default `8000` |
| `ONEMAP_EMAIL`, `ONEMAP_PASSWORD` | A free OneMap account (onemap.gov.sg). Needed for place and postal-code search; without it those searches show an error. Walking routes are already in the data. |

> **Careful with `pnpm seed` on a shared cluster.** It replaces all blocks and amenities and gives the blocks
> new ids, so saved shortlist items stop matching their blocks. If the team's database is already loaded,
> only re-seed after the data files change, and tell the team first.

**Rebuilding the data (optional).** The JSON files are committed, so this is not needed to run the app.
Put the data.gov.sg CSV "Resale flat prices based on registration date from Jan-2017 onwards" in
`prep/raw/resale-prices.csv` (gitignored, never committed), then:

```bash
cd prep && pnpm install
node makeData.js raw/resale-prices.csv   # rebuild blocks.json + amenities.json (OneMap, cached)
node addSales.js raw/resale-prices.csv   # only refresh sales and price ranges
node addLrt.js                           # add the LRT stations (run again after makeData.js)
node addWalks.js                         # real walks to the nearest station (~30 min first time). Run last.
cd ../server && pnpm seed
```

To retrain the price model, open `prep/priceRegression.ipynb` in its conda environment and run all cells;
Step 8 writes `server/data/priceModel.json` and checks the JSON gives the same answer as the Python model.

Every API endpoint, the pages and the manual test journeys are in [`README.txt`](README.txt) (sections 3, 5 and 7).

## 7. Testing

Three layers, from fastest to closest to a real user:

| Layer | Where | Tools | Tests | Needs | Run |
|---|---|---|---|---|---|
| **Server API** | `server/tests/` | Vitest + Supertest, in-memory MongoDB | **70** | nothing (downloads a MongoDB binary on first run) | `cd server && pnpm test` |
| **Client components and utils** | `client/src/**/__tests__/` | Vitest + Vue Test Utils + jsdom | **103** | nothing | `cd client && pnpm test` |
| **End-to-end** | `e2e/tests/` | Playwright (Chromium) | **31** (26 desktop + 5 phone) | API and website running, seeded DB, OneMap login | `cd e2e && pnpm exec playwright test` |

Last local run (4 Nov 2026): server **70/70 passed**, client **103/103 passed**.

**Server API.** The test setup (`server/tests/start-test-server.js`) starts a throwaway MongoDB in memory
and our real `server.js` on port 8001 pointed at it, so the tests never touch the database in `DB` and can
run alongside `pnpm dev`. Covers auth (register, login, email and password rules, preferences, forgot
password), search and every filter, geospatial nearby search, sales summaries, amenities, the shortlist
CRUD with its error codes, and the priority score maths.

**Client components and utils.** jsdom gives Vitest a pretend browser, so Vue components are mounted
without opening one. Unit tests check one function (affordability maths, score words, saved priorities);
component tests mount one component, give it props and check what it shows and which events it sends;
an integration test mounts BlockCard and MatchScore together.

**End-to-end.** Real user journeys in a real Chromium browser: accounts, search and filters, shortlist and
notes, compare, price details, the map, the affordability calculator and PHG checker, plus phone-size
journeys in `tests/mobile/`.

Before running them:
- Start the API (`cd server && pnpm dev`) and the website (`cd client && pnpm dev`). Playwright does **not** start them.
- Load the data (`pnpm seed`). Some tests use seed data, e.g. postal code 761672 = Blk 672A Yishun Ave 4.
- The calculator and PHG tests look up postal codes on OneMap, so they need the OneMap login in `server/config.env`.
- They use the database in `DB`, not an in-memory one. Each test that needs an account creates a new
  `e2e-<time>-<random>@example.com`, so runs are repeatable, and these test accounts stay in the database.

```bash
cd e2e
pnpm exec playwright test                       # all 31 tests, both screen sizes
pnpm exec playwright test --project=desktop     # 26 desktop tests (1280 x 720)
pnpm exec playwright test --project=iphone-6    # 5 phone tests in tests/mobile/ (375 x 667)
pnpm exec playwright test tests/search.spec.js  # one file
pnpm exec playwright show-report                # open the HTML report of the last run
BASE_URL=https://<deployed-app> pnpm exec playwright test   # run against the deployed site
```

How the tests are written: every test has three stages, **setup** (open the page), **actions** (what the
user does) and **assert** (what the user sees). Each starts in a fresh browser, so its setup first closes
the first-visit popup and the page tour. Elements are found the way a user finds them (role and visible
name, e.g. the "Logout" button) or by a fixed id (e.g. `#login-email`), never by layout or CSS classes.
Both screen sizes run in Chromium, because the app is marked in Chrome; the phone size is the iPhone 6,
the smallest screen in the responsive check.

What every test file covers, with test counts, is listed in [`README.txt`](README.txt), section 5.

## 8. Limitations

- Only the 40 busiest blocks in each of the 26 towns (974 blocks), not every HDB block.
- The priority score uses straight-line distances for schools, hawker centres and parks; only MRT / LRT uses
  a real walking route, and it ends at the station's centre point, not its nearest exit.
- Each amenity is one point, so a block on the edge of a big park can be closer than shown.
- The price model's lease decay and market trend are straight lines (Section 4); the estimate is a guide,
  typically within about $35k to $46k, not a valuation.
- Grant and loan numbers must be checked against hdb.gov.sg / cpf.gov.sg; each has its source in
  `client/src/utils/affordabilityRules.js`.
- OneMap features need a OneMap account in `server/config.env`. Login tokens last 7 days.

## 9. Team

| Member | Area |
|---|---|
| Wingyee | Front end: app shell, NavBar, responsive layout, FilterPanel, PreferencesPanel, block detail layout |
| Shaun | Price analysis: data prep, geocoding, price aggregation, price model, trend and lease-decay charts |
| Philbert | Back end: Express API and API contract, search and geospatial endpoints, score, deployment, tests |
| Yujia | CRUD and accounts: auth, shortlist with notes, saved preferences, Login page |
| Jiun Wei | Mapping: Leaflet map, clustering, price colours, OneMap search, MRT routes, amenity layers |
| Jihao | Affordability: calculator, grant rules, PHG, Compare page |

More detail (every API endpoint, how the geospatial search, priority score, map and login work, and the
manual test journeys) is in [`README.txt`](README.txt).

## 10. AI Use Declaration

Declared per member in [`README.txt`](README.txt), section 11 (IS216 brief FAQ 20).
