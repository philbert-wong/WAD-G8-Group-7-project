<script setup>
import { computed } from "vue";
import { useFilterStore } from "../stores/filters.js";
import { useListingsStore } from "../stores/listings.js";
import { useScoreStore } from "../stores/score.js";
import { FLAT_TYPES, TOWNS, LIMITS, SCOPES } from "../lib/constants.js";
import { money } from "../lib/format.js";

/** OWNER: Frontend — Shell & UI */
const filters = useFilterStore();
const listings = useListingsStore();
const score = useScoreStore();

// The far end of each slider means "no limit", stored as null.
const price = computed({
  get: () => filters.maxPrice ?? LIMITS.price.max,
  set: (v) => { filters.maxPrice = v >= LIMITS.price.max ? null : Number(v); },
});
const walk = computed({
  get: () => filters.maxWalkMin ?? LIMITS.walk.max,
  set: (v) => { filters.maxWalkMin = v >= LIMITS.walk.max ? null : Number(v); },
});
const lease = computed({
  get: () => filters.minLease ?? LIMITS.lease.min,
  set: (v) => { filters.minLease = v <= LIMITS.lease.min ? null : Number(v); },
});

const count = computed(() => listings.visible.length);
</script>

<template>
  <div data-cy="filter-panel">
    <div class="d-flex justify-content-between align-items-baseline mb-3">
      <p class="small text-muted mb-0" data-cy="result-count">
        {{ count.toLocaleString() }} block{{ count === 1 ? "" : "s" }} shown
      </p>
      <button v-if="filters.activeCount" class="btn btn-link btn-sm p-0"
              data-cy="reset-filters" @click="filters.reset()">
        Reset all
      </button>
    </div>

    <div class="row g-2 mb-3">
      <div class="col-6">
        <label class="form-label small text-muted mb-1" for="flatType">Flat type</label>
        <select id="flatType" v-model="filters.flatType" class="form-select form-select-sm" data-cy="filter-flat-type">
          <option value="">Any</option>
          <option v-for="t in FLAT_TYPES" :key="t" :value="t">{{ t }}</option>
        </select>
      </div>
      <div class="col-6">
        <label class="form-label small text-muted mb-1" for="town">Town</label>
        <select id="town" v-model="filters.town" class="form-select form-select-sm" data-cy="filter-town">
          <option value="">Any</option>
          <option v-for="t in TOWNS" :key="t" :value="t">{{ t }}</option>
        </select>
      </div>
    </div>

    <div class="mb-3">
      <label class="form-label small text-muted mb-0 d-flex justify-content-between" for="maxPrice">
        <span>Budget (max price)</span>
        <strong class="text-body">{{ filters.maxPrice ? money(filters.maxPrice) : "No limit" }}</strong>
      </label>
      <input id="maxPrice" v-model.number="price" type="range" class="form-range"
             :min="LIMITS.price.min" :max="LIMITS.price.max" :step="LIMITS.price.step" data-cy="filter-max-price" />
      <RouterLink class="small" to="/affordability">Work out my budget →</RouterLink>
    </div>

    <div class="mb-3">
      <label class="form-label small text-muted mb-0 d-flex justify-content-between" for="minLease">
        <span>Min remaining lease</span>
        <strong class="text-body">{{ filters.minLease ? `${filters.minLease} yrs` : "Any" }}</strong>
      </label>
      <input id="minLease" v-model.number="lease" type="range" class="form-range"
             :min="LIMITS.lease.min" :max="LIMITS.lease.max" :step="LIMITS.lease.step" data-cy="filter-min-lease" />
    </div>

    <div class="mb-3">
      <label class="form-label small text-muted mb-0 d-flex justify-content-between" for="maxWalk">
        <span>Max walk to MRT</span>
        <strong class="text-body">{{ filters.maxWalkMin ? `${filters.maxWalkMin} min` : "Any" }}</strong>
      </label>
      <input id="maxWalk" v-model.number="walk" type="range" class="form-range"
             :min="LIMITS.walk.min" :max="LIMITS.walk.max" :step="LIMITS.walk.step" data-cy="filter-max-walk" />
    </div>

    <div class="mb-3">
      <label class="form-label small text-muted mb-1" for="scope">Search area</label>
      <select id="scope" v-model.number="filters.radius" class="form-select form-select-sm" data-cy="filter-scope">
        <option v-for="s in SCOPES" :key="s.value" :value="s.value">{{ s.label }}</option>
      </select>
    </div>

    <div class="mb-1">
      <span class="form-label small text-muted d-block mb-1">Colour markers by</span>
      <div class="btn-group btn-group-sm w-100" role="group" aria-label="Colour markers by">
        <input id="col-psm" v-model="filters.colourBy" type="radio" class="btn-check" value="psm" />
        <label class="btn btn-outline-primary" for="col-psm" data-cy="colour-psm">Price per sqm</label>
        <input id="col-score" v-model="filters.colourBy" type="radio" class="btn-check" value="score"
               :disabled="!score.active" />
        <label class="btn btn-outline-primary" :class="{ disabled: !score.active }" for="col-score"
               data-cy="colour-score">My score</label>
      </div>
      <p v-if="!score.active" class="form-text mb-0">Set a priority below to colour by your score.</p>
    </div>
  </div>
</template>
