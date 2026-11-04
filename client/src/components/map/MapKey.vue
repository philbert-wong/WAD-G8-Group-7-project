<script setup>
// The colour key, floating in the bottom-left corner of the map (MapView puts it there), so what the dot colours
// mean is always in view while looking at the dots. It follows "Colour dots by": the 4 price colours, or the
// priority score gradient. Only shows things (props down, nothing sent up).
// On phones the title has an arrow that slides the whole key off the left edge of the map (only the arrow stays,
// to bring it back), so it gets out of the way of the small map.
import { ref } from 'vue'

defineProps({
  colourBy: String, // 'price' or 'match'
  priceBands: Array, // [{ max, colour, label }, ...]
  noScoreColour: String, // the grey for "no score"
})

// Phones only: true = the key is shown, false = slid off to the left with just its arrow showing (bigger screens always show it)
const open = ref(true)

function toggle() {
  open.value = !open.value
}
</script>

<template>
  <div class="map-key small" :class="{ 'slid-away': !open }">
    <!-- Title, with the hide / show arrow on phones (d-sm-none: hidden from Bootstrap's sm size up) -->
    <div class="d-flex justify-content-between align-items-center gap-2">
      <div class="fw-semibold">
        <span v-if="colourBy === 'price'">Median price (cheapest flat type)</span>
        <span v-else>Priority score (from Your Priorities)</span>
      </div>
      <button
        type="button"
        class="arrow d-sm-none"
        :aria-expanded="open"
        :aria-label="open ? 'Hide the colour key' : 'Show the colour key'"
        @click="toggle"
      >
        {{ open ? '◂' : '▸' }}
      </button>
    </div>

    <!-- The colours -->
    <div class="mt-1">
      <!-- Price: one coloured dot per price band -->
      <div v-if="colourBy === 'price'" class="d-flex flex-wrap column-gap-3 row-gap-1">
        <!-- The number in each dot is the same number shown inside the map's dots -->
        <span v-for="(band, index) in priceBands" :key="band.label" class="d-inline-flex align-items-center gap-1">
          <span class="dot num-dot" :style="{ background: band.colour }">{{ index + 1 }}</span>
          {{ band.label }}
        </span>
      </div>

      <!-- Priority score: the gradient bar with the same words as the score bar on the cards -->
      <div v-else>
        <div class="gradient-bar"></div>
        <div class="d-flex justify-content-between text-muted">
          <span>Weak</span>
          <span>Fair</span>
          <span>Good</span>
          <span>Excellent</span>
        </div>
        <div class="no-score d-flex align-items-center gap-1 text-muted mt-1">
          <span class="dot" :style="{ background: noScoreColour }"></span>
          No score (no priorities ticked)
        </div>
      </div>
    </div>
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
  pointer-events: none; /* only shows things: drags and clicks go through to the map (except the arrow) */
  transition: transform 0.25s ease; /* slides smoothly on phones (see .slid-away) */
}
/* The hide / show arrow (phones): a grey strip down the whole right edge of the key, so it clearly looks like a
   button. When the key is slid away, this strip is the tab left showing at the map's edge. */
.arrow {
  pointer-events: auto;
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 15px; /* the same 15px that stays showing when slid away (see .slid-away) */
  border: none;
  border-left: 1px solid var(--line);
  border-radius: 0 12px 12px 0; /* rounded like the key's right corners */
  background: rgba(120, 125, 145, 0.08); /* a very light, see-through grey: just enough to show it is a button */
  padding: 0; /* the whole 15px is for the arrow */
  font-size: 14px; /* big enough to see and tap */
  line-height: 1;
  color: #6b6f80; /* a soft dark grey arrow */
}
.arrow:active {
  background: rgba(120, 125, 145, 0.18); /* a little darker while pressed */
}
/* Round colour dots, like the dots on the map */
.dot {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}
/* Price key dots carry the band number, like the dots on the map */
.dot.num-dot {
  width: 16px;
  height: 16px;
  display: inline-grid;
  place-items: center;
  font: 700 10px/1 sans-serif;
  color: #111;
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

/* Phones: a much smaller key, so it does not cover the small map.
   Smaller text and dots, less padding, and no "No score" line (rarely needed). */
@media (max-width: 575px) {
  .map-key {
    width: 190px;
    left: 6px;
    bottom: 20px;
    padding: 5px 21px 5px 8px; /* room on the right for the arrow strip */
    font-size: 10px;
    line-height: 1.3;
  }
  .dot {
    width: 9px;
    height: 9px;
  }
  .gradient-bar {
    height: 6px;
  }
  .no-score {
    display: none !important; /* !important: beats Bootstrap's d-flex, which is also !important */
  }
  /* The arrow closed it: slide the whole key left, off the map, leaving only its right edge with the arrow (15px).
     translateX moves it without changing the page's layout (not in our course). The map hides what sticks out. */
  .slid-away {
    transform: translateX(calc(-100% + 15px - 6px)); /* - 6px: also past its 6px gap from the map's edge */
  }
}
</style>
