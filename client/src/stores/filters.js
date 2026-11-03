// Pinia store (Week 11): the search filters (search text, flat type, budget, lease), shared by Search and the Map,
// so both pages always show the same results. Change a filter on one page and the other page uses it too.
// (Same idea as Your Priorities, which are also the same on every page.)
import { ref } from 'vue'
import { defineStore } from 'pinia'

// The filters at the start and after "Clear all". maxPrice '' would mean "Any" budget.
// phg = the "Near parents (PHG)" switch on the Map: true = only show blocks within 4 km of the parents (yes by default)
function makeDefaultFilters() {
  return { q: '', flatType: '', maxPrice: '760000', minLease: '60', phg: true }
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
  // (The PHG switch is a choice, not a filter value, so "Clear all" leaves it as it is.)
  function clearFilters() {
    const phg = filters.value.phg
    filters.value = makeDefaultFilters()
    filters.value.phg = phg
  }

  // The account's profile answers (stores/auth.js) become the starting filters, on Search and on the Map.
  // Nothing changes when there is no profile yet, or when the user pressed "Skip for now".
  function applyProfile(profile) {
    if (profile === null) {
      return
    }
    // Profiles saved before the switch existed have no showPhg: that counts as yes
    filters.value.phg = profile.showPhg !== false
    if (profile.skipped) {
      return
    }
    filters.value.flatType = profile.flatType
    filters.value.maxPrice = profile.maxPrice // '' = Any budget
    if (profile.minLease !== '') {
      filters.value.minLease = profile.minLease
    }
  }

  // You must return every state and action, or pages cannot use them (slide 21)
  return { filters, setFilter, clearFilters, applyProfile }
})
