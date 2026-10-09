<script setup>
import { computed, ref } from "vue";
import { geocode } from "../api/blocks.js";
import { useListingsStore } from "../stores/listings.js";
import { useMapStore } from "../stores/map.js";

/**
 * OWNER: Maps & Location — Proximity Housing Grant layer.
 * Enter a parent's (or child's) address and the map highlights every block
 * within 4 km, which is where the "live near" grant applies.
 */
const mapStore = useMapStore();
const listings = useListingsStore();
const address = ref("");
const error = ref("");
const busy = ref(false);

const inside = computed(() => listings.phgIds?.size ?? 0);
const total = computed(() => listings.blocks.length);

async function check() {
  if (!address.value.trim()) return;
  busy.value = true; error.value = "";
  try {
    const r = await geocode(address.value);
    mapStore.setPhg({ lat: r.lat, lng: r.lng, address: r.address });
  } catch (err) {
    error.value = err.message;
  } finally {
    busy.value = false;
  }
}

function clear() {
  mapStore.clearPhg();
  listings.phgOnly = false;
  address.value = "";
}
</script>

<template>
  <div data-cy="phg-panel">
    <p class="small text-muted">
      Buying near your parents or child can earn a Proximity Housing Grant. Enter their address
      to see which blocks are within 4 km.
    </p>

    <form class="input-group input-group-sm mb-2" @submit.prevent="check">
      <input v-model="address" class="form-control" placeholder="Their postal code or address"
             aria-label="Parent's address" data-cy="phg-input" autocomplete="off" />
      <button class="btn btn-primary" :disabled="busy" data-cy="phg-submit">{{ busy ? "…" : "Show" }}</button>
    </form>
    <p v-if="error" class="text-danger small" role="alert" data-cy="phg-error">{{ error }}</p>

    <template v-if="mapStore.phg">
      <p class="small mb-2" data-cy="phg-summary">
        <strong>{{ inside.toLocaleString() }}</strong> of {{ total.toLocaleString() }} blocks are within 4 km of
        <span class="text-muted">{{ mapStore.phg.address }}</span>.
      </p>
      <div class="form-check mb-2">
        <input id="phgOnly" v-model="listings.phgOnly" class="form-check-input" type="checkbox" data-cy="phg-only" />
        <label class="form-check-label small" for="phgOnly">Show only these blocks</label>
      </div>
      <div class="d-flex flex-wrap gap-2">
        <RouterLink class="btn btn-sm btn-outline-primary" :to="{ path: '/affordability', query: { proximity: 'near' } }">
          Add grant to my budget
        </RouterLink>
        <button class="btn btn-sm btn-link" data-cy="phg-clear" @click="clear">Remove</button>
      </div>
    </template>
  </div>
</template>
