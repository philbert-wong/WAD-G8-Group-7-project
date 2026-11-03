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
  return { q: '', flatType: '', maxPrice: '760000', minLease: '60', phg: false }
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

describe('TestSuite2: FilterPanel conditional rendering', () => {
  // The Near parents switch is only for the Map: Search gives no phgPostal, so it is hidden there
  it('Test1: hides the Near parents switch on the Search page', () => {
    const wrapper = mountPanel({ filters: startFilters() })

    expect(wrapper.text()).not.toContain('Near parents')
  })

  it('Test2: shows the Near parents switch on the Map page', () => {
    const wrapper = mountPanel({ filters: startFilters(), phgPostal: '560314' })

    expect(wrapper.text()).toContain('Near parents')
  })

  it('Test3: tells the user to add a postal code when the profile has none', () => {
    const wrapper = mountPanel({ filters: startFilters(), phgPostal: '' })

    expect(wrapper.text()).toContain("Add your parents' postal code")
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
})
