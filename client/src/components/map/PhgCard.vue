<script setup>
// The Proximity Housing Grant (PHG) card: type your parents' postal code, and MapView draws the circle
// and keeps only the blocks inside it. This component only collects the text and shows the result.
import { ref } from 'vue'

const props = defineProps({
  parentPlace: { type: Object, default: null }, // the parents' place found: { name, lat, lng }, or null
  nearbyCount: { type: Number, default: null }, // blocks inside the circle (null = no circle)
  distanceKm: { type: Number, default: 4 }, // the PHG "live near" distance in km
  initialText: { type: String, default: '' }, // what the box starts with, e.g. the postal code saved on the profile page
})
const emit = defineEmits(['search', 'clear'])

// What is typed in the box (only this component needs it)
const text = ref(props.initialText)

// Search button / Enter: send the typed text up to MapView
function onSearch() {
  emit('search', text.value)
}

// Clear button: empty the box, and tell MapView to remove the circle
function onClear() {
  text.value = ''
  emit('clear')
}
</script>

<template>
  <div class="cosy-card cosy-shadow">
    <h5 class="serif">Proximity Grant (PHG) layer</h5>
    <p class="small text-muted">
      Type your parents' postal code (or home address) to draw the {{ distanceKm }} km circle.
      Only the blocks inside it are shown (together with your filters): they can get the "live near" grant.
    </p>

    <!-- Search box: any address or postal code (looked up by OneMap) -->
    <div class="d-flex gap-2">
      <input
        v-model="text"
        type="text"
        class="form-control cosy-input"
        placeholder="e.g. 560314"
        @keyup.enter="onSearch"
      />
      <button type="button" class="btn btn-dark" @click="onSearch">Search</button>
    </div>

    <!-- The place OneMap found, so you can check it is the right one -->
    <p v-if="parentPlace !== null" class="small mt-2 mb-0">
      Using: <strong>{{ parentPlace.name }}</strong>
      <button type="button" class="btn btn-sm btn-outline-secondary ms-2" @click="onClear">Clear</button>
    </p>

    <p v-if="nearbyCount !== null" class="mt-2 mb-0">
      <strong>{{ nearbyCount }}</strong> block(s) within {{ distanceKm }} km match your filters
    </p>
  </div>
</template>
