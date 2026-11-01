<script setup>
// The Shortlist page: every saved flat with its note.
// The list itself lives in the shortlist store (stores/shortlist.js), shared with Search, Compare and the NavBar.
// The route guard (router/index.js) only lets logged-in users open this page.
import { onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import ShortlistItem from '../components/ShortlistItem.vue'
import { useAuthStore } from '../stores/auth'
import { useShortlistStore } from '../stores/shortlist'

const auth = useAuthStore()
const shortlist = useShortlistStore()

// ShortlistItem sends the item and the new note when "Save note" is pressed
function changeNote(item, note) {
  shortlist.updateNote(item.id, note)
}

// ShortlistItem sends the item when "Remove" is pressed
function removeItem(item) {
  shortlist.removeFromShortlist(item.id)
}

// When the page opens, get the latest shortlist from the server (only when logged in)
onMounted(function () {
  if (auth.isLoggedIn) {
    shortlist.fetchShortlist()
  }
})
</script>

<template>
  <section>
    <!-- Serif title, one wide card per row -->
    <span class="eyebrow">Your favourites</span>
    <h1 class="page-title serif">My <em>shortlist</em> ({{ shortlist.count }})</h1>
    <p class="page-sub mb-4">Keep notes on the flats you like and compare them later.</p>

    <!-- The shortlist belongs to an account (the route guard normally sends logged-out users to /login first) -->
    <p v-if="!auth.isLoggedIn" class="text-muted">
      Please <RouterLink to="/login">log in</RouterLink> to see your shortlist.
    </p>

    <div v-if="shortlist.error" class="alert alert-danger">
      {{ shortlist.error }}
    </div>

    <p v-if="auth.isLoggedIn && shortlist.count === 0" class="text-muted">
      Nothing saved yet. Go to Search and press "Save" on a flat.
    </p>

    <div class="row row-cols-1 g-3">
      <div v-for="item in shortlist.items" :key="item.id" class="col">
        <ShortlistItem :item="item" @remove="removeItem" @change-note="changeNote" />
      </div>
    </div>
  </section>
</template>
