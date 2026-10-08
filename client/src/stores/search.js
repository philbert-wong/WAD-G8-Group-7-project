import { computed, reactive, ref } from 'vue';
import { defineStore } from 'pinia';
import { api } from '../services/api.js';

export const BUDGET_MAX = 1_600_000; // slider value meaning "no limit"

const defaultFilters = () => ({ town: '', flatTypes: [], maxPrice: BUDGET_MAX, minLease: 0 });

// Search state lives in a store so results survive going to a block page and back.
export const useSearchStore = defineStore('search', () => {
  const meta = ref(null);
  const location = ref(null); // the OneMap result the user picked
  const filters = reactive(defaultFilters());
  const page = ref(1);
  const pageSize = 12;

  const results = ref([]);
  const total = ref(0);
  const loading = ref(false);
  const error = ref('');
  const hasSearched = ref(false);
  let latestRequest = 0;

  const activeFilterCount = computed(
    () => [filters.town, filters.flatTypes.length, filters.maxPrice < BUDGET_MAX, filters.minLease > 0].filter(Boolean).length,
  );
  const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize)));

  async function loadMeta() {
    meta.value ??= await api.meta();
  }

  async function search({ resetPage = true } = {}) {
    if (resetPage) page.value = 1;
    const requestId = ++latestRequest;
    loading.value = true;
    error.value = '';
    try {
      const data = await api.searchBlocks({
        street: location.value?.road,
        block: location.value?.block,
        town: filters.town,
        flatType: filters.flatTypes.join(','),
        maxPrice: filters.maxPrice < BUDGET_MAX ? filters.maxPrice : undefined,
        minLease: filters.minLease || undefined,
        page: page.value,
        pageSize,
      });
      if (requestId !== latestRequest) return; // a newer search has started
      results.value = data.results;
      total.value = data.total;
      hasSearched.value = true;
    } catch (err) {
      if (requestId === latestRequest) error.value = err.message;
    } finally {
      if (requestId === latestRequest) loading.value = false;
    }
  }

  function setLocation(place) {
    location.value = place;
    return search();
  }

  function clearLocation() {
    location.value = null;
    return search();
  }

  function goToPage(n) {
    page.value = n;
    return search({ resetPage: false });
  }

  function resetFilters() {
    Object.assign(filters, defaultFilters());
    return search();
  }

  return {
    meta, location, filters, page, pageSize, results, total, loading, error, hasSearched,
    activeFilterCount, pageCount, loadMeta, search, setLocation, clearLocation, goToPage, resetFilters,
  };
});
