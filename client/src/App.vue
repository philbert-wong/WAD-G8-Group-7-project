<script setup>
// The root component: the navbar on every page, and the current page underneath it
import { RouterView } from 'vue-router'
import NavBar from './components/NavBar.vue'
import { useShortlistStore } from './stores/shortlist.js'

const shortlist = useShortlistStore()
</script>

<template>
  <NavBar :saved-count="shortlist.count" />

  <main class="container py-4">
    <RouterView />
  </main>
</template>
