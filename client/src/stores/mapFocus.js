// Pinia store (Week 11): which block the Map page should zoom to when it opens, and the Search filters to use.
// Search's "Show on map" button puts the block's id (and Search's filters) here and opens /map;
// the map reads them once and clears them.
// (Before, the id travelled in the URL as /map?block=<id>, and that stayed in the address bar.)
import { ref } from 'vue'
import { defineStore } from 'pinia'

export const useMapFocusStore = defineStore('mapFocus', function () {
  // ---------- state ----------
  const blockId = ref(null) // the block card's id to show on the map, or null = nothing to show
  // The filters the Search results were made with: { q, flatType, maxPrice, minLease },
  // or null = none (e.g. from the Shortlist page), so the map keeps its own filters
  const filters = ref(null)

  // ---------- actions ----------

  // "Show on map" was pressed for this block (searchFilters = Search's filters, or null)
  function showOnMap(id, searchFilters) {
    blockId.value = id
    filters.value = searchFilters
  }

  // The map has shown it: forget it, so it does not happen again
  function clear() {
    blockId.value = null
    filters.value = null
  }

  // You must return every state and action, or pages cannot use them (slide 21)
  return { blockId, filters, showOnMap, clear }
})
