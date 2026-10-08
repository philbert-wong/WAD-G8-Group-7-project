<script setup>
import { computed } from 'vue';

const props = defineProps({
  remaining: { type: Number, required: true },
  commenced: { type: Number, required: true },
});

const percent = computed(() => Math.max(0, Math.min(100, (props.remaining / 99) * 100)));
const tone = computed(() => (props.remaining >= 70 ? 'success' : props.remaining >= 55 ? 'warning' : 'danger'));
</script>

<template>
  <div class="lease-bar" data-cy="lease-bar">
    <div class="d-flex justify-content-between small mb-1">
      <span class="fw-semibold">{{ Math.floor(remaining) }} years lease left</span>
      <span class="text-body-secondary">since {{ commenced }}</span>
    </div>
    <div
      class="progress"
      role="progressbar"
      :aria-label="`${Math.floor(remaining)} of 99 lease years remaining`"
      :aria-valuenow="Math.floor(remaining)"
      aria-valuemin="0"
      aria-valuemax="99"
      style="height: 6px"
    >
      <div class="progress-bar" :class="`bg-${tone}`" :style="{ width: `${percent}%` }"></div>
    </div>
  </div>
</template>
