<script setup>
// The four filters from the proposal: flat type, budget, remaining lease, walk to MRT.
// The page (SearchView) owns the filter values and passes them in as a prop.
// When the user changes a box, we send the change up with emit.
const props = defineProps({
  filters: Object, // { flatType, maxPrice, minLease, maxWalk, ... }
})
const emit = defineEmits(['change-filter', 'search', 'clear'])

const flatTypes = ['2 ROOM', '3 ROOM', '4 ROOM', '5 ROOM', 'EXECUTIVE']

// A box changed: send which filter it was and its new value
function onChange(name, event) {
  emit('change-filter', name, event.target.value)
}

// Choosing a flat type searches straight away
function onFlatTypeChange(event) {
  emit('change-filter', 'flatType', event.target.value)
  emit('search')
}

// Enter in any box, or the "Apply filters" button
function onSubmit() {
  emit('search')
}

// The "Clear all" button
function onClear() {
  emit('clear')
}
</script>

<template>
  <form class="row g-2 mb-2" @submit.prevent="onSubmit">
    <div class="col-6 col-md-3">
      <label class="form-label small mb-1">Flat type</label>
      <select :value="props.filters.flatType" class="form-select" @change="onFlatTypeChange">
        <option value="">Any</option>
        <option v-for="type in flatTypes" :key="type" :value="type">{{ type }}</option>
      </select>
    </div>

    <div class="col-6 col-md-3">
      <label class="form-label small mb-1">Max budget ($)</label>
      <input
        :value="props.filters.maxPrice"
        type="number"
        min="0"
        step="10000"
        class="form-control"
        placeholder="e.g. 600000"
        @input="onChange('maxPrice', $event)"
      />
    </div>

    <div class="col-6 col-md-3">
      <label class="form-label small mb-1">Min remaining lease (years)</label>
      <input
        :value="props.filters.minLease"
        type="number"
        min="0"
        max="99"
        class="form-control"
        placeholder="e.g. 60"
        @input="onChange('minLease', $event)"
      />
    </div>

    <div class="col-6 col-md-3">
      <label class="form-label small mb-1">Max walk to MRT (mins)</label>
      <input
        :value="props.filters.maxWalk"
        type="number"
        min="0"
        class="form-control"
        placeholder="e.g. 10"
        @input="onChange('maxWalk', $event)"
      />
    </div>

    <!-- pressing Enter in any box searches; this button is for people who prefer clicking -->
    <div class="col-12 d-flex gap-2">
      <button type="submit" class="btn btn-outline-primary btn-sm">Apply filters</button>
      <button type="button" class="btn btn-link btn-sm" @click="onClear">Clear all</button>
    </div>
  </form>
</template>
