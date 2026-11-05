/* ShortlistItem.spec.js
   Component tests for ShortlistItem.vue, one saved flat on the Shortlist page: its card plus the note box.
   The flat card (BlockCard) is replaced with a stub, because this test is about the note box alone.
   The store only changes item.note once the server has accepted the note, so the tests do the same
   (setProps with the new note) to act as the server saying "saved".
*/
import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, afterEach } from 'vitest'
import ShortlistItem from '../ShortlistItem.vue'

function makeItem(note) {
  return {
    id: 'item1',
    note: note,
    block: { id: 'b1', block: '672A', street: 'YISHUN AVE 4' },
  }
}

function mountItem(note) {
  return mount(ShortlistItem, {
    props: { item: makeItem(note) },
    global: { stubs: { BlockCard: true } },
  })
}

afterEach(() => {
  vi.useRealTimers()
})

describe('TestSuite1: ShortlistItem tells the user the note was saved', () => {
  it('Test1: shows no message before anything is saved', () => {
    const wrapper = mountItem('')
    expect(wrapper.find('.note-saved').exists()).toBe(false)
  })

  it('Test2: sends the new note up when Save note is pressed', async () => {
    const wrapper = mountItem('')
    await wrapper.find('textarea').setValue('near my parents')
    await wrapper.find('.act-btn.primary').trigger('click')
    expect(wrapper.emitted('change-note')).toHaveLength(1)
    expect(wrapper.emitted('change-note')[0][1]).toBe('near my parents')
  })

  it('Test3: shows "Note saved" once the server has accepted the note', async () => {
    const wrapper = mountItem('')
    await wrapper.find('textarea').setValue('near my parents')
    await wrapper.find('.act-btn.primary').trigger('click')
    // the message must not appear yet: the server has not answered
    expect(wrapper.find('.note-saved').exists()).toBe(false)

    await wrapper.setProps({ item: makeItem('near my parents') })
    expect(wrapper.find('.note-saved').text()).toContain('Note saved')
  })

  it('Test4: the message goes away after 3 seconds', async () => {
    vi.useFakeTimers()
    const wrapper = mountItem('')
    await wrapper.find('textarea').setValue('viewing on Sunday')
    await wrapper.setProps({ item: makeItem('viewing on Sunday') })
    expect(wrapper.find('.note-saved').exists()).toBe(true)

    await vi.advanceTimersByTimeAsync(3000)
    expect(wrapper.find('.note-saved').exists()).toBe(false)
  })

  it('Test5: the message goes away when the note is edited again', async () => {
    const wrapper = mountItem('')
    await wrapper.find('textarea').setValue('near my parents')
    await wrapper.setProps({ item: makeItem('near my parents') })
    expect(wrapper.find('.note-saved').exists()).toBe(true)

    await wrapper.find('textarea').setValue('near my parents, high floor')
    expect(wrapper.find('.note-saved').exists()).toBe(false)
  })
})
