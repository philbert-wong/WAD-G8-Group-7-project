<script setup>
// The Search page: search box, filters, "What matters to you?" panel and the flat cards
// DESIGN PREVIEW (Cosy Professional): only the <template> layout and <style> changed; the logic is the same.
import { onMounted, ref, computed } from 'vue'
import SearchBar from '../components/SearchBar.vue'
import FilterPanel from '../components/FilterPanel.vue'
import BlockCard from '../components/BlockCard.vue'
import PreferencesPanel from '../components/PreferencesPanel.vue'
import axios from 'axios'
import { getErrorMessage } from '../utils/errorMessage.js'
import {
  CATEGORIES,
  getWeights,
  makeDefaultPreferences,
  matchScore,
  MAX_DISTANCES,
} from '../utils/matchScore.js'

// This page's own copy of the shortlist, so each card knows if it shows ☆ Save or ★ Saved
const savedItems = ref([])
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
    const response = await axios.get('/api/blocks/area')
    area.value = response.data
  } catch (error) {
    errorMessage.value = getErrorMessage(error)
  }
}

// Gets the flats that match the search box and filters.
// Empty filters are ignored by the server, so we can send them all.
async function search() {
  loading.value = true
  errorMessage.value = ''
  try {
    const response = await axios.get('/api/blocks', { params: filters.value })
    results.value = response.data.results
    total.value = response.data.total
  } catch (error) {
    errorMessage.value = getErrorMessage(error)
  }
  loading.value = false
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
function saveChoices() {
  localStorage.setItem('matchPreferences', JSON.stringify(preferences.value))
  localStorage.setItem('sortBy', sortBy.value)
}

// Puts back the remembered choices, if there are any
function loadChoices() {
  const savedPreferences = localStorage.getItem('matchPreferences')
  if (savedPreferences !== null) {
    const saved = JSON.parse(savedPreferences)
    // Copy only the categories we know, so a category added later still gets its default
    const choices = makeDefaultPreferences()
    for (let i = 0; i < CATEGORIES.length; i++) {
      const key = CATEGORIES[i].key
      if (saved[key]) {
        choices[key] = saved[key]
      }
    }
    preferences.value = choices
  }

  const savedSort = localStorage.getItem('sortBy')
  if (savedSort !== null) {
    sortBy.value = savedSort
  }
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

// Gets the saved flats from the server
async function loadShortlist() {
  try {
    const response = await axios.get('/api/shortlist')
    savedItems.value = response.data
  } catch (error) {
    // DESIGN PREVIEW: login is not built on this branch, so the server answers 401 here.
    // We stay quiet on page load; pressing Save still shows the message.
    savedItems.value = []
  }
}

// Finds the saved item that holds this block, or null if the block is not saved
function findSavedItem(blockId) {
  for (const item of savedItems.value) {
    if (item.block.id === blockId) {
      return item
    }
  }
  return null
}

// Is this block saved? (decides ☆ Save or ★ Saved on its card)
function isSaved(blockId) {
  return findSavedItem(blockId) !== null
}

// Saves a flat. The server sends back the new item, so we add it to our list.
async function saveBlock(block) {
  shortlistErrorMessage.value = ''
  try {
    const response = await axios.post('/api/shortlist', { blockId: block.id })
    savedItems.value.push(response.data)
  } catch (error) {
    shortlistErrorMessage.value = getErrorMessage(error)
  }
}

// Un-saves a flat, then rebuilds our list without it
async function unsaveBlock(block) {
  const item = findSavedItem(block.id)
  if (item === null) {
    return
  }

  shortlistErrorMessage.value = ''
  try {
    await axios.delete('/api/shortlist/' + item.id)
    const remaining = []
    for (const savedItem of savedItems.value) {
      if (savedItem.id !== item.id) {
        remaining.push(savedItem)
      }
    }
    savedItems.value = remaining
  } catch (error) {
    shortlistErrorMessage.value = getErrorMessage(error)
  }
}

// ☆ Save / ★ Saved button on a card: saves the flat, or un-saves it if it is already saved
function toggleSave(block) {
  if (isSaved(block.id)) {
    unsaveBlock(block)
  } else {
    saveBlock(block)
  }
}

// When the page opens: put back remembered choices, then load the flats,
// the town names for the suggestions, and the shortlist
function loadPage() {
  loadChoices()
  search()
  loadAreas()
  loadShortlist()
}

onMounted(loadPage)
</script>

<template>
  <section>
    <!-- DESIGN PREVIEW (Cosy Professional): hero title, then results (left) + sidebar (right) -->
    <span class="eyebrow">4 towns · real resale prices · last 12 months</span>
    <h1 class="page-title serif">Homes that fit <em>how you live</em></h1>
    <p class="page-sub">Search blocks, compare real sale prices, and keep a shortlist.</p>

    <div v-if="shortlistErrorMessage" class="alert alert-warning">
      {{ shortlistErrorMessage }}
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

    <!-- Bootstrap grid: results take 8 of 12 columns, the sidebar 4 (stacked on phones) -->
    <div class="row g-4 mt-1">
      <div class="col-lg-8 order-2 order-lg-1">
        <div v-if="errorMessage" class="alert alert-danger">{{ errorMessage }}</div>
        <p v-else-if="loading" class="text-muted">Loading...</p>
        <div v-else class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3 resbar">
          <span><b>{{ total }} flat(s)</b> match your filters</span>
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
          v-for="item in scoredResults"
          :key="item.block.id"
          :block="item.block"
          :saved="isSaved(item.block.id)"
          :score="item.score"
          show-match
          @toggle-save="toggleSave"
        />
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
/* [AI-ASSISTED] The sidebar stays on screen while you scroll the results (position: sticky) */
@media (min-width: 992px) {
  .sidebar {
    position: sticky;
    top: 20px;
  }
}
</style>
