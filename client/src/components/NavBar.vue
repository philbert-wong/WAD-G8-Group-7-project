<script setup>
// The dark bar at the top with links to the two pages
import { RouterLink, useRoute } from 'vue-router'

// The current URL, so we can highlight the page we are on
const route = useRoute()
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
    </div>
  </nav>
</template>
