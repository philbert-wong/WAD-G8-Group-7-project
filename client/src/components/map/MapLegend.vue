<script setup>
// The legend card: "Colour dots by" (price or match), the colour key for that choice,
// and the "Show amenities" tick boxes. MapView owns the choices; this card shows them and
// sends every change up (props down, emit up).
const props = defineProps({
  colourBy: String, // 'price' or 'match'
  priceBands: Array, // [{ max, colour, label }, ...]
  amenityTypes: Array, // [{ key, label, one, colour }, ...]
  shownTypes: Array, // the ticked amenity keys, e.g. ['mrt', 'park']
  noScoreColour: String, // the grey for "no score"
})
const emit = defineEmits(['change-colour-by', 'toggle-amenity'])

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
    <div class="form-check form-check-inline mb-3">
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

    <!-- Price legend -->
    <div v-if="colourBy === 'price'">
      <h5 class="serif">Median price (cheapest flat type)</h5>
      <div v-for="band in priceBands" :key="band.label" class="d-flex align-items-center gap-2 mb-1">
        <span class="dot" :style="{ background: band.colour }"></span>
        {{ band.label }}
      </div>
    </div>

    <!-- Match legend: a smooth gradient from 0 to 100 -->
    <div v-else>
      <h5 class="serif">Priority score (from Your Priorities)</h5>
      <div class="gradient-bar"></div>
      <div class="d-flex justify-content-between small text-muted">
        <span>0</span>
        <span>50</span>
        <span>100</span>
      </div>
      <!-- The same words as the match bar on the flat cards (scoreWord in utils/matchScore.js) -->
      <div class="small text-muted mt-1">Weak 0–24 · Fair 25–49 · Good 50–74 · Excellent 75+</div>
      <div class="d-flex align-items-center gap-2 small mt-2">
        <span class="dot" :style="{ background: noScoreColour }"></span>
        No score (no priorities ticked)
      </div>
      <p class="small text-muted mt-2 mb-0">Uses Your Priorities (below, shared with the Search page).</p>
    </div>

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
/* Round colour dots in the legend */
.dot {
  display: inline-block;
  width: 14px;
  height: 14px;
  border-radius: 50%;
}
/* The match score legend: a rainbow bar red → orange → yellow → green → blue → purple
   (linear-gradient is not in our course; the same colours AND positions as MATCH_STOPS in MapView) */
.gradient-bar {
  height: 12px;
  border-radius: 6px;
  background: linear-gradient(
    to right,
    rgb(230, 57, 70) 0%,
    rgb(247, 140, 40) 12%,
    rgb(250, 215, 60) 25%,
    rgb(76, 175, 80) 45%,
    rgb(33, 102, 172) 70%,
    rgb(123, 50, 148) 100%
  );
  margin-bottom: 4px;
}
/* Small coloured squares in the legend for the amenities (same as their squares on the map) */
.square {
  display: inline-block;
  width: 10px;
  height: 10px;
}
</style>
