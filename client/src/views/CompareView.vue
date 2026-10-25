<script setup>
// FEATURE 7 (Jihao). To remove it: delete this file, its route in router/index.js
// and the "Compare my shortlisted flats" link on Step 3 of CPFCalView.vue.
// The Compare page: tick 2 or 3 flats from your shortlist and see them side by side
// (price range, lease, MRT, match score and an estimated monthly repayment).
import { ref } from 'vue'
import axios from 'axios'
import { getErrorMessage } from '../utils/errorMessage.js'
import { formatPrice } from '../utils/format.js'
import { estimateMonthlyCost } from '../utils/affordability.js'
import { HDB_LOAN_LTV_PERCENT, HDB_LOAN_INTEREST_RATE, MAX_LOAN_YEARS } from '../utils/affordabilityRules.js'
import { getWeights, makeDefaultPreferences, matchScore, MAX_DISTANCES } from '../utils/matchScore.js'

// You can compare at most this many flats at once
const MAX_COMPARE = 3

// Each item looks like { id, note, createdAt, block: { id, block, street, ... } }
const items = ref([])
const errorMessage = ref('')
const loading = ref(true)

// The ids of the ticked items. v-model on the tick boxes adds / removes ids for us.
const selectedIds = ref([])

// Match score uses the default "What matters to you?" choices (everything Important)
const weights = getWeights(makeDefaultPreferences())

// Gets the shortlist from the server (you must be logged in)
async function loadShortlist() {
  try {
    const response = await axios.get('/api/shortlist')
    items.value = response.data
  } catch (error) {
    errorMessage.value = getErrorMessage(error)
  }
  loading.value = false
}

// The ticked items, in shortlist order
function selectedItems() {
  const list = []
  for (const item of items.value) {
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
    return formatPrice(low)
  }
  return formatPrice(low) + ' – ' + formatPrice(high)
}

// Match score for one block, or "–" when it cannot be scored
function scoreText(block) {
  const score = matchScore(block.distances, weights, MAX_DISTANCES)
  if (score === null) {
    return '–'
  }
  return score
}

// Estimated monthly repayment for the median price, rounded to the dollar
function monthlyText(block) {
  return formatPrice(Math.round(estimateMonthlyCost(block.price)))
}

// Load the shortlist as soon as the page is created
loadShortlist()
</script>

<template>
  <section>
    <h2 class="h4 mb-3">Compare flats</h2>

    <div v-if="errorMessage" class="alert alert-danger">{{ errorMessage }}</div>
    <p v-else-if="loading" class="text-muted">Loading...</p>

    <p v-else-if="items.length < 2" class="text-muted">
      Save at least 2 flats to your shortlist first, then come back to compare them.
    </p>

    <div v-else>
      <!-- Step 1: pick the flats -->
      <div class="card shadow-sm mb-3">
        <div class="card-body">
          <h6 class="card-title">Choose 2 or 3 flats ({{ selectedIds.length }} / {{ MAX_COMPARE }})</h6>
          <div v-for="item in items" :key="item.id" class="form-check">
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
              <td v-for="item in selectedItems()" :key="item.id">{{ formatPrice(item.block.price) }}</td>
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
              <th>Match score</th>
              <td v-for="item in selectedItems()" :key="item.id">{{ scoreText(item.block) }}</td>
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
          {{ HDB_LOAN_INTEREST_RATE }}% over {{ MAX_LOAN_YEARS }} years. Match score uses the default
          "What matters to you?" choices.
        </p>
      </div>
    </div>
  </section>
</template>
