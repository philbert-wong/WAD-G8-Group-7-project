// The list of pages: which view to show for each URL
import { createRouter, createWebHistory } from 'vue-router'
import SearchView from '../views/SearchView.vue'
import ShortlistView from '../views/ShortlistView.vue'
import LoginView from '../views/LoginView.vue'
import CalculatorView from '../views/CalculatorView.vue'
import IndivBlockView from '../views/IndivBlockView.vue'

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
      path: '/calculator',
      name: 'calculator',
      component: CalculatorView,
    },
    {
      path: '/block/:id',
      name: 'block-detail',
      component: IndivBlockView,
    }
  ],
})

export default router
