// Pinia store (Week 11): which block the Map page should zoom to when it opens.
// Search's "Show on map" button puts the block's id here and opens /map; the map reads it once and clears it.
// (Before, the id travelled in the URL as /map?block=<id>, and that stayed in the address bar.)
import { ref } from 'vue'
import { defineStore } from 'pinia'

export const useMapFocusStore = defineStore('mapFocus', function () {
  // ---------- state ----------
  const blockId = ref(null) // the block card's id to show on the map, or null = nothing to show

  // ---------- actions ----------

  // "Show on map" was pressed for this block
  function showOnMap(id) {
    blockId.value = id
  }

  // The map has shown it: forget it, so it does not happen again
  function clear() {
    blockId.value = null
  }

  // You must return every state and action, or pages cannot use them (slide 21)
  return { blockId, showOnMap, clear }
})
