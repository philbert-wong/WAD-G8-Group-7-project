<script setup>
// The dark bar at the top with links to the two pages
import { RouterLink, useRoute } from 'vue-router'


// The current URL, so we can highlight the page we are on
const route = useRoute()
</script>

<template>
  <nav class="top-nav navbar">
    <div class="container-fluid d-flex align-items-center w-100">
      <div class="d-flex align-items-center gap-3">
        <span class="navbar-brand">
          <RouterLink to="/" style="text-decoration: none;" class="brand">
            HDB Resale Finder
          </RouterLink>
        </span>
        <label class="view-switcher">
          <RouterLink
            to="/"
            class="switch-btn" style="text-decoration: none;"
            :class="{ 'active': route.path === '/'}"
          >Search</RouterLink>
          <span class="divider">|</span>
          <RouterLink
            to="/shortlist"
            class="switch-btn" style="text-decoration: none;"
            :class="{ 'active': route.path === '/shortlist'}"
          >Shortlist</RouterLink>
          <span class="divider">|</span>
          <RouterLink
            to="/calculator"
            class="switch-btn" style="text-decoration: none;"
            :class="{ 'active': route.path === '/calculator'}"
          >Affordability Calculator</RouterLink>
        </label>
      </div>
    
      <div class="right-group ms-auto me-2">
          <RouterLink to="/login" style="text-decoration: none;">
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
  font-size: 25px;
  font-weight: 700;
}

 .view-switcher {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 0.95rem;
}

.switch-btn {
  background: none;
  border: none;
  padding: 2px 4px;
  color: #6c757d;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  position: relative;
  transition: color 0.2s ease;
  
}

.switch-btn:hover {
  color: #1e293b;
}

.switch-btn.active {
  color: #0f172a;
  font-weight: 600;
}

.switch-btn.active::after {
  content: "";
  position: absolute;
  bottom: -2px;
  left: 0;
  width: 100%;
  height: 2px;
  background-color: #4f46e5;
  border-radius: 2px;
}

.divider {
  color: #cbd5e1;
  user-select: none;
}
</style>