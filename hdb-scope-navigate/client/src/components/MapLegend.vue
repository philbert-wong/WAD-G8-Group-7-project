<script setup>
import { computed } from "vue";
import { useFilterStore } from "../stores/filters.js";
import { useListingsStore } from "../stores/listings.js";
import { useScoreStore } from "../stores/score.js";
import { useShortlistStore } from "../stores/shortlist.js";
import { PRICE_STOPS, SCORE_STOPS } from "../lib/colour.js";
import { money } from "../lib/format.js";

/** OWNER: Maps & Location — what the marker colours mean */
const filters = useFilterStore();
const listings = useListingsStore();
const score = useScoreStore();
const shortlist = useShortlistStore();

const noBlocks = computed(() => listings.blocks.length === 0);
const byScore = computed(() => filters.colourBy === "score" && score.active);
const gradient = computed(() =>
  `linear-gradient(90deg, ${(byScore.value ? SCORE_STOPS : PRICE_STOPS).join(", ")})`);
</script>

<template>
  <div class="map-legend" data-cy="map-legend">
    <div v-if="noBlocks" class="small text-muted">No blocks to colour</div>
    <template v-else>
    <div v-if="byScore" class="small fw-semibold">Match with my priorities</div>
    <div v-else class="small fw-semibold">Median price per sqm</div>

    <div class="map-legend__bar" :style="{ background: gradient }"></div>
    <div class="d-flex justify-content-between small text-muted">
      <template v-if="byScore"><span>Low</span><span>High</span></template>
      <template v-else><span>{{ money(listings.psmRange[0]) }}</span><span>{{ money(listings.psmRange[1]) }}</span></template>
    </div>
    </template>

    <div v-if="listings.phgIds || shortlist.items.length" class="mt-1 small">
      <div v-if="listings.phgIds" class="d-flex align-items-center gap-2">
        <span class="ring ring-phg"></span>Within 4 km of parents
      </div>
      <div v-if="shortlist.items.length" class="d-flex align-items-center gap-2">
        <span class="ring ring-saved"></span>On my shortlist
      </div>
    </div>
  </div>
</template>
