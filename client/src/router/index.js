// The list of pages: which view to show for each URL
import { createRouter, createWebHistory } from 'vue-router'
import SearchView from '../views/SearchView.vue'
import ShortlistView from '../views/ShortlistView.vue'
import LoginView from '../views/LoginView.vue'
import CPFCalView from '../views/CPFCalView.vue'
import CompareView from '../views/CompareView.vue' // FEATURE 7 (Jihao): compare shortlisted flats
import MapView from '../views/MapView.vue' // map of every block + PHG circle

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
  ],
})

// Navigation guard (Week 11 slides 35-36): runs before every page change.
// A page with meta.requiresAuth needs a logged-in user; otherwise go to /login,
// and remember the page in ?redirect=... so LoginView can send the user back after logging in.
// (This is only for the user experience: the server still checks the token on every shortlist call.)
router.beforeEach(function (to) {
  if (!to.meta.requiresAuth) {
    return true
  }

  const auth = useAuthStore()
  if (auth.isLoggedIn) {
    return true
  }

  return { path: '/login', query: { redirect: to.fullPath } }
})

export default router
