<script setup>
// The Shortlist page: every saved flat with its note
import { onMounted, ref } from 'vue'
import axios from 'axios'
import ShortlistItem from '../components/ShortlistItem.vue'
import { getErrorMessage } from '../utils/errorMessage.js'

// Each item looks like { id, note, createdAt, block: { id, block, street, ... } }
const items = ref([])
const errorMessage = ref('')

// Gets every saved flat from the server
async function load() {
  try {
    const response = await axios.get('/api/shortlist')
    items.value = response.data
  } catch (error) {
    errorMessage.value = getErrorMessage(error)
  }
}

// ShortlistItem sends the item and the new note when "Save note" is pressed
async function changeNote(item, note) {
  errorMessage.value = ''
  try {
    const response = await axios.patch('/api/shortlist/' + item.id, { note: note })
    item.note = response.data.note
  } catch (error) {
    errorMessage.value = getErrorMessage(error)
  }
}

// ShortlistItem sends the item when "Remove" is pressed.
// After the server deletes it, we rebuild the list without that item.
async function removeItem(item) {
  errorMessage.value = ''
  try {
    await axios.delete('/api/shortlist/' + item.id)
    const remaining = []
    for (const savedItem of items.value) {
      if (savedItem.id !== item.id) {
        remaining.push(savedItem)
      }
    }
    items.value = remaining
  } catch (error) {
    errorMessage.value = getErrorMessage(error)
  }
}

// When the page opens, get the latest shortlist from the server
onMounted(load)
</script>

<template>
  <section>
    <h2 class="h4 mb-3">My shortlist ({{ items.length }})</h2>

    <div v-if="errorMessage" class="error-alert alert alert-danger">
      {{ errorMessage }}
    </div>

    <p v-if="items.length === 0" class="text-muted">
      Nothing saved yet. Go to Search and press "Save" on a flat.
    </p>

    <div class="row row-cols-1 row-cols-md-2 g-3">
      <div v-for="item in items" :key="item.id" class="col">
        <ShortlistItem :item="item" @remove="removeItem" @change-note="changeNote" />
      </div>
    </div>
  </section>
</template>

<style scoped>
.error-alert {
  padding: 14px 20px;
  border: 1.5px solid #fecaca;
  border-left: 5px solid #ef4444;   
  border-right: 5px solid #ef4444;
  border-radius: 14px;
  background: #fef2f2;
  color: #991b1b;
  font-size: 15px;
  font-weight: 500;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
}
</style>
