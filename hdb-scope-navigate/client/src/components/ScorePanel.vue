<script setup>
import { useFilterStore } from "../stores/filters.js";
import { useListingsStore } from "../stores/listings.js";
import { useMapStore } from "../stores/map.js";
import { useScoreStore, PRESETS } from "../stores/score.js";
import { SCORE_CATEGORIES } from "../lib/constants.js";
import { moneyShort } from "../lib/format.js";

/** OWNER: Frontend — Shell & UI — the personalised score */
const score = useScoreStore();
const filters = useFilterStore();
const listings = useListingsStore();
const mapStore = useMapStore();
</script>

<template>
  <div data-cy="score-panel">
    <p class="small text-muted">
      How much does each matter to you? Every block gets a 0–100 match that follows your sliders.
    </p>

    <div class="d-flex flex-wrap gap-1 mb-3">
      <button v-for="(p, key) in PRESETS" :key="key" class="btn btn-sm btn-outline-secondary"
              :data-cy="`preset-${key}`" @click="score.preset(key)">{{ p.label }}</button>
      <button class="btn btn-sm btn-link" data-cy="score-clear" @click="score.clear()">Clear</button>
    </div>

    <div v-for="cat in SCORE_CATEGORIES" :key="cat.id" class="mb-2">
      <label :for="`w-${cat.id}`" class="form-label small mb-0 d-flex justify-content-between">
        <span>{{ cat.label }} <span class="text-muted">· {{ cat.hint }}</span></span>
        <strong>{{ score.weights[cat.id] }}</strong>
      </label>
      <input :id="`w-${cat.id}`" type="range" class="form-range" min="0" max="10" step="1"
             :value="score.weights[cat.id]" :data-cy="`weight-${cat.id}`"
             @input="score.set(cat.id, $event.target.value)" />
    </div>

    <template v-if="score.active">
      <div class="mt-2 mb-3">
        <label for="minScore" class="form-label small mb-0 d-flex justify-content-between">
          <span>Hide blocks matching less than</span>
          <strong>{{ filters.minScore || "off" }}</strong>
        </label>
        <input id="minScore" v-model.number="filters.minScore" type="range" class="form-range"
               min="0" max="90" step="5" data-cy="filter-min-score" />
      </div>

      <h3 class="h6 mb-2">Best matches</h3>
      <p v-if="!listings.ranked.length" class="small text-muted">No blocks with enough data to score.</p>
      <ol class="list-unstyled mb-0 ranked" data-cy="ranked-list">
        <li v-for="r in listings.ranked" :key="r.block.id">
          <button class="ranked__row" @click="mapStore.selectAndFocus(r.block.id)">
            <span class="ranked__score">{{ r.score }}</span>
            <span class="flex-grow-1 text-start text-truncate">
              <strong>Blk {{ r.block.block }}</strong> {{ r.block.streetName }}
              <span class="d-block small text-muted">{{ r.block.town }} · {{ moneyShort(r.block.medianPrice) }}</span>
            </span>
          </button>
        </li>
      </ol>
    </template>
    <p v-else class="small text-muted mb-0">All sliders are at zero, so no score is shown.</p>
  </div>
</template>
