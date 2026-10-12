<script setup>
import { onMounted, ref } from 'vue'
import NavBar from './components/NavBar.vue'
import SearchView from './views/SearchView.vue'
import ShortlistView from './views/ShortlistView.vue'
import { useShortlistStore } from './stores/shortlist.js'

const shortlist = useShortlistStore()

const page = ref('search') // 'search' or 'shortlist'

// Changes which page is shown when a navbar button is clicked
function changePage(newPage) {
  page.value = newPage
}

onMounted(shortlist.load)
</script>

<template>
  <NavBar :page="page" :saved-count="shortlist.count" @change-page="changePage" />

  <main class="container py-4">
    <div v-if="shortlist.errorMessage" class="alert alert-danger">
      {{ shortlist.errorMessage }}
    </div>

    <SearchView v-show="page === 'search'" />
    <ShortlistView v-show="page === 'shortlist'" />
  </main>
</template>
