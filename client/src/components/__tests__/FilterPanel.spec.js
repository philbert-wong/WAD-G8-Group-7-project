/* FilterPanel.spec.js
   Component tests for FilterPanel.vue, the flat type, budget and lease filters.
   The page owns the filter values and passes them in as the filters prop; the panel sends changes up with emit.
   The panel contains a link (RouterLink) to the calculator page. This test is about the panel alone, so
   the link is replaced with a stub (global.stubs), as in the slides.
*/
import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import FilterPanel from '../FilterPanel.vue'

// The filters the Search page starts with
function startFilters() {
  return { q: '', flatType: '', maxPrice: '760000', minLease: '60', phg: false, parentsPostal: '' }
}

// Mounts the panel with the link stubbed. Extra props (like filters) are given by each test.
function mountPanel(props) {
  return mount(FilterPanel, { props: props, global: { stubs: { RouterLink: true } } })
}

// The test needs one button, found by what it says
function buttonSaying(wrapper, text) {
  return wrapper.findAll('button').find(function (button) {
    return button.text() === text
  })
}

describe('TestSuite1: FilterPanel shows the filters it is given', () => {
  it('Test1: shows the budget as money', () => {
    const wrapper = mountPanel({ filters: startFilters() })

    expect(wrapper.text()).toContain('$760,000')
  })

  // Different states: an empty budget means "no limit", which is shown as Any
  it('Test2: shows no dollar amount when the budget is Any', () => {
    const filters = startFilters()
    filters.maxPrice = ''
    const wrapper = mountPanel({ filters: filters })

    expect(wrapper.text()).not.toContain('$')
  })

  it('Test3: shows the minimum lease in years', () => {
    const wrapper = mountPanel({ filters: startFilters() })

    expect(wrapper.text()).toContain('60 yrs')
  })

  it('Test4: has a chip for each flat type', () => {
    const wrapper = mountPanel({ filters: startFilters() })

    expect(wrapper.text()).toContain('2-Rm')
    expect(wrapper.text()).toContain('4-Rm')
    expect(wrapper.text()).toContain('Exec')
  })
})

describe('TestSuite2: FilterPanel parents section (PHG)', () => {
  // The parents' postal code and the switch that uses it are on Search and on the Map
  it('Test1: has a parents postal code box and a switch to use it', () => {
    const wrapper = mountPanel({ filters: startFilters() })

    expect(wrapper.text()).toContain("Parents' postal code")
    expect(wrapper.text()).toContain('Only show flats within 4 km of my parents')
  })

  // Different states: the hint under the switch says what is going on
  it('Test2: explains the grant while the switch is off', () => {
    const wrapper = mountPanel({ filters: startFilters() })

    expect(wrapper.text()).toContain('Proximity Housing Grant (PHG)')
  })

  it('Test3: asks for the postal code when the switch is on and there is none', () => {
    const filters = startFilters()
    filters.phg = true
    const wrapper = mountPanel({ filters: filters })

    expect(wrapper.text()).toContain("Type your parents' postal code above")
  })

  it('Test4: shows the postal code it is using when the place has not been found yet', () => {
    const filters = startFilters()
    filters.phg = true
    filters.parentsPostal = '560314'
    const wrapper = mountPanel({ filters: filters })

    expect(wrapper.text()).toContain('Only flats within 4 km of 560314')
  })

  it('Test5: shows the place that was found, so the user can check it is the right one', () => {
    const filters = startFilters()
    filters.phg = true
    filters.parentsPostal = '530959'
    const wrapper = mountPanel({ filters: filters, phgPlaceName: 'BLK 959 HOUGANG STREET 91' })

    expect(wrapper.text()).toContain('Only flats within 4 km of BLK 959 HOUGANG STREET 91')
  })
})

describe('TestSuite3: FilterPanel tells its parent what the user did', () => {
  // Emitted events: choosing a flat type changes the filter and searches straight away
  it('Test1: changes the flat type and searches when a chip is clicked', async () => {
    const wrapper = mountPanel({ filters: startFilters() })

    await buttonSaying(wrapper, '4-Rm').trigger('click')

    expect(wrapper.emitted('change-filter')[0]).toEqual(['flatType', '4 ROOM'])
    expect(wrapper.emitted('search')).toBeTruthy()
  })

  it('Test2: chooses any flat type when Any is clicked', async () => {
    const wrapper = mountPanel({ filters: startFilters() })

    await buttonSaying(wrapper, 'Any').trigger('click')

    expect(wrapper.emitted('change-filter')[0]).toEqual(['flatType', ''])
  })

  it('Test3: searches when Apply Filters is used (the form is submitted)', async () => {
    const wrapper = mountPanel({ filters: startFilters() })

    await wrapper.find('form').trigger('submit')

    expect(wrapper.emitted('search')).toBeTruthy()
  })

  it('Test4: clears the filters when Clear all is clicked', async () => {
    const wrapper = mountPanel({ filters: startFilters() })

    await buttonSaying(wrapper, 'Clear all').trigger('click')

    expect(wrapper.emitted('clear')).toBeTruthy()
  })

  // Emitted events: flipping the switch changes the filter and applies it straight away
  it('Test5: turns the parents filter on and searches when the switch is flipped', async () => {
    const wrapper = mountPanel({ filters: startFilters() })
    const switchBox = wrapper.find('#filter-phg')

    switchBox.element.checked = true
    await switchBox.trigger('change')

    expect(wrapper.emitted('change-filter')[0]).toEqual(['phg', true])
    expect(wrapper.emitted('search')).toBeTruthy()
  })

  it('Test6: sends the parents postal code up as it is typed', async () => {
    const wrapper = mountPanel({ filters: startFilters() })
    const box = wrapper.find('#filter-parents')

    box.element.value = '560314'
    await box.trigger('input')

    expect(wrapper.emitted('change-filter')[0]).toEqual(['parentsPostal', '560314'])
  })
})
