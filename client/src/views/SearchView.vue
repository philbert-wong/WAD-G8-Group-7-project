<script setup>
import { computed, onMounted, ref } from 'vue';
import AddressSearch from '../components/AddressSearch.vue';
import BlockCard from '../components/BlockCard.vue';
import FilterPanel from '../components/FilterPanel.vue';
import ResultsPagination from '../components/ResultsPagination.vue';
import { useSearchStore } from '../stores/search.js';
import { titleCase } from '../services/format.js';

const store = useSearchStore();
const addressSearch = ref(null);
const metaError = ref('');

const resultSummary = computed(() => {
  const n = store.total.toLocaleString('en-SG');
  if (store.location) return `${n} result${store.total === 1 ? '' : 's'} on ${titleCase(store.location.road)}`;
  return `${n} block and flat type combination${store.total === 1 ? '' : 's'} island-wide`;
});

function clearLocation() {
  addressSearch.value?.clear();
  store.clearLocation();
}

onMounted(async () => {
  try {
    await store.loadMeta();
  } catch (err) {
    metaError.value = err.message;
  }
  if (!store.hasSearched) store.search();
});
</script>

<template>
  <section class="hero pb-4 pt-4 pt-md-5">
    <div class="container">
      <div class="row justify-content-center">
        <div class="col-lg-9 col-xl-8 text-center">
          <h1 class="display-6 fw-bold mb-2">Where should you start looking?</h1>
          <p class="lead hero__lead mb-4">
            Search every HDB block by what flats actually sold for, not asking prices.
            <span v-if="store.meta" class="d-block small mt-1">
              {{ store.meta.transactionCount.toLocaleString('en-SG') }} resale transactions,
              {{ store.meta.dataFrom }} to {{ store.meta.dataTo }}
            </span>
          </p>
          <AddressSearch ref="addressSearch" @select="store.setLocation" />
          <div v-if="store.location" class="mt-3" data-cy="location-chip">
            <span class="badge rounded-pill location-chip">
              <i class="bi bi-signpost-2 me-1" aria-hidden="true"></i>
              Blocks on {{ titleCase(store.location.road) }}
              <template v-if="store.location.block">· Blk {{ store.location.block }} first</template>
              <button type="button" class="btn-close btn-close-white ms-2" aria-label="Clear location" @click="clearLocation"></button>
            </span>
          </div>
        </div>
      </div>
    </div>
  </section>

  <div class="container mt-4">
    <div v-if="metaError" class="alert alert-danger" role="alert">
      Could not reach the server: {{ metaError }}. Is the API running (<code>npm run dev</code>)?
    </div>

    <div class="row g-4">
      <aside class="col-lg-4 col-xl-3">
        <button
          class="btn btn-outline-primary w-100 d-lg-none mb-2"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#filters"
          aria-expanded="false"
          aria-controls="filters"
          data-cy="toggle-filters"
        >
          <i class="bi bi-sliders me-1" aria-hidden="true"></i>Filters
          <span v-if="store.activeFilterCount" class="badge text-bg-primary ms-1">{{ store.activeFilterCount }}</span>
        </button>
        <div id="filters" class="collapse d-lg-block filter-sticky">
          <FilterPanel />
        </div>
      </aside>

      <section class="col-lg-8 col-xl-9" aria-labelledby="results-heading">
        <h2 id="results-heading" class="h6 mb-3 text-body-secondary" aria-live="polite" data-cy="result-summary">
          <template v-if="store.hasSearched">{{ resultSummary }}, cheapest first</template>
        </h2>

        <div v-if="store.error" class="alert alert-danger" role="alert" data-cy="search-error">{{ store.error }}</div>

        <div v-if="store.loading && !store.results.length" class="row row-cols-1 row-cols-sm-2 row-cols-xl-3 g-3" aria-hidden="true">
          <div v-for="n in 6" :key="n" class="col">
            <div class="card border-0 shadow-sm placeholder-glow h-100">
              <div class="placeholder col-12 block-card__skeleton"></div>
              <div class="card-body">
                <span class="placeholder col-8 mb-2"></span>
                <span class="placeholder col-5 placeholder-lg mb-2"></span>
                <span class="placeholder col-10"></span>
              </div>
            </div>
          </div>
        </div>

        <div v-else-if="store.hasSearched && !store.results.length && !store.error" class="empty-state text-center py-5" data-cy="empty-state">
          <i class="bi bi-search display-5 text-body-tertiary" aria-hidden="true"></i>
          <h3 class="h5 mt-3">No blocks match</h3>
          <p class="text-body-secondary mb-3">
            <template v-if="store.location">
              No HDB resale sales on {{ titleCase(store.location.road) }} match your filters. It may not be an HDB street.
            </template>
            <template v-else>Try raising your budget or lowering the minimum lease.</template>
          </p>
          <button class="btn btn-outline-primary btn-sm" type="button" @click="store.location ? clearLocation() : store.resetFilters()">
            {{ store.location ? 'Search island-wide instead' : 'Reset filters' }}
          </button>
        </div>

        <template v-else>
          <div class="row row-cols-1 row-cols-sm-2 row-cols-xl-3 g-3" :class="{ 'opacity-50': store.loading }" data-cy="results">
            <div v-for="card in store.results" :key="`${card.blockId}-${card.flatType}`" class="col">
              <BlockCard :card="card" />
            </div>
          </div>
          <ResultsPagination
            v-if="store.pageCount > 1"
            class="mt-4"
            :page="store.page"
            :page-count="store.pageCount"
            @change="store.goToPage"
          />
        </template>
      </section>
    </div>
  </div>
</template>
