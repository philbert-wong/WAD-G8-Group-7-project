<script setup>
// The dark bar at the top with links to the two pages, and Login / Logout on the right
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { currentUser, logout } from '../utils/auth.js'

// The current URL, so we can highlight the page we are on
const route = useRoute()
const router = useRouter()

// "Logout" button: forget the login, then go to the Login page
function onLogout() {
  logout()
  router.push('/login')
}
</script>

<template>
  <nav class="navbar navbar-dark bg-dark">
    <div class="container">
      <span class="navbar-brand">HDB Resale Finder</span>

      <div class="btn-group">
        <RouterLink
          to="/"
          class="btn btn-sm"
          :class="{ 'btn-light': route.path === '/', 'btn-outline-light': route.path !== '/' }"
        >
          Search
        </RouterLink>
        <RouterLink
          to="/shortlist"
          class="btn btn-sm"
          :class="{
            'btn-light': route.path === '/shortlist',
            'btn-outline-light': route.path !== '/shortlist',
          }"
        >
          Shortlist
        </RouterLink>
      </div>

      <!-- Logged in: email + Logout. Logged out: a Login button. -->
      <div v-if="currentUser" class="d-flex align-items-center gap-2">
        <span class="text-light small">{{ currentUser.email }}</span>
        <button class="btn btn-sm btn-outline-light" @click="onLogout">Logout</button>
      </div>
      <RouterLink
        v-else
        to="/login"
        class="btn btn-sm"
        :class="{ 'btn-light': route.path === '/login', 'btn-outline-light': route.path !== '/login' }"
      >
        Login
      </RouterLink>
    </div>
  </nav>
</template>
