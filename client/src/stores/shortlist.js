// Pinia store for the shortlist (the flats the user saved).
// It lives in a store because three places need the same list:
// the Search page (★ Saved buttons), the Shortlist page, and the navbar's count.
import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import axios from 'axios'
import { getErrorMessage } from '../utils/errorMessage.js'

export const useShortlistStore = defineStore('shortlist', function () {
  // Each item looks like { id, note, block: { id, block, street, ... } }
  const items = ref([])
  const errorMessage = ref('')

  // How many flats are saved (shown in the navbar)
  const count = computed(function () {
    return items.value.length
  })

  // Gets every saved flat from the server
  async function load() {
    errorMessage.value = ''
    try {
      const response = await axios.get('/api/shortlist')
      items.value = response.data
    } catch (error) {
      errorMessage.value = getErrorMessage(error)
    }
  }

  // Saves a flat, then reloads the list so we get the new item from the server
  async function add(block) {
    errorMessage.value = ''
    try {
      await axios.post('/api/shortlist', { blockId: block.id })
      await load()
    } catch (error) {
      errorMessage.value = getErrorMessage(error)
    }
  }

  // Deletes one shortlist item, then takes it off the list on screen
  async function remove(item) {
    errorMessage.value = ''
    try {
      await axios.delete('/api/shortlist/' + item.id)
      items.value = items.value.filter(function (i) {
        return i.id !== item.id
      })
    } catch (error) {
      errorMessage.value = getErrorMessage(error)
    }
  }

  // Changes the note of one shortlist item
  async function updateNote(item, note) {
    errorMessage.value = ''
    try {
      const response = await axios.patch('/api/shortlist/' + item.id, { note: note })
      item.note = response.data.note
    } catch (error) {
      errorMessage.value = getErrorMessage(error)
    }
  }

  // Finds the shortlist item that holds this block, or null if the block is not saved
  function findByBlock(blockId) {
    for (let i = 0; i < items.value.length; i++) {
      if (items.value[i].block.id === blockId) {
        return items.value[i]
      }
    }
    return null
  }

  // Is this block in the shortlist? (used for the ★ Saved / ☆ Save button)
  function isSaved(blockId) {
    return findByBlock(blockId) !== null
  }

  // Un-saves a block from a search card (the card knows the block, not the shortlist item)
  async function removeByBlock(block) {
    const item = findByBlock(block.id)
    if (item !== null) {
      await remove(item)
    }
  }

  return { items, errorMessage, count, load, add, remove, updateNote, isSaved, removeByBlock }
})
