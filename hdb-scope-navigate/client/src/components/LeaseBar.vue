<script setup>
import { computed } from "vue";

/** Remaining lease out of 99 years. OWNER: Frontend — Data Views */
const props = defineProps({ years: { type: Number, default: null } });
const pct = computed(() => Math.max(0, Math.min(100, ((props.years ?? 0) / 99) * 100)));
const tone = computed(() => (props.years >= 60 ? "bg-success" : props.years >= 30 ? "bg-warning" : "bg-danger"));
</script>

<template>
  <div v-if="years != null" data-cy="lease-bar">
    <div class="progress" style="height: 10px" role="progressbar" :aria-valuenow="years" aria-valuemin="0" aria-valuemax="99">
      <div class="progress-bar" :class="tone" :style="{ width: pct + '%' }"></div>
    </div>
    <div class="d-flex justify-content-between small text-muted mt-1">
      <span>{{ Math.round(years) }} of 99 years left</span>
      <span>{{ Math.round(99 - years) }} used</span>
    </div>
  </div>
  <span v-else class="text-muted small">—</span>
</template>
