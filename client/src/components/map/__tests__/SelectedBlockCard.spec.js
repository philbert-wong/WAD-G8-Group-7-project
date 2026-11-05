/* SelectedBlockCard.spec.js
   Component tests for SelectedBlockCard.vue, the "Selected block" card on the Map.
   The Map page knows what is in the shortlist and saves the flats; this card shows a Save button for each flat type
   of the block, and sends the click up. A visitor without an account is asked to log in instead.
*/
import { mount, RouterLinkStub } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import SelectedBlockCard from '../SelectedBlockCard.vue'

// One block with two flat types (the Map sends one card per flat type)
function makeCard(id, flatType) {
  return {
    id: id,
    block: '650',
    street: 'ANG MO KIO ST 61',
    town: 'ANG MO KIO',
    flatType: flatType,
    price: 705000,
    salesCount: 4,
    remainingLease: 60,
    mrtName: 'Yio Chu Kang',
    mrtWalkMinutes: 12,
    distances: { mrt: 900 },
  }
}
const place = {
  label: 'Blk 650 ANG MO KIO ST 61',
  lat: 1.37,
  lng: 103.84,
  cards: [makeCard('a1', '3 ROOM'), makeCard('a2', '4 ROOM')],
}
const otherPlace = { label: 'Blk 1 OTHER ST', lat: 1.3, lng: 103.8, cards: [makeCard('b1', '5 ROOM')] }

// RouterLink needs a router: a stub is enough to see where the link goes
function mountCard(props) {
  return mount(SelectedBlockCard, {
    props: Object.assign({ place: place, amenityTypes: [] }, props),
    global: { stubs: { RouterLink: RouterLinkStub } },
  })
}

describe('TestSuite1: SelectedBlockCard shows a Save button for each flat type', () => {
  it('Test1: has one Save button per flat type', () => {
    const wrapper = mountCard({ loggedIn: true })
    const buttons = wrapper.findAll('.save-btn')

    expect(buttons.length).toBe(2)
    expect(buttons[0].text()).toBe('+ Save')
    expect(buttons[1].text()).toBe('+ Save')
  })

  it('Test2: names the flat type in the button, for screen readers', () => {
    const wrapper = mountCard({ loggedIn: true })
    const buttons = wrapper.findAll('.save-btn')

    expect(buttons[0].attributes('aria-label')).toBe('Save 3 ROOM to shortlist')
    expect(buttons[1].attributes('aria-label')).toBe('Save 4 ROOM to shortlist')
  })

  // Different states: a flat that is in the shortlist
  it('Test3: shows ✓ Saved for a flat that is in the shortlist', () => {
    const wrapper = mountCard({ loggedIn: true, savedIds: ['a2'] })
    const buttons = wrapper.findAll('.save-btn')

    expect(buttons[0].text()).toBe('+ Save')
    expect(buttons[1].text()).toBe('✓ Saved')
    expect(buttons[1].attributes('aria-label')).toBe('Saved 4 ROOM (press to remove)')
  })
})

describe('TestSuite2: SelectedBlockCard sends the click up', () => {
  it('Test1: sends the flat that was clicked when logged in', async () => {
    const wrapper = mountCard({ loggedIn: true })

    await wrapper.findAll('.save-btn')[1].trigger('click')

    expect(wrapper.emitted('toggle-save').length).toBe(1)
    expect(wrapper.emitted('toggle-save')[0][0]).toEqual(place.cards[1])
  })

  it('Test2: a flat that is already saved is sent too (the page removes it)', async () => {
    const wrapper = mountCard({ loggedIn: true, savedIds: ['a1'] })

    await wrapper.findAll('.save-btn')[0].trigger('click')

    expect(wrapper.emitted('toggle-save')[0][0]).toEqual(place.cards[0])
  })
})

describe('TestSuite3: SelectedBlockCard asks a visitor without an account to log in', () => {
  it('Test1: sends nothing, and says to log in', async () => {
    const wrapper = mountCard({ loggedIn: false })

    await wrapper.findAll('.save-btn')[0].trigger('click')

    expect(wrapper.emitted('toggle-save')).toBeUndefined()
    expect(wrapper.text()).toContain('to save Blk 650 ANG MO KIO ST 61.')
    const links = wrapper.findAllComponents(RouterLinkStub)
    expect(links[0].props('to')).toBe('/login')
    expect(links[1].props('to')).toBe('/createaccount')
  })

  it('Test2: says nothing before the button is pressed', () => {
    const wrapper = mountCard({ loggedIn: false })

    expect(wrapper.text()).not.toContain('create a free account')
  })

  it('Test3: forgets the message when another block is selected', async () => {
    const wrapper = mountCard({ loggedIn: false })
    await wrapper.findAll('.save-btn')[0].trigger('click')
    expect(wrapper.text()).toContain('create a free account')

    await wrapper.setProps({ place: otherPlace })

    expect(wrapper.text()).not.toContain('create a free account')
  })
})

describe('TestSuite4: SelectedBlockCard shows a problem from the shortlist', () => {
  it('Test1: shows the message it is given', () => {
    const wrapper = mountCard({ loggedIn: true, saveError: 'Network Error' })

    expect(wrapper.text()).toContain('Network Error')
  })

  it('Test2: shows no message by default', () => {
    const wrapper = mountCard({ loggedIn: true })

    expect(wrapper.find('.text-danger').exists()).toBe(false)
  })
})
