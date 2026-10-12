<script setup>
// The root component: the navbar on every page, and the current page underneath it
import { RouterView } from 'vue-router'
import NavBar from './components/NavBar.vue'
</script>

<template>
  <NavBar />

  <main class="container py-4">
    <RouterView />
  </main>
</template>
