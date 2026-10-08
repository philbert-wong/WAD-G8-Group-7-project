<script setup>
import { useShortlistStore } from '../stores/shortlist.js';

const shortlist = useShortlistStore();
</script>

<template>
  <nav class="navbar navbar-expand-md app-navbar sticky-top" data-bs-theme="dark" aria-label="Main navigation">
    <div class="container">
      <RouterLink class="navbar-brand d-flex align-items-center gap-2 fw-semibold" to="/">
        <img src="/favicon.svg" alt="" width="28" height="28" />
        HDB Resale Explorer
      </RouterLink>
      <button
        class="navbar-toggler"
        type="button"
        data-bs-toggle="collapse"
        data-bs-target="#main-nav"
        aria-controls="main-nav"
        aria-expanded="false"
        aria-label="Toggle navigation"
      >
        <span class="navbar-toggler-icon"></span>
      </button>
      <div id="main-nav" class="collapse navbar-collapse">
        <ul class="navbar-nav ms-auto gap-md-2">
          <li class="nav-item">
            <RouterLink class="nav-link" active-class="active" exact-active-class="active" to="/" data-cy="nav-search">
              <i class="bi bi-search me-1" aria-hidden="true"></i>Search
            </RouterLink>
          </li>
          <li class="nav-item">
            <RouterLink class="nav-link" active-class="active" to="/shortlist" data-cy="nav-shortlist">
              <i class="bi bi-bookmark-heart me-1" aria-hidden="true"></i>Shortlist
              <span v-if="shortlist.count" class="badge rounded-pill text-bg-warning ms-1" data-cy="shortlist-count">
                {{ shortlist.count }}
              </span>
            </RouterLink>
          </li>
        </ul>
      </div>
    </div>
  </nav>
</template>
