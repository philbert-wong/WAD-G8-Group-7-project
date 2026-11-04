<script setup>
// The "Show amenities" card: tick a type (MRT, hawker, park, school) to show its squares on the map.
// (What the dots show and their colours are in the bar above the map, MapToolbar.vue; the colour key floats on the
// map, MapKey.vue.) MapView owns the choices; this card shows them and sends every change up (props down, emit up).
const props = defineProps({
  amenityTypes: Array, // [{ key, label, one, colour }, ...]
  shownTypes: Array, // the ticked amenity keys, e.g. ['mrt', 'park']
})
const emit = defineEmits(['toggle-amenity'])

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
    <!-- Amenity layers: tick a type to show its squares (the coloured square is its legend) -->
    <h5 class="serif">Show amenities</h5>
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
