# Design preview: "Cosy Professional" (branch `preview/design-cosy-jihao`)

**For viewing only.** Not to be merged as is. It shows Wingyee's front-end part (navbar, search layout,
filters, preferences, block cards, shortlist) in the "Cosy Professional" design from Jihao's mockup.

- Based on `check-in` (the team's shared starting point). It does **not** include Wingyee's newer
  `wingyee` branch work, the login work or the affordability work.
- No logic was changed (same props, emits, API calls). Only the look changed, plus 2 small notes in SearchView.
- Login is not built on this branch, so the shortlist answers "Please log in". That is expected here.

## How to view
`pnpm dev` → http://localhost:5173. Use the dark bar at the top to switch the guide pet: none / cat / dog.

## What changed (file by file)
| File | What |
|---|---|
| `client/index.html` | Google Fonts link (DM Sans + DM Serif Display) |
| `client/src/main.js` | loads `assets/cosy.css` |
| `client/src/assets/cosy.css` | **new**: colours, fonts, buttons, pills, tags, cards shared by every page |
| `client/src/App.vue` | preview bar (pick the pet), footer, the guide pet |
| `client/src/components/NavBar.vue` | white bar, logo, underlined tabs, "My Shortlist" pill |
| `client/src/components/SearchBar.vue` | cosy search box |
| `client/src/views/SearchView.vue` | hero title; results on the left (8/12), sticky sidebar on the right (4/12) |
| `client/src/components/FilterPanel.vue` | "Filter Results" sidebar card; flat type as chips |
| `client/src/components/PreferencesPanel.vue` | "Your Priorities" card; the 5 level buttons became 1 dropdown |
| `client/src/components/BlockCard.vue` | photo placeholder, match bar, beige price box, lease/MRT facts, ✓ tags |
| `client/src/views/ShortlistView.vue`, `ShortlistItem.vue` | serif title, wide cards, cosy note box |
| `client/src/components/GuidePet.vue` | **new**: Mochi / Biscuit 3D pet with a 7-step tour |

## What WE could build ourselves vs what is AI-assisted
Every CSS block in the code is tagged `[COURSE]` or `[AI-ASSISTED]`.

### ✅ Possible with what IS216 taught (`[COURSE]`)
- Colours, fonts (Google Fonts `<link>`), font sizes, letter-spacing, text-transform
- Box model: padding, margin, borders, border-radius ("rounded" cards, pills, chips)
- Flexbox layouts: card (photo + text), navbar, chips, stat rows, priorities rows
- Grid `place-items: center` for centring icons
- Bootstrap: grid (`row`, `col-lg-8`, `col-lg-4`, `order-*`), `d-flex`, `gap-*`, `form-select`, `form-range`, `d-none d-md-block`
- Media queries (card stacks on phones, smaller title)
- `position: absolute` labels (town tag on the photo)
- All the Vue in the pages: `ref`, `v-for`, `v-if`, `:class`, `@click`, props / emit
- The ✓ tags (`makeTags` in BlockCard): plain `if` checks on the block's data

### 🤖 AI-assisted (beyond the course: `[AI-ASSISTED]`)
- **CSS variables** (`--terra`, `var(--terra)`) for the colour palette
- **Gradients** (`linear-gradient`, `radial-gradient`): photo placeholder, logo, match bar, the pet's fur
- **Shadows** (`box-shadow` with negative spread) under cards, buttons, sidebar
- **Transitions / transforms**: cards lift on hover, match bar slides, bubble springs in
- **Keyframe animations**: tour highlight pulse; pet breathing, tail wag, ear flop, tongue, pop-in
- **Sticky sidebar** (`position: sticky`)
- **Custom slider handles** (`::-webkit-slider-thumb`, `::-moz-range-thumb`), `accent-color`
- **Pseudo-elements** (`::before`, `::after`) and `clip-path` for the pet's eyes, ears and bubble pointer
- **The whole guide pet** (`GuidePet.vue`): 3D CSS (`perspective`, `translateZ`, `rotateX/Y`),
  mouse tracking (`addEventListener('mousemove')`, `getBoundingClientRect`),
  `onMounted` / `onUnmounted`, `setTimeout` blinking, `document.querySelector` + `scrollIntoView` for the tour
- `:key` on `<GuidePet>` to restart it when the pet changes (instead of `watch`)

### Things to decide as a team
1. Keep the guide pet? It is fun for the demo but is almost all AI-assisted. Easy to remove: delete `GuidePet.vue` + 2 lines in `App.vue`.
2. CSS variables: keep (cleaner) or replace with plain hex colours (course-only)?
3. Flat type chips vs the old dropdown; level dropdown vs the old 5 buttons.
4. No real photos: the warm gradient is a placeholder. Real photos would need a source and permission.
5. Google Fonts need internet when the site loads.
