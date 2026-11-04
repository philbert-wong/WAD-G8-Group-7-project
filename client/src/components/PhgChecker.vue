<script setup>
// The Proximity Housing Grant (PHG) checker on the calculator page (Step 2): type your parents' (or child's)
// postal code or address, and see which blocks within 4 km qualify for "live near".
// The place is found by the server's OneMap lookup (/api/blocks/place), the same as the PHG box on the Map,
// so any postal code or address in Singapore works. The blocks come from our own data (/api/blocks/nearby).
// The list is shown a page at a time: a table on tablets and computers, a stacked list on phones.
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import axios from 'axios'
import { PHG_NEAR_DISTANCE_METRES } from '../utils/affordabilityRules.js'
import { money } from '../utils/affordability.js'

// Our Express server's address, from one shared place (see config.js; it changes for deployment)
import { BASE_URL } from '../config.js'

// The server never sends more than 50 nearby blocks
const NEARBY_LIMIT = 50

// Phones show the stacked list (see the template), which is tall: fewer blocks per page, so it needs less
// scrolling. 768px is the same break as the table / list below (Bootstrap's "md").
const isPhone = ref(window.innerWidth < 768)

// The window was resized (e.g. the DevTools device toolbar): work out the screen size again
function onResize() {
  isPhone.value = window.innerWidth < 768
}
onMounted(function () {
  window.addEventListener('resize', onResize)
})
onUnmounted(function () {
  window.removeEventListener('resize', onResize)
})

// How many blocks to show at a time: 5 on a phone, 10 on a tablet or computer
const pageSize = computed(function () {
  if (isPhone.value) {
    return 5
  }
  return 10
})

// What the user typed (a postal code or an address), and the place the server found for it: { name, lat, lng }
const parentText = ref('')
const parentPlace = ref(null)

// The blocks within 4 km, closest first (each has "distance" in metres)
const nearbyBlocks = ref([])
const checked = ref(false)
const loading = ref(false)
const errorMessage = ref('')

// Which page of the list is showing (1 = the closest blocks)
const page = ref(1)

// How many pages the list needs (at least 1)
const totalPages = computed(function () {
  return Math.max(1, Math.ceil(nearbyBlocks.value.length / pageSize.value))
})

// The blocks on the current page
const visibleBlocks = computed(function () {
  const start = (page.value - 1) * pageSize.value
  return nearbyBlocks.value.slice(start, start + pageSize.value)
})

// A bigger window means fewer pages: if we were past the new last page, go to the last one
watch(totalPages, function () {
  if (page.value > totalPages.value) {
    page.value = totalPages.value
  }
})

function goToPage(number) {
  if (number < 1 || number > totalPages.value) {
    return
  }
  page.value = number
}

// Counts the checks. A slow answer to an earlier check must not replace the answer to a newer one
// (the same "latest request wins" rule as on the Search page).
let latestCheck = 0

// "Check PHG" button (or Enter): find the parents' place, then the blocks within 4 km of it
async function checkPhg() {
  errorMessage.value = ''
  const typed = parentText.value.trim()
  if (typed === '') {
    errorMessage.value = "Please type your parents' postal code or address first"
    return
  }

  latestCheck = latestCheck + 1
  const thisCheck = latestCheck
  loading.value = true
  try {
    const placeResponse = await axios.get(`${BASE_URL}/api/blocks/place`, { params: { q: typed } })
    const place = placeResponse.data

    // The parents' location, the 4 km radius and the limit go in the URL after the "?"
    const response = await axios.get(`${BASE_URL}/api/blocks/nearby`, {
      params: { lat: place.lat, lng: place.lng, radius: PHG_NEAR_DISTANCE_METRES, limit: NEARBY_LIMIT },
    })

    if (thisCheck !== latestCheck) {
      return // a newer check has been started: this answer is out of date
    }
    parentPlace.value = place
    nearbyBlocks.value = response.data.results
    page.value = 1
    checked.value = true
  } catch (error) {
    if (thisCheck !== latestCheck) {
      return
    }
    checked.value = false
    if (error.response && error.response.status === 404) {
      // The server could not find the place
      errorMessage.value = 'We could not find "' + typed + '". Try a 6-digit postal code, or a block address.'
    } else if (error.response && error.response.status >= 500) {
      // The address lookup (OneMap) is not working right now: say what still works
      errorMessage.value =
        'We could not check this address right now. Please try again later, or try another postal code. ' +
        'You can still go on: your grant estimate above does not depend on this check.'
    } else if (error.response && error.response.data && error.response.data.message) {
      errorMessage.value = error.response.data.message
    } else {
      errorMessage.value = error.message
    }
  }
  if (thisCheck === latestCheck) {
    loading.value = false
  }
}

// Distance for the list: 850 -> "850 m", 2300 -> "2.3 km"
function formatDistance(metres) {
  if (metres < 1000) {
    return metres + ' m'
  }
  return (metres / 1000).toFixed(1) + ' km'
}
</script>

<template>
  <div class="card shadow-sm">
    <div class="card-body">
      <h5 class="card-title">Proximity Housing Grant: which blocks qualify?</h5>
      <p class="small text-muted">
        Living within {{ PHG_NEAR_DISTANCE_METRES / 1000 }} km of your parents (or child) can get you the PHG.
        Type their postal code or address to see which blocks in our data qualify.
      </p>

      <form class="row g-2 align-items-end" @submit.prevent="checkPhg">
        <div class="col-12 col-md-8">
          <label for="phg-parent" class="form-label small mb-1">Parents' / child's postal code or address</label>
          <input
            id="phg-parent"
            v-model="parentText"
            type="text"
            class="form-control"
            placeholder="e.g. 560314 or Blk 314 Ang Mo Kio Ave 3"
          />
        </div>
        <div class="col-12 col-md-4">
          <button type="submit" class="btn btn-outline-primary w-100" :disabled="loading">Check PHG</button>
        </div>
      </form>

      <div v-if="errorMessage" class="alert alert-danger mt-3 mb-0" role="alert">{{ errorMessage }}</div>
      <p v-else-if="loading" class="text-muted mt-3 mb-0">Loading...</p>

      <div v-else-if="checked" class="mt-3">
        <!-- The place the server found, so the user can check it is the right one -->
        <p class="small text-muted mb-2">
          Using: <strong>{{ parentPlace.name }}</strong>
        </p>
        <p class="mb-2">
          <strong>{{ nearbyBlocks.length }}</strong> flat(s) within {{ PHG_NEAR_DISTANCE_METRES / 1000 }} km qualify for "live near".
          <span v-if="nearbyBlocks.length === NEARBY_LIMIT" class="text-muted small">(showing the closest {{ NEARBY_LIMIT }} only)</span>
        </p>

        <!-- Tablets and computers: a table -->
        <div class="table-responsive d-none d-md-block">
          <table class="table table-sm align-middle">
            <thead>
              <tr>
                <th>Block</th>
                <th>Flat type</th>
                <th class="text-end">Median price</th>
                <th class="text-end">Distance</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="block in visibleBlocks" :key="block.id">
                <td>
                  Blk {{ block.block }} {{ block.street }}
                  <div class="small text-muted">{{ block.town }}</div>
                </td>
                <td>{{ block.flatType }}</td>
                <td class="text-end">{{ money(block.price) }}</td>
                <td class="text-end">{{ formatDistance(block.distance) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Phones: the same blocks as a stacked list (a 4-column table is too wide) -->
        <ul class="list-group d-md-none">
          <li v-for="block in visibleBlocks" :key="block.id" class="list-group-item d-flex justify-content-between gap-3">
            <div>
              Blk {{ block.block }} {{ block.street }}
              <div class="small text-muted">{{ block.town }} · {{ block.flatType }}</div>
            </div>
            <div class="text-end text-nowrap">
              {{ money(block.price) }}
              <div class="small text-muted">{{ formatDistance(block.distance) }}</div>
            </div>
          </li>
        </ul>

        <!-- Pages: only when there is more than one -->
        <nav v-if="totalPages > 1" class="d-flex justify-content-center align-items-center gap-2 mt-3">
          <button type="button" class="btn btn-outline-secondary btn-sm" :disabled="page === 1" @click="goToPage(page - 1)">
            ← Previous page
          </button>
          <span class="small text-muted">Page {{ page }} of {{ totalPages }}</span>
          <button
            type="button"
            class="btn btn-outline-secondary btn-sm"
            :disabled="page === totalPages"
            @click="goToPage(page + 1)"
          >
            Next page →
          </button>
        </nav>
      </div>
    </div>
  </div>
</template>
