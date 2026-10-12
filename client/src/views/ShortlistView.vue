<script setup>
// The Shortlist page: every saved flat with its note
import { onMounted } from 'vue'
import ShortlistItem from '../components/ShortlistItem.vue'
import { useShortlistStore } from '../stores/shortlist.js'

const shortlist = useShortlistStore()

// When the page opens, get the latest shortlist from the server
onMounted(shortlist.load)

// ShortlistItem sends { item, note } when "Save note" is pressed
function changeNote(data) {
  shortlist.updateNote(data.item, data.note)
}

// ShortlistItem sends the item when "Remove" is pressed
function removeItem(item) {
  shortlist.remove(item)
}
</script>

<template>
  <section>
    <h2 class="h4 mb-3">My shortlist</h2>

    <div v-if="shortlist.errorMessage" class="alert alert-danger">
      {{ shortlist.errorMessage }}
    </div>

    <p v-if="shortlist.count === 0" class="text-muted">
      Nothing saved yet. Go to Search and press "Save" on a flat.
    </p>

    <div class="row row-cols-1 row-cols-md-2 g-3">
      <div v-for="item in shortlist.items" :key="item.id" class="col">
        <ShortlistItem :item="item" @remove="removeItem" @change-note="changeNote" />
      </div>
    </div>
  </section>
</template>
