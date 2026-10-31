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
import FilterPanel from '../components/FilterPanel.vue'

// Our Express server's address (class style: the full URL, like wk5/wk6 code-along App.vue)
const BASE_URL = 'http://localhost:8000'

// PHG "live near" rule: within 4 km of your parents / child (same value as Jihao's affordabilityRules.js)
const PHG_NEAR_DISTANCE_METRES = 4000

const errorMessage = ref('')
const blockCount = ref(0)

// The filters: the same panel as Search ('' = any flat type). The map starts with the widest
// budget and lease (the sliders' limits), so you first see every block and then narrow it down.
const filters = ref({ q: '', flatType: '', maxPrice: '1000000', minLease: '20' })

// For the PHG dropdown: one entry per address
const addresses = ref([])
const parentAddress = ref('')
const nearbyCount = ref(null) // how many blocks are shown inside the 4 km circle (null = no circle)

// The map, the group holding the block dots, and the PHG circle live in normal variables
// (Leaflet does not like Vue's ref)
let map = null
let blockLayer = null
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

// The text inside a dot's popup: the address, then one line per flat type, then the nearest MRT.
// place = { cards: [...] }: every card (flat type) at this address that matches the filters
function popupText(place) {
  const first = place.cards[0]
  let text = '<b>Blk ' + first.block + ' ' + first.street + '</b><br>' + first.town + '<br>'
  for (const card of place.cards) {
    text = text + card.flatType + ': median $' + card.price.toLocaleString('en-SG') +
      ' (' + card.salesCount + ' sales), ' + card.remainingLease + ' yrs lease<br>'
  }
  text = text + first.mrtWalkMinutes + ' min walk to ' + first.mrtName
  return text
}

// The lowest median price at an address (the dot's colour: "the least you would pay to live here")
function cheapestPrice(place) {
  let cheapest = place.cards[0].price
  for (const card of place.cards) {
    if (card.price < cheapest) {
      cheapest = card.price
    }
  }
  return cheapest
}

// Gets the blocks that match the filters and puts a dot for each on the map
async function loadBlocks() {
  try {
    // Same request as Search: the server only sends blocks that match the filters
    const response = await axios.get(`${BASE_URL}/api/blocks`, { params: filters.value })
    const cards = response.data.results

    // The server sends one card per block + flat type. Group them by address, so each block
    // gets ONE dot (otherwise the flat types of one block sit exactly on top of each other).
    // places = [{ label, lat, lng, cards: [card, card, ...] }, ...]
    const places = []
    for (const card of cards) {
      const label = 'Blk ' + card.block + ' ' + card.street

      // Is there already a place for this address?
      let place = null
      for (const existing of places) {
        if (existing.label === label) {
          place = existing
        }
      }
      if (place === null) {
        place = { label: label, lat: card.lat, lng: card.lng, cards: [] }
        places.push(place)
      }
      place.cards.push(card)
    }

    // PHG filter: when your parents' block is chosen, keep only the blocks within 4 km of it
    // (on top of the other filters). map.distance is Leaflet's: the straight-line distance in
    // metres between two [lat, lng] points.
    const parent = findParent()
    let shown = places
    if (parent !== null) {
      shown = []
      for (const place of places) {
        const metres = map.distance([parent.lat, parent.lng], [place.lat, place.lng])
        if (metres <= PHG_NEAR_DISTANCE_METRES) {
          shown.push(place)
        }
      }
      nearbyCount.value = shown.length
    } else {
      nearbyCount.value = null
    }
    blockCount.value = shown.length

    // Remove the old dots first, or the new ones pile up on top of them
    blockLayer.clearLayers()

    for (const place of shown) {
      // One dot per block, coloured by its cheapest flat type
      L.circleMarker([place.lat, place.lng], {
        radius: 7,
        color: '#fff',
        weight: 1.5,
        fillColor: priceColour(cheapestPrice(place)),
        fillOpacity: 1,
      })
        .bindPopup(popupText(place))
        .addTo(blockLayer)
    }
  } catch (error) {
    // Show our server's message if it sent one, otherwise axios's own (e.g. "Network Error")
    if (error.response && error.response.data && error.response.data.message) {
      errorMessage.value = error.response.data.message
    } else {
      errorMessage.value = error.message
    }
  }
}

// The filter panel says one filter changed, e.g. ('maxPrice', '600000'). Same as on Search.
function setFilter(name, value) {
  filters.value[name] = value
}

// "Clear all": back to the starting filters, then reload the dots
function clearFilters() {
  filters.value = { q: '', flatType: '', maxPrice: '1000000', minLease: '20' }
  loadBlocks()
}

// Fills the PHG dropdown with every block address (all flat types: it is where your parents live,
// so it does not depend on the filters). Runs once when the page opens.
async function loadAddresses() {
  try {
    const response = await axios.get(`${BASE_URL}/api/blocks`)
    const blocks = response.data.results

    const seen = []
    const list = []
    for (const block of blocks) {
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

// The parents' block chosen in the PHG dropdown ({ label, lat, lng }), or null for "No circle"
function findParent() {
  let parent = null
  for (const address of addresses.value) {
    if (address.label === parentAddress.value) {
      parent = address
    }
  }
  return parent
}

// PHG dropdown changed: draw (or remove) the 4 km circle, then reload the dots,
// so only the blocks inside the circle are shown (together with the filters)
function showPhg() {
  // Remove the old circle first
  if (phgCircle !== null) {
    map.removeLayer(phgCircle)
    phgCircle = null
  }

  const parent = findParent()
  if (parent !== null) {
    phgCircle = L.circle([parent.lat, parent.lng], {
      radius: PHG_NEAR_DISTANCE_METRES,
      color: '#c0614a',
      weight: 2,
      fillOpacity: 0.08,
    }).addTo(map)
    map.fitBounds(phgCircle.getBounds())
  }

  loadBlocks()
}

// When the page opens: make the map inside <div id="mapBox"> (centred on Singapore),
// then add the blocks and fill the PHG dropdown
onMounted(function () {
  map = L.map('mapBox').setView([1.36, 103.84], 12)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map)

  // A layer group is a "bag" of map things: the block dots go in it, so they can all be removed at once
  blockLayer = L.layerGroup().addTo(map)

  loadBlocks()
  loadAddresses()
})
</script>

<template>
  <section>
    <span class="eyebrow">{{ blockCount }} blocks on the map</span>
    <h1 class="page-title serif">See it on <em>the map</em></h1>
    <p class="page-sub">
      Each dot is a block, coloured by the median price of its cheapest flat type that fits your filters.
      Click a dot to see every flat type there.
    </p>

    <div v-if="errorMessage" class="alert alert-danger">{{ errorMessage }}</div>

    <div class="row g-4">
      <div class="col-lg-8">
        <div id="mapBox" class="map-box"></div>
      </div>

      <div class="col-lg-4">
        <!-- Filters: the same panel as Search -->
        <div class="mb-3">
          <FilterPanel
            :filters="filters"
            @change-filter="setFilter"
            @search="loadBlocks"
            @clear="clearFilters"
          />
        </div>

        <!-- Legend -->
        <div class="cosy-card cosy-shadow mb-3">
          <h5 class="serif">Median price (cheapest flat type)</h5>
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
            Only the blocks inside it are shown (together with your filters): they can get the "live near" grant.
          </p>
          <select v-model="parentAddress" class="form-select cosy-input" @change="showPhg">
            <option value="">No circle</option>
            <option v-for="address in addresses" :key="address.label" :value="address.label">
              {{ address.label }}
            </option>
          </select>
          <p v-if="nearbyCount !== null" class="mt-2 mb-0">
            <strong>{{ nearbyCount }}</strong> block(s) within {{ PHG_NEAR_DISTANCE_METRES / 1000 }} km match your filters
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
