import { createRouter, createWebHistory } from 'vue-router';
import SearchView from './views/SearchView.vue';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'search', component: SearchView, meta: { title: 'Search' } },
    {
      path: '/blocks/:blockId',
      name: 'block',
      component: () => import('./views/BlockDetailView.vue'),
      meta: { title: 'Block details' },
    },
    {
      path: '/shortlist',
      name: 'shortlist',
      component: () => import('./views/ShortlistView.vue'),
      meta: { title: 'My shortlist' },
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
  scrollBehavior: (_to, _from, saved) => saved ?? { top: 0 },
});

router.afterEach((to) => {
  document.title = `${to.meta.title} · HDB Resale Explorer`;
});
