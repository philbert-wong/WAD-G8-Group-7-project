<script setup>
// The search bar above the map: the SAME box as the Search page (SearchBar.vue) with the same town suggestions,
// and the same search (they mirror each other). It starts with the text last searched (on either page);
// Search (or Enter, or a suggestion) sends the text up to MapView, which shares it with Search (props down, emit up).
import { ref, computed, watch, onMounted } from 'vue'
import axios from 'axios'
import SearchBar from '../SearchBar.vue'
import { BASE_URL } from '../../config.js'

const props = defineProps({
  searched: { type: String, default: '' }, // the text last searched, on this page or on Search
})
const emit = defineEmits(['search'])

// What is typed in the box (only this component needs it until a search)
const text = ref(props.searched)
const area = ref([]) // town names, for the suggestions under the box
// Only after the user types (like Search): a text filled in from the last search does not open the list
const showSuggestions = ref(false)

// Town names that contain what is typed (the same as Search's suggestions)
const suggestions = computed(function () {
  const typed = text.value.toUpperCase()
  return area.value.filter(function (town) {
    return town.includes(typed)
  })
})

// The search changed somewhere else (e.g. "Clear all", or new presets): show it in the box too
watch(
  function () {
    return props.searched
  },
  function (newText) {
    text.value = newText
  },
)

// Each key press: new text, open the suggestions
function setText(newText) {
  text.value = newText
  showSuggestions.value = true
}

// Enter or the Search button: close the suggestions and send the text up to MapView
function onSearch() {
  showSuggestions.value = false
  emit('search', text.value)
}

// A suggested town was clicked: search it
function selectArea(town) {
  text.value = town
  onSearch()
}

// The town names, from the same server address Search uses (if it fails, there are just no suggestions)
onMounted(async function () {
  try {
    const response = await axios.get(`${BASE_URL}/api/blocks/area`)
    area.value = response.data
  } catch (error) {
    area.value = []
  }
})
</script>

<template>
  <!-- position: relative, so the suggestions can float just under the box (see the style below) -->
  <div class="map-search">
    <SearchBar :text="text" @change-text="setText" @search="onSearch" />
    <div v-if="text && showSuggestions && suggestions.length > 0" class="list-group suggestions shadow">
      <button
        v-for="town in suggestions"
        :key="town"
        type="button"
        class="btn btn-light w-100 text-start"
        @click="selectArea(town)"
      >
        {{ town }}
      </button>
    </div>
  </div>
</template>

<style scoped>
/* The suggestions float OVER the map (position: absolute) instead of pushing it down.
   z-index above Leaflet, whose panes and controls go up to 1000. */
.map-search {
  position: relative;
}
.suggestions {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: -12px; /* the box has a 16px gap under it (mb-3): start just under the box */
  z-index: 1100;
  max-height: 260px;
  overflow-y: auto; /* a long list scrolls inside, over the map */
}
</style>
