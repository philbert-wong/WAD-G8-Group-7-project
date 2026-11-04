// "Your Priorities" saved on this device: school, MRT, hawker centre and park, each ticked or not with an
// importance level (see makeDefaultPreferences in matchScore.js).
// Search, the Map, Compare and the Shortlist all read them from localStorage ('matchPreferences').
// The presets form (the popup and the profile page) reads and writes them through the functions below.
import { CATEGORIES, makeDefaultPreferences } from './matchScore.js'

const STORAGE_KEY = 'matchPreferences'

// Fills in anything missing with the defaults, copying only the categories we know,
// so a category added later still gets its default.
export function mergeWithDefaults(savedPanel) {
  const choices = makeDefaultPreferences()
  if (savedPanel) {
    for (const category of CATEGORIES) {
      if (savedPanel[category.key]) {
        choices[category.key] = savedPanel[category.key]
      }
    }
  }
  return choices
}

// The priorities saved on this device, or the defaults when nothing is saved (or the saved text is broken)
export function readSavedPriorities() {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved === null) {
    return makeDefaultPreferences()
  }
  try {
    return mergeWithDefaults(JSON.parse(saved))
  } catch (e) {
    return makeDefaultPreferences()
  }
}

// Keeps the priorities on this device, where Search, the Map, Compare and the Shortlist read them
export function saveSavedPriorities(panel) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(panel))
}
