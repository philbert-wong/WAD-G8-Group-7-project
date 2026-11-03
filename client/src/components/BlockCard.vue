<script setup>
// One flat card: price, lease, MRT, match score, and buttons for Save, price details and amenities
import { ref, computed } from 'vue'
import axios from 'axios'
import { useRouter } from 'vue-router'
import { useMapFocusStore } from '../stores/mapFocus'
import PriceDetails from './PriceDetails.vue'
import MatchScore from './MatchScore.vue'
import { scoreColor } from '../utils/matchScore.js'

// Our Express server's address, from one shared place (see config.js; it changes for deployment)
import { BASE_URL } from '../config.js'

const props = defineProps({
  block: Object, // one card from /api/blocks
  saved: Boolean, // is it in the shortlist?
  showSave: { type: Boolean, default: true }, // the shortlist page hides the Save button
  showMatch: { type: Boolean, default: false }, // only the search page shows the match score
  score: { type: Number, default: null }, // match score 0 to 100, or null for "–"
  weights: { type: Object, default: null }, // Your Priorities as weights, for the match score's "i" breakdown
})
defineEmits(['toggle-save'])

// "Show on map" button: remember this block in the small mapFocus Pinia store, then open the Map page.
// The map reads it, zooms to the block and opens its card. (The filters are already the same on both pages:
// they live in the shared filters store. The URL stays a plain /map.)
const router = useRouter()
const mapFocus = useMapFocusStore()
function showOnMap() {
  mapFocus.showOnMap(props.block.id)
  router.push('/map')
}

// Price details (each sale) are shown when you press the "Price details" button
const showPrices = ref(false)

// Nearby amenities are only fetched when you press the button
const open = ref(false)
const loading = ref(false)
const errorMessage = ref('')
const amenities = ref([])
const imageFailed = ref(false)
const mapUrl = computed(function () {
  const b = props.block
  return `https://www.onemap.gov.sg/api/staticmap/getStaticImage?layerchosen=default&lat=${b.lat}&lng=${b.lng}&zoom=17&height=500&width=400&points=%5B${b.lat},${b.lng},%22255,0,0%22,%22%22%5D`
})

const streetViewUrl = computed(function () {
  const b = props.block
  return `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${b.lat},${b.lng}`
})


// Price estimate from our regression model (/api/blocks/:id/estimate). null = not loaded, or none for this block.

// The text after each amenity in the list. For the MRT: the block's nearest station by WALKING and its walking
// distance (the same walk as the card's "min walk" and the match score). The others: straight-line metres.
function amenityText(amenity) {
  if (amenity.category === 'mrt') {
    return props.block.mrtName + ' (' + props.block.distances.mrt + ' m walk)'
  }
  return amenity.name + ' (' + amenity.distance + ' m)'
}


// "Amenities" button: opens the list and gets it from the server, or closes it
async function toggleDetails() {
  open.value = !open.value
  if (!open.value) {
    return
  }

  loading.value = true
  errorMessage.value = ''
  try {
    const response = await axios.get(`${BASE_URL}/api/blocks/${props.block.id}/amenities`)
    amenities.value = response.data.amenities
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

// "$600,000 – $720,000", or one price when every sale was the same
function formatRange(low, high) {
  if (low === high) {
    return '$' + low.toLocaleString('en-SG')
  }
  return '$' + low.toLocaleString('en-SG') + ' – ' + '$' + high.toLocaleString('en-SG')
}

const categoryNames = {
  mrt: 'MRT',
  hawker: 'Hawker centre',
  park: 'Park',
  school: 'Primary school',
}

// The little "✓ Near MRT" tags. Worked out from the block's own data.
// The limits (10 min, 70 years, 1 km, 500 m) are our own choice, not an HDB rule.
function makeTags(block) {
  const tags = []
  if (block.mrtWalkMinutes <= 10) {
    tags.push('Near MRT')
  }
  if (block.remainingLease >= 70) {
    tags.push('Long lease')
  }
  if (block.distances) {
    if (block.distances.school <= 1000) {
      tags.push('Near schools')
    }
    if (block.distances.hawker <= 500) {
      tags.push('Hawker centre')
    }
    if (block.distances.park <= 500) {
      tags.push('Near a park')
    }
  }
  return tags
}

// The photo box takes the colour of the match score (the bar itself is in MatchScore.vue)
function photoStyle(score) {
  if (score === null) {
    return {}   // no score: keep the default warm gradient
  }
  const c = scoreColor(score)
  // lighter at the top, full colour at the bottom, so the 🏢 and the town label stay readable
  return {
    background: `linear-gradient(160deg, color-mix(in oklab, ${c} 55%, white), color-mix(in oklab, ${c} 80%, white) 55%, ${c})`,
  }
}


// Width of the match bar, e.g. score 87 -> "87%"
function barWidth(score) {
  if (score === null) {
    return '0%'
  }
  return score + '%'
}
</script>

<template>
  <!-- Phones: compact card (small map thumbnail beside the title, ~2 flats per screen).
       Laptops: the map fills a column on the left, the details on the right.
       Same information and the same buttons on both; only the layout changes (CSS Grid, see the style below). -->
  <article class="bcard">
    <!-- Map of the block (or the 🏢 if the map image cannot load) -->
    <div class="photo" :style="photoStyle(score)">
      <img
        v-if="!imageFailed"
        class="photo-img"
        :src="mapUrl"
        :alt="`Map of Blk ${block.block} ${block.street}`"
        loading="lazy"
        @error="imageFailed = true"
      />
      <span v-else class="photo-icon">🏢</span>
      <span class="ph-tag">{{ block.town }}</span>
    </div>

    <!-- Title, town and flat type -->
    <div class="head">
      <h3 class="serif">Blk {{ block.block }} {{ block.street }}</h3>
      <div class="meta">{{ block.town }} · {{ block.flatType }}</div>
    </div>

    <div class="cbody">
      <MatchScore v-if="showMatch" class="mb-2" :score="score" :distances="block.distances" :weights="weights" />

      <!-- Price: the headline of the card -->
      <div class="price serif">{{ formatRange(block.priceLow, block.priceHigh) }}</div>
      <div class="price-sub">
        Median {{ '$' + block.price.toLocaleString('en-SG') }} · {{ block.salesCount }} sale(s) in the last 12 months
      </div>

      <!-- Lease + MRT on one line -->
      <div class="facts">
        <span>⏳ <b>{{ block.remainingLease }} years</b> lease</span>
        <span>🚆 <b>{{ block.mrtWalkMinutes }} min walk</b> to {{ block.mrtName }}</span>
      </div>

      <!-- Tags -->
      <div class="tags">
        <span v-for="tag in makeTags(block)" :key="tag" class="tag"><b>✓</b> {{ tag }}</span>
      </div>

      <!-- Buttons: Save is the main one; the other four are smaller -->
      <div class="actions">
        <button
          v-if="showSave"
          class="act-btn save-btn"
          :class="{ saved: saved, primary: !saved }"
          @click="$emit('toggle-save', block)"
        >
          <span v-if="saved">✓ Saved</span>
          <span v-else>+ Save to Shortlist</span>
        </button>
        <div class="more-btns">
          <button class="act-btn" @click="showOnMap">📍 Show on map</button>
          <a class="act-btn" :href="streetViewUrl" target="_blank" rel="noopener">📷 Street View</a>
          <button class="act-btn" :aria-expanded="showPrices" @click="showPrices = !showPrices">
            <span v-if="showPrices">Hide price details</span>
            <span v-else>💲 Price details</span>
          </button>
          <button class="act-btn" :aria-expanded="open" @click="toggleDetails">
            <span v-if="open">Hide amenities ▴</span>
            <span v-else>🏫 Amenities ▾</span>
          </button>
        </div>
      </div>

      <PriceDetails v-if="showPrices" :block-id="block.id" />

      <div v-if="open" class="mt-3 pt-3 border-top">
        <p v-if="loading" class="text-muted mb-0">Loading...</p>
        <p v-else-if="errorMessage" class="text-danger mb-0">{{ errorMessage }}</p>
        <ul v-else class="list-unstyled small mb-0">
          <li v-for="a in amenities" :key="a.category">
            {{ categoryNames[a.category] }}: {{ amenityText(a) }}
          </li>
        </ul>
      </div>
    </div>
  </article>
</template>

<style scoped>
/* The card: white, rounded, with a soft shadow. CSS Grid places the three parts:
   phones  -> [thumbnail | title]  then the details full width underneath
   laptops -> [map | title] with the details under the title, the map filling the left column */
.bcard {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 18px;
  overflow: hidden;
  margin-bottom: 18px;
  display: grid;
  grid-template-columns: 88px 1fr;
  grid-template-areas:
    'photo head'
    'body body';
  column-gap: 14px;
  padding: 14px;
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.02), 0 12px 30px -20px rgba(30, 30, 80, 0.35);
  transition: transform 0.25s, box-shadow 0.25s;
}
.bcard:hover {
  transform: translateY(-2px);
  box-shadow: 0 20px 40px -22px rgba(30, 30, 80, 0.45);
}

/* Map thumbnail (phones): a rounded square */
.photo {
  grid-area: photo;
  position: relative;
  width: 88px;
  height: 88px;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--line);
  display: grid;
  place-items: center;
  background: linear-gradient(160deg, #f3d9c4, #e7b89a 55%, #c98c6a); /* while the map loads, or if it fails */
}
.photo-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.photo-icon {
  font-size: 36px;
}
/* Town label on the map: only on the big map (laptops), the thumbnail is too small for it */
.ph-tag {
  display: none;
  position: absolute;
  left: 12px;
  bottom: 12px;
  background: rgba(255, 255, 255, 0.92);
  border-radius: 8px;
  font-size: 11px;
  padding: 3px 8px;
  font-weight: 700;
}

/* Title */
.head {
  grid-area: head;
  min-width: 0;
  align-self: center;
}
.head h3 {
  font-size: 19px;
  line-height: 1.2;
  margin: 0;
}
.meta {
  color: var(--muted);
  font-size: 13px;
  margin-top: 4px;
}

/* Details */
.cbody {
  grid-area: body;
  min-width: 0;
  padding-top: 12px;
}
.price {
  font-size: 25px;
  line-height: 1.15;
  font-weight: 700;
}
.price-sub {
  color: var(--muted);
  font-size: 13px;
  margin-top: 2px;
}
.facts {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 16px;
  font-size: 14px;
  margin: 10px 0 8px;
}
.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
}

/* Buttons. Phones: Save full width, then the other four in a 2 x 2 grid */
.actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.save-btn {
  width: 100%;
  padding: 10px 14px;
}
.more-btns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.more-btns .act-btn {
  padding: 8px 6px;
  font-size: 13px;
  text-align: center;
  white-space: nowrap;
}
a.act-btn {
  text-decoration: none;
  display: inline-block;
}

/* Big phones and tablets (Bootstrap sm, 576px, and up): there is room for the buttons in one row that wraps.
   display: contents lets the four smaller buttons join Save in the same row */
@media (min-width: 576px) {
  .actions {
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
  }
  .save-btn {
    width: auto;
  }
  .more-btns {
    display: contents;
  }
  .actions .act-btn {
    padding: 7px 12px;
    font-size: 13px;
  }
}

/* Laptops and bigger (Bootstrap lg, 992px): the map becomes a full-height column on the left,
   the title and details sit on the right, and all five buttons share one row */
@media (min-width: 992px) {
  .bcard {
    grid-template-columns: 230px 1fr;
    grid-template-rows: auto 1fr;
    grid-template-areas:
      'photo head'
      'photo body';
    column-gap: 22px;
    padding: 0;
  }
  .photo {
    width: 100%;
    height: 100%;
    min-height: 240px;
    max-height: 520px;
    border: 0;
    border-right: 1px solid var(--line);
    border-radius: 0;
  }
  .photo-icon {
    font-size: 64px;
  }
  .ph-tag {
    display: inline-block;
  }
  .head {
    align-self: start;
    padding: 20px 22px 0 0;
  }
  .head h3 {
    font-size: 24px;
  }
  .cbody {
    padding: 10px 22px 20px 0;
  }
  .price {
    font-size: 30px;
  }
}
</style>
