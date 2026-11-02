// Pinia store (Week 11): the search filters (search text, flat type, budget, lease), shared by Search and the Map,
// so both pages always show the same results. Change a filter on one page and the other page uses it too.
// (Same idea as Your Priorities, which are also the same on every page.)
import { ref } from 'vue'
import { defineStore } from 'pinia'

// The filters at the start and after "Clear all". maxPrice '' would mean "Any" budget.
function makeDefaultFilters() {
  return { q: '', flatType: '', maxPrice: '760000', minLease: '60' }
}

export const useFiltersStore = defineStore('filters', function () {
  // ---------- state ----------
  // { q, flatType, maxPrice, minLease }: q = the search box text, '' = not used
  const filters = ref(makeDefaultFilters())

  // ---------- actions ----------

  // One filter changed, e.g. ('maxPrice', '600000')
  function setFilter(name, value) {
    filters.value[name] = value
  }

  // "Clear all": back to the starting filters
  function clearFilters() {
    filters.value = makeDefaultFilters()
  }

  // You must return every state and action, or pages cannot use them (slide 21)
  return { filters, setFilter, clearFilters }
})
