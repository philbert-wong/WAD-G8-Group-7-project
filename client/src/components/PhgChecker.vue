<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import { PHG_NEAR_DISTANCE_METRES } from '../utils/affordabilityRules.js'
import { money } from '../utils/affordability.js'

// Our Express server's address, from one shared place (see config.js; it changes for deployment)
import { BASE_URL } from '../config.js'

// The server never sends more than 50 nearby blocks
const NEARBY_LIMIT = 50

// Every block address for the dropdown: [{ label, lat, lng }]
const addresses = ref([])
const parentAddress = ref('')

// The blocks within 4 km, closest first (each has "distance" in metres)
const nearbyBlocks = ref([])
const checked = ref(false)
const loading = ref(false)
const errorMessage = ref('')

// Sorts addresses A to Z for the dropdown
// a "compare function" for list.sort(). sort() calls it with two items at a time:
// a negative number puts a first, a positive number puts b first, 0 leaves them as they are.
function compareByLabel(a, b) {
  if (a.label < b.label) {
    return -1
  } else if (a.label > b.label) {
    return 1
  } else {
    return 0
  }
}

// Gets every block, then keeps one entry per address.
// (The same block appears once per flat type, e.g. "Blk 314" 3 ROOM and 4 ROOM.)
async function loadAddresses() {
  try {
    const response = await axios.get(`${BASE_URL}/api/blocks`)
    const list = []
    const seen = []
    for (const block of response.data.results) {
      const label = 'Blk ' + block.block + ' ' + block.street + ' (' + block.town + ')'
      if (!seen.includes(label)) {
        seen.push(label)
        list.push({ label: label, lat: block.lat, lng: block.lng })
      }
    }
    list.sort(compareByLabel)
    addresses.value = list
  } catch (error) {
    if (error.response && error.response.data && error.response.data.message) {
      errorMessage.value = error.response.data.message
    } else {
      errorMessage.value = error.message
    }
  }
}

// Finds the chosen address in the list (the dropdown only keeps its label)
function findAddress(label) {
  for (const address of addresses.value) {
    if (address.label === label) {
      return address
    }
  }
  return null
}

// "Check PHG" button: ask the server for blocks within 4 km of the parents' block
async function checkPhg() {
  errorMessage.value = ''
  const parent = findAddress(parentAddress.value)
  if (parent === null) {
    errorMessage.value = "Please choose your parents' block first"
    return
  }

  loading.value = true
  try {
    // The parents' location, the 4 km radius and the limit go in the URL after the "?"
    const response = await axios.get(
      `${BASE_URL}/api/blocks/nearby?lat=${parent.lat}&lng=${parent.lng}&radius=${PHG_NEAR_DISTANCE_METRES}&limit=${NEARBY_LIMIT}`,
    )
    nearbyBlocks.value = response.data.results
    checked.value = true
  } catch (error) {
    if (error.response && error.response.data && error.response.data.message) {
      errorMessage.value = error.response.data.message
    } else {
      errorMessage.value = error.message
    }
  }
  loading.value = false
}

// Distance for the table: 850 -> "850 m", 2300 -> "2.3 km"
function formatDistance(metres) {
  if (metres < 1000) {
    return metres + ' m'
  }
  return (metres / 1000).toFixed(1) + ' km'
}

// Fill the dropdown when the component appears on the page 
onMounted(loadAddresses)
</script>

<template>
  <div class="card shadow-sm">
    <div class="card-body">
      <h5 class="card-title">Proximity Housing Grant: which blocks qualify?</h5>
      <p class="small text-muted">
        Living within {{ PHG_NEAR_DISTANCE_METRES / 1000 }} km of your parents (or child) can get you the PHG.
        Choose their block to see which blocks in our data qualify.
      </p>

      <form class="row g-2 align-items-end" @submit.prevent="checkPhg">
        <div class="col-12 col-md-8">
          <label for="phg-parent" class="form-label small mb-1">Parents' / child's block</label>
          <select id="phg-parent" v-model="parentAddress" class="form-select">
            <option value="">Choose a block...</option>
            <option v-for="address in addresses" :key="address.label" :value="address.label">
              {{ address.label }}
            </option>
          </select>
        </div>
        <div class="col-12 col-md-4">
          <button type="submit" class="btn btn-outline-primary w-100">Check PHG</button>
        </div>
      </form>
      <p class="small text-muted mt-1 mb-0">
        Only blocks in our data are listed. If your parents live elsewhere, this check cannot help yet.
      </p>

      <div v-if="errorMessage" class="alert alert-danger mt-3 mb-0">{{ errorMessage }}</div>
      <p v-else-if="loading" class="text-muted mt-3 mb-0">Loading...</p>

      <div v-else-if="checked" class="mt-3">
        <p class="mb-2">
          <strong>{{ nearbyBlocks.length }}</strong> flat(s) within {{ PHG_NEAR_DISTANCE_METRES / 1000 }} km qualify for "live near".
          <span v-if="nearbyBlocks.length === NEARBY_LIMIT" class="text-muted small">(showing the closest {{ NEARBY_LIMIT }} only)</span>
        </p>

        <div class="table-responsive">
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
              <tr v-for="block in nearbyBlocks" :key="block.id">
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
      </div>
    </div>
  </div>
</template>
