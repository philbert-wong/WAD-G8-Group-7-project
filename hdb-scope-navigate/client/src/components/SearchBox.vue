<script setup>
import { ref, watch } from "vue";
import { geocode } from "../api/blocks.js";
import { useMapStore } from "../stores/map.js";

/** OWNER: Maps & Location — walkthrough step 01 */
const mapStore = useMapStore();
const query = ref("");
const error = ref("");
const busy = ref(false);

// A new pin (search or dropped) makes an old "couldn't find" message stale.
watch(() => mapStore.pin, () => { error.value = ""; });

async function onSearch() {
  if (!query.value.trim()) return;
  busy.value = true;
  error.value = "";
  try {
    const result = await geocode(query.value);
    mapStore.setPin(result.lat, result.lng, result.address);   // hands off to the map
  } catch (err) {
    error.value = err.message;
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <form class="search-form" @submit.prevent="onSearch">
    <div class="d-flex align-items-center gap-2">
      <label for="search" class="form-label small text-muted mb-1 text-nowrap">Postal code or address</label>
      <div class="input-group">
        <input id="search" v-model="query" class="form-control" placeholder="e.g. 560406"
              data-cy="search-input" autocomplete="off" />
        <button class="btn btn-primary" :disabled="busy" data-cy="search-submit">
          {{ busy ? "…" : "Go" }}
        </button>
      </div>
    </div>
    <p v-if="mapStore.pin?.label && !error" class="small text-muted mt-2 mb-0 text-truncate" data-cy="search-found">
        Showing {{ mapStore.pin.label }}
      <button type="button" class="btn btn-link btn-sm p-0 ms-1 align-baseline" @click="mapStore.clearPin()">clear</button>
    </p>
    <p v-if="error" class="text-danger small mt-2 mb-0" role="alert" data-cy="search-error">{{ error }}</p>
    
  </form>
</template>
