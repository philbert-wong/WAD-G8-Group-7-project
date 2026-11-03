/* CollapsiblePanel.spec.js
   Component tests for CollapsiblePanel.vue, the "Filters   Hide ▴" bar that opens and closes whatever is put inside it.
   The content comes in through a slot. The panel starts open or closed (startOpen prop) and the user flips it with the bar.
*/
import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import CollapsiblePanel from '../CollapsiblePanel.vue'

describe('TestSuite1: CollapsiblePanel', () => {
  it('Test1: shows its title', () => {
    const wrapper = mount(CollapsiblePanel, { props: { title: 'Proximity Grant (PHG)' } })

    expect(wrapper.text()).toContain('Proximity Grant (PHG)')
  })

  // Different states: the label on the bar says what clicking it will do
  it('Test2: starts open by default, so the bar offers to hide it', () => {
    const wrapper = mount(CollapsiblePanel, { props: { title: 'Filters' } })

    expect(wrapper.text()).toContain('Hide')
    expect(wrapper.text()).not.toContain('Show')
  })

  it('Test3: starts closed when asked to, so the bar offers to show it', () => {
    const wrapper = mount(CollapsiblePanel, { props: { title: 'Filters', startOpen: false } })

    expect(wrapper.text()).toContain('Show')
    expect(wrapper.text()).not.toContain('Hide')
  })

  // User interactions: clicking the bar flips it, and back again
  it('Test4: closes when the bar is clicked, and opens again on a second click', async () => {
    const wrapper = mount(CollapsiblePanel, { props: { title: 'Filters' } })

    await wrapper.find('button').trigger('click')
    expect(wrapper.text()).toContain('Show')

    await wrapper.find('button').trigger('click')
    expect(wrapper.text()).toContain('Hide')
  })

  // Props and slots: whatever the page puts inside is shown, and is kept while the panel is closed
  it('Test5: shows the content it is given', () => {
    const wrapper = mount(CollapsiblePanel, {
      props: { title: 'Filters' },
      slots: { default: '<p>Panel content</p>' },
    })

    expect(wrapper.text()).toContain('Panel content')
  })

  it('Test6: keeps its content (hidden) while closed, so nothing typed inside is lost', () => {
    const wrapper = mount(CollapsiblePanel, {
      props: { title: 'Filters', startOpen: false },
      slots: { default: '<p>Panel content</p>' },
    })

    expect(wrapper.find('p').exists()).toBe(true)
    expect(wrapper.find('p').isVisible()).toBe(false)
  })
})
