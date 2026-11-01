<script setup>
// Every block as a dot on a map, coloured by its median price. Click a dot for details.
// PHG layer: pick your parents' block to draw the 4 km Proximity Housing Grant circle.
import { ref, onMounted } from 'vue'
import axios from 'axios'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import FilterPanel from '../components/FilterPanel.vue'

// Our Express server's address (class style: the full URL, like wk5/wk6 code-along App.vue)
const BASE_URL = 'http://localhost:8000'

// PHG "live near" rule: within 4 km of your parents / child 
const PHG_NEAR_DISTANCE_METRES = 4000

const errorMessage = ref('')
const blockCount = ref(0)

// The filters: the same panel as Search ('' = any flat type). The map starts with the widest
// budget and lease (the sliders' limits), so you first see every block and then narrow it down.
const filters = ref({ q: '', flatType: '', maxPrice: '1000000', minLease: '20' })

// For the address search above the map: what is typed, and the place OneMap found ({ name, lat, lng }, or null)
const searchQuery = ref('')
const searchedPlace = ref(null)

// For the PHG search box: what is typed, and the place OneMap found ({ name, lat, lng }, or null = no circle)
const parentQuery = ref('')
const parentPlace = ref(null)
const nearbyCount = ref(null) // how many blocks are shown inside the 4 km circle (null = no circle)

// The 4 kinds of amenity that can be shown on the map. key = the category the server uses.
// The colours are chosen to look nothing like the 4 price colours (green, yellow, orange, red).
// one = the name for a single one (used in the "nearest amenities" list)
const amenityTypes = [
  { key: 'mrt', label: 'MRT stations', one: 'MRT', colour: '#0057ff' },
  { key: 'hawker', label: 'Hawker centres', one: 'Hawker centre', colour: '#a21caf' },
  { key: 'park', label: 'Parks', one: 'Park', colour: '#e83e8c' },
  { key: 'school', label: 'Primary schools', one: 'Primary school', colour: '#111111' },
]

// The ticked amenity types, e.g. ['mrt', 'park']. v-model on the tick boxes adds / removes keys for us.
const shownTypes = ref([])

// The block whose dot was clicked: { label, lat, lng, cards: [...] }, shown in the "Selected block" card
// (null = no block selected, so no card)
const selectedPlace = ref(null)

// The selected block's nearest MRT, hawker centre, park and school: [{ category, name, distance }, ...]
// (null = not asked for yet, so the card shows the "Show nearest amenities" button)
const nearestAmenities = ref(null)

// The map, the groups holding the block and amenity dots, the PHG circle and the parents' marker live in
// normal variables (Leaflet does not like Vue's ref)
let map = null
let blockLayer = null
let amenityLayer = null
let phgCircle = null
let parentMarker = null
let searchMarker = null

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

// The short text inside a dot's popup: the address, the town, then one line per flat type with its median
// (a block has at most a few flat types). More details are in the "Selected block" card in the sidebar.
// Bootstrap classes work here because Bootstrap's CSS applies to the whole page.
function popupText(place) {
  const first = place.cards[0]
  let text =
    '<b>Blk ' + first.block + ' ' + first.street + '</b><br>' +
    '<span class="small text-muted">' + first.town + '</span>'
  for (const card of place.cards) {
    text = text + '<br>' + card.flatType + ': median $' + card.price.toLocaleString('en-SG')
  }
  return text
}

// A block dot was clicked: show that block in the "Selected block" card
// (and forget the previous block's nearest amenities, so their highlights go away)
function selectPlace(place) {
  selectedPlace.value = place
  nearestAmenities.value = null
  showAmenities()
}

// The card's close (X) button: close the card AND the dot's popup on the map (map.closePopup is Leaflet's)
function closePlace() {
  selectedPlace.value = null
  nearestAmenities.value = null
  showAmenities()
  map.closePopup()
}

// "Show nearest amenities" button: ask our server for the selected block's nearest MRT, hawker centre,
// park and school (GET /api/blocks/<id>/amenities), list them in the card, and highlight them on the map
async function showNearest() {
  // Every flat type of a block is at the same spot, so the first card's id is enough
  const blockId = selectedPlace.value.cards[0].id
  try {
    const response = await axios.get(`${BASE_URL}/api/blocks/${blockId}/amenities`)
    nearestAmenities.value = response.data.amenities
    showAmenities()
  } catch (error) {
    // Show our server's message if it sent one, otherwise axios's own (e.g. "Network Error")
    if (error.response && error.response.data && error.response.data.message) {
      errorMessage.value = error.response.data.message
    } else {
      errorMessage.value = error.message
    }
  }
}

// "Hide nearest amenities" button: back to the "Show" button, and the highlighted squares go back to normal
function hideNearest() {
  nearestAmenities.value = null
  showAmenities()
}

// The single name of an amenity category, e.g. 'hawker' -> 'Hawker centre' (for the nearest list)
function amenityName(category) {
  for (const type of amenityTypes) {
    if (type.key === category) {
      return type.one
    }
  }
  return category
}

// Is this amenity one of the selected block's 4 nearest? (same category AND same name)
function isNearest(category, name) {
  if (nearestAmenities.value === null) {
    return false
  }
  for (const nearest of nearestAmenities.value) {
    if (nearest.category === category && nearest.name === name) {
      return true
    }
  }
  return false
}

// The flat type (card) with the lowest median price at an address
function cheapestCard(place) {
  let cheapest = place.cards[0]
  for (const card of place.cards) {
    if (card.price < cheapest.price) {
      cheapest = card
    }
  }
  return cheapest
}

// The lowest median price at an address (the dot's colour: "the least you would typically pay to live here")
function cheapestPrice(place) {
  return cheapestCard(place).price
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
      // Add this flat type to its address. place points to the SAME object that is inside places
      // (not a copy), so the entry in places gets the card too, without pushing it again.
      place.cards.push(card)
    }

    // PHG filter: when your parents' place has been searched, keep only the blocks within 4 km of it
    // (on top of the other filters). map.distance is Leaflet's: the straight-line distance in
    // metres between two [lat, lng] points.
    const parent = parentPlace.value
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

    // Keep the "Selected block" card up to date: if the selected block is still on the map, use its new
    // entry (its flat types may have changed with the filters); if it is gone, close the card and its highlights.
    if (selectedPlace.value !== null) {
      let stillShown = null
      for (const place of shown) {
        if (place.label === selectedPlace.value.label) {
          stillShown = place
        }
      }
      selectedPlace.value = stillShown
      if (stillShown === null) {
        nearestAmenities.value = null
        showAmenities()
      }
    }

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
        // Leaflet's own click event (Vue's @click cannot be used on map dots): show this block in the sidebar
        .on('click', function () {
          selectPlace(place)
        })
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

// A tick box changed: draw the amenity dots for every ticked type (and none for the unticked ones)
async function showAmenities() {
  try {
    // 1. Get the amenities of each ticked type from our server: [{ type, places: [...] }, ...]
    const toDraw = []
    for (const type of amenityTypes) {
      if (shownTypes.value.includes(type.key)) {
        const response = await axios.get(`${BASE_URL}/api/amenities`, { params: { category: type.key } })
        toDraw.push({ type: type, places: response.data.results })
      }
    }

    // 2. Remove the old amenity dots (the block dots are in their own group, so they stay)
    amenityLayer.clearLayers()

    // 3. One small SQUARE per amenity (so they look different from the round block dots),
    //    in its type's colour, with its name in the popup.
    //    L.divIcon = a marker drawn with our own HTML instead of a picture: here a 10 x 10 coloured <span>.
    //    (className: '' removes Leaflet's default white box around a divIcon.)
    for (const group of toDraw) {
      const squareIcon = L.divIcon({
        className: '',
        html:
          '<span style="display: block; width: 10px; height: 10px; border: 1px solid #fff; background: ' +
          group.type.colour + ';"></span>',
        iconSize: [10, 10],
      })
      // A bigger square with a thick black border, for the selected block's nearest one of this type
      const bigSquareIcon = L.divIcon({
        className: '',
        html:
          '<span style="display: block; width: 18px; height: 18px; border: 3px solid #000; background: ' +
          group.type.colour + ';"></span>',
        iconSize: [18, 18],
      })

      for (const place of group.places) {
        if (isNearest(group.type.key, place.name)) {
          // zIndexOffset (Leaflet) puts this marker on top of the small ones around it
          L.marker([place.lat, place.lng], { icon: bigSquareIcon, zIndexOffset: 1000 })
            .bindPopup('<b>' + place.name + '</b><br>Nearest ' + group.type.one + ' to the selected block')
            .addTo(amenityLayer)
        } else {
          L.marker([place.lat, place.lng], { icon: squareIcon })
            .bindPopup('<b>' + place.name + '</b><br>' + group.type.label)
            .addTo(amenityLayer)
        }
      }
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

// Address search above the map (Go button or Enter): ask OneMap where the place is, put a marker there
// and move the map to it. Unlike the PHG search, it does not filter the blocks.
async function searchPlace() {
  errorMessage.value = ''
  if (searchQuery.value.trim() === '') {
    errorMessage.value = 'Type an address or postal code'
    return
  }

  let place = null
  try {
    // Our server asks OneMap and answers { name, lat, lng } for the best match
    const response = await axios.get(`${BASE_URL}/api/blocks/place`, { params: { q: searchQuery.value } })
    place = response.data
  } catch (error) {
    if (error.response && error.response.status === 500) {
      // The server could not log in to OneMap (or something else broke there)
      errorMessage.value = 'Place search failed. Check the OneMap login in server/config.env'
    } else if (error.response && error.response.data && error.response.data.message) {
      // e.g. "Place not found" (404)
      errorMessage.value = error.response.data.message
    } else {
      errorMessage.value = error.message
    }
    return
  }
  searchedPlace.value = place

  // A new search closes the selected-block card (comparing blocks is the Compare page's job)
  closePlace()

  // Remove the previous search marker, if there is one
  if (searchMarker !== null) {
    map.removeLayer(searchMarker)
    searchMarker = null
  }

  // A white dot with a thick dark ring, so it does not look like a block, an amenity or the parents' dot.
  // (A circleMarker, not L.marker: Leaflet's default pin picture often fails to load with Vite.)
  searchMarker = L.circleMarker([place.lat, place.lng], {
    radius: 9,
    color: '#111',
    weight: 4,
    fillColor: '#fff',
    fillOpacity: 1,
  })
    .bindPopup('<b>' + place.name + '</b>')
    .addTo(map)

  // Jump there at zoom 16 (street level), then open the marker's popup so the name shows straight away
  map.setView([place.lat, place.lng], 16)
  searchMarker.openPopup()
}

// "Clear" next to the searched place: remove the marker and empty the search box
function clearSearch() {
  if (searchMarker !== null) {
    map.removeLayer(searchMarker)
    searchMarker = null
  }
  searchedPlace.value = null
  searchQuery.value = ''
}

// Takes the old PHG circle and parents' marker off the map (if there are any)
function removeParentDrawings() {
  if (phgCircle !== null) {
    map.removeLayer(phgCircle)
    phgCircle = null
  }
  if (parentMarker !== null) {
    map.removeLayer(parentMarker)
    parentMarker = null
  }
}

// PHG search (Search button or Enter): ask OneMap where the parents live (any address or postal code),
// draw a marker and the 4 km circle there, then reload the dots so only the blocks inside are shown
async function searchParent() {
  errorMessage.value = ''
  if (parentQuery.value.trim() === '') {
    errorMessage.value = 'Type your parents\' address or postal code'
    return
  }

  try {
    // Our server asks OneMap and answers { name, lat, lng } for the best match
    const response = await axios.get(`${BASE_URL}/api/blocks/place`, { params: { q: parentQuery.value } })
    parentPlace.value = response.data
  } catch (error) {
    if (error.response && error.response.status === 500) {
      // The server could not log in to OneMap (or something else broke there)
      errorMessage.value = 'Place search failed. Check the OneMap login in server/config.env'
    } else if (error.response && error.response.data && error.response.data.message) {
      // e.g. "Place not found" (404)
      errorMessage.value = error.response.data.message
    } else {
      errorMessage.value = error.message
    }
    return
  }

  const parent = parentPlace.value
  removeParentDrawings()

  // A small dark dot where the parents live, with its name in a popup.
  // (A circleMarker, not L.marker: Leaflet's default pin picture often fails to load with Vite.)
  parentMarker = L.circleMarker([parent.lat, parent.lng], {
    radius: 8,
    color: '#fff',
    weight: 2,
    fillColor: '#2d2d2d',
    fillOpacity: 1,
  })
    .bindPopup('<b>Parents</b><br>' + parent.name)
    .addTo(map)

  // The 4 km PHG circle (a real size in metres), and zoom so the whole circle fits on screen
  phgCircle = L.circle([parent.lat, parent.lng], {
    radius: PHG_NEAR_DISTANCE_METRES,
    color: '#c0614a',
    weight: 2,
    fillOpacity: 0.08,
  }).addTo(map)
  map.fitBounds(phgCircle.getBounds())

  loadBlocks()
}

// "Clear" link: remove the circle and marker, and show every block that fits the filters again
function clearParent() {
  removeParentDrawings()
  parentPlace.value = null
  parentQuery.value = ''
  loadBlocks()
}

// When the page opens: make the map inside <div id="mapBox"> (centred on Singapore), then add the blocks
onMounted(function () {
  map = L.map('mapBox').setView([1.36, 103.84], 12)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map)

  // A layer group is a "bag" of map things: the block dots go in it, so they can all be removed at once
  blockLayer = L.layerGroup().addTo(map)

  // A second bag for the amenity dots, so ticking / unticking only clears and redraws those
  amenityLayer = L.layerGroup().addTo(map)

  loadBlocks()
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
        <!-- Address search: move the map to any address or postal code (looked up by OneMap) -->
        <div class="input-group mb-2">
          <input
            v-model="searchQuery"
            type="text"
            class="form-control"
            placeholder="Search an address or postal code"
            @keyup.enter="searchPlace"
          />
          <button type="button" class="btn btn-dark" @click="searchPlace">Go</button>
        </div>
        <p v-if="searchedPlace !== null" class="small mb-2">
          Showing: <strong>{{ searchedPlace.name }}</strong>
          <button type="button" class="btn btn-sm btn-outline-secondary ms-2" @click="clearSearch">Clear</button>
        </p>

        <div id="mapBox" class="map-box"></div>
      </div>

      <div class="col-lg-4">
        <!-- Selected block: appears when a dot is clicked -->
        <div v-if="selectedPlace !== null" class="cosy-card cosy-shadow mb-3">
          <div class="d-flex justify-content-between align-items-start gap-2">
            <h5 class="serif mb-1">{{ selectedPlace.label }}</h5>
            <button type="button" class="btn-close" aria-label="Close" @click="closePlace"></button>
          </div>
          <p class="small text-muted mb-3">
            {{ selectedPlace.cards[0].town }} · {{ selectedPlace.cards[0].mrtWalkMinutes }} min walk to
            {{ selectedPlace.cards[0].mrtName }}
          </p>

          <!-- One row per flat type at this block that fits the filters -->
          <table class="table table-sm small mb-0">
            <thead>
              <tr>
                <th>Flat type</th>
                <th class="text-end">Median</th>
                <th class="text-end">Sales</th>
                <th class="text-end">Lease left</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="card in selectedPlace.cards" :key="card.id">
                <td>{{ card.flatType }}</td>
                <td class="text-end">{{ '$' + card.price.toLocaleString('en-SG') }}</td>
                <td class="text-end">{{ card.salesCount }}</td>
                <td class="text-end">{{ card.remainingLease }} yrs</td>
              </tr>
            </tbody>
          </table>

          <!-- Nearest amenities: a button first, then the list once loaded -->
          <button
            v-if="nearestAmenities === null"
            type="button"
            class="btn btn-sm btn-outline-dark mt-3"
            @click="showNearest"
          >
            Show nearest amenities
          </button>
          <div v-else class="mt-3">
            <h6 class="mb-2">Nearest amenities</h6>
            <ul class="list-unstyled small mb-2">
              <li v-for="amenity in nearestAmenities" :key="amenity.category" class="mb-1">
                <strong>{{ amenityName(amenity.category) }}:</strong> {{ amenity.name }} · {{ amenity.distance }} m
              </li>
            </ul>
            <p class="small text-muted mb-2">
              Tick a type under "Show amenities" to see its nearest one highlighted (bigger square) on the map.
            </p>
            <button type="button" class="btn btn-sm btn-outline-dark" @click="hideNearest">
              Hide nearest amenities
            </button>
          </div>
        </div>

        <!-- Legend (2nd card, so on a phone it is right under the map, before the filters) -->
        <div class="cosy-card cosy-shadow mb-3">
          <h5 class="serif">Median price (cheapest flat type)</h5>
          <div v-for="band in priceBands" :key="band.label" class="d-flex align-items-center gap-2 mb-1">
            <span class="dot" :style="{ background: band.colour }"></span>
            {{ band.label }}
          </div>

          <!-- Amenity layers: tick a type to show its dots (the coloured dot is its legend) -->
          <h5 class="serif mt-3">Show amenities</h5>
          <div v-for="type in amenityTypes" :key="type.key" class="form-check">
            <input
              :id="'amenity-' + type.key"
              v-model="shownTypes"
              :value="type.key"
              type="checkbox"
              class="form-check-input"
              @change="showAmenities"
            />
            <label :for="'amenity-' + type.key" class="form-check-label d-flex align-items-center gap-2">
              <span class="square" :style="{ background: type.colour }"></span>
              {{ type.label }}
            </label>
          </div>
        </div>

        <!-- Filters: the same panel as Search -->
        <div class="mb-3">
          <FilterPanel
            :filters="filters"
            @change-filter="setFilter"
            @search="loadBlocks"
            @clear="clearFilters"
          />
        </div>

        <!-- PHG layer -->
        <div class="cosy-card cosy-shadow">
          <h5 class="serif">Proximity Grant (PHG) layer</h5>
          <p class="small text-muted">
            Type your parents' postal code (or home address) to draw the {{ PHG_NEAR_DISTANCE_METRES / 1000 }} km circle.
            Only the blocks inside it are shown (together with your filters): they can get the "live near" grant.
          </p>

          <!-- Search box: any address or postal code (looked up by OneMap) -->
          <div class="d-flex gap-2">
            <input
              v-model="parentQuery"
              type="text"
              class="form-control cosy-input"
              placeholder="e.g. 560406"
              @keyup.enter="searchParent"
            />
            <button type="button" class="btn btn-dark" @click="searchParent">Search</button>
          </div>

          <!-- The place OneMap found, so you can check it is the right one -->
          <p v-if="parentPlace !== null" class="small mt-2 mb-0">
            Using: <strong>{{ parentPlace.name }}</strong>
            <button type="button" class="btn btn-sm btn-outline-secondary ms-2" @click="clearParent">Clear</button>
          </p>

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
/* [COURSE] Small coloured squares in the legend for the amenities (same as their squares on the map) */
.square {
  display: inline-block;
  width: 10px;
  height: 10px;
}
</style>
