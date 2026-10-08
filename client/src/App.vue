<script setup>
import { onMounted } from 'vue';
import AppNavbar from './components/AppNavbar.vue';
import { useShortlistStore } from './stores/shortlist.js';

const shortlist = useShortlistStore();
onMounted(() => shortlist.load());
</script>

<template>
  <AppNavbar />
  <main class="flex-grow-1">
    <RouterView />
  </main>
  <footer class="site-footer border-top py-4 mt-5">
    <div class="container small text-body-secondary d-flex flex-column flex-md-row gap-2 justify-content-between">
      <span>
        Prices are transacted HDB resale prices from
        <a href="https://data.gov.sg/datasets/d_8b84c4ee58e3cfc0ece0d773c8ca6abc/view" target="_blank" rel="noopener">data.gov.sg</a>,
        not asking prices. Trends and estimates are indicative only and are not financial advice.
      </span>
      <span class="text-nowrap">Maps &amp; search &copy; <a href="https://www.onemap.gov.sg" target="_blank" rel="noopener">OneMap</a></span>
    </div>
  </footer>
</template>
