<script setup>
// The root component: the navbar on every page, and the current page underneath it
import { RouterView } from 'vue-router'
import NavBar from './components/NavBar.vue'
import ProfileModal from './components/ProfileModal.vue'
import GuideTour from './components/GuideTour.vue'
import { useAuthStore } from './stores/auth'

// The presets popup: only when logged out, after every refresh (see needsProfile in stores/auth.js)
const auth = useAuthStore()
</script>

<template>
  <NavBar/>

  <!-- Presets popup: asks for the town, parents' postal code and starting filters (logged out only, after every refresh) -->
  <ProfileModal v-if="auth.needsProfile" />

  <main class="container py-5">
    <RouterView/>
  </main>

  <!-- Help: the round "?" button bottom-right on every page, and the tour of the page (see GuideTour.vue) -->
  <GuideTour />

  <footer class="cosy-footer">
    <div class="container d-flex justify-content-between flex-wrap gap-2">
      <span>Prices are real HDB resale sales from data.gov.sg (last 12 months).</span>
      <span>HDB Resale Finder</span>
    </div>
  </footer>
</template>

