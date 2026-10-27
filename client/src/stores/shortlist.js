// Pinia store (Week 11): the logged-in user's shortlist, shared by SearchView (☆ Save / ★ Saved),
// ShortlistView (the list + notes), CompareView (pick 2-3 flats) and the NavBar ("Shortlist (3)").
// Same idea as the MiniShop example's stores/cart.js. The login token is sent automatically (see stores/auth.js).
import { ref, computed } from 'vue'
import axios from 'axios'
import { defineStore } from 'pinia'

// Our Express server's address (class style: the full URL, like wk5/wk6 code-along App.vue)
const BASE_URL = 'http://localhost:8000'

export const useShortlistStore = defineStore('shortlist', function () {
  // ---------- state ----------
  // Each item looks like { id, note, createdAt, block: { id, block, street, ... } }
  const items = ref([])
  const loading = ref(false)
  const error = ref('')

  // ---------- getters ----------
  const count = computed(function () {
    return items.value.length
  })

  // ---------- actions ----------

  // Gets every saved flat from the server
  async function fetchShortlist() {
    loading.value = true
    error.value = ''
    try {
      const response = await axios.get(`${BASE_URL}/api/shortlist`)
      items.value = response.data
    } catch (e) {
      // Show our server's message if it sent one, otherwise axios's own (e.g. "Network Error")
      if (e.response && e.response.data && e.response.data.message) {
        error.value = e.response.data.message
      } else {
        error.value = e.message
      }
    }
    loading.value = false
  }

  // Finds the saved item that holds this block, or null if the block is not saved
  function findItemByBlock(blockId) {
    for (const item of items.value) {
      if (item.block.id === blockId) {
        return item
      }
    }
    return null
  }

  // Is this block saved? (decides ☆ Save or ★ Saved on its card)
  function isSaved(blockId) {
    return findItemByBlock(blockId) !== null
  }

  // Saves a flat. The server sends back the new item, so we add it to the list.
  async function addToShortlist(blockId) {
    error.value = ''
    try {
      const response = await axios.post(`${BASE_URL}/api/shortlist`, { blockId: blockId })
      items.value.push(response.data)
    } catch (e) {
      // Show our server's message if it sent one, otherwise axios's own (e.g. "Network Error")
      if (e.response && e.response.data && e.response.data.message) {
        error.value = e.response.data.message
      } else {
        error.value = e.message
      }
    }
  }

  // Removes one saved item, then rebuilds the list without it
  async function removeFromShortlist(itemId) {
    error.value = ''
    try {
      await axios.delete(`${BASE_URL}/api/shortlist/${itemId}`)
      const remaining = []
      for (const item of items.value) {
        if (item.id !== itemId) {
          remaining.push(item)
        }
      }
      items.value = remaining
    } catch (e) {
      // Show our server's message if it sent one, otherwise axios's own (e.g. "Network Error")
      if (e.response && e.response.data && e.response.data.message) {
        error.value = e.response.data.message
      } else {
        error.value = e.message
      }
    }
  }

  // Changes the note of one saved item
  async function updateNote(itemId, note) {
    error.value = ''
    try {
      const response = await axios.patch(`${BASE_URL}/api/shortlist/${itemId}`, { note: note })
      for (const item of items.value) {
        if (item.id === itemId) {
          item.note = response.data.note
        }
      }
    } catch (e) {
      // Show our server's message if it sent one, otherwise axios's own (e.g. "Network Error")
      if (e.response && e.response.data && e.response.data.message) {
        error.value = e.response.data.message
      } else {
        error.value = e.message
      }
    }
  }

  // On logout: forget the list, so the next person does not see it
  function clearShortlist() {
    items.value = []
    error.value = ''
  }

  // You must return every state, getter and action, or pages cannot use them (slide 21)
  return {
    items,
    loading,
    error,
    count,
    fetchShortlist,
    isSaved,
    addToShortlist,
    removeFromShortlist,
    updateNote,
    clearShortlist,
  }
})
