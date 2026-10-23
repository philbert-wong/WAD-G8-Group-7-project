<script setup>
// The dark bar at the top with links to the two pages
import { RouterLink, useRoute } from 'vue-router'

// The current URL, so we can highlight the page we are on
const route = useRoute()
</script>

<template>
  <nav class="top-nav navbar">
    <div class="container">
      <span class="navbar-brand">
        <RouterLink to="/" style="text-decoration: none;" class="brand">
          HDB Resale Finder
        </RouterLink>
      </span>
      <div class="left-group">
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
        <div>
          <RouterLink to="/login">
            <svg 
            xmlns="http://w3.org" 
            viewBox="0 0 24 24" 
            width="24" 
            height="24" 
            fill="currentColor"
          >
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
          <span>Login</span>
          </RouterLink>
        </div>
      </div>
      <!-- <div class="nav-pills-group">
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
      <div>
        <RouterLink to="/login">
          <svg 
          xmlns="http://w3.org" 
          viewBox="0 0 24 24" 
          width="24" 
          height="24" 
          fill="currentColor"
        >
          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
        </svg>
        <span>Login</span>
        </RouterLink>
      </div> -->
    </div>
  </nav>
</template>
<style scoped>

.top-nav {
  position: sticky;
  top: 0;
  z-index: 1000;
  width: 100%;

  padding: 20px 0;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.04);
  background: rgba(214, 234, 255, 0.45);
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
  
}


.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #111827;
  font-size: 20px;
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

.left-group {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

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


.nav-pill.active {
  background: #ffffff;
  color: #4f46e5;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
}

.nav-pill:focus-visible {
  outline: 2px solid #4f46e5;
  outline-offset: 2px;
}

.account-pill {
  
  padding: 4px;
  border-radius: 999px;
  background: #f3f4f6;
}
</style>