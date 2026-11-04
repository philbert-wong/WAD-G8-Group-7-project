/* priorities.spec.js
   Unit tests for priorities.js: reading and saving "Your Priorities" on this device (localStorage).
   Search, the Map, Compare and the Shortlist read them from the same place, so these functions must always
   give back a complete set (all four categories), whatever is saved.
   Each test starts with an empty localStorage.
*/
import { describe, it, expect, beforeEach } from 'vitest'
import { mergeWithDefaults, readSavedPriorities, saveSavedPriorities } from '../priorities.js'
import { makeDefaultPreferences } from '../matchScore.js'

beforeEach(() => {
  localStorage.clear()
})

describe('TestSuite1: readSavedPriorities', () => {
  // Verify "nothing saved": the defaults (all four ticked, Important)
  it('Test1: gives the defaults when nothing is saved', () => {
    expect(readSavedPriorities()).toEqual(makeDefaultPreferences())
  })

  it('Test2: gives back what was saved', () => {
    const panel = makeDefaultPreferences()
    panel.mrt.ticked = false
    panel.park.level = 5
    saveSavedPriorities(panel)

    expect(readSavedPriorities()).toEqual(panel)
  })

  // A saved copy from an older version might be missing a category: it gets its default
  it('Test3: fills in a missing category with its default', () => {
    localStorage.setItem('matchPreferences', JSON.stringify({ mrt: { ticked: false, level: 2 } }))
    const priorities = readSavedPriorities()

    expect(priorities.mrt).toEqual({ ticked: false, level: 2 })
    expect(priorities.school).toEqual(makeDefaultPreferences().school)
  })

  it('Test4: ignores a category it does not know', () => {
    localStorage.setItem('matchPreferences', JSON.stringify({ zoo: { ticked: true, level: 1 } }))

    expect(readSavedPriorities().zoo).toBeFalsy()
  })

  // Negative case: broken text must not crash the page
  it('Test5: gives the defaults when the saved text is broken', () => {
    localStorage.setItem('matchPreferences', 'not json at all')

    expect(readSavedPriorities()).toEqual(makeDefaultPreferences())
  })
})

describe('TestSuite2: mergeWithDefaults', () => {
  it('Test1: gives the defaults for nothing', () => {
    expect(mergeWithDefaults(null)).toEqual(makeDefaultPreferences())
  })

  it('Test2: keeps the saved choices and fills in the rest', () => {
    const merged = mergeWithDefaults({ hawker: { ticked: true, level: 4 } })

    expect(merged.hawker).toEqual({ ticked: true, level: 4 })
    expect(merged.school).toEqual(makeDefaultPreferences().school)
  })
})
