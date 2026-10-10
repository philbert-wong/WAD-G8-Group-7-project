<script setup>
import { ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth.js";
import { useShortlistStore } from "../stores/shortlist.js";

import SearchBox from "../components/SearchBox.vue";

/** OWNER: Frontend — Shell & UI */
const auth = useAuthStore();
const shortlist = useShortlistStore();
const route = useRoute();
const router = useRouter();

const open = ref(false);   // the collapsed menu on phones
watch(() => route.fullPath, () => { open.value = false; });

function signOut() {
  auth.logout();
  router.push("/");
}
</script>

<template>
  <nav class="navbar navbar-expand-md bg-white border-bottom px-3 app-nav">
    <RouterLink class="navbar-brand fw-semibold d-flex align-items-center gap-2" to="/">
      <span class="brand-mark" aria-hidden="true">H</span>
      <span>HDB Scope &amp; Navigate</span>
    </RouterLink>

    <button class="navbar-toggler" type="button" aria-label="Toggle navigation"
            :aria-expanded="open" data-cy="nav-toggle" @click="open = !open">
      <span class="navbar-toggler-icon"></span>
    </button>

    <div class="navbar-collapse" :class="open ? 'collapse show' : 'collapse'">
      <ul class="navbar-nav me-auto mb-2 mb-md-0">
        <li class="nav-item"><RouterLink class="nav-link" to="/explore" data-cy="nav-explore">Explore</RouterLink></li>
        <li class="nav-item"><RouterLink class="nav-link" to="/trends" data-cy="nav-trends">Trends</RouterLink></li>
        <li class="nav-item"><RouterLink class="nav-link" to="/affordability" data-cy="nav-afford">Affordability</RouterLink></li>
        <li class="nav-item">
          <RouterLink class="nav-link" to="/shortlist" data-cy="nav-shortlist">
            Shortlist
            <span v-if="auth.isSignedIn && shortlist.items.length" class="badge text-bg-secondary ms-1">
              {{ shortlist.items.length }}
            </span>
          </RouterLink>
        </li>
        <li class="nav-item">
          <RouterLink class="nav-link" to="/compare" data-cy="nav-compare">
            Compare
            <span v-if="shortlist.compareIds.length" class="badge text-bg-secondary ms-1">
              {{ shortlist.compareIds.length }}
            </span>
          </RouterLink>
        </li>
      </ul>

      <div class="navbar-search me-auto mb-2 mb-md-0" v-if="route.path === '/explore'">
        <SearchBox></SearchBox>
      </div>

      <div class="d-flex gap-2 align-items-center flex-wrap">
        <template v-if="auth.isSignedIn">
          <span class="small text-muted text-truncate nav-email" data-cy="nav-email">{{ auth.email }}</span>
          <button class="btn btn-sm btn-outline-secondary" data-cy="nav-signout" @click="signOut">Sign out</button>
        </template>
        <template v-else>
          <RouterLink class="btn btn-sm btn-outline-secondary" to="/register" data-cy="nav-register">Register</RouterLink>
          <RouterLink class="btn btn-sm btn-primary" to="/login" data-cy="nav-signin">Sign in</RouterLink>
        </template>
      </div>
    </div>
  </nav>
</template>
