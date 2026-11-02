<script setup>
// The Shortlist page: every saved flat with its note.
// The list itself lives in the shortlist store (stores/shortlist.js), shared with Search, Compare and the NavBar.
// The route guard (router/index.js) only lets logged-in users open this page.
import { onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import ShortlistItem from '../components/ShortlistItem.vue'
import { useAuthStore } from '../stores/auth'
import { useShortlistStore } from '../stores/shortlist'
import { CATEGORIES, getWeights, makeDefaultPreferences, matchScore, MAX_DISTANCES } from '../utils/matchScore.js'


const auth = useAuthStore()
const shortlist = useShortlistStore()

// Your Priorities (school, MRT, hawker, park), the same ones Search, Compare and the Map use.
// Search saves them in localStorage as 'matchPreferences'; we start from those (or the defaults).
function loadSavedPreferences() {
  const choices = makeDefaultPreferences()
  const saved = localStorage.getItem('matchPreferences')
  if (saved !== null) {
    const savedPanel = JSON.parse(saved)
    for (const category of CATEGORIES) {
      if (savedPanel[category.key]) {
        choices[category.key] = savedPanel[category.key]
      }
    }
  }
  return choices
}
const weights = getWeights(loadSavedPreferences())

// Match score for one saved flat, or null when it cannot be scored (the card then shows "–")
function scoreFor(block) {
  return matchScore(block.distances, weights, MAX_DISTANCES)
}


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
        <ShortlistItem :item="item" :score="scoreFor(item.block)" @remove="removeItem" @change-note="changeNote" />
      </div>
    </div>
  </section>
</template>
