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
  <div class="block-card h-100">
    <div class="top">
      <div class="address">
        <h5 class="title">Blk {{ block.block }} {{ block.street }}</h5>
        <span class="town">{{ block.town }}</span>
      </div>
    
      <div class="badges">
          <span class="type-badge">{{ block.flatType }}</span>
          <span v-if="showMatch" class="match" :class="{ 'match-none': score === null }">
            <template v-if="score === null">Match –</template>
            <template v-else>Match {{ score }}</template>
          </span>
      </div>
    </div>
    <div class="price-block">
      <p class="price">{{ formatRange(block.priceLow, block.priceHigh) }}</p>
      <p class="price-note">
        {{ block.salesCount }} recent sale(s) · median {{ formatPrice(block.price) }}
      </p>
    </div>
    <div class="facts">
      <div class="fact">
        <div class="fact-row">
          <span class="fact-label">Remaining lease</span>
          <strong class="fact-value">{{ block.remainingLease }} years</strong>
        </div>
        <div class="lease-bar" role="presentation">
          <div class="lease-fill" :style="{ width: block.remainingLease + '%' }"></div>
        </div>
      </div>
 
      <div class="fact-row mrt-row">
        <span class="fact-label">Nearest MRT</span>
        <span class="fact-value">
          <strong>{{ block.mrtWalkMinutes }} min</strong> walk to {{ block.mrtName }}
        </span>
      </div>
    </div>
    <div class="actions">
      <button
        v-if="showSave"
        type="button"
        class="pill-btn save-btn"
        :class="{ 'is-saved': saved }"
        @click="$emit('toggle-save', block)"
      >
        <span v-if="saved">★ Saved</span>
        <span v-else>☆ Save</span>
      </button>
      <button type="button" class="pill-btn" @click="showPrices = !showPrices">
        <span v-if="showPrices">Hide price details</span>
        <span v-else>Price details</span>
      </button>
      <button type="button" class="pill-btn" @click="toggleDetails">
        <span v-if="open">Hide amenities</span>
        <span v-else>Nearby amenities</span>
      </button>
    </div>
 
    <div v-if="showPrices" class="panel">
      <PriceDetails :block-id="block.id" />
    </div>
 
    <div v-if="open" class="panel">
      <p v-if="loading" class="panel-note">Loading...</p>
      <p v-else-if="errorMessage" class="panel-note text-danger">{{ errorMessage }}</p>
 
      <ul v-else class="amenity-list">
        <li v-for="a in amenities" :key="a.category">
          <span class="amenity-category">{{ categoryNames[a.category] }}</span>
          <span class="amenity-name">{{ a.name }}</span>
          <span class="amenity-distance">{{ a.distance }} m</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.block-card {
  --accent: #4f46e5;
  --accent-soft: #eef2ff;
  --ink: #111827;
  --ink-soft: #6b7280;
  --line: #e5e7eb;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  padding: 22px;
  background: #ffffff;
  border: 1px solid var(--line);
  border-radius: 18px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}
 
.block-card:hover {
  transform: translateY(-3px);
  border-color: #c7d2fe;
  box-shadow: 0 10px 28px rgba(79, 70, 229, 0.12);
}
 

.top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}
 
.address {
  min-width: 0;
}
 
.title {
  margin: 0 0 4px;
  color: var(--ink);
  font-size: 17px;
  font-weight: 700;
  line-height: 1.25;
}
 
.town {
  color: var(--ink-soft);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
}
 
.badges {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
  flex-shrink: 0;
}
 
.type-badge {
  padding: 4px 11px;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}
 
.match {
  color: #374151;
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
 
.match-none {
  color: var(--ink-soft);
}
 

.price-block {
  margin: 18px 0 16px;
}
 
.price {
  margin: 0;
  color: var(--ink);
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.01em;
  font-variant-numeric: tabular-nums;
}
 
.price-note {
  margin: 2px 0 0;
  color: var(--ink-soft);
  font-size: 13px;
}
 

.facts {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 18px;
  padding: 14px 16px;
  border-radius: 12px;
  background: #f9fafb;
}
 
.fact-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
}
 
.fact-label {
  color: var(--ink-soft);
  font-size: 13px;
}
 
.fact-value {
  color: var(--ink);
  font-size: 14px;
  text-align: right;
}
 
.lease-bar {
  height: 6px;
  margin-top: 8px;
  overflow: hidden;
  border-radius: 999px;
  background: #e5e7eb;
}
 
.lease-fill {
  height: 100%;
  border-radius: 999px;
  background: var(--accent);
}
 

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: auto; 
}
 
.pill-btn {
  padding: 7px 14px;
  border: 1.5px solid var(--line);
  border-radius: 999px;
  background: #ffffff;
  color: #374151;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}
 
.pill-btn:hover {
  border-color: #c7d2fe;
  background: #f8f9ff;
  color: var(--accent);
}
 
.pill-btn:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
 
.save-btn {
  border-color: #fcd34d;
  color: #b45309;
}
 
.save-btn:hover {
  border-color: #f59e0b;
  background: #fffbeb;
  color: #b45309;
}
 
.save-btn.is-saved {
  border-color: #f59e0b;
  background: #fbbf24;
  color: #78350f;
}
 

.panel {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--line);
}
 
.panel-note {
  margin: 0;
  color: var(--ink-soft);
  font-size: 14px;
}
 
.amenity-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 13px;
}
 
.amenity-list li {
  display: grid;
  grid-template-columns: 110px 1fr auto;
  align-items: baseline;
  gap: 10px;
}
 
.amenity-category {
  color: var(--ink-soft);
}
 
.amenity-name {
  min-width: 0;
  color: var(--ink);
  font-weight: 500;
}
 
.amenity-distance {
  color: var(--accent);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

</style>