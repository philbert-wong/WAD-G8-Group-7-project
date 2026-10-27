<script setup>
// FINAL DRAFT, FEATURE: MAP (Jiun Wei's area, first draft by Jihao + AI)
// Every block as a dot on a map, coloured by its median price. Click a dot for details.
// PHG layer: pick your parents' block to draw the 4 km Proximity Housing Grant circle.
//
// ⚠️ NOT IN OUR COURSE: the Leaflet library (new npm package), onMounted,
//    and keeping the map in a normal variable (not a ref) because Vue's ref breaks Leaflet.
// ⚠️ WATCH OUT: the map pictures (tiles) come from OpenStreetMap over the internet,
//    the only outside call the site makes. OpenStreetMap's credit line must stay on the map.
import { ref, onMounted } from 'vue'
import axios from 'axios'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// PHG "live near" rule: within 4 km of your parents / child (same value as Jihao's affordabilityRules.js)
const PHG_NEAR_DISTANCE_METRES = 4000

const errorMessage = ref('')
const blockCount = ref(0)

// For the PHG dropdown: one entry per address
const addresses = ref([])
const parentAddress = ref('')
const nearbyCount = ref(null) // how many flats are within 4 km (null = not checked yet)

// The map and the PHG circle live in normal variables (Leaflet does not like Vue's ref)
let map = null
let phgCircle = null

// The price colours, cheapest first. Used by the dots and by the legend.
const priceBands = [
  { max: 400000, colour: '#2e9e4f', label: 'Under $400k' },
  { max: 550000, colour: '#f2c230', label: '$400k - $550k' },
  { max: 700000, colour: '#ef7b22', label: '$550k - $700k' },
  { max: Infinity, colour: '#d6312b', label: 'Over $700k' },
]

// Picks the colour for a price (the first band it fits in)
function priceColour(price) {
  for (const band of priceBands) {
    if (price <= band.max) {
      return band.colour
    }
  }
  return 'grey'
}

// The text inside a dot's popup
function popupText(block) {
  return (
    '<b>Blk ' + block.block + ' ' + block.street + '</b><br>' +
    block.town + ' · ' + block.flatType + '<br>' +
    'Median $' + block.price.toLocaleString('en-SG') + ' (' + block.salesCount + ' sales)<br>' +
    block.remainingLease + ' years lease · ' + block.mrtWalkMinutes + ' min to ' + block.mrtName
  )
}

// Gets every block and puts a dot for each on the map
async function loadBlocks() {
  try {
    const response = await axios.get('/api/blocks')
    const blocks = response.data.results
    blockCount.value = blocks.length

    const seen = []
    const list = []
    for (const block of blocks) {
      // One coloured dot per block + flat type
      L.circleMarker([block.lat, block.lng], {
        radius: 7,
        color: '#fff',
        weight: 1.5,
        fillColor: priceColour(block.price),
        fillOpacity: 0.9,
      })
        .bindPopup(popupText(block))
        .addTo(map)

      // One dropdown entry per address (the same block appears once per flat type)
      const label = 'Blk ' + block.block + ' ' + block.street + ' (' + block.town + ')'
      if (!seen.includes(label)) {
        seen.push(label)
        list.push({ label: label, lat: block.lat, lng: block.lng })
      }
    }
    list.sort(function (a, b) {
      return a.label.localeCompare(b.label)
    })
    addresses.value = list
  } catch (error) {
    // Show our server's message if it sent one, otherwise axios's own (e.g. "Network Error")
    if (error.response && error.response.data && error.response.data.message) {
      errorMessage.value = error.response.data.message
    } else {
      errorMessage.value = error.message
    }
  }
}

// PHG dropdown changed: draw the 4 km circle and count the flats inside it
async function showPhg() {
  // Remove the old circle first
  if (phgCircle !== null) {
    map.removeLayer(phgCircle)
    phgCircle = null
  }
  nearbyCount.value = null

  let parent = null
  for (const address of addresses.value) {
    if (address.label === parentAddress.value) {
      parent = address
    }
  }
  if (parent === null) {
    return
  }

  phgCircle = L.circle([parent.lat, parent.lng], {
    radius: PHG_NEAR_DISTANCE_METRES,
    color: '#c0614a',
    weight: 2,
    fillOpacity: 0.08,
  }).addTo(map)
  map.fitBounds(phgCircle.getBounds())

  // Count the flats inside (the server caps the answer at 50)
  try {
    const response = await axios.get('/api/blocks/nearby', {
      params: { lat: parent.lat, lng: parent.lng, radius: PHG_NEAR_DISTANCE_METRES, limit: 50 },
    })
    nearbyCount.value = response.data.total
  } catch (error) {
    // Show our server's message if it sent one, otherwise axios's own (e.g. "Network Error")
    if (error.response && error.response.data && error.response.data.message) {
      errorMessage.value = error.response.data.message
    } else {
      errorMessage.value = error.message
    }
  }
}

// When the page opens: make the map inside <div id="mapBox"> (centred on Singapore), then add the blocks
onMounted(function () {
  map = L.map('mapBox').setView([1.36, 103.84], 12)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map)
  loadBlocks()
})
</script>

<template>
  <section>
    <span class="eyebrow">{{ blockCount }} flats on the map</span>
    <h1 class="page-title serif">See it on <em>the map</em></h1>
    <p class="page-sub">Each dot is a block, coloured by its median resale price. Click a dot for details.</p>

    <div v-if="errorMessage" class="alert alert-danger">{{ errorMessage }}</div>

    <div class="row g-4">
      <div class="col-lg-8">
        <div id="mapBox" class="map-box"></div>
      </div>

      <div class="col-lg-4">
        <!-- Legend -->
        <div class="cosy-card cosy-shadow mb-3">
          <h5 class="serif">Median price</h5>
          <div v-for="band in priceBands" :key="band.label" class="d-flex align-items-center gap-2 mb-1">
            <span class="dot" :style="{ background: band.colour }"></span>
            {{ band.label }}
          </div>
        </div>

        <!-- PHG layer -->
        <div class="cosy-card cosy-shadow">
          <h5 class="serif">Proximity Grant (PHG) layer</h5>
          <p class="small text-muted">
            Choose your parents' block to draw the {{ PHG_NEAR_DISTANCE_METRES / 1000 }} km circle.
            Flats inside it can get the "live near" grant.
          </p>
          <select v-model="parentAddress" class="form-select cosy-input" @change="showPhg">
            <option value="">No circle</option>
            <option v-for="address in addresses" :key="address.label" :value="address.label">
              {{ address.label }}
            </option>
          </select>
          <p v-if="nearbyCount !== null" class="mt-2 mb-0">
            <strong>{{ nearbyCount }}</strong> flat(s) within {{ PHG_NEAR_DISTANCE_METRES / 1000 }} km
            <span v-if="nearbyCount === 50" class="small text-muted">(the server shows at most 50)</span>
          </p>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* [COURSE] The map needs a fixed height, otherwise it is 0 px tall */
.map-box {
  height: 560px;
  border-radius: 18px;
  overflow: hidden;
  border: 1px solid var(--line);
}
/* [COURSE] Round colour dots in the legend */
.dot {
  display: inline-block;
  width: 14px;
  height: 14px;
  border-radius: 50%;
}
</style>
