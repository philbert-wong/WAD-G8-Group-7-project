/* BlockCardIntegration.spec.js
   Integration tests: BlockCard.vue (the parent) and MatchScore.vue (its child) working together.
   Unlike the component tests, the child is NOT stubbed: the real MatchScore is mounted and used as a group.
   These tests check that the card passes the right props to MatchScore and that MatchScore shows them.
   They do not check the colour or the "how was this made" box: that belongs to the MatchScore tests.
*/
import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import { createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import BlockCard from '../BlockCard.vue'

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

// Your Priorities as weights, which the card passes on to MatchScore
const weights = { school: 3, mrt: 3, hawker: 3, park: 3 }

// Only the price chart is stubbed (it would call the server). BlockCard and MatchScore are both real.
function mountCard(props) {
  const emptyPage = { render: () => null }
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/', component: emptyPage }] })
  return mount(BlockCard, {
    props: Object.assign({ block: block, showMatch: true, weights: weights, score: 57 }, props),
    global: { plugins: [createPinia(), router], stubs: { PriceDetails: true } },
  })
}

describe('TestSuite1: BlockCard and MatchScore together', () => {
  // The card shows its own details, and the child shows the score the card gave it
  it('Test1: shows the block and its priority score', () => {
    const wrapper = mountCard()

    expect(wrapper.text()).toContain('Blk 7 TELOK BLANGAH CRES')
    expect(wrapper.text()).toContain('Priority score')
    expect(wrapper.text()).toContain('57/100 · Good')
  })

  // Changing the score prop of the card changes what the child shows
  it('Test2: shows Excellent when the card is given a high score', async () => {
    const wrapper = mountCard()

    await wrapper.setProps({ score: 80 })

    expect(wrapper.text()).toContain('80/100 · Excellent')
  })

  it('Test3: shows Fair when the card is given a low score', async () => {
    const wrapper = mountCard()

    await wrapper.setProps({ score: 30 })

    expect(wrapper.text()).toContain('30/100 · Fair')
  })

  // Different states: no score (nothing ticked in Your Priorities) shows a dash instead of a number
  it('Test4: shows a dash when there is no score', async () => {
    const wrapper = mountCard()

    await wrapper.setProps({ score: null })

    expect(wrapper.text()).toContain('Priority score')
    expect(wrapper.text()).toContain('–')
    expect(wrapper.text()).not.toContain('/100')
  })

  // The card decides whether the child is shown at all (only the Search page shows the score)
  it('Test5: does not show the priority score when the card is not asked to', () => {
    const wrapper = mountCard({ showMatch: false })

    expect(wrapper.text()).toContain('Blk 7 TELOK BLANGAH CRES')
    expect(wrapper.text()).not.toContain('Priority score')
  })

  // The card passes the weights on: with them MatchScore offers the "how was this made" button, without them it does not
  it('Test6: offers the how-was-this-made button when the card passes the weights', () => {
    const wrapper = mountCard()

    expect(wrapper.find('[aria-label="How is the priority score made?"]').exists()).toBe(true)
  })

  it('Test7: has no how-was-this-made button when the card passes no weights', () => {
    const wrapper = mountCard({ weights: null })

    expect(wrapper.find('[aria-label="How is the priority score made?"]').exists()).toBe(false)
  })
})
