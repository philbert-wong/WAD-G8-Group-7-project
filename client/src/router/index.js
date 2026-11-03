// The list of pages: which view to show for each URL
import { createRouter, createWebHistory } from 'vue-router'
import SearchView from '../views/SearchView.vue'
import ShortlistView from '../views/ShortlistView.vue'
import LoginView from '../views/LoginView.vue'
import CPFCalView from '../views/CPFCalView.vue'
import CompareView from '../views/CompareView.vue' // FEATURE 7 (Jihao): compare shortlisted flats
import MapView from '../views/MapView.vue' // map of every block + PHG circle
import ProfileView from '../views/ProfileView.vue' // the account icon: profile settings

import { useAuthStore } from '../stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'search',
      component: SearchView,
    },
    {
      path: '/shortlist',
      name: 'shortlist',
      component: ShortlistView,
      meta: { requiresAuth: true }, // only for logged-in users (see the guard below)
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView,
    },
    {
      // The same page, opened on "Create account" (the presets popup's "Save my presets" comes here)
      path: '/createaccount',
      name: 'createaccount',
      component: LoginView,
    },
    {
      path: '/CPFCal',
      name: 'cpfcal',
      component: CPFCalView,
    },
    {
      // FEATURE 7 (Jihao): compare 2-3 shortlisted flats side by side
      path: '/compare',
      name: 'compare',
      component: CompareView,
      meta: { requiresAuth: true }, // only for logged-in users (see the guard below)
    },
    {
      // Map of every block, coloured by price, with the PHG 4 km circle
      path: '/map',
      name: 'map',
      component: MapView,
    },
    {
      // Profile settings (the account icon in the NavBar)
      path: '/profile',
      name: 'profile',
      component: ProfileView,
      meta: { requiresAuth: true }, // only for logged-in users (see the guard below)
    },
  ],
})

// Navigation guard (Week 11 slides 35-36): runs before every page change.
// A page with meta.requiresAuth needs a logged-in user; otherwise go to /login,
// and remember the page in ?redirect=... so LoginView can send the user back after logging in.
// (This is only for the user experience: the server still checks the token on every shortlist call.)
router.beforeEach(async function (to) {
  const auth = useAuthStore()

  // Logged in but the profile is not loaded yet (just logged in, or the page was refreshed):
  // load it BEFORE the page opens, so Search and the Map start with the profile's filters
  if (auth.isLoggedIn && !auth.profileLoaded) {
    await auth.loadProfile()
  }

  if (!to.meta.requiresAuth) {
    return true
  }

  if (auth.isLoggedIn) {
    return true
  }

  return { path: '/login', query: { redirect: to.fullPath } }
})

export default router
