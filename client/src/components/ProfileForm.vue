<script setup>
// The profile questions: town to focus on, parents' postal code (for the PHG), and the starting filters.
// Used twice: in the sign-up popup (ProfileModal.vue) and on the profile settings page (ProfileView.vue).
// It only collects the answers and sends them up with emit; the page decides what to do with them.
import { ref } from 'vue'
import axios from 'axios'
import { useFiltersStore } from '../stores/filters'

// Our Express server's address, from one shared place (see config.js; it changes for deployment)
import { BASE_URL } from '../config.js'

const props = defineProps({
  profile: { type: Object, default: null }, // the saved answers to start from, or null
  saving: { type: Boolean, default: false }, // true while the server is saving (disables the button)
  error: { type: String, default: '' }, // a problem from the server, shown under the form
  buttonText: { type: String, default: 'Save' },
})
const emit = defineEmits(['save'])

const filterStore = useFiltersStore()

// '' = any flat type (same list as the Filters panel)
const flatTypes = [
  { value: '', label: 'Any' },
  { value: '2 ROOM', label: '2-Room' },
  { value: '3 ROOM', label: '3-Room' },
  { value: '4 ROOM', label: '4-Room' },
  { value: '5 ROOM', label: '5-Room' },
  { value: 'EXECUTIVE', label: 'Executive' },
]

// Where the boxes start: the saved answers, or (nothing saved yet, or "Skip for now") the current filters
let start = {
  town: '',
  parentsPostal: '',
  flatType: filterStore.filters.flatType,
  maxPrice: filterStore.filters.maxPrice,
  minLease: filterStore.filters.minLease,
  showPhg: filterStore.filters.phg,
}
if (props.profile !== null && !props.profile.skipped) {
  start = props.profile
}

// What is typed in the form (v-model keeps these in sync with the boxes)
const town = ref(start.town)
const parentsPostal = ref(start.parentsPostal)
const flatType = ref(start.flatType)
const maxPrice = ref(start.maxPrice)
const minLease = ref(start.minLease)
// The "Near parents (PHG)" switch: off unless it was switched on
const showPhg = ref(start.showPhg === true)

// Town names for the dropdown, from the same server address Search uses for its suggestions
const towns = ref([])
const errorMessage = ref('')

async function loadTowns() {
  try {
    const response = await axios.get(`${BASE_URL}/api/blocks/area`)
    towns.value = response.data.slice().sort()
  } catch (e) {
    // The form still works without the list; the town just stays "No preference"
  }
}

// Checks the form before we send it. Returns an error message, or '' when it is fine.
// (The server checks too; this just gives a quicker answer.)
function checkForm() {
  const postal = String(parentsPostal.value).trim()
  if (postal !== '' && !/^[0-9]{6}$/.test(postal)) {
    return "The postal code must be 6 digits, e.g. 560314"
  }
  return ''
}

// "Save" button: send the answers up as text (the Filters panel keeps its values as text too)
function onSubmit() {
  errorMessage.value = checkForm()
  if (errorMessage.value !== '') {
    return
  }
  emit('save', {
    town: town.value,
    parentsPostal: String(parentsPostal.value).trim(),
    flatType: flatType.value,
    maxPrice: String(maxPrice.value),
    minLease: String(minLease.value),
    showPhg: showPhg.value,
  })
}

// Fill the town dropdown as soon as this component is created
loadTowns()
</script>

<template>
  <form @submit.prevent="onSubmit">
    <div class="mb-3">
      <label for="profile-town" class="form-label">Town you want to focus on</label>
      <select id="profile-town" v-model="town" class="form-select">
        <option value="">No preference</option>
        <option v-for="name in towns" :key="name" :value="name">{{ name }}</option>
      </select>
      <div class="form-text">The map opens zoomed in on this town.</div>
    </div>

    <div class="mb-3">
      <label for="profile-parents" class="form-label">Parents' postal code</label>
      <input
        id="profile-parents"
        v-model="parentsPostal"
        type="text"
        inputmode="numeric"
        maxlength="6"
        placeholder="e.g. 560314"
        class="form-control"
      />
      <div class="form-text">
        Optional. For the Proximity Housing Grant: flats within 4 km of your parents. It is filled in for you on the map.
      </div>
    </div>

    <div class="form-check form-switch mb-3">
      <input id="profile-phg" v-model="showPhg" class="form-check-input" type="checkbox" role="switch" />
      <label for="profile-phg" class="form-check-label">Only show flats near my parents (PHG) on the map</label>
    </div>

    <div class="mb-3">
      <label for="profile-flat" class="form-label">Flat type</label>
      <select id="profile-flat" v-model="flatType" class="form-select">
        <option v-for="type in flatTypes" :key="type.value" :value="type.value">{{ type.label }}</option>
      </select>
    </div>

    <div class="row">
      <div class="col-7 mb-3">
        <label for="profile-budget" class="form-label">Max budget ($)</label>
        <input
          id="profile-budget"
          v-model="maxPrice"
          type="number"
          min="100000"
          step="10000"
          placeholder="Any"
          class="form-control"
        />
        <div class="form-text">Leave empty for no limit.</div>
      </div>
      <div class="col-5 mb-3">
        <label for="profile-lease" class="form-label">Min lease (yrs)</label>
        <input id="profile-lease" v-model="minLease" type="number" min="20" max="99" class="form-control" />
      </div>
    </div>

    <div v-if="errorMessage" class="alert alert-danger py-2">{{ errorMessage }}</div>
    <div v-else-if="props.error" class="alert alert-danger py-2">{{ props.error }}</div>

    <button type="submit" class="btn btn-primary w-100" :disabled="props.saving">
      <span v-if="props.saving">Please wait...</span>
      <span v-else>{{ props.buttonText }}</span>
    </button>
  </form>
</template>
