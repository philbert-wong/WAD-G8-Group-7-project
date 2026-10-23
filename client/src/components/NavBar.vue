<script setup>
// The dark bar at the top with links to the two pages
import { RouterLink, useRoute } from 'vue-router'

// The current URL, so we can highlight the page we are on
const route = useRoute()
</script>

<template>
  <nav class="top-nav navbar">
    <div class="container">
      <span class="brand navbar-brand">HDB Resale Finder</span>

      <div class="nav-pills-group">
        <RouterLink
          to="/"
          class="nav-pill"
          :class="{ 'active': route.path === '/' }"
        >
          Search
        </RouterLink>
        <RouterLink
          to="/shortlist"
          class="nav-pill"
          :class="{
            'active': route.path === '/shortlist'}"
        >
          Shortlist
        </RouterLink>
      </div>
    </div>
  </nav>
</template>
<style scoped>

.top-nav {
  padding: 20px 0;
  background: #d6eaff;
  border-bottom: 1px solid #e5e7eb;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.04);
}


.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #111827;
  font-size: 18px;
  font-weight: 700;
}

/* .brand-mark {
  padding: 3px 9px;
  border-radius: 8px;
  background: #4f46e5;
  color: #ffffff;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.04em;
} */


.nav-pills-group {
  display: flex;
  gap: 4px;
  padding: 4px;
  border-radius: 999px;
  background: #f3f4f6;
}

.nav-pill {
  padding: 6px 18px;
  border-radius: 999px;
  color: #6b7280;
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  transition: background 0.15s ease, color 0.15s ease;
}

.nav-pill:hover {
  color: #111827;
}

/* the page you are on: white pill with a soft shadow */
.nav-pill.active {
  background: #ffffff;
  color: #4f46e5;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
}

.nav-pill:focus-visible {
  outline: 2px solid #4f46e5;
  outline-offset: 2px;
}
</style>