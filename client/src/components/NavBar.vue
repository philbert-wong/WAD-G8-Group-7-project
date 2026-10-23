<script setup>
// DESIGN PREVIEW (Cosy Professional): the white bar at the top with the logo and page tabs
import { RouterLink, useRoute } from 'vue-router'

// The current URL, so we can underline the page we are on
const route = useRoute()
</script>

<template>
  <nav class="navx">
    <div class="container d-flex align-items-center justify-content-between">
      <RouterLink to="/" class="logo">
        <span class="mark">🏠</span>
        <span><b>HDB</b> Resale Finder</span>
      </RouterLink>

      <!-- Page tabs: hidden on phones (Bootstrap d-none d-md-block) -->
      <div class="tabs d-none d-md-block">
        <RouterLink to="/" :class="{ act: route.path === '/' }">Search</RouterLink>
        <RouterLink to="/shortlist" :class="{ act: route.path === '/shortlist' }">Shortlist</RouterLink>
      </div>

      <RouterLink to="/shortlist" class="btn-short">My Shortlist</RouterLink>
    </div>
  </nav>
</template>

<style scoped>
/* [COURSE] White bar with a bottom border */
.navx {
  background: #fff;
  border-bottom: 1px solid var(--line);
}

/* [COURSE] Logo: bold text, "HDB" in the serif font and terracotta */
.logo {
  font-weight: 700;
  font-size: 19px;
  color: var(--char);
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 0;
}
.logo b {
  color: var(--terra);
  font-family: 'DM Serif Display', serif;
  font-weight: 400;
  font-size: 22px;
}
/* [COURSE] Square logo mark, centred with Grid */
.logo .mark {
  width: 30px;
  height: 30px;
  border-radius: 9px;
  display: grid;
  place-items: center;
  font-size: 15px;
}
/* [AI-ASSISTED] Gradient fill and glow on the logo mark */
.logo .mark {
  background: linear-gradient(140deg, var(--terra), #d98a63);
  box-shadow: 0 4px 10px rgba(192, 97, 74, 0.35);
}

/* [COURSE] Tabs: grey links, the current one is dark with a terracotta underline (border-bottom) */
.tabs a {
  color: var(--muted);
  text-decoration: none;
  font-weight: 500;
  padding: 20px 4px;
  margin: 0 14px;
  display: inline-block;
  border-bottom: 2px solid transparent;
}
.tabs a.act {
  color: var(--char);
  border-color: var(--terra);
}
.tabs a:hover {
  color: var(--terra);
}

/* [COURSE] "My Shortlist" pill button */
.btn-short {
  border: 1.5px solid var(--char);
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  padding: 6px 14px;
  background: #fff;
  color: var(--char);
  text-transform: uppercase;
  text-decoration: none;
}
.btn-short:hover {
  background: var(--char);
  color: #fff;
}
</style>
