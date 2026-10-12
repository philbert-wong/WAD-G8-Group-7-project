<script setup>
// The four filters from the proposal: flat type, budget, remaining lease, walk to MRT.
// "filters" is an object owned by the parent; we change its fields directly with v-model.
defineProps({
  filters: Object,
})
defineEmits(['search', 'clear'])

const flatTypes = ['2 ROOM', '3 ROOM', '4 ROOM', '5 ROOM', 'EXECUTIVE']
</script>

<template>
  <form class="row g-2 mb-2" @submit.prevent="$emit('search')">
    <div class="col-6 col-md-3">
      <label class="form-label small mb-1">Flat type</label>
      <select v-model="filters.flatType" class="form-select" @change="$emit('search')">
        <option value="">Any</option>
        <option v-for="type in flatTypes" :key="type" :value="type">{{ type }}</option>
      </select>
    </div>

    <div class="col-6 col-md-3">
      <label class="form-label small mb-1">Max budget ($)</label>
      <input
        v-model="filters.maxPrice"
        type="number"
        min="0"
        step="10000"
        class="form-control"
        placeholder="e.g. 600000"
      />
    </div>

    <div class="col-6 col-md-3">
      <label class="form-label small mb-1">Min remaining lease (years)</label>
      <input
        v-model="filters.minLease"
        type="number"
        min="0"
        max="99"
        class="form-control"
        placeholder="e.g. 60"
      />
    </div>

    <div class="col-6 col-md-3">
      <label class="form-label small mb-1">Max walk to MRT (mins)</label>
      <input
        v-model="filters.maxWalk"
        type="number"
        min="0"
        class="form-control"
        placeholder="e.g. 10"
      />
    </div>

    <!-- pressing Enter in any box searches; this button is for people who prefer clicking -->
    <div class="col-12 d-flex gap-2">
      <button type="submit" class="btn btn-outline-primary btn-sm">Apply filters</button>
      <button type="button" class="btn btn-link btn-sm" @click="$emit('clear')">Clear all</button>
    </div>
  </form>
</template>
