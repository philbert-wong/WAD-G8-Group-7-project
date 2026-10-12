<script setup>
defineProps({
  page: String,
  savedCount: Number,
})
defineEmits(['change-page'])
</script>

<template>
  <nav class="navbar navbar-dark bg-dark">
    <div class="container">
      <span class="navbar-brand">HDB Resale Finder</span>

      <div class="btn-group">
        <button
          class="btn btn-sm"
          :class="page === 'search' ? 'btn-light' : 'btn-outline-light'"
          @click="$emit('change-page', 'search')"
        >
          Search
        </button>
        <button
          class="btn btn-sm"
          :class="page === 'shortlist' ? 'btn-light' : 'btn-outline-light'"
          @click="$emit('change-page', 'shortlist')"
        >
          Shortlist <span class="badge text-bg-warning">{{ savedCount }}</span>
        </button>
      </div>
    </div>
  </nav>
</template>
