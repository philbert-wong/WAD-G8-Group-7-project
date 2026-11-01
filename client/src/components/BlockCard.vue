<script setup>
// One flat card: price, lease, MRT, match score, and buttons for Save, price details and amenities
// DESIGN PREVIEW (Cosy Professional): new look. The props, emits and logic are the SAME as before,
// so SearchView and ShortlistItem did not need to change how they use this card.
import { ref, onMounted } from 'vue'
import axios from 'axios'
import { useRouter } from 'vue-router'
import { useMapFocusStore } from '../stores/mapFocus'
import PriceDetails from './PriceDetails.vue'

// Our Express server's address, from one shared place (see config.js; it changes for deployment)
import { BASE_URL } from '../config.js'

const props = defineProps({
  block: Object, // one card from /api/blocks
  saved: Boolean, // is it in the shortlist?
  showSave: { type: Boolean, default: true }, // the shortlist page hides the Save button
  showMatch: { type: Boolean, default: false }, // only the search page shows the match score
  score: { type: Number, default: null }, // match score 0 to 100, or null for "–"
})
defineEmits(['toggle-save'])

// "Show on map" button: remember this block in the small mapFocus Pinia store, then open the Map page.
// The map reads it, zooms to the block and opens its card. (The URL stays a plain /map.)
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
const walk = ref(null)

async function loadWalk() {
  try {
    const response = await axios.get(`${BASE_URL}/api/blocks/${props.block.id}/walk-to-mrt`)
    walk.value = response.data
  } catch (error) {
    // do nothing: the card keeps the stored estimate
  }
}

onMounted(loadWalk)


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

// NEW (design): the little "✓ Near MRT" tags. Worked out from the block's own data.
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

const SCORE_STOPS = [
  { at: 0,   color: '#e07b39' },   // orange
  { at: 25,  color: '#f0c13f' },   // yellow
  { at: 50,  color: '#4fa66a' },   // green
  { at: 75,  color: '#2f6fa8' },   // blue
  { at: 100, color: '#1c3a6b' },   // navy
]

function scoreColor(score) {
  let i = 0
  while (i < SCORE_STOPS.length - 2 && score > SCORE_STOPS[i + 1].at) {
    i++
  }
  const a = SCORE_STOPS[i]
  const b = SCORE_STOPS[i + 1]
  const t = ((score - a.at) / (b.at - a.at)) * 100   // how far from a to b, in %
  return `color-mix(in oklab, ${b.color} ${t}%, ${a.color})`
}

// The match bar: filled to the score, showing the ramp from orange up to the score's colour
function barStyle(score) {
  if (score === null || score <= 0) {
    return { width: '0%' }
  }
  const parts = SCORE_STOPS
    .filter(function (stop) {
      return stop.at < score
    })
    .map(function (stop) {
      return `${stop.color} ${(stop.at / score) * 100}%`
    })
  parts.push(`${scoreColor(score)} 100%`)
  return {
    width: score + '%',
    background: `linear-gradient(90deg, ${parts.join(', ')})`,
  }
}



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


// NEW (design): width of the match bar, e.g. score 87 -> "87%"
function barWidth(score) {
  if (score === null) {
    return '0%'
  }
  return score + '%'
}
</script>

<template>
  <article class="bcard">
    <!-- Photo area. We have no real photos, so it is a coloured placeholder. -->
    <div class="photo" :style="photoStyle(score)">
      <span class="photo-icon">🏢</span>
      <span class="ph-tag">{{ block.town }}</span>
    </div>

    <div class="cbody">
      <!-- Title + match score -->
      <div class="d-flex justify-content-between gap-3 flex-wrap">
        <div>
          <h3 class="serif">Blk {{ block.block }} {{ block.street }}</h3>
          <div class="meta">{{ block.town }} · {{ block.flatType }}</div>
        </div>
        <div v-if="showMatch" class="match">
          <div class="row1">
            <span>Match</span>
            <b v-if="score === null">–</b>
            <b v-else>{{ score }}/100</b>
          </div>
          <div class="bar"><i :style="barStyle(score)"></i></div>
        </div>
      </div>

      <!-- Price box -->
      <div class="pricebox">
        <div class="lab">Resale price range · last 12 months</div>
        <div class="price serif">{{ formatRange(block.priceLow, block.priceHigh) }}</div>
        <span class="pill green">{{ block.salesCount }} sale(s)</span>
        <span class="pill dark ms-1">Median {{ '$' + block.price.toLocaleString('en-SG') }}</span>
      </div>

      <!-- Lease + MRT -->
      <div class="d-flex gap-4 flex-wrap mb-3">
        <div class="stat">
          <span class="ic">⏳</span>
          <div><b>{{ block.remainingLease }} years</b>Remaining lease</div>
        </div>
        <div class="stat">
          <span class="ic">🚆</span>
          <div><b>{{ walk ? walk.minutes : block.mrtWalkMinutes }} min walk</b>to {{ block.mrtName }}</div>
        </div>
      </div>

      <!-- Tags -->
      <div class="d-flex gap-2 flex-wrap mb-3">
        <span v-for="tag in makeTags(block)" :key="tag" class="tag"><b>✓</b> {{ tag }}</span>
      </div>

      <!-- Buttons -->
      <div class="d-flex gap-2 flex-wrap">
        <button
          v-if="showSave"
          class="act-btn"
          :class="{ saved: saved, primary: !saved }"
          @click="$emit('toggle-save', block)"
        >
          <span v-if="saved">✓ Saved</span>
          <span v-else>+ Save to Shortlist</span>
        </button>
        <button class="act-btn" @click="showPrices = !showPrices">
          <span v-if="showPrices">Hide price details</span>
          <span v-else>Price details</span>
        </button>
        <button class="act-btn" @click="toggleDetails">
          <span v-if="open">Hide amenities ▴</span>
          <span v-else>Amenities ▾</span>
        </button>
        <button class="act-btn" @click="showOnMap">📍 Show on map</button>
      </div>

      <PriceDetails v-if="showPrices" :block-id="block.id" />

      <div v-if="open" class="mt-3 pt-3 border-top">
        <p v-if="loading" class="text-muted mb-0">Loading...</p>
        <p v-else-if="errorMessage" class="text-danger mb-0">{{ errorMessage }}</p>
        <ul v-else class="list-unstyled small mb-0">
          <li v-for="a in amenities" :key="a.category">
            {{ categoryNames[a.category] }}: {{ a.name }}
            ({{ a.category === 'mrt' && walk && walk.metres ? walk.metres + ' m walk' : a.distance + ' m' }})
          </li>
        </ul>
      </div>
    </div>
  </article>
</template>

<style scoped>
/* [COURSE] The card: white, rounded, photo on the left and text on the right (Flexbox) */
.bcard {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 18px;
  overflow: hidden;
  display: flex;
  margin-bottom: 22px;
}
/* [AI-ASSISTED] Soft shadow, and the card lifts up a little on hover (transform + transition) */
.bcard {
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.02), 0 14px 34px -18px rgba(80, 50, 30, 0.25);
  transition: transform 0.25s, box-shadow 0.25s;
}
.bcard:hover {
  transform: translateY(-3px);
  box-shadow: 0 22px 44px -20px rgba(80, 50, 30, 0.35);
}

/* [COURSE] Photo area: fixed width, icon centred with Grid */
.photo {
  width: 32%;
  min-height: 300px;
  flex-shrink: 0;
  position: relative;
  display: grid;
  place-items: center;
}
.photo-icon {
  font-size: 64px;
}
/* [AI-ASSISTED] Warm gradient as a stand-in for a real photo */
.photo {
  background: linear-gradient(160deg, #f3d9c4, #e7b89a 55%, #c98c6a);
}
/* [COURSE] Town label in the bottom-left corner of the photo (position: absolute) */
.ph-tag {
  position: absolute;
  left: 12px;
  bottom: 12px;
  background: rgba(255, 255, 255, 0.92);
  border-radius: 8px;
  font-size: 11px;
  padding: 3px 8px;
  font-weight: 600;
}

/* [COURSE] Text side of the card */
.cbody {
  padding: 22px 24px;
  flex: 1;
  min-width: 0;
}
.cbody h3 {
  font-size: 26px;
  line-height: 1.15;
  margin: 0;
}
.meta {
  color: var(--muted);
  font-size: 13px;
  margin-top: 4px;
}

/* [COURSE] Match score label and the bar behind it */
.match {
  min-width: 150px;
}
.row1 {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--muted);
  font-weight: 600;
}
.row1 b {
  color: var(--terra);
}
.bar {
  height: 7px;
  background: var(--beige);
  border-radius: 9px;
  overflow: hidden;
  margin-top: 6px;
}
.bar i {
  display: block;
  height: 100%;
  border-radius: 9px;
}
/* [AI-ASSISTED] Gradient fill that slides to its width (transition) */
.bar i {
  background: linear-gradient(90deg, #d98a63, var(--terra));
  transition: width 1.4s cubic-bezier(0.2, 0.8, 0.2, 1);
}

/* [COURSE] Beige price box */
.pricebox {
  background: var(--beige);
  border-radius: 14px;
  padding: 14px 18px;
  margin: 16px 0 14px;
}
.lab {
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted);
  font-weight: 600;
}
.price {
  font-size: 32px;
  line-height: 1.1;
  margin: 4px 0 10px;
}

/* [COURSE] Lease / MRT facts with an icon square */
.stat {
  display: flex;
  gap: 10px;
  align-items: center;
  font-size: 13px;
  color: var(--muted);
}
.stat .ic {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: #fbede7;
  display: grid;
  place-items: center;
  font-size: 16px;
}
.stat b {
  display: block;
  color: var(--char);
  font-size: 15px;
}

/* [COURSE] Phones and tablets: photo on top instead of on the left (media query) */
@media (max-width: 991px) {
  .bcard {
    flex-direction: column;
  }
  .photo {
    width: 100%;
    min-height: 160px;
  }
}
</style>
