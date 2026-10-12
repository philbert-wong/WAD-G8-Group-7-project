<script setup>
// One flat card: price, lease, MRT, match score, and buttons for Save, price details and amenities
import { ref } from 'vue'
import axios from 'axios'
import { getErrorMessage } from '../utils/errorMessage.js'
import PriceDetails from './PriceDetails.vue'
import { formatPrice } from '../utils/format.js'

const props = defineProps({
  block: Object, // one card from /api/blocks
  saved: Boolean, // is it in the shortlist?
  showSave: { type: Boolean, default: true }, // the shortlist page hides the Save button
  showMatch: { type: Boolean, default: false }, // only the search page shows the match score
  score: { type: Number, default: null }, // match score 0 to 100, or null for "–"
})
defineEmits(['toggle-save'])

// Price details (each sale) are shown when you press the "Price details" button
const showPrices = ref(false)

// Nearby amenities are only fetched when you press the button
const open = ref(false)
const loading = ref(false)
const errorMessage = ref('')
const amenities = ref([])

// "Nearby amenities" button: opens the list and gets it from the server, or closes it
async function toggleDetails() {
  open.value = !open.value
  if (!open.value) {
    return
  }

  loading.value = true
  errorMessage.value = ''
  try {
    const response = await axios.get('/api/blocks/' + props.block.id + '/amenities')
    amenities.value = response.data.amenities
  } catch (error) {
    errorMessage.value = getErrorMessage(error)
  }
  loading.value = false
}

// "$600,000 – $720,000", or one price when every sale was the same
function formatRange(low, high) {
  if (low === high) {
    return formatPrice(low)
  }
  return formatPrice(low) + ' – ' + formatPrice(high)
}

const categoryNames = {
  mrt: 'MRT',
  hawker: 'Hawker centre',
  park: 'Park',
  school: 'Primary school',
}
</script>

<template>
  <div class="card h-100 shadow-sm">
    <div class="card-body">
      <div class="d-flex justify-content-between align-items-start">
        <div>
          <h5 class="card-title mb-0">Blk {{ block.block }} {{ block.street }}</h5>
          <small class="text-muted">{{ block.town }}</small>
        </div>
        <div class="text-end">
          <span class="badge text-bg-secondary">{{ block.flatType }}</span>
          <div v-if="showMatch" class="small fw-semibold mt-1">
            <span v-if="score === null">Match: –</span>
            <span v-else>Match: {{ score }}</span>
          </div>
        </div>
      </div>

      <p class="fs-5 fw-bold mt-2 mb-0">{{ formatRange(block.priceLow, block.priceHigh) }}</p>
      <p class="small text-muted mb-2">
        {{ block.salesCount }} recent sale(s) · median {{ formatPrice(block.price) }}
      </p>

      <ul class="list-unstyled mb-3">
        <li>
          Remaining lease: <strong>{{ block.remainingLease }} years</strong>
        </li>
        <li>{{ block.mrtWalkMinutes }} min walk to {{ block.mrtName }}</li>
      </ul>

      <div class="d-flex flex-wrap gap-2">
        <button
          v-if="showSave"
          class="btn btn-sm"
          :class="{ 'btn-warning': saved, 'btn-outline-warning': !saved }"
          @click="$emit('toggle-save', block)"
        >
          <span v-if="saved">★ Saved</span>
          <span v-else>☆ Save</span>
        </button>
        <button class="btn btn-sm btn-outline-secondary" @click="showPrices = !showPrices">
          <span v-if="showPrices">Hide price details</span>
          <span v-else>Price details</span>
        </button>
        <button class="btn btn-sm btn-outline-secondary" @click="toggleDetails">
          <span v-if="open">Hide amenities</span>
          <span v-else>Nearby amenities</span>
        </button>
      </div>

      <PriceDetails v-if="showPrices" :block-id="block.id" />

      <div v-if="open" class="mt-3 pt-3 border-top">
        <p v-if="loading" class="text-muted mb-0">Loading...</p>
        <p v-else-if="errorMessage" class="text-danger mb-0">{{ errorMessage }}</p>

        <ul v-else class="list-unstyled small mb-0">
          <li v-for="a in amenities" :key="a.category">
            {{ categoryNames[a.category] }}: {{ a.name }} ({{ a.distance }} m)
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
