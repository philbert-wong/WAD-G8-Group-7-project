// The list of pages: which view to show for each URL
import { createRouter, createWebHistory } from 'vue-router'
import SearchView from '../views/SearchView.vue'
import ShortlistView from '../views/ShortlistView.vue'
import LoginView from '../views/LoginView.vue'
import CPFCalView from '../views/CPFCalView.vue'
import CompareView from '../views/CompareView.vue' // FEATURE 7 (Jihao): compare shortlisted flats

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
    },
  ],
})

export default router
