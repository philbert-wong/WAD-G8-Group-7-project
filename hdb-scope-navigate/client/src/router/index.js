import { createRouter, createWebHistory } from "vue-router";

/** OWNER: Frontend — Shell & UI */
const router = createRouter({
  history: createWebHistory(),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    { path: "/",              name: "landing",       component: () => import("../views/Landing.vue") },
    { path: "/explore",       name: "explore",       component: () => import("../views/Explore.vue") },
    { path: "/trends",        name: "trends",        component: () => import("../views/Trends.vue") },
    { path: "/affordability", name: "affordability", component: () => import("../views/Affordability.vue") },
    { path: "/shortlist",     name: "shortlist",     component: () => import("../views/Shortlist.vue"), meta: { auth: true } },
    { path: "/compare",       name: "compare",       component: () => import("../views/Compare.vue") },
    { path: "/login",         name: "login",         component: () => import("../views/Login.vue") },
    { path: "/register",      name: "register",      component: () => import("../views/Register.vue") },
    { path: "/:pathMatch(.*)*", name: "not-found",   component: () => import("../views/NotFound.vue") },
  ],
});

// Pages that need an account send you to sign in, then bring you back.
router.beforeEach((to) => {
  if (to.meta.auth && !localStorage.getItem("token")) {
    return { name: "login", query: { redirect: to.fullPath } };
  }
});

export default router;
