<script setup>
// "What matters to you?" panel.
// "preferences" is an object owned by the parent ({ school: { ticked, level }, ... });
// we change its fields directly with v-model, so the parent's match scores update straight away.
import { CATEGORIES, IMPORTANCE_LEVELS } from '../matchScore.js'

defineProps({
  preferences: Object,
})
</script>

<template>
  <div class="card shadow-sm mt-3">
    <div class="card-body">
      <h6 class="card-title">What matters to you?</h6>

      <div
        v-for="category in CATEGORIES"
        :key="category.key"
        class="row g-2 align-items-center mb-2"
      >
        <!-- Tick box: unticked means this category is ignored (weight 0) -->
        <div class="col-12 col-md-4">
          <div class="form-check">
            <input
              :id="'matters-' + category.key"
              v-model="preferences[category.key].ticked"
              type="checkbox"
              class="form-check-input"
            />
            <label :for="'matters-' + category.key" class="form-check-label">{{
              category.label
            }}</label>
          </div>
        </div>

        <!-- How important it is: Low (1) to Extremely (5). Greyed out when unticked. -->
        <div class="col-12 col-md-8">
          <div class="btn-group btn-group-sm flex-wrap" role="group">
            <template v-for="level in IMPORTANCE_LEVELS" :key="level.value">
              <input
                :id="'level-' + category.key + '-' + level.value"
                v-model="preferences[category.key].level"
                type="radio"
                class="btn-check"
                :name="'level-' + category.key"
                :value="level.value"
                :disabled="!preferences[category.key].ticked"
              />
              <label
                class="btn btn-outline-primary"
                :for="'level-' + category.key + '-' + level.value"
              >
                {{ level.label }}
              </label>
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
