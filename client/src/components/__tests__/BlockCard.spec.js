/* BlockCard.spec.js
   Component tests for BlockCard.vue, one flat card: price, lease, MRT, and the Save and Price details buttons.
   This test is about the card alone, so its two child components are replaced with stubs (global.stubs):
   MatchScore (the priority score) and PriceDetails (the price chart, which would call the server).
   The card also uses the Pinia store and the router, so the test gives it a real Pinia and a router that stays in memory.
*/
import { mount, flushPromises } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import { createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import BlockCard from '../BlockCard.vue'

// One card, in the same shape the server sends (see /api/blocks)
const block = {
  id: 'abc123',
  block: '7',
  street: 'TELOK BLANGAH CRES',
  town: 'BUKIT MERAH',
  postal: '090007',
  flatType: '1 ROOM',
  price: 265000,
  priceLow: 238888,
  priceHigh: 279000,
  salesCount: 9,
  remainingLease: 48,
  mrtName: 'Tiong Bahru MRT',
  mrtWalkMinutes: 21,
  distances: { school: 655, mrt: 1708, hawker: 137, park: 868 },
  lat: 1.278361,
  lng: 103.819384,
}

// A router with two empty pages, so the "Show on map" button has somewhere to go
function makeRouter() {
  const emptyPage = { render: () => null }
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: emptyPage },
      { path: '/map', component: emptyPage },
    ],
  })
}

// Mounts the card with the two children stubbed. The test gives the props that matter to it.
function mountCard(props, router) {
  return mount(BlockCard, {
    props: Object.assign({ block: block }, props),
    global: {
      plugins: [createPinia(), router || makeRouter()],
      stubs: { MatchScore: true, PriceDetails: true },
    },
  })
}

// The test needs one button, found by what it says
function buttonSaying(wrapper, text) {
  return wrapper.findAll('button').find(function (button) {
    return button.text().includes(text)
  })
}

describe('TestSuite1: BlockCard shows the block', () => {
  it('Test1: shows the block number, street, town and flat type', () => {
    const wrapper = mountCard()

    expect(wrapper.text()).toContain('Blk 7 TELOK BLANGAH CRES')
    expect(wrapper.text()).toContain('BUKIT MERAH')
    expect(wrapper.text()).toContain('1 ROOM')
  })

  it('Test2: shows the price range and the median price', () => {
    const wrapper = mountCard()

    expect(wrapper.text()).toContain('$238,888 – $279,000')
    expect(wrapper.text()).toContain('Median $265,000')
    expect(wrapper.text()).toContain('9 sale(s)')
  })

  it('Test3: shows the remaining lease and the walk to the MRT', () => {
    const wrapper = mountCard()

    expect(wrapper.text()).toContain('48 years')
    expect(wrapper.text()).toContain('21 min walk')
    expect(wrapper.text()).toContain('Tiong Bahru MRT')
  })

  // Computed values: a tag is added for each thing the block is good at
  it('Test4: tags a block that has a hawker centre close by', () => {
    const wrapper = mountCard()

    expect(wrapper.text()).toContain('Hawker centre')
    expect(wrapper.text()).not.toContain('Near MRT/LRT')
  })

  it('Test5: shows a single price, not a range, when the low and high are the same', () => {
    const sameBlock = Object.assign({}, block, { priceLow: 265000, priceHigh: 265000 })
    const wrapper = mountCard({ block: sameBlock })

    expect(wrapper.text()).toContain('$265,000')
    expect(wrapper.text()).not.toContain('–')
  })
})

describe('TestSuite2: BlockCard states', () => {
  // Different states: the Save button depends on the saved prop
  it('Test1: offers to save a block that is not saved yet', () => {
    const wrapper = mountCard({ saved: false })

    expect(wrapper.text()).toContain('Save to Shortlist')
    expect(wrapper.text()).not.toContain('Saved')
  })

  it('Test2: says Saved for a block that is in the shortlist', () => {
    const wrapper = mountCard({ saved: true })

    expect(wrapper.text()).toContain('Saved')
    expect(wrapper.text()).not.toContain('Save to Shortlist')
  })

  // The shortlist page shows the same card without a Save button
  it('Test3: hides the Save button when asked to', () => {
    const wrapper = mountCard({ showSave: false })

    expect(wrapper.text()).not.toContain('Save to Shortlist')
  })

  it('Test4: switches the Price details button to Hide when it is clicked', async () => {
    const wrapper = mountCard()

    await buttonSaying(wrapper, 'Price details').trigger('click')

    expect(wrapper.text()).toContain('Hide price details')
  })
})

describe('TestSuite3: BlockCard tells the outside world what the user did', () => {
  // Emitted events: the whole block goes up, so the page knows which one to save
  it('Test1: sends the block up when Save to Shortlist is clicked', async () => {
    const wrapper = mountCard()

    await buttonSaying(wrapper, 'Save to Shortlist').trigger('click')

    expect(wrapper.emitted('toggle-save')[0]).toEqual([block])
  })

  // User interactions: Show on map opens the Map page
  it('Test2: opens the Map page when Show on map is clicked', async () => {
    const router = makeRouter()
    router.push('/')
    await router.isReady()
    const wrapper = mountCard({}, router)

    await buttonSaying(wrapper, 'Show on map').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/map')
  })
})
