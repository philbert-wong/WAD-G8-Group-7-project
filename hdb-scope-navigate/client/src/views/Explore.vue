<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import MapView from "../components/MapView.vue";
import MapLegend from "../components/MapLegend.vue";
import FilterPanel from "../components/FilterPanel.vue";
import SearchBox from "../components/SearchBox.vue";
import ScorePanel from "../components/ScorePanel.vue";
import AmenityToggles from "../components/AmenityToggles.vue";
import PhgPanel from "../components/PhgPanel.vue";
import PanelSection from "../components/PanelSection.vue";
import BlockSidebar from "../components/BlockSidebar.vue";
import { useAuthStore } from "../stores/auth.js";
import { useFilterStore } from "../stores/filters.js";
import { useListingsStore } from "../stores/listings.js";
import { useMapStore } from "../stores/map.js";
import { usePreferencesStore } from "../stores/preferences.js";
import { useScoreStore } from "../stores/score.js";

/**
 * OWNER: Frontend — Shell & UI. Composes everyone else's components.
 *
 * This view also decides WHEN blocks are fetched: whenever a server-side filter
 * changes (or the pin moves, if we are searching near it). Everything that can
 * be done in the browser — the score, the grant layer — never touches the server.
 */
const route = useRoute();
const auth = useAuthStore();
const filters = useFilterStore();
const listings = useListingsStore();
const mapStore = useMapStore();
const prefs = usePreferencesStore();
const score = useScoreStore();

const panelOpen = ref(false);   // the filter sheet on phones
let timer = null;

watch(
  () => [filters.queryParams, filters.radius > 0 ? mapStore.centre : null],
  () => { clearTimeout(timer); timer = setTimeout(listings.load, 200); }
);

onMounted(() => {
  listings.load();
  if (typeof route.query.block === "string") mapStore.selectAndFocus(route.query.block);
});
onBeforeUnmount(() => clearTimeout(timer));

const layersOn = computed(() => Object.values(mapStore.layers).filter(Boolean).length);
const filterBadge = computed(() => filters.activeCount || "");
// Nothing came back and nothing is loading: say why, and offer the way out.
const empty = computed(() => !listings.loading && !listings.error && listings.blocks.length === 0);
const scopeText = computed(() =>
  filters.radius > 0 ? `${filters.radius / 1000} km around the pin` : "the whole island");
</script>

<template>
  <div class="explore" data-cy="explore">
    <aside class="explore__panel" :class="{ 'is-open': panelOpen }" data-cy="explore-panel">
      <div class="d-flex d-md-none justify-content-between align-items-center mb-2">
        <strong>Search &amp; filters</strong>
        <button class="btn-close" aria-label="Close filters" @click="panelOpen = false"></button>
      </div>

      <SearchBox />

      <PanelSection title="Filters" :badge="filterBadge" cy="section-filters">
        <FilterPanel />
      </PanelSection>

      <PanelSection title="My priorities" :badge="score.active ? 'on' : ''" cy="section-score">
        <ScorePanel />
      </PanelSection>

      <PanelSection title="Amenity layers" :badge="layersOn || ''" :start-open="false" cy="section-layers">
        <AmenityToggles />
      </PanelSection>

      <PanelSection title="Proximity grant" :badge="mapStore.phg ? 'on' : ''" :start-open="false" cy="section-phg">
        <PhgPanel />
      </PanelSection>

      <div v-if="auth.isSignedIn" class="mt-3">
        <button class="btn btn-sm btn-outline-primary w-100" :disabled="prefs.saving"
                data-cy="save-prefs" @click="prefs.save()">
          {{ prefs.saving ? "Saving…" : "Save my filters & priorities" }}
        </button>
        <p v-if="prefs.message" class="form-text mb-0" :class="prefs.failed ? 'text-danger' : 'text-success'"
           data-cy="prefs-message">{{ prefs.message }}</p>
      </div>
      <p v-else class="form-text mt-3">
        <RouterLink to="/login">Sign in</RouterLink> to save your filters and shortlist blocks.
      </p>

      <p class="form-text mt-2 mb-0">
        Prices are transacted resale prices published by HDB, not asking prices.
      </p>
    </aside>

    <section class="explore__map">
      <MapView />

      <div class="map-chip" data-cy="map-chip">
        <span v-if="listings.loading" class="spinner-border spinner-border-sm me-2" role="status"></span>
        {{ listings.visible.length.toLocaleString() }} block{{ listings.visible.length === 1 ? "" : "s" }} · {{ scopeText }}
      </div>

      <div v-if="mapStore.dropMode" class="map-banner" role="status">Click the map to drop a pin</div>
      <div v-else-if="empty" class="map-banner map-banner--empty" role="status" data-cy="map-empty">
        <template v-if="filters.radius > 0">
          No blocks within {{ filters.radius / 1000 }} km of the pin.
          <button class="btn btn-sm btn-light ms-2" data-cy="empty-whole-island" @click="filters.radius = 0">Show whole island</button>
        </template>
        <template v-else>
          No blocks match these filters.
          <button v-if="filters.activeCount" class="btn btn-sm btn-light ms-2" data-cy="empty-reset" @click="filters.reset()">Reset filters</button>
        </template>
      </div>
      <div v-if="listings.error" class="map-banner map-banner--error" role="alert" data-cy="map-error">
        {{ listings.error }}
        <button class="btn btn-sm btn-light ms-2" @click="listings.load()">Retry</button>
      </div>

      <div class="map-tools">
        <button class="btn btn-sm" :class="mapStore.dropMode ? 'btn-primary' : 'btn-light'" data-cy="drop-pin"
                @click="mapStore.dropMode = !mapStore.dropMode">
          {{ mapStore.dropMode ? "Cancel" : "Drop a pin" }}
        </button>
        <button v-if="mapStore.pin" class="btn btn-sm btn-light" @click="mapStore.clearPin()">Clear pin</button>
      </div>

      <MapLegend />

      <button class="btn btn-primary map-fab d-md-none" data-cy="open-filters" @click="panelOpen = true">
        Filters <span v-if="filterBadge" class="badge text-bg-light ms-1">{{ filterBadge }}</span>
      </button>

      <BlockSidebar />
    </section>
  </div>
</template>
