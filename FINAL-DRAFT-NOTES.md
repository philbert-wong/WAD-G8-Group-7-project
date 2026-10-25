# Final draft preview (branch `preview/final-draft-jihao`)

**For viewing only.** A first look at how the whole app could turn out. Not to be merged as is.
Built from: `preview/design-cosy-jihao` (Cosy design) + `feature/accounts-jihao` (login)
+ `feature/affordability-jihao` (Yujia's + Jihao's calculator) + a first draft of the map and price chart.

## How to run
`pnpm install` (this branch adds **leaflet** and **chart.js**), `pnpm seed`, `pnpm dev` → http://localhost:5173.
Create an account on **Login** first; the shortlist, saved priorities and Compare need it.

## Features
| # | Feature | Page | Area (owner) | Look out for | Not in our syllabus |
|---|---|---|---|---|---|
| 1 | Cosy Professional design | all | Wingyee (front end) | see `DESIGN-PREVIEW-NOTES.md`; photos are placeholders | CSS variables, gradients, shadows, animations, sticky sidebar |
| 2 | Guide pet + tour (Mochi / Biscuit) | Search | extra | only on the Search page; fun but almost all AI-assisted | 3D CSS, mouse tracking, onMounted/onUnmounted, querySelector |
| 3 | Search, filters, priorities, match score, sort | Search | Philbert / Wingyee | budget slider is $300k–$1M; match score uses straight-line distance | `computed` (already in SearchView) |
| 4 | Login / register / logout | Login, navbar | Yujia | token kept 7 days in localStorage; navbar does not notice an expired token | localStorage, `axios.defaults.headers`, JWT, bcrypt |
| 5 | Saved priorities on the account | Search | Yujia | logged out = browser only; logged in = saved to the account | PUT request, new Express routes, `markModified` |
| 6 | Shortlist with notes | Shortlist | Yujia | needs login | – |
| 7 | Affordability calculator (3 steps) | Affordability | Jihao + Yujia | numbers marked ⚠️ VERIFY in `affordabilityRules.js`; no bank loan / stamp duty | `computed` (Option A), `Math.pow` loan formula |
| 8 | "Apply budget to Search" + "Calculate my budget" link | Affordability ↔ Search | Jihao + Yujia | sends the max price **including** the loan via `?maxPrice=` | `useRoute`/`useRouter`, URL query |
| 9 | PHG checker (list) | Affordability step 2 | Jihao | only our 223 blocks; server returns at most 50 | – |
| 10 | Compare 2–3 shortlisted flats | Compare | Jihao | needs login + 2 saved flats; match score uses default priorities | – |
| 11 | Map of every block, coloured by price | Map | Jiun Wei (first draft) | map tiles load from OpenStreetMap (internet); keep the credit line | **Leaflet** (new package), onMounted/onUnmounted |
| 12 | PHG 4 km circle on the map | Map | Jiun Wei + Jihao | count capped at 50 by the server | Leaflet circles |
| 13 | Price chart of recent sales | Search card → Price details | Shaun (first draft) | shows each sale, not a monthly average; few sales = short line | **Chart.js** (new package), nextTick, `<canvas>` |

## Merge notes (for when the real branches are merged)
- `NavBar.vue`: cosy design + Login/Logout + 5 tabs (Search, Map, Affordability, Compare, Shortlist).
- `FilterPanel.vue`: cosy design kept; Yujia's "Calculate My Affordability" button became a link under the budget slider.
- `SearchView.vue`: cosy layout + login checks + saved priorities + Yujia's `?maxPrice` reading.
- New packages: `leaflet`, `chart.js` (client). Everyone runs `pnpm install` once.

## Not done / next steps
- Real HDB photos, a bank-loan option, stamp duty and fees in the calculator.
- Lease-decay chart (Shaun), MRT routes and amenity layers on the map (Jiun Wei), map marker clustering.
- Verify every ⚠️ number in `client/src/utils/affordabilityRules.js` on hdb.gov.sg / cpf.gov.sg.
- Tests for the new parts (Vitest is not in the course, so ask first).
