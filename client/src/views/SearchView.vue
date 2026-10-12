<script setup>
import { onMounted, reactive, ref, computed } from 'vue'
import SearchBar from '../components/SearchBar.vue'
import FilterPanel from '../components/FilterPanel.vue'
import BlockCard from '../components/BlockCard.vue'
import PreferencesPanel from '../components/PreferencesPanel.vue'
import * as api from '../api.js'
import {
  getWeights,
  makeDefaultPreferences,
  matchScore,
  MAX_DISTANCES,
} from '../utils/matchScore.js'
import { useShortlistStore } from '../stores/shortlist.js'

const shortlist = useShortlistStore()

const filters = reactive({ q: '', flatType: '', maxPrice: '', minLease: '', maxWalk: '' })
const results = ref([])
const total = ref(0)
const loading = ref(false)
const error = ref('')
const area = ref([])
const showSuggestions = ref(true)

// find matching areas
const suggestions = computed(() => {
  return area.value.filter((a) => a.includes(filters.q.toUpperCase()))
})

// When user selects a area
function selectArea(a) {
  filters.q = a
  showSuggestions.value = false
  search()
}

// get areas from backend
async function loadAreas() {
  try {
    const response = await fetch('/api/blocks/area')
    area.value = await response.json()
  } catch (err) {
    console.log(err.message)
  }
}

async function search() {
  loading.value = true
  error.value = ''
  try {
    const data = await api.searchBlocks(filters)
    results.value = data.results
    total.value = data.total
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

function clearFilters() {
  Object.assign(filters, { q: '', flatType: '', maxPrice: '', minLease: '', maxWalk: '' })
  search()
}

// "What matters to you?" panel: all ticked, Important (3) to start with
const preferences = reactive(makeDefaultPreferences())

// 'price' = cheapest first (the order the server sends), 'match' = best match first
const sortBy = ref('price')

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
  const weights = getWeights(preferences)
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

// ☆ Save / ★ Saved button on a card: saves the flat, or un-saves it if it is already saved
function toggleSave(block) {
  if (shortlist.isSaved(block.id)) {
    shortlist.removeByBlock(block)
  } else {
    shortlist.add(block)
  }
}

onMounted(() => {
  search()
  loadAreas()
})
</script>

<template>
  <section>
    <SearchBar v-model="filters.q" @search="search" @typing="showSuggestions = true" />
    <div v-if="filters.q && showSuggestions && suggestions.length > 0" class="list-group mb-3">
      <button
        v-for="a in suggestions"
        :key="a"
        @click="selectArea(a)"
        class="btn btn-light w-100 text-start"
      >
        {{ a }}
      </button>
    </div>

    <FilterPanel :filters="filters" @search="search" @clear="clearFilters" />

    <PreferencesPanel :preferences="preferences" />

    <div v-if="error" class="alert alert-danger mt-3">{{ error }}</div>
    <p v-else-if="loading" class="text-muted mt-3">Loading...</p>
    <div v-else class="d-flex flex-wrap justify-content-between align-items-center gap-2 mt-3 mb-2">
      <p class="text-muted mb-0">{{ total }} flat(s) found</p>
      <div class="d-flex align-items-center gap-2">
        <label for="sort-by" class="small text-muted">Sort</label>
        <select id="sort-by" v-model="sortBy" class="form-select form-select-sm w-auto">
          <option value="price">Cheapest first</option>
          <option value="match">Best match first</option>
        </select>
      </div>
    </div>

    <div class="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-3">
      <div v-for="item in scoredResults" :key="item.block.id" class="col">
        <BlockCard
          :block="item.block"
          :saved="shortlist.isSaved(item.block.id)"
          :score="item.score"
          show-match
          @toggle-save="toggleSave"
        />
      </div>
    </div>
  </section>
</template>
