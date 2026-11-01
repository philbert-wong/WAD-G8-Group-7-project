<script setup>
// The Search page: search box, filters, "What matters to you?" panel and the flat cards
// DESIGN PREVIEW (Cosy Professional): only the <template> layout and <style> changed; the logic is the same.
import { onMounted, ref, computed, watch } from 'vue'
import SearchBar from '../components/SearchBar.vue'
import FilterPanel from '../components/FilterPanel.vue'
import BlockCard from '../components/BlockCard.vue'
import PreferencesPanel from '../components/PreferencesPanel.vue'
import axios from 'axios'
import { useAuthStore } from '../stores/auth'
import { useShortlistStore } from '../stores/shortlist'
import {
  CATEGORIES,
  getWeights,
  makeDefaultPreferences,
  matchScore,
  MAX_DISTANCES,
} from '../utils/matchScore.js'
import { useRoute } from 'vue-router'

// Our Express server's address, from one shared place (see config.js; it changes for deployment)
import { BASE_URL } from '../config.js'

// get the current route
const route = useRoute() 

// Pinia stores (Week 11): who is logged in, and the shortlist (so each card knows if it shows ☆ Save or ★ Saved)
const auth = useAuthStore()
const shortlist = useShortlistStore()

// Messages for the top alert: "please log in" and problems saving your choices
// (problems with the shortlist itself are in shortlist.error)
const shortlistErrorMessage = ref('')

// The search box text (q) and the four filters. Empty = not used.
const filters = ref({ q: '', flatType: '', maxPrice: '650000', minLease: '60' })
const results = ref([])
const total = ref(0)
const loading = ref(false)
const errorMessage = ref('')
const area = ref([]) // town names, for the suggestions under the search box
const showSuggestions = ref(true)

// Town names that contain what is typed in the search box
const suggestions = computed(function () {
  const typed = filters.value.q.toUpperCase()
  return area.value.filter(function (town) {
    return town.includes(typed)
  })
})

// The search box says the user typed something
function setSearchText(text) {
  filters.value.q = text
  showSuggestions.value = true
}

// The user clicked a suggested town
function selectArea(town) {
  filters.value.q = town
  showSuggestions.value = false
  search()
}

// The filter panel says one filter changed, e.g. ('maxPrice', '600000')
function setFilter(name, value) {
  filters.value[name] = value
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

// Gets the flats that match the search box and filters.
// Empty filters are ignored by the server, so we can send them all.
async function search() {
  loading.value = true
  errorMessage.value = ''
  // A normal search replaces any "near a place" results, so stop saying "Showing flats near ..."
  placeName.value = ''
  try {
    const response = await axios.get(`${BASE_URL}/api/blocks`, { params: filters.value })
    results.value = response.data.results
    total.value = response.data.total
  } catch (error) {
    // Show our server's message if it sent one, otherwise axios's own (e.g. "Network Error")
    if (error.response && error.response.data && error.response.data.message) {
      errorMessage.value = error.response.data.message
    } else {
      errorMessage.value = error.message
    }
  }
  loading.value = false
}

// ---------------------------------------------------------------------------------------------
// "Near a place" search: STARTER CODE (AI-generated boilerplate). Finish every TODO yourself.
// OneMap turns the text into a point (/api/blocks/place), then /api/blocks/nearby finds the flats.
// ---------------------------------------------------------------------------------------------
const placeText = ref('') // what the user typed in the "near a place" box
const placeName = ref('') // the place OneMap found, shown above the results

async function searchNearPlace() {
  if (placeText.value.trim() === "") {
    errorMessage.value = 'Type an address or postal code';
    return;
  }
  loading.value = true
  errorMessage.value = '';
  placeName.value = '';

  try {
    // Bug 3 fix: Use axios for consistency, getting response.data
    const placeResponse = await axios.get(`${BASE_URL}/api/blocks/place`, { 
      params: { q: placeText.value } 
    });
    const place = placeResponse.data;
    const nearbyResponse = await axios.get(`${BASE_URL}/api/blocks/nearby`, { 
      params: { lat: place.lat, lng: place.lng } 
    });
    const nearbyData = nearbyResponse.data;

    results.value = nearbyData.results;
    total.value = nearbyData.total;
    placeName.value = place.name;

  } catch (error) {
    // Show our server's message if it sent one, otherwise axios's own (e.g. "Network Error")
    if (error.response && error.response.data && error.response.data.message) {
      errorMessage.value = error.response.data.message
    } else {
      errorMessage.value = error.message
    }
  }
  loading.value = false;
}

// "Clear all": empty the search box and every filter, then search again
function clearFilters() {
  filters.value = { q: '', flatType: '', maxPrice: '650000', minLease: '60' }
  search()
}

// "What matters to you?" panel: all ticked, Important (3) to start with
const preferences = ref(makeDefaultPreferences())

// 'price' = cheapest first (the order the server sends), 'match' = best match first
const sortBy = ref('price')

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

// Puts the best match first. Blocks with no score ("–") go to the end.
// Returning a negative number puts a before b, a positive number puts b before a.
function compareByMatch(a, b) {
  if (a.score === null && b.score === null) {
    return 0
  } else if (a.score === null) {
    return 1
  } else if (b.score === null) {
    return -1
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

// Pages: show PAGE_SIZE cards at a time
const PAGE_SIZE = 12
const page = ref(1)

// how many pages the whole list needs (at least 1)
const totalPages = computed(function () {
  return Math.max(1, Math.ceil(scoredResults.value.length / PAGE_SIZE))
})

// the cards for the current page
const visibleResults = computed(function () {
  const start = (page.value - 1) * PAGE_SIZE
  const end = start + PAGE_SIZE
  return scoredResults.value.slice(start, end)
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
    shortlistErrorMessage.value = 'Please log in to save flats'
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
    filters.value.maxPrice = String(budget)
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
    <!-- DESIGN PREVIEW (Cosy Professional): hero title, then results (left) + sidebar (right) -->
    <span class="eyebrow">26 towns · real resale prices · last 12 months</span>
    <h1 class="page-title serif">Homes that fit <em>how you live</em></h1>
    <p class="page-sub">Search blocks, compare real sale prices, and keep a shortlist.</p>

    <div v-if="shortlistErrorMessage" class="alert alert-warning">
      {{ shortlistErrorMessage }}
    </div>
    <div v-if="shortlist.error" class="alert alert-warning">
      {{ shortlist.error }}
    </div>

    <SearchBar :text="filters.q" @change-text="setSearchText" @search="search" />
    <div v-if="filters.q && showSuggestions && suggestions.length > 0" class="list-group mb-3">
      <button
        v-for="town in suggestions"
        :key="town"
        @click="selectArea(town)"
        class="btn btn-light w-100 text-start"
      >
        {{ town }}
      </button>
    </div>

    <!-- Near a place (OneMap): STARTER CODE, AI-generated boilerplate -->
    <form class="input-group mb-3" @submit.prevent="searchNearPlace">
      <input
        v-model="placeText"
        type="search"
        class="form-control cosy-input flex-grow-1"
        placeholder="Or find flats near an address or postal code e.g. 560314"
      />
      <button class="act-btn primary" type="submit">Find near me</button>
    </form>

    <p v-if="placeName" class="text-muted mb-3">
      Showing flats near {{ placeName }} (place search by OneMap)
    </p>

    <!-- Bootstrap grid: results take 8 of 12 columns, the sidebar 4 (stacked on phones) -->
    <div class="row g-4 mt-1">
      <div class="col-lg-8 order-2 order-lg-1">
        <div v-if="errorMessage" class="alert alert-danger">{{ errorMessage }}</div>
        <p v-else-if="loading" class="text-muted">Loading...</p>
        <div v-else class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3 resbar">
          <!-- "Near a place" results come from /nearby (within 1 km), which does not use the filters -->
          <span v-if="placeName"><b>{{ total }} flat(s)</b> within 1 km (filters not used)</span>
          <span v-else><b>{{ total }} flat(s)</b> match your filters</span>
          <select
            id="sort-by"
            v-model="sortBy"
            class="form-select form-select-sm cosy-input w-auto"
            aria-label="Sort"
            @change="saveChoices"
          >
            <option value="price">Sort: Cheapest first</option>
            <option value="match">Sort: Best match</option>
          </select>
        </div>

        <BlockCard
          v-for="item in visibleResults"
          :key="item.block.id"
          :block="item.block"
          :saved="shortlist.isSaved(item.block.id)"
          :score="item.score"
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
        <div class="sidebar">
          <FilterPanel
            :filters="filters"
            @change-filter="setFilter"
            @search="search"
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
/* [COURSE] Results count line */
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




</style>
