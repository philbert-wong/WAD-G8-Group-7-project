<script setup>
// The map options card: "Show" (all flats / my shortlist), "Colour dots by" (price or match) and the
// "Show amenities" tick boxes. (The colour key for the dots floats on the map itself: MapKey.vue.) MapView owns the choices; this card shows them and
// sends every change up (props down, emit up).
const props = defineProps({
  colourBy: String, // 'price' or 'match'
  amenityTypes: Array, // [{ key, label, one, colour }, ...]
  shownTypes: Array, // the ticked amenity keys, e.g. ['mrt', 'park']
  showWhich: String, // 'all' or 'shortlist'
  loggedIn: Boolean, // the shortlist option needs a login
  shortlistCount: Number, // how many flats are saved
  shownFlats: Number, // flats on the map now (in shortlist mode: the saved ones that are shown)
  shownBlocks: Number, // dots on the map now (one block can hold several flat types)
})
const emit = defineEmits(['change-show-which', 'change-colour-by', 'toggle-amenity'])

// An amenity tick box changed: send its key and whether it is now ticked, e.g. ('mrt', true)
function onToggle(key, event) {
  emit('toggle-amenity', key, event.target.checked)
}

// Is this amenity type ticked? (decides whether its box shows a tick)
function isShown(key) {
  return props.shownTypes.includes(key)
}
</script>

<template>
  <div class="cosy-card cosy-shadow mb-3">
    <!-- Show: every block that fits the filters, or only the flats in your shortlist -->
    <div class="small fw-semibold mb-1">Show</div>
    <div class="form-check form-check-inline">
      <input
        id="show-all"
        :checked="showWhich === 'all'"
        type="radio"
        name="show-which"
        class="form-check-input"
        @change="emit('change-show-which', 'all')"
      />
      <label for="show-all" class="form-check-label">All flats</label>
    </div>
    <div class="form-check form-check-inline">
      <input
        id="show-shortlist"
        :checked="showWhich === 'shortlist'"
        :disabled="!loggedIn"
        type="radio"
        name="show-which"
        class="form-check-input"
        @change="emit('change-show-which', 'shortlist')"
      />
      <!-- text-nowrap (Bootstrap): each piece stays whole, so "(log in first)" is on the same line or fully below, never split -->
      <label for="show-shortlist" class="form-check-label">
        <span class="text-nowrap">My shortlist</span>
        <span v-if="loggedIn" class="text-nowrap ms-1">({{ shortlistCount }})</span>
        <span v-else class="text-nowrap text-muted small ms-1">(log in first)</span>
      </label>
    </div>
    <div v-if="showWhich === 'shortlist'" class="small text-muted mt-1">
      <span v-if="shortlistCount === 0">Your shortlist is empty: save flats on the Search page.</span>
      <span v-else>
        Showing {{ shownFlats }} saved flat(s) in {{ shownBlocks }} block(s), even if they do not fit your filters.
        Flats in the same block share one dot: click it to see them all.
      </span>
    </div>
    <div class="mb-3"></div>

    <!-- Colour dots by: price or match (like Search's two sort options) -->
    <div class="small fw-semibold mb-1">Colour dots by</div>
    <div class="form-check form-check-inline">
      <input
        id="colour-price"
        :checked="colourBy === 'price'"
        type="radio"
        name="colour-by"
        class="form-check-input"
        @change="emit('change-colour-by', 'price')"
      />
      <label for="colour-price" class="form-check-label">Cheapest price</label>
    </div>
    <div class="form-check form-check-inline">
      <input
        id="colour-match"
        :checked="colourBy === 'match'"
        type="radio"
        name="colour-by"
        class="form-check-input"
        @change="emit('change-colour-by', 'match')"
      />
      <label for="colour-match" class="form-check-label">Priority score</label>
    </div>

    <!-- The colour key itself floats on the map (MapKey.vue), so it is in view next to the dots -->

    <!-- Amenity layers: tick a type to show its squares (the coloured square is its legend) -->
    <h5 class="serif mt-3">Show amenities</h5>
    <div v-for="type in amenityTypes" :key="type.key" class="form-check">
      <input
        :id="'amenity-' + type.key"
        :checked="isShown(type.key)"
        type="checkbox"
        class="form-check-input"
        @change="onToggle(type.key, $event)"
      />
      <label :for="'amenity-' + type.key" class="form-check-label d-flex align-items-center gap-2">
        <span class="square" :style="{ background: type.colour }"></span>
        {{ type.label }}
      </label>
    </div>
  </div>
</template>

<style scoped>
/* Small coloured squares in the legend for the amenities (same as their squares on the map) */
.square {
  display: inline-block;
  width: 10px;
  height: 10px;
}
</style>
