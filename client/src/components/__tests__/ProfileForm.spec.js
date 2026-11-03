/* ProfileForm.spec.js
   Component tests for ProfileForm.vue, the presets form used in the first-visit popup and on the profile page.
   It asks for a town, the parents' postal code, the flat type, the budget and the lease, and (new) Your Priorities:
   the same four tick boxes and importance levels as the panel on Search.
   The form only collects the answers and sends them up with emit; the page decides what to do with them.
   It reads the starting filters from the Pinia filters store, so the test gives it a real Pinia.
*/
import { mount } from '@vue/test-utils'
import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia } from 'pinia'
import ProfileForm from '../ProfileForm.vue'
import { makeDefaultPreferences } from '../../utils/matchScore.js'
import { readSavedPriorities, saveSavedPriorities } from '../../utils/priorities.js'

beforeEach(() => {
  localStorage.clear()
})

function mountForm(props) {
  return mount(ProfileForm, { props: props, global: { plugins: [createPinia()] } })
}

// The answers the form sent up on its first save
function firstSave(wrapper) {
  return wrapper.emitted('save')[0][0]
}

describe('TestSuite1: ProfileForm shows its questions', () => {
  it('Test1: asks for the town, parents postal code, flat type and budget', () => {
    const wrapper = mountForm({})

    expect(wrapper.text()).toContain('Town you want to focus on')
    expect(wrapper.text()).toContain("Parents' postal code")
    expect(wrapper.text()).toContain('Flat type')
    expect(wrapper.text()).toContain('Max budget')
  })

  // The new part: Your Priorities are asked for here too
  it('Test2: asks for Your Priorities, with the four categories', () => {
    const wrapper = mountForm({})

    expect(wrapper.text()).toContain('Your Priorities')
    expect(wrapper.text()).toContain('Education (primary schools)')
    expect(wrapper.text()).toContain('Transport (MRT stations)')
    expect(wrapper.text()).toContain('Food (hawker centres)')
    expect(wrapper.text()).toContain('Greenery (parks)')
  })

  it('Test3: shows the text the page gives the save button', () => {
    const wrapper = mountForm({ buttonText: 'Show me flats' })

    expect(wrapper.text()).toContain('Show me flats')
  })
})

describe('TestSuite2: where Your Priorities start', () => {
  // Props: the page can give the priorities to start from (the profile page gives the account's)
  it('Test1: start from the priorities the page gives', () => {
    const given = makeDefaultPreferences()
    given.mrt.ticked = false
    const wrapper = mountForm({ priorities: given })

    expect(wrapper.find('#presets-matters-mrt').element.checked).toBe(false)
    expect(wrapper.find('#presets-matters-park').element.checked).toBe(true)
  })

  // Otherwise: the ones saved on this device
  it('Test2: start from the priorities saved on this device when the page gives none', () => {
    const saved = makeDefaultPreferences()
    saved.hawker.ticked = false
    saveSavedPriorities(saved)
    const wrapper = mountForm({})

    expect(wrapper.find('#presets-matters-hawker').element.checked).toBe(false)
  })

  it('Test3: start with all four ticked when nothing is saved', () => {
    const wrapper = mountForm({})

    expect(wrapper.find('#presets-matters-school').element.checked).toBe(true)
    expect(wrapper.find('#presets-matters-mrt').element.checked).toBe(true)
    expect(wrapper.find('#presets-matters-hawker').element.checked).toBe(true)
    expect(wrapper.find('#presets-matters-park').element.checked).toBe(true)
  })
})

describe('TestSuite3: ProfileForm tells its page what the user chose', () => {
  // Emitted events: the answers go up when the form is submitted
  it('Test1: sends the budget the user typed', async () => {
    const wrapper = mountForm({})
    const budget = wrapper.find('#profile-budget')

    budget.element.value = '600000'
    await budget.trigger('input')
    await wrapper.find('form').trigger('submit')

    expect(firstSave(wrapper).maxPrice).toBe('600000')
  })

  it('Test2: sends Your Priorities along with the answers', async () => {
    const wrapper = mountForm({})

    await wrapper.find('form').trigger('submit')

    expect(firstSave(wrapper).priorities).toEqual(makeDefaultPreferences())
  })

  it('Test3: sends a priority the user unticked', async () => {
    const wrapper = mountForm({})
    const box = wrapper.find('#presets-matters-mrt')

    box.element.checked = false
    await box.trigger('change')
    await wrapper.find('form').trigger('submit')

    expect(firstSave(wrapper).priorities.mrt.ticked).toBe(false)
    expect(firstSave(wrapper).priorities.school.ticked).toBe(true)
  })

  it('Test4: sends a new importance level as a number', async () => {
    const wrapper = mountForm({})
    const level = wrapper.find('[aria-label="How important is Greenery (parks)"]')

    level.element.value = '5'
    await level.trigger('change')
    await wrapper.find('form').trigger('submit')

    expect(firstSave(wrapper).priorities.park.level).toBe(5)
  })

  // Changing a box does nothing to the saved priorities until the page saves the form
  it('Test5: leaves the saved priorities alone until the form is saved', async () => {
    const wrapper = mountForm({})
    const box = wrapper.find('#presets-matters-mrt')

    box.element.checked = false
    await box.trigger('change')

    expect(readSavedPriorities().mrt.ticked).toBe(true)
  })
})

describe('TestSuite4: ProfileForm checks the postal code', () => {
  // Negative case: the postal code must be 6 digits, so nothing is sent up
  it('Test1: warns and sends nothing when the postal code is not 6 digits', async () => {
    const wrapper = mountForm({})
    const postal = wrapper.find('#profile-parents')

    postal.element.value = '12'
    await postal.trigger('input')
    await wrapper.find('form').trigger('submit')

    expect(wrapper.text()).toContain('The postal code must be 6 digits')
    expect(wrapper.emitted('save')).toBeFalsy()
  })

  it('Test2: accepts a postal code of 6 digits', async () => {
    const wrapper = mountForm({})
    const postal = wrapper.find('#profile-parents')

    postal.element.value = '560314'
    await postal.trigger('input')
    await wrapper.find('form').trigger('submit')

    expect(firstSave(wrapper).parentsPostal).toBe('560314')
  })
})
