<script setup>
// The Shortlist page: every saved flat with its note
import { onMounted, ref } from 'vue'
import axios from 'axios'
import { RouterLink } from 'vue-router'
import ShortlistItem from '../components/ShortlistItem.vue'
import { currentUser, isLoggedIn } from '../utils/auth.js'

// Our Express server's address (class style: the full URL, like wk5/wk6 code-along App.vue)
const BASE_URL = 'http://localhost:8000'

// Each item looks like { id, note, createdAt, block: { id, block, street, ... } }
const items = ref([])
const errorMessage = ref('')

// Gets every saved flat from the server
async function load() {
  try {
    const response = await axios.get(`${BASE_URL}/api/shortlist`)
    items.value = response.data
  } catch (error) {
    // Show our server's message if it sent one, otherwise axios's own (e.g. "Network Error")
    if (error.response && error.response.data && error.response.data.message) {
      errorMessage.value = error.response.data.message
    } else {
      errorMessage.value = error.message
    }
  }
}

// ShortlistItem sends the item and the new note when "Save note" is pressed
async function changeNote(item, note) {
  errorMessage.value = ''
  try {
    const response = await axios.patch(`${BASE_URL}/api/shortlist/${item.id}`, { note: note })
    item.note = response.data.note
  } catch (error) {
    // Show our server's message if it sent one, otherwise axios's own (e.g. "Network Error")
    if (error.response && error.response.data && error.response.data.message) {
      errorMessage.value = error.response.data.message
    } else {
      errorMessage.value = error.message
    }
  }
}

// ShortlistItem sends the item when "Remove" is pressed.
// After the server deletes it, we rebuild the list without that item.
async function removeItem(item) {
  errorMessage.value = ''
  try {
    await axios.delete(`${BASE_URL}/api/shortlist/${item.id}`)
    const remaining = []
    for (const savedItem of items.value) {
      if (savedItem.id !== item.id) {
        remaining.push(savedItem)
      }
    }
    items.value = remaining
  } catch (error) {
    // Show our server's message if it sent one, otherwise axios's own (e.g. "Network Error")
    if (error.response && error.response.data && error.response.data.message) {
      errorMessage.value = error.response.data.message
    } else {
      errorMessage.value = error.message
    }
  }
}

// When the page opens, get the latest shortlist from the server (only when logged in)
onMounted(function () {
  if (isLoggedIn()) {
    load()
  }
})
</script>

<template>
  <section>
    <!-- DESIGN PREVIEW (Cosy Professional): serif title, one wide card per row -->
    <span class="eyebrow">Your favourites</span>
    <h1 class="page-title serif">My <em>shortlist</em> ({{ items.length }})</h1>
    <p class="page-sub mb-4">Keep notes on the flats you like and compare them later.</p>

    <!-- The shortlist belongs to an account -->
    <p v-if="!currentUser" class="text-muted">
      Please <RouterLink to="/login">log in</RouterLink> to see your shortlist.
    </p>

    <div v-if="errorMessage" class="alert alert-danger">
      {{ errorMessage }}
    </div>

    <p v-if="currentUser && items.length === 0" class="text-muted">
      Nothing saved yet. Go to Search and press "Save" on a flat.
    </p>

    <div class="row row-cols-1 g-3">
      <div v-for="item in items" :key="item.id" class="col">
        <ShortlistItem :item="item" @remove="removeItem" @change-note="changeNote" />
      </div>
    </div>
  </section>
</template>
