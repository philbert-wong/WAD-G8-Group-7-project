<script setup>
// The presets questions: town to focus on, parents' postal code (for the PHG), the starting filters,
// and Your Priorities (what matters about a flat: schools, MRT, hawker centres, parks).
// Used twice: in the first-visit popup (ProfileModal.vue) and on the profile settings page (ProfileView.vue).
// It only collects the answers and sends them up with emit; the page decides what to do with them.
import { ref } from 'vue'
import axios from 'axios'
import { useFiltersStore } from '../stores/filters'
import PreferencesPanel from './PreferencesPanel.vue'
import { readSavedPriorities } from '../utils/priorities.js'

// Our Express server's address, from one shared place (see config.js; it changes for deployment)
import { BASE_URL } from '../config.js'

const props = defineProps({
  profile: { type: Object, default: null }, // the saved answers to start from, or null
  priorities: { type: Object, default: null }, // Your Priorities to start from, or null = the ones saved on this device
  saving: { type: Boolean, default: false }, // true while the server is saving (disables the button)
  error: { type: String, default: '' }, // a problem from the server, shown under the form
  buttonText: { type: String, default: 'Save' },
  moreOpen: { type: Boolean, default: true }, // show the optional questions open (profile page) or closed (welcome popup)
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

// Your Priorities: the same panel and the same choices as on Search. A copy, so ticking a box here changes nothing
// anywhere until the form is saved.
let startPriorities = readSavedPriorities()
if (props.priorities !== null) {
  startPriorities = props.priorities
}
const choices = ref(JSON.parse(JSON.stringify(startPriorities)))

// The panel says a tick box or a level changed
function onTick(key, ticked) {
  choices.value[key].ticked = ticked
}
function onLevel(key, level) {
  choices.value[key].level = level
}

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
    // Not part of the profile: the page saves it apart (see saveProfile in stores/auth.js)
    priorities: JSON.parse(JSON.stringify(choices.value)),
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
      <label for="profile-flat" class="form-label">Flat type</label>
      <select id="profile-flat" v-model="flatType" class="form-select">
        <option v-for="type in flatTypes" :key="type.value" :value="type.value">{{ type.label }}</option>
      </select>
    </div>

    <div class="row">
      <div class="col-12 mb-3">
        <!-- step 1000: matches the calculator's $1,000 rounding -->
        <label for="profile-budget" class="form-label">Max budget ($)</label>
        <input
          id="profile-budget"
          v-model="maxPrice"
          type="number"
          min="100000"
          step="1000"
          placeholder="Any"
          class="form-control"
        />
        <div class="form-text">Leave empty for no limit.</div>
      </div>
    </div>
    <!-- Everything else is optional: tucked under one clearly named heading (plain HTML <details>), so a first visit
         only asks for the town, flat type and budget. Open by default on the profile page (moreOpen). -->
    <details class="more-prefs mb-3" :open="props.moreOpen">
      <summary>More preferences (optional)</summary>
      <div class="more-body">
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

    <!-- PHG switch: the same one as in the Filters panel (same look). Off = all flats; on = only flats within 4 km of the postal code above. -->
    <div class="mb-3">
      <div class="form-check form-switch phg-switch">
        <input id="profile-phg" v-model="showPhg" class="form-check-input" type="checkbox" role="switch" />
        <label for="profile-phg" class="form-check-label">Only show flats within 4 km of my parents (PHG)</label>
      </div>
      <div class="form-text">Off: flats anywhere. On: only flats near the postal code above. You can also switch it in the Filters.</div>
    </div>

    <div class="mb-3">
      <label for="profile-lease" class="form-label">Minimum years left on the lease</label>
      <input id="profile-lease" v-model="minLease" type="number" min="20" max="99" class="form-control" />
    </div>
    <!-- Your Priorities: what matters about a flat. They rank the flats on Search and colour the dots on the Map.
         This panel gets its own ids, because the Search page has one too. -->
    <div class="mb-3">
      <PreferencesPanel
        :preferences="choices"
        panel-id="presets-priorities"
        id-prefix="presets-matters-"
        @change-ticked="onTick"
        @change-level="onLevel"
      />
    </div>

      </div>
    </details>

    <div v-if="errorMessage" class="alert alert-danger py-2" role="alert">{{ errorMessage }}</div>
    <div v-else-if="props.error" class="alert alert-danger py-2" role="alert">{{ props.error }}</div>

    <button type="submit" class="btn btn-primary w-100" :disabled="props.saving">
      <span v-if="props.saving">Please wait...</span>
      <span v-else>{{ props.buttonText }}</span>
    </button>
  </form>
</template>

<style scoped>
/* "More preferences (optional)": a big, clearly tappable row with an arrow */
.more-prefs {
  border: 1px solid var(--line);
  border-radius: 12px;
  background: #fff;
}
.more-prefs summary {
  min-height: 48px;
  display: flex;
  align-items: center;
  padding: 10px 14px;
  font-weight: 700;
  cursor: pointer;
  list-style: none;
}
.more-prefs summary::-webkit-details-marker {
  display: none;
}
.more-prefs summary::after {
  content: '▾';
  margin-left: auto;
  color: var(--muted);
}
.more-prefs[open] summary::after {
  content: '▴';
}
.more-body {
  padding: 4px 14px 6px;
}
</style>
