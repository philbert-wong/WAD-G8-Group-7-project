<script setup>
// The Map page: every block as a dot (coloured by price or by match score), with the same filters and
// Your Priorities as Search, amenity layers, an address search, and the PHG (Proximity Housing Grant) layer:
// type your parents' postal code to see the blocks within 4 km. Click a dot for the "Selected block" card.
import { ref, onMounted, onUnmounted } from 'vue'
import axios from 'axios'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import FilterPanel from '../components/FilterPanel.vue'
import PreferencesPanel from '../components/PreferencesPanel.vue'
import { useAuthStore } from '../stores/auth'
import { useRoute } from 'vue-router'

// The current URL, to read ?block=<id> when we come from Search's "Show on map" button
const route = useRoute()
// The same match score maths as Search (shared file, not changed here)
import { CATEGORIES, getWeights, makeDefaultPreferences, matchScore, MAX_DISTANCES } from '../utils/matchScore.js'

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

// "Colour dots by": 'price' (the price bands) or 'match' (the match score gradient)
const colourBy = ref('price')

// Which sidebar panels are open: Filters open and Your Priorities closed at the start, so the sidebar is shorter
const showFilters = ref(true)
const showPriorities = ref(false)

// Your Priorities (school, MRT, hawker, park: ticked + importance), the same ones Search uses.
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
const preferences = ref(loadSavedPreferences())

// Who is logged in (Pinia store), so a change to Your Priorities can also be saved to the account, like Search does
const auth = useAuthStore()

// Saves Your Priorities the same way Search does: in this browser (localStorage), and on the account when
// logged in. That way Search and the map always use the same priorities.
async function saveChoices() {
  localStorage.setItem('matchPreferences', JSON.stringify(preferences.value))

  if (auth.isLoggedIn) {
    // The account also stores Search's sort choice; keep whatever Search saved (or 'price')
    let sortBy = 'price'
    if (localStorage.getItem('sortBy') !== null) {
      sortBy = localStorage.getItem('sortBy')
    }
    try {
      await axios.put(`${BASE_URL}/api/auth/preferences`, {
        preferences: { panel: preferences.value, sortBy: sortBy },
      })
    } catch (error) {
      // Show our server's message if it sent one, otherwise axios's own (e.g. "Network Error")
      if (error.response && error.response.data && error.response.data.message) {
        errorMessage.value = error.response.data.message
      } else {
        errorMessage.value = error.message
      }
    }
  }
}

// Your Priorities panel: a tick box changed, e.g. ('park', false). Same as Search.
function changeTicked(key, ticked) {
  preferences.value[key].ticked = ticked
  saveChoices()
  // In "Best match" mode the colours depend on the priorities, so redraw the dots
  if (colourBy.value === 'match') {
    loadBlocks()
  }
}

// Your Priorities panel: an importance level changed, e.g. ('mrt', 5). Same as Search.
function changeLevel(key, level) {
  preferences.value[key].level = level
  saveChoices()
  if (colourBy.value === 'match') {
    loadBlocks()
  }
}

// The match score gradient: a rainbow from 0 (poor) to 100 (great). Each stop = a score and its colour
// as [red, green, blue] numbers. A score between two stops gets a colour partway between them.
// Red, orange and yellow are squeezed to the left, so the usual scores (mostly below 75) spread over more colours.
const MATCH_STOPS = [
  { score: 0, rgb: [230, 57, 70] }, // red
  { score: 12, rgb: [247, 140, 40] }, // orange
  { score: 25, rgb: [250, 215, 60] }, // yellow
  { score: 45, rgb: [76, 175, 80] }, // green
  { score: 70, rgb: [33, 102, 172] }, // blue
  { score: 100, rgb: [123, 50, 148] }, // purple
]
const NO_SCORE_COLOUR = '#bdbdbd' // grey: no score (every priority unticked)

// A block's match score (0 to 100, or null), from its distances to the nearest school, MRT, hawker and park.
// Every flat type of a block has the same distances, so the first card is enough.
function placeScore(place) {
  return matchScore(place.cards[0].distances, getWeights(preferences.value), MAX_DISTANCES)
}

// One number partway between a and b: t = 0 gives a, t = 1 gives b, t = 0.5 gives the middle
function blend(a, b, t) {
  return Math.round(a + (b - a) * t)
}

// The rainbow colour for a score, e.g. 62 → between yellow (50) and green (75), about half way
function matchColour(score) {
  if (score === null) {
    return NO_SCORE_COLOUR
  }
  // Find the two stops the score sits between (the last pair that starts at or below the score)
  let from = MATCH_STOPS[0]
  let to = MATCH_STOPS[1]
  for (let i = 0; i < MATCH_STOPS.length - 1; i++) {
    if (score >= MATCH_STOPS[i].score) {
      from = MATCH_STOPS[i]
      to = MATCH_STOPS[i + 1]
    }
  }
  // How far the score is from "from" to "to": 0 = at "from", 1 = at "to"
  const t = (score - from.score) / (to.score - from.score)
  return (
    'rgb(' + blend(from.rgb[0], to.rgb[0], t) + ', ' + blend(from.rgb[1], to.rgb[1], t) + ', ' +
    blend(from.rgb[2], to.rgb[2], t) + ')'
  )
}

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
  // When the dots are coloured by match, show the score too
  if (colourBy.value === 'match') {
    text = text + '<br><b>Match: ' + scoreText(place) + '</b>'
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

// A dot's colour: by price band, or by match score gradient (the "Colour dots by" switch)
function dotColour(place) {
  if (colourBy.value === 'match') {
    return matchColour(placeScore(place))
  }
  return priceColour(cheapestPrice(place))
}

// The match score as text, for the popup and the card: "62 / 100", or "–" when there is no score
function scoreText(place) {
  const score = placeScore(place)
  if (score === null) {
    return '– (no priorities ticked)'
  }
  return score + ' / 100'
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
        fillColor: dotColour(place),
        fillOpacity: 1,
      })
        .bindPopup(popupText(place))
        // Leaflet's own click event (Vue's @click cannot be used on map dots): show this block in the sidebar
        .on('click', function () {
          selectPlace(place)
        })
        .addTo(blockLayer)
    }

    // If we came from Search's "Show on map", zoom to that block (first load only)
    focusOnBlockFromUrl(shown)
  } catch (error) {
    // Show our server's message if it sent one, otherwise axios's own (e.g. "Network Error")
    if (error.response && error.response.data && error.response.data.message) {
      errorMessage.value = error.response.data.message
    } else {
      errorMessage.value = error.message
    }
  }
}

// Coming from Search's "Show on map" button (/map?block=<id>): zoom to that block, open its popup and its
// "Selected block" card. Only done once, on the first load (not again every time the filters change).
let focusDone = false
function focusOnBlockFromUrl(places) {
  if (focusDone) {
    return
  }
  focusDone = true

  const blockId = route.query.block
  if (blockId === undefined) {
    return
  }

  // Find the dot (address) that holds this block's card
  let found = null
  for (const place of places) {
    for (const card of place.cards) {
      if (card.id === blockId) {
        found = place
      }
    }
  }
  if (found === null) {
    errorMessage.value = "That block is outside the map's current filters"
    return
  }

  // Zoom in on it (17 = street level). L.popup (Leaflet) opens a popup at a spot without needing the dot
  // itself, with the same text as the dot's own popup.
  map.setView([found.lat, found.lng], 17)
  L.popup().setLatLng([found.lat, found.lng]).setContent(popupText(found)).openOn(map)
  selectPlace(found)
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

// When you leave the Map page: remove the Leaflet map, so its listeners and layers do not stay in memory
// (Week 5 slide 8: onUnmounted is for cleanup)
onUnmounted(function () {
  if (map !== null) {
    map.remove()
  }
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
            <span v-if="colourBy === 'match'"><br />Match score: <strong>{{ scoreText(selectedPlace) }}</strong></span>
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
          <!-- Colour dots by: price or match (like Search's "Cheapest first / Best match") -->
          <div class="small fw-semibold mb-1">Colour dots by</div>
          <div class="form-check form-check-inline">
            <input id="colour-price" v-model="colourBy" value="price" type="radio" class="form-check-input" @change="loadBlocks" />
            <label for="colour-price" class="form-check-label">Cheapest price</label>
          </div>
          <div class="form-check form-check-inline mb-3">
            <input id="colour-match" v-model="colourBy" value="match" type="radio" class="form-check-input" @change="loadBlocks" />
            <label for="colour-match" class="form-check-label">Best match</label>
          </div>

          <!-- Price legend -->
          <div v-if="colourBy === 'price'">
            <h5 class="serif">Median price (cheapest flat type)</h5>
            <div v-for="band in priceBands" :key="band.label" class="d-flex align-items-center gap-2 mb-1">
              <span class="dot" :style="{ background: band.colour }"></span>
              {{ band.label }}
            </div>
          </div>

          <!-- Match legend: a smooth gradient from 0 to 100 -->
          <div v-else>
            <h5 class="serif">Match score (Your Priorities)</h5>
            <div class="gradient-bar"></div>
            <div class="d-flex justify-content-between small text-muted">
              <span>0 (poor)</span>
              <span>50</span>
              <span>100 (great)</span>
            </div>
            <div class="d-flex align-items-center gap-2 small mt-2">
              <span class="dot" :style="{ background: NO_SCORE_COLOUR }"></span>
              No score (no priorities ticked)
            </div>
            <p class="small text-muted mt-2 mb-0">Uses Your Priorities (below, shared with the Search page).</p>
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

        <!-- Filters: the same panel as Search. The header button opens / closes it
             (showFilters = !showFilters flips true/false, like "showModules = !showModules" in the Week 4 vue-example) -->
        <div class="mb-3">
          <button type="button" class="panel-toggle" @click="showFilters = !showFilters">
            <span>Filters</span>
            <span v-if="showFilters">Hide ▴</span>
            <span v-else>Show ▾</span>
          </button>
          <!-- v-show only hides it, so the chosen filters stay as they are while it is closed -->
          <div v-show="showFilters">
            <FilterPanel
              :filters="filters"
              @change-filter="setFilter"
              @search="loadBlocks"
              @clear="clearFilters"
            />
          </div>
        </div>

        <!-- Your Priorities: the same panel as Search (they share the saved choices), closed at the start -->
        <div class="mb-3">
          <button type="button" class="panel-toggle" @click="showPriorities = !showPriorities">
            <span>Your Priorities</span>
            <span v-if="showPriorities">Hide ▴</span>
            <span v-else>Show ▾</span>
          </button>
          <div v-show="showPriorities">
            <PreferencesPanel
              :preferences="preferences"
              @change-ticked="changeTicked"
              @change-level="changeLevel"
            />
          </div>
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
/* [AI-ASSISTED] The match score legend: a rainbow bar red → orange → yellow → green → blue → purple
   (linear-gradient is not in our course; the same colours AND positions as MATCH_STOPS in the script) */
.gradient-bar {
  height: 12px;
  border-radius: 6px;
  background: linear-gradient(
    to right,
    rgb(230, 57, 70) 0%,
    rgb(247, 140, 40) 12%,
    rgb(250, 215, 60) 25%,
    rgb(76, 175, 80) 45%,
    rgb(33, 102, 172) 70%,
    rgb(123, 50, 148) 100%
  );
  margin-bottom: 4px;
}
/* [COURSE] The "Filters / Your Priorities  Show ▾" header buttons: full width, name on the left, Show/Hide on the right */
.panel-toggle {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 10px 16px;
  margin-bottom: 8px;
  font-weight: 600;
  color: var(--char);
}
.panel-toggle:hover {
  border-color: var(--terra);
}
/* [COURSE] Small coloured squares in the legend for the amenities (same as their squares on the map) */
.square {
  display: inline-block;
  width: 10px;
  height: 10px;
}
</style>
