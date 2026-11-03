<script setup>
// The colour key, floating in the bottom-left corner of the map (MapView puts it there), so what the dot colours
// mean is always in view while looking at the dots. It follows "Colour dots by": the 4 price colours, or the
// priority score gradient. Only shows things (props down, nothing sent up).
defineProps({
  colourBy: String, // 'price' or 'match'
  priceBands: Array, // [{ max, colour, label }, ...]
  noScoreColour: String, // the grey for "no score"
})
</script>

<template>
  <div class="map-key small">
    <!-- Price: one coloured dot per price band -->
    <template v-if="colourBy === 'price'">
      <div class="fw-semibold mb-1">Median price (cheapest flat type)</div>
      <div class="d-flex flex-wrap column-gap-3 row-gap-1">
        <span v-for="band in priceBands" :key="band.label" class="d-inline-flex align-items-center gap-1">
          <span class="dot" :style="{ background: band.colour }"></span>
          {{ band.label }}
        </span>
      </div>
    </template>

    <!-- Priority score: the gradient bar with the same words as the score bar on the cards -->
    <template v-else>
      <div class="fw-semibold mb-1">Priority score (from Your Priorities)</div>
      <div class="gradient-bar"></div>
      <div class="d-flex justify-content-between text-muted">
        <span>Weak</span>
        <span>Fair</span>
        <span>Good</span>
        <span>Excellent</span>
      </div>
      <div class="d-flex align-items-center gap-1 text-muted mt-1">
        <span class="dot" :style="{ background: noScoreColour }"></span>
        No score (no priorities ticked)
      </div>
    </template>
  </div>
</template>

<style scoped>
/* A white, slightly see-through box over the bottom-left corner of the map.
   z-index: above the map's tiles and dots (Leaflet's panes go up to 1000), so it is never hidden under them */
.map-key {
  position: absolute;
  left: 10px;
  bottom: 24px; /* above the map's attribution line */
  z-index: 1000;
  width: 300px;
  max-width: calc(100% - 20px);
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 8px 12px;
  box-shadow: 0 6px 18px -10px rgba(0, 0, 0, 0.35);
  pointer-events: none; /* only shows things: drags and clicks go through to the map */
}
/* Round colour dots, like the dots on the map */
.dot {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}
/* The priority score gradient: the same colours AND positions as MATCH_STOPS in MapView
   (linear-gradient is not in our course) */
.gradient-bar {
  height: 10px;
  border-radius: 5px;
  background: linear-gradient(
    to right,
    rgb(230, 57, 70) 0%,
    rgb(247, 140, 40) 12%,
    rgb(250, 215, 60) 25%,
    rgb(76, 175, 80) 45%,
    rgb(33, 102, 172) 70%,
    rgb(123, 50, 148) 100%
  );
  margin-bottom: 2px;
}
</style>
