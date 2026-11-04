<script setup>
// The root component: the navbar on every page, and the current page underneath it
import { RouterView, useRoute } from 'vue-router'
import NavBar from './components/NavBar.vue'
import ProfileModal from './components/ProfileModal.vue'
import GuideTour from './components/GuideTour.vue'
import { useAuthStore } from './stores/auth'

// The presets popup: only for a logged-out visitor with no saved presets who has not skipped it (see needsProfile in stores/auth.js)
const auth = useAuthStore()

// The current page: the Map gets a wider page (see .wide-page below), so the map has more room on big screens
const route = useRoute()
</script>

<template>
  <NavBar/>

  <!-- Presets popup: asks for the town, parents' postal code and starting filters (first visit only: logged out, no saved presets, not skipped before) -->
  <ProfileModal v-if="auth.needsProfile" />

  <main class="container pt-4 pb-5" :class="{ 'wide-page': route.path === '/map' }">
    <!-- Help: the round "?" button bottom-right on every page, the tour of the page, and (first visit to a page)
         a one-line "Take the tour?" invitation at the top of the page, in the page itself so it never covers it -->
    <GuideTour />
    <RouterView/>
  </main>


  <footer class="cosy-footer">
    <div class="container d-flex justify-content-between flex-wrap gap-2">
      <span>Prices are real HDB resale sales from data.gov.sg (last 12 months).</span>
      <span>HDB Resale Finder</span>
    </div>
  </footer>
</template>

<style>
/* The Map page: a little wider than Bootstrap's container (at most 1320px), so big screens do not have wide empty sides.
   Only takes effect on screens wider than 1320px; smaller screens look the same as before. */
.wide-page {
  max-width: 1480px;
}
/* Phones and tablets: the Map page starts closer to the top bar (12px instead of pt-4's 24px), so more map shows.
   !important is needed because Bootstrap's pt-4 class uses !important too. */
@media (max-width: 991.98px) {
  .wide-page {
    padding-top: 12px !important;
  }
}
/* Phones held sideways: even closer (4px) */
@media (max-width: 991.98px) and (max-height: 500px) {
  .wide-page {
    padding-top: 4px !important;
  }
}
</style>
