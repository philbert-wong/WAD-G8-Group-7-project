// Pinia store (Week 11): the search filters (search text, flat type, budget, lease), shared by Search and the Map,
// so both pages always show the same results. Change a filter on one page and the other page uses it too.
// (Same idea as Your Priorities, which are also the same on every page.)
import { ref } from 'vue'
import { defineStore } from 'pinia'

// The filters at the start and after "Clear all". maxPrice '' would mean "Any" budget.
// phg = the "Near parents (PHG)" switch: true = only show blocks within 4 km of the parents (off by default),
// parentsPostal = the parents' postal code typed under it (from the presets at the start). Both on Search and the Map.
function makeDefaultFilters() {
  return { q: '', flatType: '', maxPrice: '760000', minLease: '60', phg: false, parentsPostal: '' }
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
  // (The PHG switch and the parents' postal code are choices, not filter values, so "Clear all" leaves them as they are.)
  function clearFilters() {
    const phg = filters.value.phg
    const parentsPostal = filters.value.parentsPostal
    filters.value = makeDefaultFilters()
    filters.value.phg = phg
    filters.value.parentsPostal = parentsPostal
  }

  // The account's profile answers (stores/auth.js) become the starting filters, on Search and on the Map.
  // Nothing changes when there is no profile yet, or when the user pressed "Skip for now".
  function applyProfile(profile) {
    if (profile === null) {
      return
    }
    // Only on when it was switched on (profiles saved before the switch existed have no showPhg: that counts as off)
    filters.value.phg = profile.showPhg === true
    filters.value.parentsPostal = profile.parentsPostal || ''
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
