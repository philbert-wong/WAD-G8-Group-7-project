<script setup>
import { onMounted, ref } from 'vue'
import NavBar from './components/NavBar.vue'
import SearchView from './views/SearchView.vue'
import ShortlistView from './views/ShortlistView.vue'
import * as api from './api.js'

const page = ref('search') // 'search' or 'shortlist'
const shortlist = ref([])
const error = ref('')

// Runs an API call and shows any error on the page
async function attempt(action) {
  error.value = ''
  try {
    await action()
  } catch (err) {
    error.value = err.message
  }
}

function loadShortlist() {
  return attempt(async () => {
    shortlist.value = await api.getShortlist()
  })
}

function save(block) {
  return attempt(async () => {
    await api.addToShortlist(block.id)
    await loadShortlist()
  })
}

function remove(item) {
  return attempt(async () => {
    await api.removeFromShortlist(item.id)
    shortlist.value = shortlist.value.filter((i) => i.id !== item.id)
  })
}

// Used by the Save button on a search card: it knows the block, not the shortlist item
function removeByBlock(block) {
  const item = shortlist.value.find((i) => i.block.id === block.id)
  if (item) return remove(item)
}

function changeNote({ item, note }) {
  return attempt(async () => {
    const updated = await api.updateNote(item.id, note)
    item.note = updated.note
  })
}

onMounted(loadShortlist)
</script>

<template>
  <NavBar :page="page" :saved-count="shortlist.length" @change-page="page = $event" />

  <main class="container py-4">
    <div v-if="error" class="alert alert-danger">{{ error }}</div>

    <!-- v-show (not v-if) keeps your search and filters when you visit the shortlist and come back -->
    <SearchView
      v-show="page === 'search'"
      :shortlist="shortlist"
      @save="save"
      @unsave="removeByBlock"
    />
    <ShortlistView
      v-show="page === 'shortlist'"
      :shortlist="shortlist"
      @remove="remove"
      @change-note="changeNote"
    />
  </main>
</template>
