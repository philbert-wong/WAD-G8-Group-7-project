<script setup>
// The root component: the navbar on every page, and the current page underneath it
import { RouterView } from 'vue-router'
import NavBar from './components/NavBar.vue'
import ProfileModal from './components/ProfileModal.vue'
import { useAuthStore } from './stores/auth'

// The presets popup: after every refresh when logged out, until answered when logged in (see needsProfile in stores/auth.js)
const auth = useAuthStore()
</script>

<template>
  <NavBar/>

  <!-- Presets popup: asks for the town, parents' postal code and starting filters (logged out: after every refresh; logged in: until answered) -->
  <ProfileModal v-if="auth.needsProfile" />

  <main class="container py-5">
    <RouterView/>
  </main>

  <footer class="cosy-footer">
    <div class="container d-flex justify-content-between flex-wrap gap-2">
      <span>Prices are real HDB resale sales from data.gov.sg (last 12 months).</span>
      <span>HDB Resale Finder</span>
    </div>
  </footer>
</template>

