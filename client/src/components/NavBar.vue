<script setup>
// The white bar at the top with the logo, page tabs, and Login / Logout on the right
import { onMounted } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useShortlistStore } from '../stores/shortlist'

// The current URL, so we can underline the page we are on
const route = useRoute()
const router = useRouter()

// Pinia stores (Week 11): who is logged in, and the shortlist (for "Shortlist (3)", like MiniShop's "Cart (3)")
const auth = useAuthStore()
const shortlist = useShortlistStore()

// The page tabs, in order
const tabs = [
  { to: '/', label: 'Search' },
  { to: '/map', label: 'Map' },
  { to: '/CPFCal', label: 'Affordability' },
  { to: '/compare', label: 'Compare' },
  { to: '/shortlist', label: 'Shortlist' },
]

// "Logout" button: forget the login and the shortlist, then go to the Login page
function onLogout() {
  auth.logout()
  shortlist.clearShortlist()
  router.push('/login')
}

// When the website opens and someone is already logged in, load the shortlist so the count is right on every page
onMounted(function () {
  if (auth.isLoggedIn) {
    shortlist.fetchShortlist()
  }
})
</script>

<template>
  <nav class="navx">
    <div class="container d-flex align-items-center justify-content-between flex-wrap">
      <RouterLink to="/" class="logo">
        <span class="mark">🏠</span>
        <span><b>HDB</b> Resale Finder</span>
      </RouterLink>

      <!-- Page tabs: hidden on small screens (Bootstrap d-none d-lg-block) -->
      <div class="tabs d-none d-lg-block">
        <RouterLink v-for="tab in tabs" :key="tab.to" :to="tab.to" :class="{ act: route.path === tab.to }">
          {{ tab.label }}
          <span v-if="tab.to === '/shortlist' && auth.isLoggedIn">({{ shortlist.count }})</span>
        </RouterLink>
      </div>

      <!-- Logged in: email + Logout. Logged out: a Login button. -->
      <div v-if="auth.isLoggedIn" class="d-flex align-items-center gap-2">
        <span class="small text-muted d-none d-sm-inline">{{ auth.user.email }}</span>
        <!-- Profile button (icon + word, same pill as Logout, so it is clear it can be pressed): opens the profile settings page -->
        <RouterLink to="/profile" class="btn-short account" :class="{ act: route.path === '/profile' }" title="Your profile">
          <svg width="16" height="16"viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
          </svg>
          Profile
        </RouterLink>
        <button class="btn-short" @click="onLogout">Logout</button>
      </div>
      <RouterLink v-else to="/login" class="btn-short">Login</RouterLink>

      <!-- Small screens: the tabs as a scrollable row under the logo -->
      <div class="tabs-small d-lg-none w-100">
        <RouterLink v-for="tab in tabs" :key="tab.to" :to="tab.to" :class="{ act: route.path === tab.to }">
          {{ tab.label }}
          <span v-if="tab.to === '/shortlist' && auth.isLoggedIn">({{ shortlist.count }})</span>
        </RouterLink>
      </div>
    </div>
  </nav>
</template>

<style scoped>
/* White bar with a bottom border */
.navx {
  background: #fff;
  border-bottom: 1px solid var(--line);
}

/* Logo: bold text, "HDB" in the serif font and terracotta */
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
/* Square logo mark, centred with Grid */
.logo .mark {
  width: 30px;
  height: 30px;
  border-radius: 9px;
  display: grid;
  place-items: center;
  font-size: 15px;
}
/* Gradient fill and glow on the logo mark */
.logo .mark {
  background: linear-gradient(140deg, var(--terra), #d98a63);
  box-shadow: 0 4px 10px rgba(192, 97, 74, 0.35);
}

/* Tabs: grey links, the current one is dark with a terracotta underline (border-bottom) */
.tabs a,
.tabs-small a {
  color: var(--muted);
  text-decoration: none;
  font-weight: 500;
  display: inline-block;
  border-bottom: 2px solid transparent;
}
.tabs a {
  padding: 20px 4px;
  margin: 0 12px;
}
.tabs-small {
  overflow-x: auto;
  white-space: nowrap;
}
.tabs-small a {
  padding: 6px 2px 10px;
  margin-right: 16px;
}
.tabs a.act,
.tabs-small a.act {
  color: var(--char);
  border-color: var(--terra);
}
.tabs a:hover {
  color: var(--terra);
}

/* Profile button: the Login / Logout pill (below) with the icon next to the word;
   terracotta outline and text while we are on the profile page */
.account {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.account.act {
  border-color: var(--terra);
  color: var(--terra);
}

/* Login / Logout pill button */
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
