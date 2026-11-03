<script setup>
// FEATURE 7 (Jihao). To remove it: delete this file, its route in router/index.js
// and the "Compare my shortlisted flats" link on Step 3 of CPFCalView.vue.
// The Compare page: tick 2 or 3 flats from your shortlist and see them side by side
// (price range, lease, MRT, match score and an estimated monthly repayment).
import { ref } from 'vue'
import axios from 'axios'
import { estimateMonthlyCost } from '../utils/affordability.js'
import { HDB_LOAN_LTV_PERCENT, HDB_LOAN_INTEREST_RATE, MAX_LOAN_YEARS } from '../utils/affordabilityRules.js'
import { CATEGORIES, getWeights, makeDefaultPreferences, matchScore, MAX_DISTANCES } from '../utils/matchScore.js'
import { useShortlistStore } from '../stores/shortlist'
import MatchScore from '../components/MatchScore.vue'

// Our Express server's address, from one shared place (see config.js; it changes for deployment)
import { BASE_URL } from '../config.js'

// You can compare at most this many flats at once
const MAX_COMPARE = 3

// The shortlist lives in the shortlist store (stores/shortlist.js), shared with Search, Shortlist and the NavBar.
// The route guard (router/index.js) only lets logged-in users open this page.
const shortlist = useShortlistStore()
const loading = ref(true)

// The ids of the ticked items. v-model on the tick boxes adds / removes ids for us.
const selectedIds = ref([])

const estimates = ref({})

// Your Priorities (school, MRT, hawker, park: ticked + importance), the same ones Search and the Map use.
// Search saves them in localStorage as 'matchPreferences'; we start from those (or the defaults).
function loadSavedPreferences() {
  const choices = makeDefaultPreferences()
  const saved = localStorage.getItem('matchPreferences')
  if (saved !== null) {
    const savedPanel = JSON.parse(saved)
    // Copy only the categories we know, so a category added later still gets its default (same as Search)
    for (const category of CATEGORIES) {
      if (savedPanel[category.key]) {
        choices[category.key] = savedPanel[category.key]
      }
    }
  }
  return choices
}

// Match score uses Your Priorities, so it shows the same number as on Search and the Map
const weights = getWeights(loadSavedPreferences())

// Asks our server for one block's estimate (GET /api/blocks/<id>/estimate)
async function loadEstimate(blockId) {
  try {
    const response = await axios.get(`${BASE_URL}/api/blocks/${blockId}/estimate`)
    estimates.value[blockId] = response.data.estimate
  } catch (error) {
    // do nothing: a flat the model does not cover (400) or without sales (404) just shows "–"
  }
}

// The estimate as text for the table: "$598,000", or "–" when there is none
function estimateText(block) {
  if (estimates.value[block.id] !== undefined) {
    return '$' + estimates.value[block.id].toLocaleString('en-SG')
  }
  return '–'
}


// Gets the latest shortlist from the server (you must be logged in), then each flat's price estimate
async function loadShortlist() {
  await shortlist.fetchShortlist()
  loading.value = false
  for (const item of shortlist.items) {
    loadEstimate(item.block.id) // not awaited: the estimates load at the same time, each fills in when it arrives
  }
}

// The ticked items, in shortlist order
function selectedItems() {
  const list = []
  for (const item of shortlist.items) {
    if (selectedIds.value.includes(item.id)) {
      list.push(item)
    }
  }
  return list
}

// A tick box is greyed out when 3 are already ticked (but you can still untick those 3)
function isDisabled(itemId) {
  return selectedIds.value.length >= MAX_COMPARE && !selectedIds.value.includes(itemId)
}

// "$600,000 – $720,000", or one price when every sale was the same
function formatRange(low, high) {
  if (low === high) {
    return '$' + low.toLocaleString('en-SG')
  }
  return '$' + low.toLocaleString('en-SG') + ' – ' + '$' + high.toLocaleString('en-SG')
}

// Match score for one block (0 to 100), or null when it cannot be scored (MatchScore then shows "–")
function scoreFor(block) {
  return matchScore(block.distances, weights, MAX_DISTANCES)
}

// Estimated monthly repayment for the median price, rounded to the dollar
function monthlyText(block) {
  return '$' + Math.round(estimateMonthlyCost(block.price)).toLocaleString('en-SG')
}

// Load the shortlist as soon as the page is created
loadShortlist()
</script>

<template>
  <section>
    <!-- Page heading -->
    <span class="eyebrow">Side by side</span>
    <h1 class="page-title serif">Compare <em>flats</em></h1>
    <p class="page-sub mb-4">Tick 2 or 3 flats from your shortlist.</p>

    <div v-if="shortlist.error" class="alert alert-danger">{{ shortlist.error }}</div>
    <p v-else-if="loading" class="text-muted">Loading...</p>

    <p v-else-if="shortlist.count < 2" class="text-muted">
      Save at least 2 flats to your shortlist first, then come back to compare them.
    </p>

    <div v-else>
      <!-- Step 1: pick the flats -->
      <div class="card shadow-sm mb-3">
        <div class="card-body">
          <h6 class="card-title">Choose 2 or 3 flats ({{ selectedIds.length }} / {{ MAX_COMPARE }})</h6>
          <div v-for="item in shortlist.items" :key="item.id" class="form-check">
            <input
              :id="'compare-' + item.id"
              v-model="selectedIds"
              :value="item.id"
              :disabled="isDisabled(item.id)"
              type="checkbox"
              class="form-check-input"
            />
            <label :for="'compare-' + item.id" class="form-check-label">
              Blk {{ item.block.block }} {{ item.block.street }} · {{ item.block.flatType }} · {{ item.block.town }}
            </label>
          </div>
        </div>
      </div>

      <!-- Step 2: the side-by-side table (one column per flat) -->
      <p v-if="selectedIds.length < 2" class="text-muted">Tick at least 2 flats to compare.</p>

      <div v-else class="table-responsive">
        <table class="table table-bordered align-middle bg-white">
          <thead class="table-light">
            <tr>
              <th></th>
              <th v-for="item in selectedItems()" :key="item.id">
                Blk {{ item.block.block }} {{ item.block.street }}
                <div class="small text-muted fw-normal">{{ item.block.town }} · {{ item.block.flatType }}</div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th>Price range</th>
              <td v-for="item in selectedItems()" :key="item.id">{{ formatRange(item.block.priceLow, item.block.priceHigh) }}</td>
            </tr>
            <tr>
              <th>Median price</th>
              <td v-for="item in selectedItems()" :key="item.id">{{ '$' + item.block.price.toLocaleString('en-SG') }}</td>
            </tr>
            <tr>
              <th>Estimated price (model)</th>
              <td v-for="item in selectedItems()" :key="item.id">{{ estimateText(item.block) }}</td>
            </tr>
            <tr>
              <th>Remaining lease</th>
              <td v-for="item in selectedItems()" :key="item.id">{{ item.block.remainingLease }} years</td>
            </tr>
            <tr>
              <th>Nearest MRT</th>
              <td v-for="item in selectedItems()" :key="item.id">{{ item.block.mrtName }} ({{ item.block.mrtWalkMinutes }} min walk)</td>
            </tr>
            <tr>
              <th>Priority score</th>
              <td v-for="item in selectedItems()" :key="item.id">
                <MatchScore :score="scoreFor(item.block)" :distances="item.block.distances" :weights="weights" />
              </td>
            </tr>
            <tr>
              <th>Est. monthly repayment</th>
              <td v-for="item in selectedItems()" :key="item.id">{{ monthlyText(item.block) }}</td>
            </tr>
            <tr>
              <th>My note</th>
              <td v-for="item in selectedItems()" :key="item.id" class="small">{{ item.note }}</td>
            </tr>
          </tbody>
        </table>
        <p class="small text-muted">
          Monthly repayment assumes an HDB loan of {{ HDB_LOAN_LTV_PERCENT }}% of the median price at
          {{ HDB_LOAN_INTEREST_RATE }}% over {{ MAX_LOAN_YEARS }} years. Priority score uses Your Priorities (set on the Search page). 
          <br>
          Estimated price comes from our regression model (typical error about $46k).

        </p>
      </div>
    </div>
  </section>
</template>
