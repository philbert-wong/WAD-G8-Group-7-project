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

// "Clear all": no restriction at all (any budget, any flat type, the shortest lease on the slider, PHG off)
function makeClearedFilters() {
  return { q: '', flatType: '', maxPrice: '', minLease: '20', phg: false, parentsPostal: '' }
}

// The filters are saved in localStorage, so a refresh keeps them
const SAVE_KEY = 'activeFilters'

function readSavedFilters() {
  const saved = localStorage.getItem(SAVE_KEY)
  if (saved === null) {
    return null
  }
  try {
    const filters = JSON.parse(saved)
    // Start from the defaults, so a filter added later still has a value
    const result = makeDefaultFilters()
    for (const name in result) {
      if (filters[name] !== undefined) {
        result[name] = filters[name]
      }
    }
    return result
  } catch (e) {
    localStorage.removeItem(SAVE_KEY)
    return null
  }
}

export const useFiltersStore = defineStore('filters', function () {
  // state
  // { q, flatType, maxPrice, minLease }: q = the search box text, '' = not used
  const saved = readSavedFilters()
  // true when the filters came back from before a refresh (then the profile does not replace them)
  const restoredFromSave = saved !== null
  const filters = ref(saved !== null ? saved : makeDefaultFilters())

  function save() {
    localStorage.setItem(SAVE_KEY, JSON.stringify(filters.value))
  }

  // actions

  // One filter changed, e.g. ('maxPrice', '600000')
  function setFilter(name, value) {
    filters.value[name] = value
    save()
  }

  // "Clear all": removes every restriction, including the PHG switch and the parents' postal code
  function clearFilters() {
    filters.value = makeClearedFilters()
    save()
  }

  // After a logout: the next person starts with the normal starting filters
  function resetToDefaults() {
    filters.value = makeDefaultFilters()
    localStorage.removeItem(SAVE_KEY)
  }

  // The account's profile answers (stores/auth.js) become the starting filters, on Search and on the Map.
  // Nothing changes when there is no profile yet, or when the user pressed "Skip for now".
  // atStart = true when the site is just opening (saved filters then win)
  function applyProfile(profile, atStart) {
    if (profile === null) {
      return
    }
    if (atStart === true && restoredFromSave) {
      return
    }
    // Only on when it was switched on (profiles saved before the switch existed have no showPhg: that counts as off)
    filters.value.phg = profile.showPhg === true
    filters.value.parentsPostal = profile.parentsPostal || ''
    if (profile.skipped) {
      save()
      return
    }
    filters.value.flatType = profile.flatType
    filters.value.maxPrice = profile.maxPrice // '' = Any budget
    if (profile.minLease !== '') {
      filters.value.minLease = profile.minLease
    }
    save()
  }

  // You must return every state and action, or pages cannot use them (slide 21)
  return { filters, setFilter, clearFilters, resetToDefaults, applyProfile }
})
