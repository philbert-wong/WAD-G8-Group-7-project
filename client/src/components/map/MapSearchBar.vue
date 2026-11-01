<script setup>
// The address search bar above the map: type an address or postal code, press Go (or Enter).
// It only collects the text; MapView does the search and moves the map (props down, emit up).
import { ref } from 'vue'

defineProps({
  searchedPlace: { type: Object, default: null }, // the place found: { name, lat, lng }, or null
})
const emit = defineEmits(['search', 'clear'])

// What is typed in the box (only this component needs it)
const text = ref('')

// Go button / Enter: send the typed text up to MapView
function onSearch() {
  emit('search', text.value)
}

// Clear button: empty the box, and tell MapView to remove the marker
function onClear() {
  text.value = ''
  emit('clear')
}
</script>

<template>
  <div>
    <div class="input-group mb-2">
      <input
        v-model="text"
        type="text"
        class="form-control"
        placeholder="Search an address or postal code"
        @keyup.enter="onSearch"
      />
      <button type="button" class="btn btn-dark" @click="onSearch">Go</button>
    </div>
    <p v-if="searchedPlace !== null" class="small mb-2">
      Showing: <strong>{{ searchedPlace.name }}</strong>
      <button type="button" class="btn btn-sm btn-outline-secondary ms-2" @click="onClear">Clear</button>
    </p>
  </div>
</template>
