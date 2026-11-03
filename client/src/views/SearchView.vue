<script setup>
// The Search page: search box, filters, "What matters to you?" panel and the flat cards
import { onMounted, onUnmounted, ref, computed, watch } from 'vue'
import SearchBar from '../components/SearchBar.vue'
import FilterPanel from '../components/FilterPanel.vue'
import BlockCard from '../components/BlockCard.vue'
import PreferencesPanel from '../components/PreferencesPanel.vue'
import axios from 'axios'
import { useAuthStore } from '../stores/auth'
import { useShortlistStore } from '../stores/shortlist'
import { useFiltersStore } from '../stores/filters'
import {
  CATEGORIES,
  getWeights,
  makeDefaultPreferences,
  matchScore,
  MAX_DISTANCES,
} from '../utils/matchScore.js'
import { useRoute, RouterLink } from 'vue-router'

// Our Express server's address, from one shared place (see config.js; it changes for deployment)
import { BASE_URL } from '../config.js'

// get the current route
const route = useRoute() 

// Pinia stores (Week 11): who is logged in, and the shortlist (so each card knows if it shows ☆ Save or ★ Saved)
const auth = useAuthStore()
const shortlist = useShortlistStore()
// The filters (flat type, budget, lease) live in a Pinia store shared with the Map, so both pages show the same results
const filterStore = useFiltersStore()

// Messages for the top alert: "please log in" and problems saving your choices
// (problems with the shortlist itself are in shortlist.error)
const shortlistErrorMessage = ref('')

// The "create an account" strip for a guest who has saved presets. Closing it is remembered on this device.
const accountBannerClosed = ref(localStorage.getItem('accountBannerClosed') === 'yes')

// Only for someone who is not logged in and has presets saved on this device
const showAccountBanner = computed(function () {
  return !auth.isLoggedIn && auth.profile !== null && !accountBannerClosed.value
})

function closeAccountBanner() {
  accountBannerClosed.value = true
  localStorage.setItem('accountBannerClosed', 'yes')
}

// The search box text ('' = not used). It changes on every key; the text actually SEARCHED goes in the filters store
// (filters.q, see search() below), so the Map shows the same flats and the box is filled in again when you come back.
const searchText = ref('')
const results = ref([])
const total = ref(0)
const loading = ref(false)
const errorMessage = ref('')
const area = ref([]) // town names, for the suggestions under the search box
// Only after the user types: the preset town filled in on page load should not open the list
const showSuggestions = ref(false)

// Town names that contain what is typed in the search box
const suggestions = computed(function () {
  const typed = searchText.value.toUpperCase()
  return area.value.filter(function (town) {
    return town.includes(typed)
  })
})

// The search box says the user typed something
function setSearchText(text) {
  searchText.value = text
  showSuggestions.value = true
}

// The user clicked a suggested town
function selectArea(town) {
  searchText.value = town
  showSuggestions.value = false
  search()
}

// The filter panel says one filter changed, e.g. ('maxPrice', '600000'): change it in the shared store
function setFilter(name, value) {
  filterStore.setFilter(name, value)
}

// Gets the town names from the server (for the search suggestions)
async function loadAreas() {
  try {
    const response = await axios.get(`${BASE_URL}/api/blocks/area`)
    area.value = response.data
  } catch (error) {
    // Show our server's message if it sent one, otherwise axios's own (e.g. "Network Error")
    if (error.response && error.response.data && error.response.data.message) {
      errorMessage.value = error.response.data.message
    } else {
      errorMessage.value = error.message
    }
  }
}

// The place OneMap found when the search box held a place instead of one of our blocks, e.g. "NORTHPOINT CITY"
// ('' = a normal search). Shown above the results.
const placeName = ref('')

// Flats near any place in Singapore: our server asks OneMap where the place is (/api/blocks/place),
// then finds our flats within 1 km of it that fit the filters (/api/blocks/nearby).
// Errors are caught by search() below.
async function searchNearPlace(text) {
  const placeResponse = await axios.get(`${BASE_URL}/api/blocks/place`, { params: { q: text } })
  const place = placeResponse.data

  const nearbyResponse = await axios.get(`${BASE_URL}/api/blocks/nearby`, {
    params: {
      lat: place.lat,
      lng: place.lng,
      flatType: filterStore.filters.flatType,
      maxPrice: filterStore.filters.maxPrice,
      minLease: filterStore.filters.minLease,
    },
  })

  results.value = nearbyResponse.data.results
  total.value = nearbyResponse.data.total
  placeName.value = place.name
}


// The town preset becomes the search text, so Search focuses on it like the Map does
function applyTownPreset() {
  if (auth.profile !== null && auth.profile.town) {
    searchText.value = auth.profile.town
  }
}

// New presets were saved in the popup: search again with the new filters
watch(
  function () {
    return auth.presetsVersion
  },
  function () {
    applyTownPreset()
    search()
  },
)

// The one search box (and the filters). Empty filters are ignored by the server, so we can send them all.
//   1. Search our own data: town, street, block, full address ("Blk 314 Ang Mo Kio Ave 3") or postal code ("560323")
//   2. Our data has nothing, but something was typed (e.g. "Northpoint City", or a condo's postal code):
//      ask OneMap, flats near it
async function search() {
  loading.value = true
  errorMessage.value = ''
  placeName.value = ''
  showSuggestions.value = false // searching (Enter, the button, a filter) closes the suggestions
  const typed = searchText.value.trim()
  // Share what was searched: the Map shows these same flats (MapView reads filters.q)
  filterStore.setFilter('q', typed)

  try {
    // The search text plus the shared filters
    const params = {
      q: searchText.value,
      flatType: filterStore.filters.flatType,
      maxPrice: filterStore.filters.maxPrice,
      minLease: filterStore.filters.minLease,
    }
    const response = await axios.get(`${BASE_URL}/api/blocks`, { params: params })
    if (response.data.total === 0 && typed !== '') {
      await searchNearPlace(typed)
    } else {
      results.value = response.data.results
      total.value = response.data.total
    }
  } catch (error) {
    // Nothing to show: empty the list, so old cards do not stay under the message
    results.value = []
    total.value = 0
    if (error.response && error.response.status === 404) {
      // OneMap could not find the place either
      errorMessage.value = 'Nothing found for "' + typed + '". Try a town, a street, a block address or a postal code.'
    } else if (error.response && error.response.data && error.response.data.message) {
      // Show our server's message if it sent one
      errorMessage.value = error.response.data.message
    } else {
      // otherwise axios's own (e.g. "Network Error")
      errorMessage.value = error.message
    }
  }
  loading.value = false
}

// "Clear all": empty the search box and every filter (also on the Map, since they are shared), then search again
function clearFilters() {
  searchText.value = ''
  filterStore.clearFilters()
  search()
}

// Phones and tablets: the filters live in a drawer that slides in from the left (on a computer they are always
// shown on the right). true = drawer open
const filtersOpen = ref(false)

// The "☰ Filters" button opens the drawer
function openFilters() {
  filtersOpen.value = true
}

// The ✕ button and the dark backdrop close it
function closeFilters() {
  filtersOpen.value = false
}

// "Search" in the filter panel: close the drawer, so the new results are in view, then search
function searchFromFilters() {
  filtersOpen.value = false
  search()
}

// "What matters to you?" panel: all ticked, Important (3) to start with
const preferences = ref(makeDefaultPreferences())

// 'match' = highest match score first (the default), 'price' = cheapest first (the order the server sends)
const sortBy = ref('match')

// The panel's choices and the sort are remembered in the browser (localStorage),
// so they are still there when you come back from the Shortlist page.
// When you are logged in they are ALSO saved to your account, so they follow you to other computers.
async function saveChoices() {
  localStorage.setItem('matchPreferences', JSON.stringify(preferences.value))
  localStorage.setItem('sortBy', sortBy.value)

  if (auth.isLoggedIn) {
    try {
      await axios.put(`${BASE_URL}/api/auth/preferences`, {
        preferences: { panel: preferences.value, sortBy: sortBy.value },
      })
    } catch (error) {
      // Shown in the top alert (with shortlist errors), so the search results stay visible
      // Show our server's message if it sent one, otherwise axios's own (e.g. "Network Error")
      if (error.response && error.response.data && error.response.data.message) {
        shortlistErrorMessage.value = error.response.data.message
      } else {
        shortlistErrorMessage.value = error.message
      }
    }
  }
}

// Puts saved choices onto the panel.
// savedPanel = { school: { ticked, level }, ... } or null, savedSort = 'price' / 'match' or null
function applyChoices(savedPanel, savedSort) {
  if (savedPanel) {
    // Copy only the categories we know, so a category added later still gets its default
    const choices = makeDefaultPreferences()
    for (let i = 0; i < CATEGORIES.length; i++) {
      const key = CATEGORIES[i].key
      if (savedPanel[key]) {
        choices[key] = savedPanel[key]
      }
    }
    preferences.value = choices
  }

  if (savedSort) {
    sortBy.value = savedSort
  }
}

// Puts back the remembered choices, if there are any.
// Logged in and something saved on the account: use that. Otherwise use this browser's copy.
async function loadChoices() {
  if (auth.isLoggedIn) {
    try {
      const response = await axios.get(`${BASE_URL}/api/auth/preferences`)
      const saved = response.data.preferences
      if (saved && saved.panel) {
        applyChoices(saved.panel, saved.sortBy)
        // Also keep them in this browser, so the Map and Compare pages (which read localStorage) use the same ones
        localStorage.setItem('matchPreferences', JSON.stringify(preferences.value))
        localStorage.setItem('sortBy', sortBy.value)
        return
      }
    } catch (error) {
      // Show our server's message if it sent one, otherwise axios's own (e.g. "Network Error")
      if (error.response && error.response.data && error.response.data.message) {
        shortlistErrorMessage.value = error.response.data.message
      } else {
        shortlistErrorMessage.value = error.message
      }
    }
  }

  let savedPanel = null
  const savedPreferences = localStorage.getItem('matchPreferences')
  if (savedPreferences !== null) {
    savedPanel = JSON.parse(savedPreferences)
  }
  applyChoices(savedPanel, localStorage.getItem('sortBy'))
}

// The panel says a tick box changed
function changeTicked(key, ticked) {
  preferences.value[key].ticked = ticked
  saveChoices()
}

// The panel says an importance level changed
function changeLevel(key, level) {
  preferences.value[key].level = level
  saveChoices()
}

// Puts the highest match score first. Blocks with no score ("–") go to the end.
// Same score (e.g. every block more than 1300 m' walk from a station scores 0 for Transport):
// the shorter walk to the MRT goes first, so the "min walk" on the cards still goes up down the list.
// Returning a negative number puts a before b, a positive number puts b before a.
function compareByMatch(a, b) {
  if (a.score === null && b.score === null) {
    return 0
  } else if (a.score === null) {
    return 1
  } else if (b.score === null) {
    return -1
  } else if (a.score === b.score) {
    return a.block.distances.mrt - b.block.distances.mrt
  } else {
    return b.score - a.score
  }
}


// Every result paired with its match score: [{ block, score }, ...]
// computed() re-runs by itself whenever the panel, the sort or the results change,
// so the scores update straight away without calling the server.
const scoredResults = computed(function () {
  const weights = getWeights(preferences.value)
  const list = []
  for (let i = 0; i < results.value.length; i++) {
    const block = results.value[i]
    const score = matchScore(block.distances, weights, MAX_DISTANCES)
    list.push({ block: block, score: score })
  }
  if (sortBy.value === 'match') {
    list.sort(compareByMatch)
  }
  return list
})

// Pages: show pageSize cards at a time.
// Phones and tablets stack each card (map on top), so they get fewer per page than a computer.
// 991px is the same break as the "☰ Filters" button and the stacked card.
const isSmallScreen = ref(window.innerWidth <= 991)

// the window was resized (e.g. the DevTools device toolbar): work out the screen size again
function onResize() {
  isSmallScreen.value = window.innerWidth <= 991
}
onMounted(function () {
  window.addEventListener('resize', onResize)
})
onUnmounted(function () {
  window.removeEventListener('resize', onResize)
})

const pageSize = computed(function () {
  if (isSmallScreen.value) {
    return 6
  }
  return 12
})
const page = ref(1)

// how many pages the whole list needs (at least 1)
const totalPages = computed(function () {
  return Math.max(1, Math.ceil(scoredResults.value.length / pageSize.value))
})

// the cards for the current page
const visibleResults = computed(function () {
  const start = (page.value - 1) * pageSize.value
  const end = start + pageSize.value
  return scoredResults.value.slice(start, end)
})

// a bigger window means fewer pages: if we were past the new last page, go to the last one
watch(totalPages, function () {
  if (page.value > totalPages.value) {
    page.value = totalPages.value
  }
})

// a new search gives new results: go back to page 1
watch(results, function () {
  page.value = 1
})

// move to a page and scroll back to the top of the list
function goToPage(number) {
  if (number < 1 || number > totalPages.value) {
    return
  }
  page.value = number
  window.scrollTo({ top: 0, behavior: 'smooth' })
}





// ☆ Save / ★ Saved button on a card: saves the flat, or un-saves it if it is already saved
// (the shortlist store talks to the server and keeps the list for every page)
function toggleSave(block) {
  // The shortlist belongs to an account, so you must log in first
  if (!auth.isLoggedIn) {
    shortlistErrorMessage.value = 'Saving flats needs an account.'
    return
  }

  shortlistErrorMessage.value = ''
  if (shortlist.isSaved(block.id)) {
    // find the saved item that holds this block, to know which item to remove
    for (const item of shortlist.items) {
      if (item.block.id === block.id) {
        shortlist.removeFromShortlist(item.id)
      }
    }
  } else {
    shortlist.addToShortlist(block.id)
  }
}

// When the page opens: put back remembered choices, then load the flats,
// the town names for the suggestions, and (only when logged in) the shortlist
function loadPage() {
  loadChoices()
  const budget = route.query.maxPrice

  if (budget !== undefined) {
    filterStore.setFilter('maxPrice', String(budget))
  }
  // Back from the Map (or another page): keep the last search. Nothing searched yet: start with the preset town.
  if (filterStore.filters.q !== '') {
    searchText.value = filterStore.filters.q
  } else {
    applyTownPreset()
  }
  search()
  loadAreas()
  if (auth.isLoggedIn) {
    shortlist.fetchShortlist()
  }
}

onMounted(loadPage)

</script>

<template>
  <section>
    <!-- Hero title, then results (left) + sidebar (right) -->
    <h1 class="page-title serif">Homes that fit <em>how you live</em></h1>
    <p class="page-sub">Search blocks, compare real sale prices, and keep a shortlist.</p>

    <div v-if="shortlistErrorMessage" class="alert alert-warning">
      {{ shortlistErrorMessage }}
      <!-- A guest who tried to save a flat: the best moment to offer an account -->
      <span v-if="!auth.isLoggedIn">
        <RouterLink to="/login">Log in</RouterLink> or
        <RouterLink to="/createaccount"><strong>create a free account</strong></RouterLink>.
      </span>
    </div>
    <div v-if="shortlist.error" class="alert alert-warning">
      {{ shortlist.error }}
    </div>

    <SearchBar :text="searchText" @change-text="setSearchText" @search="search" />
    <div v-if="searchText && showSuggestions && suggestions.length > 0" class="list-group mb-3">
      <button
        v-for="town in suggestions"
        :key="town"
        @click="selectArea(town)"
        class="btn btn-light w-100 text-start"
      >
        {{ town }}
      </button>
    </div>

    <!-- The search box held a place, not one of our blocks: say which place OneMap found -->
    <p v-if="placeName" class="text-muted mb-3">
      Showing flats within 1 km of <strong>{{ placeName }}</strong> (place found by OneMap)
    </p>

    <!-- A guest who saved presets: offer an account, so the presets (and the shortlist) follow them to any device -->
    <div
      v-if="showAccountBanner"
      class="alert alert-info d-flex flex-wrap align-items-center justify-content-between gap-2"
      role="status"
    >
      <span>
        Presets saved on this device.
        <RouterLink to="/createaccount"><strong>Create a free account</strong></RouterLink>
        to keep them on any device and save flats.
      </span>
      <button type="button" class="btn-close" aria-label="Close" @click="closeAccountBanner"></button>
    </div>

    <!-- Bootstrap grid: results take 8 of 12 columns, the sidebar 4 (stacked on phones) -->
    <div class="row g-4 mt-1">
      <div class="col-lg-8 order-2 order-lg-1">
        <!-- Results bar. Computers: count on the left, Sort on the right.
             Phones and tablets: "☰ Filters" and Sort side by side on top, the count on the line below.
             (order-1 / order-2 swap their places on small screens.) Always shown, so the filters can
             still be opened when a search found nothing. -->
        <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3 resbar">
          <span v-if="!loading && !errorMessage" class="results-count order-2 order-lg-1">
            <b>{{ total }} flat(s)</b> match your filters
          </span>

          <div class="results-controls d-flex justify-content-between align-items-center gap-2 ms-auto order-1 order-lg-2">
            <!-- Phones and tablets only (d-lg-none): opens the filter drawer -->
            <button
              type="button"
              class="act-btn d-lg-none"
              aria-controls="filter-drawer"
              :aria-expanded="filtersOpen"
              @click="openFilters"
            >
              ☰ Filters
            </button>

            <select
              id="sort-by"
              v-model="sortBy"
              class="form-select form-select-sm cosy-input w-auto"
              aria-label="Sort"
              @change="saveChoices"
            >
              <option value="match">Sort: Priority score</option>
              <option value="price">Sort: Cheapest first</option>
            </select>
          </div>
        </div>

        <div v-if="errorMessage" class="alert alert-danger">{{ errorMessage }}</div>
        <p v-else-if="loading" class="text-muted">Loading...</p>

        <BlockCard
          v-for="item in visibleResults"
          :key="item.block.id"
          :block="item.block"
          :saved="shortlist.isSaved(item.block.id)"
          :score="item.score"
          :weights="getWeights(preferences)"
          show-match
          @toggle-save="toggleSave"
        />

        <nav v-if="totalPages > 1" class="d-flex justify-content-center align-items-center gap-2 mb-4">
          <button class="act-btn" type="button" :disabled="page === 1" @click="goToPage(page - 1)">
            ← Previous
          </button>
          <span class="text-muted">Page {{ page }} of {{ totalPages }}</span>
          <button class="act-btn" type="button" :disabled="page === totalPages" @click="goToPage(page + 1)">
            Next →
          </button>
        </nav>
      </div>

      <div class="col-lg-4 order-1 order-lg-2">
        <!-- Dark backdrop behind the open drawer; tapping it closes the drawer -->
        <div v-if="filtersOpen" class="drawer-backdrop d-lg-none" @click="closeFilters"></div>

        <!-- On a computer: the normal sidebar. On phones and tablets: a drawer from the left (see the CSS below) -->
        <div id="filter-drawer" class="sidebar filter-drawer" :class="{ open: filtersOpen }">
          <div class="d-flex justify-content-between align-items-center mb-3 d-lg-none">
            <strong>Filters</strong>
            <button type="button" class="btn-close" aria-label="Close filters" @click="closeFilters"></button>
          </div>

          <FilterPanel
            :filters="filterStore.filters"
            @change-filter="setFilter"
            @search="searchFromFilters"
            @clear="clearFilters"
          />

          <PreferencesPanel
            :preferences="preferences"
            @change-ticked="changeTicked"
            @change-level="changeLevel"
          />
        </div>
      </div>
    </div>
  </section>
</template>

<style>
/* Results count line */
.resbar {
  font-size: 14px;
  color: var(--muted);
}
.resbar b {
  color: var(--char);
}

.search-box input {
  font-size: 16px;
  padding: 11px 14px;
}

@media (min-width: 992px) {
  .sidebar {
    position: sticky;
    top: 20px;
    max-height: calc(100vh - 40px);
    overflow-y: auto;
  }
}

/* Phones and tablets (narrower than Bootstrap's lg, 992px): the sidebar becomes a drawer on the left.
   It waits just off the screen (translateX(-100%)) and slides in when it has the "open" class. */
@media (max-width: 991.98px) {
  /* Results bar: Filters + Sort fill the first line (Filters left, Sort right), the count gets its own line */
  .results-controls,
  .results-count {
    width: 100%;
  }

  .filter-drawer {
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    width: min(85vw, 360px);
    padding: 16px;
    overflow-y: auto;
    background: var(--cream);
    box-shadow: 4px 0 20px rgba(0, 0, 0, 0.15);
    z-index: 1045; /* above the page and the navbar */
    transform: translateX(-100%);
    visibility: hidden; /* while closed, its buttons cannot be reached with the Tab key */
    transition: transform 0.25s ease, visibility 0.25s;
  }
  .filter-drawer.open {
    transform: translateX(0);
    visibility: visible;
  }

  /* The dark see-through layer over the page, just under the drawer */
  .drawer-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    z-index: 1040;
  }
}




</style>
