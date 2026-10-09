<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import Chart from "chart.js/auto";
import { signedMoney } from "../lib/format.js";

/** Price change per year, one bar per town. OWNER: Frontend — Data Views */
const props = defineProps({ towns: { type: Array, default: () => [] } });
const canvas = ref(null);
let chart = null;

const height = computed(() => `${Math.max(220, props.towns.length * 26 + 40)}px`);

function render() {
  if (!canvas.value) return;
  chart?.destroy();
  chart = new Chart(canvas.value, {
    type: "bar",
    data: {
      labels: props.towns.map((t) => t.town),
      datasets: [{
        data: props.towns.map((t) => t.trendPerYear),
        backgroundColor: props.towns.map((t) => (t.trendPerYear >= 0 ? "#1f6f5c" : "#c0392b")),
        borderRadius: 4,
      }],
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (c) => `${signedMoney(c.parsed.x)} per year` } },
      },
      scales: { x: { ticks: { callback: (v) => `${v / 1000}k` } } },
    },
  });
}

onMounted(render);
onBeforeUnmount(() => chart?.destroy());
watch(() => props.towns, render);
</script>

<template>
  <div :style="{ height }" data-cy="trend-chart"><canvas ref="canvas"></canvas></div>
</template>
