<script setup>
// The root component: the navbar on every page, and the current page underneath it
import { RouterView } from 'vue-router'
import NavBar from './components/NavBar.vue'
import ProfileModal from './components/ProfileModal.vue'
import { useAuthStore } from './stores/auth'

// Who is logged in: the sign-up popup shows when a logged-in user has not answered it yet
const auth = useAuthStore()
</script>

<template>
  <NavBar/>

  <!-- Sign-up popup: asks for the town, parents' postal code and starting filters (only until it is answered or skipped) -->
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

