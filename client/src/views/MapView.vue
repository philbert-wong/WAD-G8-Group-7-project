<script setup>
// The Map page: every block as a dot (coloured by price or by match score), with the same filters and
// Your Priorities as Search, amenity layers, an address search, and the PHG (Proximity Housing Grant) layer:
// type your parents' postal code to see the blocks within 4 km. Click a dot for the "Selected block" card.
import { ref, watch, onMounted, onUnmounted } from 'vue'
import axios from 'axios'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import FilterPanel from '../components/FilterPanel.vue'
import PreferencesPanel from '../components/PreferencesPanel.vue'
// The map page's own sidebar pieces (client/src/components/map/). MapView keeps the data and the
// Leaflet map; these components only show things and send clicks / typed text back up (props down, emit up).
import MapSearchBar from '../components/map/MapSearchBar.vue'
import SelectedBlockCard from '../components/map/SelectedBlockCard.vue'
import MapLegend from '../components/map/MapLegend.vue'
import MapKey from '../components/map/MapKey.vue'
import MapToolbar from '../components/map/MapToolbar.vue'
import { useAuthStore } from '../stores/auth'
import { useMapFocusStore } from '../stores/mapFocus'
import { useFiltersStore } from '../stores/filters'
import { useShortlistStore } from '../stores/shortlist'

// Which block to zoom to when we come from Search's "Show on map" button (small Pinia store)
const mapFocus = useMapFocusStore()
// The filters (flat type, budget, lease) live in a Pinia store shared with Search, so both pages show the same results
const filterStore = useFiltersStore()
// The same match score maths as Search (shared file, not changed here)
import { CATEGORIES, getWeights, makeDefaultPreferences, matchScore, MAX_DISTANCES, scoreWord } from '../utils/matchScore.js'

// Our Express server's address, from one shared place (see config.js; it changes for deployment)
import { BASE_URL } from '../config.js'

// Is the browser window at least as wide as Bootstrap's "lg" size (992px, a laptop)? On a phone the Filters
// panel starts closed, because the sidebar is under the map there and the open filters push everything down.
const isWideScreen = window.innerWidth >= 992

// PHG "live near" rule: within 4 km of your parents / child
const PHG_NEAR_DISTANCE_METRES = 4000

const errorMessage = ref('')
const blockCount = ref(0)
const flatCount = ref(0) // the flats in those blocks (one block can hold several flat types)


// The search from the Search page is shared in the filters store (filterStore.filters.q, '' = none): the map shows
// the same flats. When it was a place rather than one of our blocks (e.g. "Northpoint City"), this is the place's
// name from OneMap and the map shows our flats within 1 km of it, like Search does ('' = a normal search)
const searchNearName = ref('')
// true after "Show all of Singapore": the search stays in the box, but the map shows every block that fits the
// filters, until Search is pressed again (only on the Map; Search always shows its search)
const showAllFlats = ref(false)

// The parents' place found by the PHG search: { name, lat, lng }, or null = no circle
// (the parents' postal code itself is in the filters store: filterStore.filters.parentsPostal)
const parentPlace = ref(null)
const nearbyCount = ref(null) // how many blocks are shown inside the 4 km circle (null = no circle)
// The 4 kinds of amenity that can be shown on the map. key = the category the server uses.
// The colours are chosen to look nothing like the 4 price colours (green, yellow, orange, red).
// one = the name for a single one (used in the "nearest amenities" list)
const amenityTypes = [
  { key: 'mrt', label: 'MRT / LRT stations', one: 'MRT / LRT', colour: '#0057ff' },
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
let searchMarker = null // the searched place's white dot, or a hidden block's grey dot (one at a time)

// The blocks (places) currently drawn on the map, kept so the address search can check
// whether the place it found is one of them
let shownPlaces = []

// "Colour dots by": 'match' (the priority score gradient) or 'price' (the price bands).
// The SAME choice as Search's sort ("Sort: Priority score" / "Cheapest first"), saved as 'sortBy' in localStorage
// (and on the account), so the two pages always match. Search's default is 'match', so it is the map's too.
function loadSavedSort() {
  const saved = localStorage.getItem('sortBy')
  if (saved === 'price') {
    return 'price'
  }
  return 'match'
}
const colourBy = ref(loadSavedSort())

// The legend's "Colour dots by" changed: save it as the shared sort (so Search sorts the same way),
// then redraw the dots in the new colours
function changeColourBy(value) {
  colourBy.value = value
  localStorage.setItem('sortBy', value)
  saveChoices() // also on the account when logged in (saveChoices sends the sort saved just above)
  loadBlocks()
}

// "Show": 'all' = every block that fits the filters, 'shortlist' = only the flats you saved
// (your saved flats are shown even if they do not fit the filters: you picked them on purpose)
const shortlist = useShortlistStore()
const showWhich = ref('all')

// The legend's "Show" changed: get the latest shortlist if needed, redraw the dots,
// and for the shortlist zoom out / in so every saved flat is on the screen
async function changeShowWhich(value) {
  showWhich.value = value
  if (value === 'shortlist') {
    await shortlist.fetchShortlist()
  }
  await loadBlocks()

  if (value === 'shortlist' && shownPlaces.length > 0) {
    const points = []
    for (const place of shownPlaces) {
      points.push([place.lat, place.lng])
    }
    // fitBounds (Leaflet): zoom to the smallest view that holds all the points; padding keeps them off the edge
    map.fitBounds(points, { padding: [40, 40], maxZoom: 16 })
  }
}

// The legend's amenity tick box changed, e.g. ('mrt', true): add or remove that type, then redraw the squares
function toggleAmenity(key, ticked) {
  if (ticked) {
    if (!shownTypes.value.includes(key)) {
      shownTypes.value.push(key)
    }
  } else {
    shownTypes.value = shownTypes.value.filter(function (shownKey) {
      return shownKey !== key
    })
  }
  showAmenities()
}

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
    // The account also stores Search's sort choice; keep whatever Search saved (or 'match', Search's default)
    let sortBy = 'match'
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
  // When the dots are coloured by Your Priorities the colours depend on the priorities, so redraw the dots
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
    text = text + '<br><b>Priority score: ' + scoreText(place) + '</b>'
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
  // A new action: remove any old error message first
  errorMessage.value = ''
  // Every flat type of a block is at the same spot, so the first card's id is enough
  const blockId = selectedPlace.value.cards[0].id
  try {
    const response = await axios.get(`${BASE_URL}/api/blocks/${blockId}/amenities`)
    const amenities = response.data.amenities
    // The server finds the closest MRT in a straight line; use the block's nearest station by WALKING instead
    // (the same one as the card's "min walk"), so the right station's square is the highlighted one
    for (const amenity of amenities) {
      if (amenity.category === 'mrt') {
        amenity.name = selectedPlace.value.cards[0].mrtName
      }
    }
    nearestAmenities.value = amenities
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

// The match score as text, for the popup and the card: "62/100 · Good", or "–" when there is no score
function scoreText(place) {
  const score = placeScore(place)
  if (score === null) {
    return '– (no priorities ticked)'
  }
  return score + '/100 · ' + scoreWord(score)
}

// Gets the blocks that match the filters and puts a dot for each on the map
async function loadBlocks() {
  // New filters / a new load: remove any old error message first (a new problem below sets it again)
  errorMessage.value = ''
  try {
    // Same request as Search, with the shared filters AND the shared search text: the map shows the same flats
    // as the Search page (all of Singapore when nothing was searched).
    let cards = []
    searchNearName.value = ''
    if (showWhich.value === 'shortlist') {
      // Only your saved flats (already loaded by changeShowWhich). They are the same cards as /api/blocks sends.
      if (shortlist.error !== '') {
        errorMessage.value = shortlist.error
      }
      for (const item of shortlist.items) {
        cards.push(item.block)
      }
    } else {
      // "Show all of Singapore" pressed: no search text, so every block that fits the filters
      let searched = filterStore.filters.q
      if (showAllFlats.value) {
        searched = ''
      }
      const params = {
        q: searched,
        flatType: filterStore.filters.flatType,
        maxPrice: filterStore.filters.maxPrice,
        minLease: filterStore.filters.minLease,
      }
      const response = await axios.get(`${BASE_URL}/api/blocks`, { params: params })
      cards = response.data.results
      // None of our blocks match, but something was searched (e.g. "Northpoint City"): our flats near that place
      if (cards.length === 0 && searched !== '') {
        cards = await loadNearSearchedPlace(searched)
      }
    }

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
    shownPlaces = shown

    // How many flats (block + flat type) those dots hold: two saved flats in one block share one dot
    let flats = 0
    for (const place of shown) {
      flats = flats + place.cards.length
    }
    flatCount.value = flats

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

    // Draw them: a dot per block, or a bubble per town when zoomed out (see drawBlocks below)
    drawBlocks()

    // If we came from Search's "Show on map", zoom to that block (first load only)
    focusOnRequestedBlock(shown)
  } catch (error) {
    // Show our server's message if it sent one, otherwise axios's own (e.g. "Network Error")
    if (error.response && error.response.data && error.response.data.message) {
      errorMessage.value = error.response.data.message
    } else {
      errorMessage.value = error.message
    }
  }
}

// The Search page searched a place that is not one of our blocks: ask OneMap where it is, then get our flats
// within 1 km of it that fit the filters (the same two requests as Search's searchNearPlace). Returns the cards.
// (A place OneMap cannot find either is caught by loadBlocks and shown as its error message.)
async function loadNearSearchedPlace(text) {
  const placeResponse = await axios.get(`${BASE_URL}/api/blocks/place`, { params: { q: text } })
  const place = placeResponse.data
  const nearbyResponse = await axios.get(`${BASE_URL}/api/blocks/nearby`, {
    params: {
      lat: place.lat,
      lng: place.lng,
      flatType: filterStore.filters.flatType,
      maxPrice: filterStore.filters.maxPrice,
      minLease: filterStore.filters.minLease,
    },
  })
  searchNearName.value = place.name
  // A white dot with a thick dark ring where the place is, so it does not look like a block, an amenity or the parents' dot
  // (a circleMarker, not L.marker: Leaflet's default pin picture often fails to load with Vite)
  removeSearchMarker()
  searchMarker = L.circleMarker([place.lat, place.lng], { radius: 9, color: '#111', weight: 4, fillColor: '#fff', fillOpacity: 1 })
    .bindPopup('<b>' + place.name + '</b><br>Our flats within 1 km are shown')
    .addTo(map)
  return nearbyResponse.data.results
}

// Zoom to the flats from the Search page's search. One block: open it like a clicked dot.
// All in one town: zoom in at least to TOWN_ZOOM, so its dots show (not just its town bubble).
// Several towns (e.g. a long street): just fit them all.
function zoomToSearch() {
  if (shownPlaces.length === 0) {
    return
  }
  if (shownPlaces.length === 1) {
    focusPlace(shownPlaces[0])
    return
  }
  const spots = []
  const towns = []
  for (const place of shownPlaces) {
    spots.push([place.lat, place.lng])
    if (!towns.includes(place.cards[0].town)) {
      towns.push(place.cards[0].town)
    }
  }
  map.fitBounds(spots, { padding: [30, 30], maxZoom: 17, animate: false })
  if (towns.length === 1 && map.getZoom() < TOWN_ZOOM) {
    map.setView(map.getCenter(), TOWN_ZOOM)
  }
}

// Takes the searched place's dot (or a hidden block's grey dot) off the map, if there is one
function removeSearchMarker() {
  if (searchMarker !== null) {
    map.removeLayer(searchMarker)
    searchMarker = null
  }
}

// Search (or Enter, or a suggestion) in the map's search bar: the same search as the Search page's box (shared, so Search shows it too).
// Show those flats and zoom to them; an empty box shows every block that fits the filters, on the whole island.
async function searchFromMap(text) {
  filterStore.setFilter('q', text.trim())
  showAllFlats.value = false
  closePlace()
  removeSearchMarker()
  await loadBlocks()
  if (filterStore.filters.q === '') {
    map.setView([1.36, 103.84], 12)
  } else {
    zoomToSearch()
  }
}

// "Show all of Singapore": every block that fits the filters, zoomed out to the whole island.
// The search stays in the box (and on Search): Search shows it again.
async function showAllOfSingapore() {
  showAllFlats.value = true
  closePlace()
  removeSearchMarker()
  await loadBlocks()
  map.setView([1.36, 103.84], 12)
}

// Zoomed out further than this, the map shows one bubble per town instead of 400+ dots (too busy to read).
// 14 = a few streets across; the map starts at 12 (the whole island).
const TOWN_ZOOM = 14

// Draws the blocks in shownPlaces. Runs after every load, and again whenever you zoom in or out.
function drawBlocks() {
  // Remove the old dots / bubbles first, or the new ones pile up on top of them
  blockLayer.clearLayers()

  // Town bubbles only for the full map: the shortlist and the PHG circle have few blocks,
  // and you need to see exactly which ones (e.g. which are inside the 4 km circle)
  const useTowns = showWhich.value === 'all' && parentPlace.value === null && map.getZoom() < TOWN_ZOOM
  if (useTowns) {
    drawTownBubbles()
    return
  }

  for (const place of shownPlaces) {
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
}

// Zoomed out: one round bubble per town with the number of flats there that fit your filters.
// It sits in the middle of the town's blocks; click it to zoom into the town and see its dots.
function drawTownBubbles() {
  // Group the blocks by town: towns = [{ name, places: [place, ...], flats }, ...]
  const towns = []
  for (const place of shownPlaces) {
    const name = place.cards[0].town
    let town = null
    for (const existing of towns) {
      if (existing.name === name) {
        town = existing
      }
    }
    if (town === null) {
      town = { name: name, places: [], flats: 0 }
      towns.push(town)
    }
    town.places.push(place)
    town.flats = town.flats + place.cards.length
  }

  for (const town of towns) {
    // The middle of the town = the average position of its blocks
    let latSum = 0
    let lngSum = 0
    const points = []
    for (const place of town.places) {
      latSum = latSum + place.lat
      lngSum = lngSum + place.lng
      points.push([place.lat, place.lng])
    }
    const middle = [latSum / town.places.length, lngSum / town.places.length]

    // Bigger bubble for more flats: 30 px for a few, up to 50 px for the busiest towns
    const size = Math.min(50, 30 + Math.round(town.flats / 4))

    // L.divIcon = a marker drawn with our own HTML (like the amenity squares): the circle with the number,
    // and the town name underneath. iconAnchor puts the middle of the circle on the town's middle.
    const icon = L.divIcon({
      className: '',
      html:
        '<div style="width: ' + size + 'px; height: ' + size + 'px; line-height: ' + size + 'px; ' +
        'border-radius: 50%; background: var(--terra); opacity: 0.88; color: #fff; text-align: center; ' +
        'font-weight: 700; font-size: 13px; border: 2px solid #fff; box-shadow: 0 1px 4px rgba(0,0,0,0.3); cursor: pointer;">' +
        town.flats + '</div>' +
        '<div style="width: 120px; margin-left: ' + (size / 2 - 60) + 'px; text-align: center; font-size: 10px; ' +
        'font-weight: 700; color: #333; text-shadow: 0 0 3px #fff, 0 0 3px #fff;">' + town.name + '</div>',
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    })

    // zIndexOffset: drawn on top of the amenity squares (also markers), which would otherwise cover the bubbles
    // further north. 2000 = above even the big "nearest amenity" squares (1000).
    L.marker(middle, { icon: icon, title: town.name + ': ' + town.flats + ' flats', zIndexOffset: 2000 })
      .on('click', function () {
        // Zoom to fit the whole town, but at least to TOWN_ZOOM so its dots show (not the bubble again)
        map.fitBounds(points, { padding: [30, 30], animate: false })
        if (map.getZoom() < TOWN_ZOOM) {
          map.setView(map.getCenter(), TOWN_ZOOM)
        }
      })
      .addTo(blockLayer)
  }
}

// Zoom to one block on the map, open its popup and its "Selected block" card (as if its dot was clicked).
// L.popup (Leaflet) opens a popup at a spot without needing the dot itself, with the same text as the dot's.
function focusPlace(place) {
  map.setView([place.lat, place.lng], 17) // 17 = street level
  L.popup().setLatLng([place.lat, place.lng]).setContent(popupText(place)).openOn(map)
  selectPlace(place)
}

// Coming from Search's "Show on map" button: the block's id is in the mapFocus store. Zoom to it, then clear
// the store, so it only happens once (not again every time the filters change).
function focusOnRequestedBlock(places) {
  const blockId = mapFocus.blockId
  if (blockId === null) {
    return
  }
  mapFocus.clear()

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
    // It does not fit the filters (e.g. a shortlisted flat): show it as a grey dot instead
    showRequestedHiddenBlock(blockId)
    return
  }
  focusPlace(found)
}

// The filter panel says one filter changed, e.g. ('maxPrice', '600000'): change it in the shared store. Same as on Search.
function setFilter(name, value) {
  filterStore.setFilter(name, value)
  if (name === 'phg') {
    auth.savePhgToggle(value) // remembered on the presets, so it is the same next time
  }
}

// "Clear all": back to the starting filters (also on Search, since they are shared), then reload the dots
function clearFilters() {
  filterStore.clearFilters()
  applyFilters()
}

// "Apply Filters" (or the PHG switch, a flat type chip, Enter in a box): load the dots with the shared filters.
// PHG on with a postal code: draw the 4 km circle around the parents and keep only the blocks inside
// (searchParent loads the blocks). Otherwise: no circle, every block that fits the filters.
async function applyFilters() {
  if (filterStore.filters.phg && filterStore.filters.parentsPostal.trim() !== '') {
    await searchParent(filterStore.filters.parentsPostal)
  } else {
    removeParentDrawings()
    parentPlace.value = null
    await loadBlocks()
  }
}

// A tick box changed: draw the amenity dots for every ticked type (and none for the unticked ones)
async function showAmenities() {
  // Runs after every click on a dot, a tick box or the card's buttons: remove any old error message first
  errorMessage.value = ''
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

// Where is this typed text? Answers { name, lat, lng }. Used by the address search and the PHG search.
// 1. Our own blocks first (the same search as the Search page, with no filters): if the text is the address of
//    exactly ONE of our blocks, e.g. "Blk 405B Northshore Dr Punggol", use that block's spot, no OneMap needed.
//    (Only when the text contains the block number, so a word like "Ubi" still goes to OneMap.)
// 2. Otherwise our server asks OneMap (any address, postal code or place in Singapore).
async function findPlaceFor(text) {
  const response = await axios.get(`${BASE_URL}/api/blocks`, { params: { q: text } })
  const cards = response.data.results
  if (cards.length > 0) {
    const first = cards[0]
    const label = 'Blk ' + first.block + ' ' + first.street

    // Are all the cards the same block (its flat types), and was its block number typed?
    let oneBlock = true
    for (const card of cards) {
      if ('Blk ' + card.block + ' ' + card.street !== label) {
        oneBlock = false
      }
    }
    if (oneBlock && text.toUpperCase().includes(first.block.toUpperCase() + ' ')) {
      return { name: label, lat: first.lat, lng: first.lng }
    }
  }

  const placeResponse = await axios.get(`${BASE_URL}/api/blocks/place`, { params: { q: text } })
  return placeResponse.data
}

// One of our blocks that the filters hide: a grey dot the size of a block dot, with a dashed dark ring
// (so it does not look like the light grey "no score" dots when coloured by Your Priorities), and its usual popup plus why it is
// not shown. Used by the address search and by "Show on map" (e.g. a shortlisted flat that does not fit the filters).
// It is kept in searchMarker, so the next search removes it.
function showHiddenBlock(hiddenBlock) {
  if (searchMarker !== null) {
    map.removeLayer(searchMarker)
  }
  searchMarker = L.circleMarker([hiddenBlock.lat, hiddenBlock.lng], {
    radius: 7,
    color: '#444',
    weight: 2,
    dashArray: '3 3',
    fillColor: '#9e9e9e',
    fillOpacity: 1,
  })
    .bindPopup(
      popupText(hiddenBlock) +
        '<br><span class="text-danger">Does not fit your current filters, so it is not on the map.</span>' +
        '<br><span class="small text-muted">Press "Clear all" under Filters to see it.</span>',
    )
    .addTo(map)
  map.setView([hiddenBlock.lat, hiddenBlock.lng], 17) // 17 = street level, like a found block
  searchMarker.openPopup()
}

// "Show on map" for a block that does not fit the filters: get that one card from our server (GET /api/blocks/<id>)
// and show it as the grey dot
async function showRequestedHiddenBlock(blockId) {
  try {
    const response = await axios.get(`${BASE_URL}/api/blocks/${blockId}`)
    const card = response.data
    const label = 'Blk ' + card.block + ' ' + card.street
    showHiddenBlock({ label: label, lat: card.lat, lng: card.lng, cards: [card] })
  } catch (error) {
    // e.g. the block was removed when the data was seeded again
    errorMessage.value = 'That block could not be found'
  }
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

// PHG search (the parents' postal code from the Filters card): find where the parents live (any address or postal code),
// draw a marker and the 4 km circle there, then reload the dots so only the blocks inside are shown
async function searchParent(text) {
  errorMessage.value = ''
  if (text.trim() === '') {
    errorMessage.value = 'Type your parents\' address or postal code'
    return
  }

  try {
    parentPlace.value = await findPlaceFor(text)
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

  // awaited, so the page opening can zoom to the profile's town once these blocks are in
  await loadBlocks()
}

// The match score text for the Selected block card: "62/100 · Good" when the dots are coloured by Your Priorities, '' otherwise (not shown)
function selectedMatchText() {
  if (colourBy.value === 'match') {
    return scoreText(selectedPlace.value)
  }
  return ''
}

// New presets were saved in the popup while the map is open: redraw with them (PHG circle or not), then zoom to the town
watch(
  function () {
    return auth.presetsVersion
  },
  async function () {
    // Your Priorities may have changed in the form too: start from the saved ones again
    preferences.value = loadSavedPreferences()
    // Like Search: the new town becomes the search (so both pages show that town)
    if (auth.profile !== null && auth.profile.town) {
      filterStore.setFilter('q', auth.profile.town)
      showAllFlats.value = false
    }
    await applyFilters()
    zoomToProfileTown()
  },
)

// The town chosen on the profile page: zoom the map to that town's blocks (the blocks themselves are not filtered).
// Does nothing when no town was chosen, or no block of that town fits the filters.
function zoomToProfileTown() {
  if (auth.profile === null || !auth.profile.town) {
    return
  }
  const spots = []
  for (const place of shownPlaces) {
    // Every card of a place has the same town, so the first one is enough
    if (place.cards[0].town === auth.profile.town) {
      spots.push([place.lat, place.lng])
    }
  }
  if (spots.length > 0) {
    // Zoom in at least to TOWN_ZOOM, so the town's own dots show (not just its town bubble)
    map.fitBounds(spots, { padding: [30, 30], animate: false })
    if (map.getZoom() < TOWN_ZOOM) {
      map.setView(map.getCenter(), TOWN_ZOOM)
    }
  }
}

// When the page opens: make the map inside <div id="mapBox"> (centred on Singapore), then add the blocks
onMounted(async function () {
  map = L.map('mapBox').setView([1.36, 103.84], 12)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map)

  // A layer group is a "bag" of map things: the block dots go in it, so they can all be removed at once
  blockLayer = L.layerGroup().addTo(map)

  // A second bag for the amenity dots, so ticking / unticking only clears and redraws those
  amenityLayer = L.layerGroup().addTo(map)

  // Leaflet's zoomend event: after every zoom in / out, redraw as dots or town bubbles (see drawBlocks)
  map.on('zoomend', drawBlocks)

  // Coming from Search's "Show on map" button, the map zooms to that block instead of the profile's town
  const comingFromSearch = mapFocus.blockId !== null

  // Load the blocks once: with the PHG circle if the switch is on and the parents' postal code is known
  // (searchParent draws the circle, then loads the blocks inside it), otherwise every block that fits the filters
  await applyFilters()

  // The map opens on the whole island (the setView above). A search left over from the Search page does not zoom it in
  // (the strip above the map says "Showing your search ..." with a "Show all of Singapore" button); the map zooms in
  // to a search only when it is searched here (searchFromMap) or from a flat's "Show on map" button.
  // The one thing that zooms on opening is the town in the saved presets, as its form says ("The map opens zoomed in
  // on this town"). If none of its blocks are shown (e.g. a different search, or outside the PHG circle), the map stays as it is.
  if (!comingFromSearch) {
    zoomToProfileTown()
  }
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
    <h1 class="page-title serif">See it on <em>the map</em></h1>
    <!-- Phones and tablets: two short instructions instead of the long sentence -->
    <p class="page-sub d-lg-none">Tap a town bubble to zoom in. Tap a block to see its prices.</p>
    <p class="page-sub d-none d-lg-block">
      <!-- Says which dots are shown ("Show") and what their colours mean ("Colour dots by"), both on the right -->
      Each dot is a block
      <span v-if="showWhich === 'shortlist'">from your shortlist (your filters are not used here)</span>
      <span v-else-if="parentPlace !== null">within 4 km of your parents (PHG) that fits your filters</span>
      <span v-else-if="filterStore.filters.q !== '' && !showAllFlats">from your search that fits your filters</span>
      <span v-else>that fits your filters</span>,
      <span v-if="colourBy === 'match'">coloured by its priority score (from Your Priorities).</span>
      <span v-else>coloured by the median price of its cheapest flat type.</span>
      Click a dot to see every flat type there.
      <span v-if="showWhich === 'all' && parentPlace === null">Zoomed out, the blocks are grouped into one bubble per town: click a bubble to zoom in.</span>
    </p>

    <div v-if="errorMessage" class="alert alert-danger">{{ errorMessage }}</div>

    <!-- Bootstrap grid: the map takes 8 of 12 columns on laptops and 9 of 12 on big screens, the sidebar the rest.
         On phones and tablets (below lg) the sidebar goes under the map. -->
    <div class="row g-4 map-row">
      <div class="col-lg-8 col-xl-9 map-col">
        <!-- Address search: move the map to any address or postal code (looked up by OneMap) -->
        <MapSearchBar class="m-search" :searched="filterStore.filters.q" @search="searchFromMap" />

        <!-- What the dots show and how they are coloured: right under the search, so it is easy to see and change -->
        <MapToolbar
          class="m-toolbar"
          :show-which="showWhich"
          :colour-by="colourBy"
          :logged-in="auth.isLoggedIn"
          :shortlist-count="shortlist.count"
          :shown-flats="flatCount"
          :shown-blocks="blockCount"
          @change-show-which="changeShowWhich"
          @change-colour-by="changeColourBy"
        />

        <!-- The search from the Search page: the map shows the same flats. One click to see the whole island again. -->
        <div v-if="showWhich === 'all' && filterStore.filters.q !== ''" class="search-strip m-strip small mb-2">
          <span v-if="showAllFlats">
            Showing all of Singapore. Press <strong>Search</strong> to show your search
            <strong>"{{ filterStore.filters.q }}"</strong> again.
          </span>
          <template v-else>
            <span>
              Showing your search <strong>"{{ filterStore.filters.q }}"</strong>
              <span v-if="searchNearName !== ''"> (flats within 1 km of {{ searchNearName }})</span>:
              {{ blockCount }} block(s).
            </span>
            <button type="button" class="btn btn-sm btn-outline-secondary" @click="showAllOfSingapore">
              Show all of Singapore
            </button>
          </template>
        </div>

        <!-- position: relative, so the colour key can float in the map's bottom-left corner; overflow-hidden: on phones, the part of the key slid off to the left is not shown -->
        <div class="position-relative overflow-hidden m-map">
          <div id="mapBox" class="map-box"></div>
          <MapKey :colour-by="colourBy" :price-bands="priceBands" :no-score-colour="NO_SCORE_COLOUR" />
        </div>
      </div>

      <div class="col-lg-4 col-xl-3 map-col">
        <div class="map-sidebar">
          <!-- Selected block: appears when a dot is clicked -->
          <SelectedBlockCard
            class="m-selected"
            v-if="selectedPlace !== null"
            :place="selectedPlace"
            :match-text="selectedMatchText()"
            :nearest-amenities="nearestAmenities"
            :amenity-types="amenityTypes"
            @close="closePlace"
            @show-nearest="showNearest"
            @hide-nearest="hideNearest"
          />

          <!-- Your Priorities FIRST, like Search: the dots are coloured by priority score by default, so it should
               not be hidden at the bottom. Same panel as Search (they share the saved choices). Open on a wide screen.
               collapsible: "Hide / Show" sits in its own title row, so it folds down to one line (no extra header box) -->
          <PreferencesPanel
            class="mb-3 m-prio"
            :preferences="preferences"
            on-map
            collapsible
            :start-open="isWideScreen"
            @change-ticked="changeTicked"
            @change-level="changeLevel"
          />

          <!-- Filters: the same panel as Search, near the top so it is easy to find. Closed at the start
               (its title row is in view: one click opens it), so the map options below are not pushed far down -->
          <FilterPanel
            class="m-filters"
            :filters="filterStore.filters"
            :phg-place-name="parentPlace !== null ? parentPlace.name : ''"
            collapsible
            :start-open="false"
            @change-filter="setFilter"
            @search="applyFilters"
            @clear="clearFilters"
          />

          <!-- Show amenities: the tick boxes (Show / Colour dots by are in the bar above the map) -->
          <MapLegend class="m-legend" :amenity-types="amenityTypes" :shown-types="shownTypes" @toggle-amenity="toggleAmenity" />

        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* Phones and tablets (below Bootstrap's lg, 992px): Your Priorities and Filter Results go ABOVE the map
   (closed, one line each), so you change them right above the dots they change. The selected block and
   "Show amenities" stay under the map. Laptops keep the sidebar on the right.
   ⚠️ NOT IN COURSE: display: contents. It makes the two Bootstrap columns (and the sidebar box) "disappear" for
   layout, so their parts become items of ONE flex row, and the Flexbox order property (Week 2) can then put the
   parts of both columns in any order. */
@media (max-width: 991.98px) {
  .map-row {
    margin: 0;
    row-gap: 10px;
  }
  .map-col,
  .map-row .map-sidebar {
    display: contents;
  }
  .m-search,
  .m-toolbar,
  .m-prio,
  .m-filters,
  .m-strip,
  .m-map,
  .m-selected,
  .m-legend {
    flex: 0 0 100%;
    max-width: 100%;
    margin-bottom: 0 !important;
  }
  .m-search { order: 1; }
  .m-toolbar { order: 2; }
  .m-prio { order: 3; }
  .m-filters { order: 4; }
  .m-strip { order: 5; }
  .m-map { order: 6; }
  .m-selected { order: 7; }
  .m-legend { order: 8; }
}

/* The map needs a set height, otherwise it is 0 px tall.
   100vh = the whole height of the browser window, minus room for the search bar, the Show / Colour bar and the "Showing your search" strip above the map,
   so when you scroll down to the map it fills the screen. Never shorter than 450px. */
.map-box {
  height: calc(100vh - 190px);
  min-height: 520px;
  border-radius: 18px;
  overflow: hidden;
  border: 1px solid var(--line);
}

/* "Showing your search ..." above the map: the text and its button side by side, wrapping onto two lines on a phone */
.search-strip {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  background: var(--beige);
  border-radius: 12px;
  padding: 8px 12px;
}

/* Phones and tablets (narrower than Bootstrap's lg, 992px): the map still fills most of the screen (minus the top bar of
   this page, the tab bar at the bottom and the controls above the map), but never taller than 760px on a tall tablet,
   so the cards under it are still easy to reach */
@media (max-width: 991px) {
  .map-box {
    height: calc(100vh - 220px);
    min-height: 380px;
    max-height: 760px;
  }
}

/* Laptops and bigger: the sidebar stays beside the map while you scroll, and scrolls by itself
   when its cards are taller than the window (the same idea as Search's sidebar) */
@media (min-width: 992px) {
  .map-sidebar {
    position: sticky;
    top: 20px;
    max-height: calc(100vh - 40px);
    overflow-y: auto;
  }
}
</style>
