<script setup>
import { computed } from 'vue';
import { BUDGET_MAX, useSearchStore } from '../stores/search.js';
import { flatTypeLabel, money, titleCase } from '../services/format.js';

const store = useSearchStore();
const filters = store.filters;

const budgetLabel = computed(() => (filters.maxPrice >= BUDGET_MAX ? 'Any price' : `Up to ${money(filters.maxPrice)}`));
const leaseLabel = computed(() => (filters.minLease > 0 ? `At least ${filters.minLease} years` : 'Any lease'));
</script>

<template>
  <form class="filter-panel card border-0 shadow-sm" data-cy="filter-panel" @submit.prevent="store.search()">
    <div class="card-body d-flex flex-column gap-4">
      <div>
        <label for="filter-town" class="form-label fw-semibold">Town</label>
        <select id="filter-town" v-model="filters.town" class="form-select" data-cy="filter-town">
          <option value="">All towns</option>
          <option v-for="town in store.meta?.towns ?? []" :key="town" :value="town">{{ titleCase(town) }}</option>
        </select>
      </div>

      <fieldset>
        <legend class="form-label fw-semibold fs-6">Flat type</legend>
        <div class="d-flex flex-wrap gap-2">
          <template v-for="type in store.meta?.flatTypes ?? []" :key="type">
            <input
              :id="`type-${type}`"
              v-model="filters.flatTypes"
              type="checkbox"
              class="btn-check"
              :value="type"
              autocomplete="off"
              :data-cy="`filter-type-${type.replace(/\s+/g, '-')}`"
            />
            <label class="btn btn-sm btn-outline-primary rounded-pill" :for="`type-${type}`">{{ flatTypeLabel(type) }}</label>
          </template>
        </div>
      </fieldset>

      <div>
        <div class="d-flex justify-content-between align-items-baseline">
          <label for="filter-budget" class="form-label fw-semibold mb-1">Budget</label>
          <span class="small text-primary fw-semibold" data-cy="budget-label">{{ budgetLabel }}</span>
        </div>
        <input
          id="filter-budget"
          v-model.number="filters.maxPrice"
          type="range"
          class="form-range"
          min="200000"
          :max="BUDGET_MAX"
          step="10000"
          data-cy="filter-budget"
        />
        <div class="d-flex justify-content-between small text-body-secondary">
          <span>$200k</span><span>No limit</span>
        </div>
      </div>

      <div>
        <div class="d-flex justify-content-between align-items-baseline">
          <label for="filter-lease" class="form-label fw-semibold mb-1">Remaining lease</label>
          <span class="small text-primary fw-semibold" data-cy="lease-label">{{ leaseLabel }}</span>
        </div>
        <input
          id="filter-lease"
          v-model.number="filters.minLease"
          type="range"
          class="form-range"
          min="0"
          max="95"
          step="5"
          data-cy="filter-lease"
        />
        <div class="d-flex justify-content-between small text-body-secondary">
          <span>Any</span><span>95+ yrs</span>
        </div>
      </div>

      <div class="d-grid gap-2">
        <button type="submit" class="btn btn-primary" data-cy="apply-filters" :disabled="store.loading">
          <i class="bi bi-funnel me-1" aria-hidden="true"></i>Show blocks
        </button>
        <button type="button" class="btn btn-link btn-sm text-body-secondary" data-cy="reset-filters" @click="store.resetFilters()">
          Reset filters
        </button>
      </div>
    </div>
  </form>
</template>
