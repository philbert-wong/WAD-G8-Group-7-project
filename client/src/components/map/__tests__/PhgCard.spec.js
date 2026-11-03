/* PhgCard.spec.js
   Component tests for PhgCard.vue, the Proximity Housing Grant (PHG) card on the Map.
   The user types the parents' postal code; the Map page does the search and draws the circle. This component only
   collects the text and shows the result it is given (the place found, and how many blocks are inside the circle).
*/
import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import PhgCard from '../PhgCard.vue'

// The test needs one button, found by what it says
function buttonSaying(wrapper, text) {
  return wrapper.findAll('button').find(function (button) {
    return button.text() === text
  })
}

describe('TestSuite1: PhgCard shows what it is given', () => {
  it('Test1: says how far the circle reaches', () => {
    const wrapper = mount(PhgCard, { props: { distanceKm: 4 } })

    expect(wrapper.text()).toContain('within 4 km')
  })

  // Different states: before any search there is no place and no result
  it('Test2: shows no place and no count before a search', () => {
    const wrapper = mount(PhgCard)

    expect(wrapper.text()).not.toContain('Using:')
    expect(wrapper.text()).not.toContain('block(s)')
  })

  it('Test3: shows the place that was found, with a Clear button', () => {
    const wrapper = mount(PhgCard, { props: { parentPlace: { name: 'BLK 959 HOUGANG STREET 91' } } })

    expect(wrapper.text()).toContain('Using:')
    expect(wrapper.text()).toContain('BLK 959 HOUGANG STREET 91')
    expect(buttonSaying(wrapper, 'Clear')).toBeTruthy()
  })

  it('Test4: shows how many blocks are inside the circle', () => {
    const wrapper = mount(PhgCard, { props: { nearbyCount: 69, distanceKm: 4 } })

    expect(wrapper.text()).toContain('69 block(s) within 4 km match your filters')
  })

  // The box can start with a postal code, such as the one saved in the presets
  it('Test5: starts with the postal code it is given', () => {
    const wrapper = mount(PhgCard, { props: { initialText: '560314' } })

    expect(wrapper.find('input').element.value).toBe('560314')
  })
})

describe('TestSuite2: PhgCard tells its parent what the user did', () => {
  // Emitted events: the typed text goes up with the search
  it('Test1: sends the typed postal code up when Search is clicked', async () => {
    const wrapper = mount(PhgCard)
    const box = wrapper.find('input')

    box.element.value = '530959'
    await box.trigger('input')
    await buttonSaying(wrapper, 'Search').trigger('click')

    expect(wrapper.emitted('search')[0]).toEqual(['530959'])
  })

  it('Test2: does not search before the user does anything', () => {
    const wrapper = mount(PhgCard)

    expect(wrapper.emitted('search')).toBeFalsy()
  })

  it('Test3: asks to remove the circle, and empties the box, when Clear is clicked', async () => {
    const wrapper = mount(PhgCard, {
      props: { parentPlace: { name: 'BLK 959 HOUGANG STREET 91' }, initialText: '530959' },
    })

    await buttonSaying(wrapper, 'Clear').trigger('click')

    expect(wrapper.emitted('clear')).toBeTruthy()
    expect(wrapper.find('input').element.value).toBe('')
  })
})
