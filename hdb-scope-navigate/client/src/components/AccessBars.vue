<script setup>
import { computed } from "vue";
import { SCORE_CATEGORIES } from "../lib/constants.js";
import { categoryScore, rawValue, personalScore } from "../lib/score.js";
import { useScoreStore } from "../stores/score.js";

/** How close a block is to what matters: one bar per category. OWNER: Frontend — Data Views */
const props = defineProps({ block: { type: Object, required: true } });
const score = useScoreStore();

const rows = computed(() => SCORE_CATEGORIES.map((c) => {
  const raw = rawValue(c, props.block);
  return {
    ...c,
    raw,
    text: raw == null ? "no data" : c.unit === "min" ? `${raw} min walk` : raw >= 1000 ? `${(raw / 1000).toFixed(1)} km` : `${Math.round(raw)} m`,
    value: categoryScore(c, props.block),
    weighted: (score.weights[c.id] || 0) > 0,
  };
}));
const overall = computed(() => personalScore(props.block, score.weights));
</script>

<template>
  <div data-cy="access-bars">
    <div v-if="overall != null" class="d-flex align-items-center justify-content-between mb-2">
      <span class="small text-muted">Match with your priorities</span>
      <span class="badge text-bg-primary fs-6" data-cy="overall-score">{{ overall }}/100</span>
    </div>

    <div v-for="r in rows" :key="r.id" class="mb-2">
      <div class="d-flex justify-content-between small">
        <span :class="{ 'fw-semibold': r.weighted }">{{ r.label }}</span>
        <span class="text-muted">{{ r.text }}</span>
      </div>
      <div class="progress" style="height: 6px">
        <div class="progress-bar" :class="r.weighted ? 'bg-primary' : 'bg-secondary'"
             :style="{ width: (r.value ?? 0) + '%' }"></div>
      </div>
    </div>
  </div>
</template>
