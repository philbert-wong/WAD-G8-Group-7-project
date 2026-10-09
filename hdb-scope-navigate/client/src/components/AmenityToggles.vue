<script setup>
import { useMapStore } from "../stores/map.js";
import { AMENITY_TYPES } from "../lib/constants.js";

/** OWNER: Maps & Location — amenity layers */
const mapStore = useMapStore();
</script>

<template>
  <div data-cy="amenity-toggles">
    <p class="small text-muted">Show these on the map. They load for the area you are looking at.</p>
    <div v-for="t in AMENITY_TYPES" :key="t.id" class="form-check form-switch mb-1">
      <input :id="`layer-${t.id}`" v-model="mapStore.layers[t.id]" class="form-check-input" type="checkbox"
             role="switch" :data-cy="`layer-${t.id}`" />
      <label class="form-check-label d-flex align-items-center gap-2" :for="`layer-${t.id}`">
        <span class="dot" :style="{ background: t.colour }"></span>{{ t.label }}
      </label>
    </div>
  </div>
</template>
