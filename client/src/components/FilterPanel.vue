<script setup>
// The three filters: flat type, budget and remaining lease.
// (Closeness to MRT is handled by the "What matters to you?" panel instead.)
// The page (SearchView) owns the filter values and passes them in as a prop.
// When the user changes a box, we send the change up with emit.
// The "Not sure? Calculate my budget" link under the budget slider opens the Affordability page.
import { ref } from 'vue'
import { RouterLink } from 'vue-router'

const props = defineProps({
  filters: Object, // { flatType, maxPrice, minLease, phg, parentsPostal, ... }
  // The place found for the parents' postal code, e.g. "BLK 314 ANG MO KIO AVENUE 3" ('' = not found yet),
  // so the user can check it is the right one
  phgPlaceName: { type: String, default: '' },
  // The Map makes the card foldable: "Hide ▴ / Show ▾" next to the title folds it down to just the title row
  // (Search leaves it always open)
  collapsible: { type: Boolean, default: false },
  startOpen: { type: Boolean, default: true }, // open or closed at the start, when collapsible
})
const emit = defineEmits(['change-filter', 'search', 'clear'])

// Open or folded (only used when collapsible). Only this card needs it, so it lives here.
const open = ref(props.startOpen)

// '' = any flat type
const flatTypes = [
  { value: '', label: 'Any' },
  { value: '2 ROOM', label: '2-Rm' },
  { value: '3 ROOM', label: '3-Rm' },
  { value: '4 ROOM', label: '4-Rm' },
  { value: '5 ROOM', label: '5-Rm' },
  { value: 'EXECUTIVE', label: 'Exec' },
]

// A slider moved: send which filter it was and its new value
function onChange(name, event) {
  emit('change-filter', name, event.target.value)
}

// Budget slider: $300k to $1.2M in $10k steps, then ONE more step at the very end = "Any" (no budget limit).
// Above $1.2M money is rarely what rules a flat out, and this way no expensive block is ever hidden.
// "Any" is sent as '' (empty), which the server already treats as "no maxPrice filter".
const ANY_BUDGET_STEP = 1210000 // the slider position just after $1.2M

// Where the slider knob sits: at the very end when the budget is "Any" ('')
function budgetSliderValue() {
  if (props.filters.maxPrice === '') {
    return ANY_BUDGET_STEP
  }
  return props.filters.maxPrice
}

// The budget slider moved: the last position means "Any" (''), every other position is that amount
function onBudgetChange(event) {
  if (Number(event.target.value) === ANY_BUDGET_STEP) {
    emit('change-filter', 'maxPrice', '')
  } else {
    emit('change-filter', 'maxPrice', event.target.value)
  }
}

// A flat type chip was clicked: set it and search straight away.
function chooseFlatType(value) {
  emit('change-filter', 'flatType', value)
  emit('search')
}

// The PHG switch was flipped: send true / false up, and apply it straight away (like the flat type chips)
function onPhgChange(event) {
  emit('change-filter', 'phg', event.target.checked)
  emit('search')
}

// The "Apply filters" button
function onSubmit() {
  emit('search')
}

// The "Clear all" link
function onClear() {
  emit('clear')
}
</script>

<template>
  <form id="filters-panel" class="filters" :class="{ folded: collapsible && !open }" @submit.prevent="onSubmit">
    <!-- Title row; on the Map also the Hide / Show button -->
    <div class="d-flex justify-content-between align-items-center">
      <h4 class="serif">Filter Results</h4>
      <button v-if="collapsible" type="button" class="fold-toggle" :aria-expanded="open" @click="open = !open">
        {{ open ? 'Hide ▴' : 'Show ▾' }}
      </button>
    </div>

    <!-- Everything under the title: folded away on the Map when closed -->
    <div v-show="!collapsible || open">
    <div class="hint">Only flats that fit these are shown, on both Search and the Map.</div>

    <!-- Flat type chips -->
    <label class="flab">Flat type</label>
    <div class="chips">
      <button
        v-for="type in flatTypes"
        :key="type.value"
        type="button"
        class="chip"
        :class="{ on: props.filters.flatType === type.value }"
        @click="chooseFlatType(type.value)"
      >
        {{ type.label }}
      </button>
    </div>

    <!-- Budget slider: $300k to $1.2M, and "Any" at the very end (see ANY_BUDGET_STEP above) -->
    <label for="filter-budget" class="flab d-flex justify-content-between align-items-end">
      Max budget
      <span v-if="props.filters.maxPrice === ''" class="big-val serif">Any</span>
      <span v-else class="big-val serif">{{ '$' + Number(props.filters.maxPrice).toLocaleString('en-SG') }}</span>
    </label>
    <input
      id="filter-budget"
      :value="budgetSliderValue()"
      type="range"
      min="300000"
      :max="ANY_BUDGET_STEP"
      step="10000"
      class="form-range"
      @input="onBudgetChange"
    />
    <RouterLink to="/CPFCal" class="calc-link">Not sure? Calculate my budget →</RouterLink>

    <!-- Lease slider -->
    <label for="filter-lease" class="flab d-flex justify-content-between align-items-end">
      Min remaining lease <span class="big-val serif">{{ props.filters.minLease }} yrs</span>
    </label>
    <input
      id="filter-lease"
      :value="props.filters.minLease"
      type="range"
      min="20"
      max="99"
      step="1"
      class="form-range"
      @input="onChange('minLease', $event)"
    />

    <!-- PHG (Proximity Housing Grant): the parents' postal code, then the switch that uses it. On both Search and the Map.
         On = only flats within 4 km of the parents. Enter in the box (or Apply Filters) uses a new postal code. -->
    <div class="phg-row">
      <!-- Short placeholder so it fits the narrow sidebar; the label says what the box is for -->
      <label for="filter-parents" class="flab parents-label">Parents' postal code</label>
      <input
        id="filter-parents"
        :value="props.filters.parentsPostal"
        type="text"
        inputmode="numeric"
        class="form-control cosy-input mb-2"
        placeholder="e.g. 560314"
        @input="onChange('parentsPostal', $event)"
      />
      <div class="form-check form-switch phg-switch">
        <input
          id="filter-phg"
          class="form-check-input"
          type="checkbox"
          role="switch"
          :checked="props.filters.phg"
          @change="onPhgChange"
        />
        <label for="filter-phg" class="form-check-label">Only show flats within 4 km of my parents</label>
      </div>
      <!-- Off: why it matters. On: what it is using (or what is missing) -->
      <div v-if="!props.filters.phg" class="hint">Living this close can get you the Proximity Housing Grant (PHG).</div>
      <div v-else-if="props.filters.parentsPostal.trim() === ''" class="hint">
        Type your parents' postal code above, then press Enter.
      </div>
      <div v-else-if="props.phgPlaceName !== ''" class="hint">
        Only flats within 4 km of <strong>{{ props.phgPlaceName }}</strong>.
      </div>
      <div v-else class="hint">Only flats within 4 km of {{ props.filters.parentsPostal }}.</div>
    </div>

    <button type="submit" class="apply">Apply Filters</button>
    <button type="button" class="clear" @click="onClear">Clear all</button>
    </div>
  </form>
</template>

<style scoped>
/* Sidebar card with a thick terracotta top border */
.filters {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 18px;
  padding: 22px;
  margin-bottom: 18px;
}
/* Shadow under the sidebar */
.filters {
  box-shadow: 0 14px 34px -20px rgba(80, 50, 30, 0.25);
}
.filters h4 {
  font-size: 26px;
  margin: 0;
}
.hint {
  color: var(--muted);
  font-size: 13px;
  margin-bottom: 8px;
}
.flab {
  font-size: 13px;
  font-weight: 600;
  margin: 16px 0 6px;
  display: block;
}
.big-val {
  font-size: 19px;
}

/* The PHG switch row, under the lease slider */
.phg-row {
  margin-top: 16px;
}
.phg-row .form-check-label {
  font-size: 13px;
}


/* "Parents' postal code": dark like the other filter labels (not grey); the row already has a gap above */
.parents-label {
  color: var(--char);
  margin-top: 0;
}

/* Chips: a row of equal buttons (Flexbox + flex-wrap); the chosen one is dark */
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.chip {
  flex: 1 1 28%;
  border: 1px solid var(--line);
  background: #fffdf9;
  border-radius: 10px;
  padding: 7px 0;
  font-size: 13px;
  font-weight: 600;
  color: #5c5449;
}
.chip.on {
  background: var(--char);
  color: #fff;
  border-color: var(--char);
}

/* Terracotta slider handle (browser-specific ::-webkit / ::-moz selectors, not taught) */
.form-range::-webkit-slider-thumb {
  background: var(--terra);
}
.form-range::-moz-range-thumb {
  background: var(--terra);
}
/* (kept as two rules: a browser ignores a whole rule if it does not know one of its selectors) */
.form-range::-webkit-slider-runnable-track {
  background: var(--beige);
}
.form-range::-moz-range-track {
  background: var(--beige);
}

/* Small terracotta link to the affordability calculator */
.calc-link {
  display: inline-block;
  font-size: 13px;
  font-weight: 600;
  color: var(--terra);
  margin-top: 2px;
}

/* Full-width "Apply Filters" button and the "Clear all" link-button */
.apply {
  width: 100%;
  background: var(--terra);
  color: #fff;
  border: 0;
  border-radius: 11px;
  padding: 11px;
  font-weight: 600;
  margin-top: 18px;
}
.apply:hover {
  background: var(--terra-d);
}
.clear {
  display: block;
  width: 100%;
  border: 0;
  background: none;
  text-align: center;
  color: var(--muted);
  font-size: 13px;
  margin-top: 10px;
  text-decoration: underline;
}

/* Hide / Show next to the title (only when the page makes the card foldable, e.g. on the Map) */
.fold-toggle {
  border: none;
  background: none;
  padding: 4px 0 4px 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--terra);
  white-space: nowrap;
}
.fold-toggle:hover {
  text-decoration: underline;
}

/* Folded (Map): a thin bar, just the title row with less padding and a smaller title */
.filters.folded {
  padding-top: 10px;
  padding-bottom: 10px;
}
.filters.folded h4 {
  font-size: 19px;
}
</style>
