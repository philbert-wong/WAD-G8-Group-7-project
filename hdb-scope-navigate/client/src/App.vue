<script setup>
import { onMounted } from "vue";
import NavBar from "./components/NavBar.vue";
import { useAuthStore } from "./stores/auth.js";
import { useShortlistStore } from "./stores/shortlist.js";
import { usePreferencesStore } from "./stores/preferences.js";

const auth = useAuthStore();
const shortlist = useShortlistStore();
const prefs = usePreferencesStore();

// Already signed in from an earlier visit: bring the account's data back.
onMounted(() => {
  if (auth.isSignedIn) {
    shortlist.load();
    prefs.load();
  }
});
</script>

<!-- OWNER: Frontend — Shell & UI -->
<template>
  <div class="app-shell">
    <NavBar />
    <main class="app-main">
      <RouterView />
    </main>
  </div>
</template>
