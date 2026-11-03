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

// The page tabs, in order.
// short + icon are only for the phone tab bar at the bottom (icon = the SVG drawing for that page)
const tabs = [
  { to: '/', label: 'Search', short: 'Search', icon: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4' },
  { to: '/map', label: 'Map', short: 'Map', icon: 'M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14' },
  { to: '/CPFCal', label: 'Affordability', short: 'Afford', icon: 'M4 7h16v12H4zM4 11h16M8 15h3' },
  { to: '/compare', label: 'Compare', short: 'Compare', icon: 'M5 4v16M19 4v16M5 8h6M13 12h6M5 16h6' },
  { to: '/shortlist', label: 'Shortlist', short: 'Shortlist', icon: 'M12 4l2.5 5 5.5.8-4 3.9.9 5.5-4.9-2.6-4.9 2.6.9-5.5-4-3.9 5.5-.8z' },
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

      <!-- Logged in: Profile + Logout. Logged out: Presets + Login. Same place, same pills, so "my settings" are always top right. -->
      <div v-if="auth.isLoggedIn" class="d-flex align-items-center gap-2">
        <!-- Profile button (icon + word, same pill as Logout, so it is clear it can be pressed): opens the profile settings page.
             The email is in the tooltip (and on the profile page), so the bar stays on one line. -->
        <RouterLink
          to="/profile"
          class="btn-short account"
          :class="{ act: route.path === '/profile' }"
          :title="'Your profile (' + auth.user.email + ')'"
          aria-label="Your profile"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
          </svg>
          <!-- The word only from sm up: on a phone the pill keeps just the icon, so it fits next to the logo -->
          <span class="d-none d-sm-inline">Profile</span>
        </RouterLink>
        <button class="btn-short" @click="onLogout">Logout</button>
      </div>
      <div v-else class="d-flex align-items-center gap-2">
        <!-- Presets button (guests): opens the presets popup again, to change the town, budget... saved on this device -->
        <button type="button" class="btn-short account" title="Change your presets" aria-label="Your presets" @click="auth.openPresets()">
          <!-- Three sliders: the usual "settings / filters" icon -->
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">
            <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12" />
            <circle cx="16" cy="6" r="2" />
            <circle cx="10" cy="12" r="2" />
            <circle cx="18" cy="18" r="2" />
          </svg>
          <span class="d-none d-sm-inline">Presets</span>
        </button>
        <RouterLink to="/login" class="btn-short">Login</RouterLink>
      </div>

    </div>
  </nav>

  <!-- Phones and tablets: the 5 pages as a tab bar fixed to the bottom of the screen, like a phone app.
       Always visible and easy to reach with a thumb. (Bootstrap d-lg-none: hidden from 992px up.) -->
  <nav class="bottom-tabs d-lg-none" aria-label="Pages">
    <RouterLink
      v-for="tab in tabs"
      :key="tab.to"
      :to="tab.to"
      class="bottom-tab"
      :class="{ act: route.path === tab.to }"
      :aria-current="route.path === tab.to ? 'page' : null"
    >
      <span class="tab-icon">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path :d="tab.icon" />
        </svg>
        <!-- Shortlist count as a small badge on the star -->
        <span v-if="tab.to === '/shortlist' && auth.isLoggedIn && shortlist.count > 0" class="tab-badge">{{ shortlist.count }}</span>
      </span>
      <span class="tab-label">{{ tab.short }}</span>
    </RouterLink>
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
.tabs a {
  color: var(--muted);
  text-decoration: none;
  font-weight: 500;
  display: inline-block;
  border-bottom: 2px solid transparent;
  padding: 20px 4px;
  margin: 0 12px;
}
.tabs a.act {
  color: var(--char);
  border-color: var(--terra);
}
.tabs a:hover {
  color: var(--terra);
}

/* Phone tab bar: fixed to the bottom, 5 equal columns (Grid), white with a line on top.
   z-index 1030: above the page and the map (Leaflet goes up to 1000), below the filter drawer (1040+)
   and the popups. env(safe-area-inset-bottom) keeps it above the iPhone home bar. */
.bottom-tabs {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1030;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  background: #fff;
  border-top: 1px solid var(--line);
  padding-bottom: env(safe-area-inset-bottom, 0px);
  box-shadow: 0 -6px 20px rgba(30, 30, 60, 0.06);
}
.bottom-tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 2px 7px;
  min-height: 60px; /* a big enough target for a thumb */
  color: var(--muted);
  text-decoration: none;
  font-size: 11px;
  font-weight: 600;
  border-top: 3px solid transparent;
}
/* The page we are on: accent colour and a bar on top */
.bottom-tab.act {
  color: var(--terra);
  border-top-color: var(--terra);
}
.tab-icon {
  position: relative;
  display: grid;
  place-items: center;
}
.tab-label {
  white-space: nowrap;
}
/* Shortlist count: a small round badge on the top-right of the icon */
.tab-badge {
  position: absolute;
  top: -5px;
  right: -10px;
  min-width: 17px;
  height: 17px;
  padding: 0 4px;
  border-radius: 999px;
  background: var(--terra);
  color: #fff;
  font-size: 10px;
  line-height: 17px;
  text-align: center;
}

/* Profile / Presets buttons: the Login / Logout pill (below) with the icon next to the word;
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
