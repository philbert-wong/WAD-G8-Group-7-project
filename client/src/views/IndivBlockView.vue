<script setup>
// The page for one flat block (/block/:id): price, lease, MRT, sales history and nearby amenities
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import { getErrorMessage } from '../utils/errorMessage.js'
import { formatPrice } from '../utils/format.js'
import PriceDetails from '../components/PriceDetails.vue'
 
const route = useRoute()
const router = useRouter()
 
// The block id comes from the URL: /block/:id
const blockId = route.params.id
 
const block = ref(null)
const amenities = ref([])
const loading = ref(true)
const errorMessage = ref('')
 
// The shortlist item for this block, or null when it is not saved.
// (The server needs the item's id to un-save, so we keep the whole item.)
const savedItem = ref(null)
const shortlistErrorMessage = ref('')
 
const categoryNames = {
  mrt: 'MRT',
  hawker: 'Hawker centre',
  park: 'Park',
  school: 'Primary school',
}
 
// Gets the block and its amenities. Both routes already exist on the server.
async function loadBlock() {
  try {
    const blockResponse = await axios.get('/api/blocks/' + blockId)
    const amenitiesResponse = await axios.get('/api/blocks/' + blockId + '/amenities')
    // /api/blocks/:id sends the card itself, not { block: ... }
    block.value = blockResponse.data
    amenities.value = amenitiesResponse.data.amenities
  } catch (error) {
    errorMessage.value = getErrorMessage(error)
  }
  loading.value = false
}
 
// Is this block in the shortlist? Looks through the saved items for this block's id.
// This is separate from loadBlock so the page still shows when you are not logged in.
async function loadSaved() {
  try {
    const response = await axios.get('/api/shortlist')
    savedItem.value = null
    for (const item of response.data) {
      if (item.block.id === blockId) {
        savedItem.value = item
      }
    }
  } catch (error) {
    shortlistErrorMessage.value = getErrorMessage(error)
  }
}
 
// ☆ Save / ★ Saved button
async function toggleSave() {
  shortlistErrorMessage.value = ''
  try {
    if (savedItem.value === null) {
      const response = await axios.post('/api/shortlist', { blockId: blockId })
      savedItem.value = response.data
    } else {
      await axios.delete('/api/shortlist/' + savedItem.value.id)
      savedItem.value = null
    }
  } catch (error) {
    shortlistErrorMessage.value = getErrorMessage(error)
  }
}
 
function goBack() {
  router.back()
}
 
// "$600,000 – $720,000", or one price when every sale was the same
function formatRange(low, high) {
  if (low === high) {
    return formatPrice(low)
  }
  return formatPrice(low) + ' – ' + formatPrice(high)
}
 
// HDB leases are 99 years, so 94 years left fills 95% of the bar
function leasePercent(years) {
  return Math.max(0, Math.min(100, (years / 99) * 100))
}
 
onMounted(function () {
  loadBlock()
  loadSaved()
})
</script>
 
<template>
    <div v-if="shortlistErrorMessage" 
    class="error-alert"
    @click="$router.push('/login')"
    >{{ shortlistErrorMessage }}</div>
    <div class="detail-page">
        <button type="button" class="back-btn" @click="goBack">← Back</button>
    
        <p v-if="loading" class="state-note">Loading block details...</p>
        <!-- cant seem to change the error msg for log in like the rest of the views -->
        <div v-else-if="errorMessage" class="alert alert-danger mt-3">{{ errorMessage }}</div>
        <div v-else-if="block" class="detail-card">
        
    
        <!-- header -->
        <div class="detail-header">
            <div>
            <h1 class="detail-title">Blk {{ block.block }} {{ block.street }}</h1>
            <p class="detail-sub">{{ block.town }} · {{ block.flatType }}</p>
            </div>
            <button
            type="button"
            class="pill-btn save-btn"
            :class="{ 'is-saved': savedItem !== null }"
            @click="toggleSave"
            >
            <span v-if="savedItem !== null">★ Saved</span>
            <span v-else>☆ Save</span>
            </button>
        </div>
    
        <!-- price -->
        <div class="price-section">
            <p class="price">{{ formatRange(block.priceLow, block.priceHigh) }}</p>
            <p class="price-note">
            {{ block.salesCount }} recent sale(s) · median {{ formatPrice(block.price) }}
            </p>
        </div>
    
        <!-- lease and MRT -->
        <div class="specs-grid">
            <div class="spec-box">
            <span class="spec-label">Remaining lease</span>
            <strong class="spec-value">{{ block.remainingLease }} years</strong>
            <div class="lease-bar">
                <div class="lease-fill" :style="{ width: leasePercent(block.remainingLease) + '%' }"></div>
            </div>
            </div>
    
            <div class="spec-box">
            <span class="spec-label">Nearest MRT</span>
            <strong class="spec-value">{{ block.mrtName }}</strong>
            <span class="spec-note">{{ block.mrtWalkMinutes }} min walk</span>
            </div>
        </div>
    
        <!-- recent sales (PriceDetails fetches its own data from /api/blocks/:id/sales) -->
        <div class="section-block">
            <h3 class="section-title">Price history</h3>
            <PriceDetails :block-id="block.id" />
        </div>
    
        <!-- amenities -->
        <div class="section-block">
            <h3 class="section-title">Nearby amenities</h3>
            <ul class="amenity-list">
            <li v-for="a in amenities" :key="a.category">
                <span class="amenity-category">{{ categoryNames[a.category] }}</span>
                <span class="amenity-name">{{ a.name }}</span>
                <span class="amenity-distance">{{ a.distance }} m</span>
            </li>
            </ul>
        </div>
        </div>
    </div>
</template>
 
<style scoped>
.error-alert {
  /* think if i should change the position */

  padding: 14px 20px;
  border: 1.5px solid #fecaca;
  border-left: 5px solid #ef4444;   
  border-right: 5px solid #ef4444;
  border-radius: 14px;
  background: #fef2f2;
  color: #991b1b;
  font-size: 15px;
  font-weight: 500;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 1000;
  cursor: pointer;

}
.detail-page {
  max-width: 820px;
  margin: 0 auto;
}
 
.back-btn {
  margin-bottom: 16px;
  padding: 6px 14px;
  border-radius: 999px;
  color: #374151;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.15s ease, color 0.15s ease;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(12px);
  border: 1.5px solid rgba(229, 231, 235, 0.25);
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.2);
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}
 
.back-btn:hover {
  border-color: #c7d2fe;
  color: #4f46e5;
}
 
.state-note {
  color: #6b7280;
  font-weight: 600;
}
 
.detail-card {
  padding: 28px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(12px);
  border: 1.5px solid rgba(229, 231, 235, 0.25);
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.2);
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}
 
.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}
 
.detail-title {
  margin: 0 0 4px;
  color: #111827;
  font-size: 26px;
  font-weight: 800;
}
 
.detail-sub {
  margin: 0;
  color: #6b7280;
  font-size: 14px;
  font-weight: 600;
}
 
.pill-btn {
  padding: 8px 16px;
  border: 1.5px solid #fcd34d;
  border-radius: 999px;
  background: #ffffff;
  color: #b45309;
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
  backdrop-filter: blur(8px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
}
 
.pill-btn:hover {
  border-color: #f59e0b;
  background: #fffbeb;
}
 
.pill-btn.is-saved {
  border-color: #f59e0b;
  background: #fbbf24;
  color: #78350f;
}
 
.price-section {
  margin: 24px 0;
}
 
.price {
  margin: 0;
  color: #111827;
  font-size: 30px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}
 
.price-note {
  margin: 2px 0 0;
  color: #6b7280;
  font-size: 14px;
}
 
.specs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}
 
.spec-box {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 16px;
  border-radius: 12px;
  background: rgba(249, 250, 251, 0.45);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.6);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
}
 
.spec-label,
.spec-note {
  color: #6b7280;
  font-size: 13px;
}
 
.spec-value {
  color: #111827;
  font-size: 18px;
}
 
.lease-bar {
  height: 6px;
  margin-top: 6px;
  overflow: hidden;
  border-radius: 999px;
  background: #e5e7eb;
  
}
 
.lease-fill {
  height: 100%;
  border-radius: 999px;
  background: #4f46e5;
}
 
.section-block {
  margin-top: 28px;
}
 
.section-title {
  margin: 0 0 8px;
  color: #111827;
  font-size: 17px;
  font-weight: 700;
}
 
.amenity-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 14px;
}
 
.amenity-list li {
  display: grid;
  grid-template-columns: 120px 1fr auto;
  align-items: baseline;
  gap: 10px;
}
 
.amenity-category {
  color: #6b7280;
}
 
.amenity-name {
  color: #111827;
  font-weight: 500;
}
 
.amenity-distance {
  color: #4f46e5;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
</style>