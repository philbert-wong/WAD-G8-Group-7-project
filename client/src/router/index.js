// The list of pages: which view to show for each URL
import { createRouter, createWebHistory } from 'vue-router'
import SearchView from '../views/SearchView.vue'
import ShortlistView from '../views/ShortlistView.vue'

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
  ],
})

export default router
