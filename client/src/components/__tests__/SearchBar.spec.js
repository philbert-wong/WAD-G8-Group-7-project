/* SearchBar.spec.js
   Component tests for SearchBar.vue, the big search box.
   The page owns the text and passes it in as a prop; the component sends the typing and "search" up with emit.
   We test what the user sees and what the component tells its parent, not how it is built inside.
*/
import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import SearchBar from '../SearchBar.vue'

describe('TestSuite1: SearchBar', () => {
  // Verify that the text prop is shown in the box
  it('Test1: shows the text it is given', () => {
    const wrapper = mount(SearchBar, { props: { text: 'Bishan' } })

    expect(wrapper.find('input').element.value).toBe('Bishan')
  })

  it('Test2: has a Search button', () => {
    const wrapper = mount(SearchBar, { props: { text: '' } })

    expect(wrapper.text()).toContain('Search')
  })

  // Verify the event sent up while the user types
  it('Test3: tells its parent the new text when the user types', async () => {
    const wrapper = mount(SearchBar, { props: { text: '' } })
    const box = wrapper.find('input')

    box.element.value = 'Yishun'
    await box.trigger('input')

    expect(wrapper.emitted('change-text')).toBeTruthy()
    expect(wrapper.emitted('change-text')[0]).toEqual(['Yishun'])
  })

  // Verify the event sent up when the user presses Enter or the Search button (the form is submitted)
  it('Test4: tells its parent to search when the form is submitted', async () => {
    const wrapper = mount(SearchBar, { props: { text: 'Yishun' } })

    await wrapper.find('form').trigger('submit')

    expect(wrapper.emitted('search')).toBeTruthy()
  })

  it('Test5: does not ask for a search before the user does anything', () => {
    const wrapper = mount(SearchBar, { props: { text: 'Yishun' } })

    expect(wrapper.emitted('search')).toBeFalsy()
  })
})
