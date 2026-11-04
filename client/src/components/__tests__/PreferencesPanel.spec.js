/* PreferencesPanel.spec.js
   Component tests for PreferencesPanel.vue, the "Your Priorities" panel.
   The page owns the choices and passes them in as the preferences prop; when the user clicks a tick box or picks
   a level, the panel tells the page with emit.
   makeDefaultPreferences() (from matchScore.js) gives the starting choices: all four ticked, level 3 (Important).
*/
import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import PreferencesPanel from '../PreferencesPanel.vue'
import { makeDefaultPreferences } from '../../utils/matchScore.js'

describe('TestSuite1: PreferencesPanel', () => {
  // Verify that the choices in the prop are shown
  it('Test1: shows the four categories', () => {
    const wrapper = mount(PreferencesPanel, { props: { preferences: makeDefaultPreferences() } })

    expect(wrapper.text()).toContain('Education (primary schools)')
    expect(wrapper.text()).toContain('Transport (MRT/LRT stations)')
    expect(wrapper.text()).toContain('Food (hawker centres)')
    expect(wrapper.text()).toContain('Greenery (parks)')
  })

  it('Test2: has a tick box for each category, all ticked to start with', () => {
    const wrapper = mount(PreferencesPanel, { props: { preferences: makeDefaultPreferences() } })
    const boxes = wrapper.findAll('input[type="checkbox"]')

    expect(boxes).toHaveLength(4)
    expect(boxes[0].element.checked).toBe(true)
    expect(boxes[3].element.checked).toBe(true)
  })

  // Conditional rendering: the hint is different on the Search page and on the Map page
  it('Test3: explains the sort on the Search page', () => {
    const wrapper = mount(PreferencesPanel, { props: { preferences: makeDefaultPreferences() } })

    expect(wrapper.text()).toContain('Sort: Priority score')
  })

  it('Test4: explains the dot colours on the Map page', () => {
    const wrapper = mount(PreferencesPanel, { props: { preferences: makeDefaultPreferences(), onMap: true } })

    expect(wrapper.text()).toContain('colour the dots')
    expect(wrapper.text()).not.toContain('Sort: Priority score')
  })

  // Different states: an unticked category is ignored, so its importance dropdown is greyed out
  it('Test5: greys out the importance of an unticked category', () => {
    const preferences = makeDefaultPreferences()
    preferences.mrt.ticked = false
    const wrapper = mount(PreferencesPanel, { props: { preferences: preferences } })

    const mrtLevel = wrapper.find('[aria-label="How important is Transport (MRT/LRT stations)"]')
    const parkLevel = wrapper.find('[aria-label="How important is Greenery (parks)"]')

    expect(mrtLevel.element.disabled).toBe(true)
    expect(parkLevel.element.disabled).toBe(false)
  })

  // Props: the presets form shows this panel over the Search page, which has one too, so the ids can be changed
  it('Test5b: uses the ids it is given, so two panels on one page do not clash', () => {
    const wrapper = mount(PreferencesPanel, {
      props: { preferences: makeDefaultPreferences(), panelId: 'presets-priorities', idPrefix: 'presets-matters-' },
    })

    expect(wrapper.find('#presets-priorities').exists()).toBe(true)
    expect(wrapper.find('#presets-matters-mrt').exists()).toBe(true)
    expect(wrapper.find('#matters-mrt').exists()).toBe(false)
  })

  // Emitted events: the category and the new choice go up to the page
  it('Test6: tells its parent when a tick box is unticked', async () => {
    const wrapper = mount(PreferencesPanel, { props: { preferences: makeDefaultPreferences() } })
    const box = wrapper.find('#matters-mrt')

    box.element.checked = false
    await box.trigger('change')

    expect(wrapper.emitted('change-ticked')[0]).toEqual(['mrt', false])
  })

  it('Test7: tells its parent when a new level is picked, as a number', async () => {
    const wrapper = mount(PreferencesPanel, { props: { preferences: makeDefaultPreferences() } })
    const level = wrapper.find('[aria-label="How important is Transport (MRT/LRT stations)"]')

    level.element.value = '5'
    await level.trigger('change')

    expect(wrapper.emitted('change-level')[0]).toEqual(['mrt', 5])
  })
})
