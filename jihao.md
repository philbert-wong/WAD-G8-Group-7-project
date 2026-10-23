# HDB Resale Finder – IS216 WAD2, G8 Group 7

## What the app does
Helps HDB resale buyers decide WHERE to look, using real transaction prices
(data.gov.sg, last 12 months) instead of asking prices. Users search blocks
(not listings), filter, compare cards with a personalised match score,
view price details and nearby amenities, and shortlist blocks with notes.

User flow: Search → Filter → Compare cards → Dig deeper → Shortlist

Data: 4 towns (Ang Mo Kio, Bishan, Punggol, Tampines), the 40 busiest blocks each.
The app never calls outside APIs at runtime; it reads server/data/*.json (seeded into MongoDB).

## How to run (pnpm, Node 22+, MongoDB)
- pnpm install   → installs server AND client/
- pnpm seed      → loads server/data/*.json into MongoDB
- pnpm dev       → website http://localhost:5173, API http://localhost:3030 (Vite proxies /api)
- pnpm test      → Vitest + Supertest on an in-memory MongoDB. Keep all tests passing.
- No .env = local MongoDB. For Atlas, copy .env.example to .env (never commit .env).

## Where things are
- client/src/views/        SearchView.vue, ShortlistView.vue, LoginView.vue (pages)
- client/src/components/   NavBar, SearchBar, FilterPanel, PreferencesPanel, BlockCard, PriceDetails, ShortlistItem
- client/src/utils/        matchScore.js, format.js, errorMessage.js
- client/src/router/index.js  routes: / (search), /shortlist, /login
- server/routes/           blocks.js, shortlist.js, auth.js
- server/models/, server/lib/, server/data/, server/seed.js
- tests/                   *.test.js
- README.md has the full API contract (its folder list is slightly out of date, e.g. there is no src/api.js).

## Tech stack (do not add other libraries without asking me)
- Front-end: Vue 3 (<script setup>, .vue files), Vue Router, axios, Bootstrap 5
- Back-end: Node.js, Express 5, MongoDB + Mongoose (2dsphere indexes), JWT auth
- Planned by others: Leaflet, Chart.js, Cypress, deployment

## Code style used in this repo ("simple style") — follow it
- Plain, explicit code with a short comment explaining each block
- for...of loops, if/else, total = total + x — avoid clever one-liners, ternaries, .reduce
- Components talk with props down and emit up (see FilterPanel.vue ↔ SearchView.vue)
- API errors look like { "error": "message" }

## Team ownership — DO NOT edit other members' files without asking me first
- Wingyee (Front-end): app shell, NavBar, responsive layout, FilterPanel, PreferencesPanel, block detail layout
- Shaun (Price analysis): data prep, geocoding, price aggregation, trend & lease decay, charts
- Philbert (Back-end): Express API & API contract, search/geospatial endpoints, score, deployment, tests setup
- Yujia (CRUD & accounts): auth, shortlist CRUD with notes, saved preferences, LoginView
- Jiun Wei (Mapping): Leaflet map, clustering, price colours, OneMap search, MRT routes, amenity layers
- Jihao (ME): Affordability — below

## MY PART (Jihao): Affordability
1. Affordability calculator — loan, downpayment, cash vs CPF outlay, grants → a max budget
2. Grant rules — eligibility logic for HDB resale grants (EHG, CPF Family/Singles Grant, PHG)
3. Budget filter — the filter ALREADY exists: filters.maxPrice in SearchView.vue, slider in FilterPanel.vue.
   My job is to let the calculator's result set maxPrice (e.g. a "Use this budget" button),
   not to rebuild the filter.
4. Proximity Housing Grant (PHG) layer — show which blocks qualify (within 4 km of / same flat as parents or children)
5. Comparison view — compare 2–3 shortlisted blocks side by side (price range, lease, MRT, match score, est. monthly cost)

Rules for my part:
- Grant amounts, income ceilings, LTV and loan rules change. NEVER hardcode them from memory.
  Put every number in ONE file (client/src/utils/affordabilityRules.js) with a comment citing the
  HDB/CPF page and the date checked, so I can verify each value myself.
- Keep my work in NEW files where possible, e.g.
  client/src/views/AffordabilityView.vue, client/src/views/CompareView.vue,
  client/src/components/AffordabilityCalculator.vue, client/src/utils/affordability.js
- Adding a route in router/index.js or a link in NavBar.vue touches shared files: tell me first,
  keep the change to a few lines.
- PHG on the map plugs into Jiun Wei's Leaflet work; any new endpoint must follow Philbert's API contract.
- Write Vitest tests for the calculator and grant logic (tests/affordability.test.js).

## How I want you to work
- Plan first and wait for my OK before editing files
- One feature at a time; after each, tell me exactly how to test it in the browser
- I'm learning: explain what you changed and why, so I can present and defend it in the demo
- Do not commit or push; I commit myself in GitHub Desktop
- After every finished change, give me a ready-to-paste commit message for GitHub Desktop so my
  teammates know what changed:
  - Summary (one line, under 60 characters), e.g. "Add affordability calculator page"
  - Description: what I added/changed (file by file), how to test it, and anything a teammate
    must know (e.g. "touched NavBar.vue: added 1 link — Wingyee FYI", "run pnpm install again")
