<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import Chart from "chart.js/auto";
import { median } from "../lib/median.js";

/** One line per block: median resale price each month. OWNER: Frontend — Data Views */
const props = defineProps({
  blocks: { type: Array, default: () => [] },
  flatType: { type: String, default: "" },
});
const canvas = ref(null);
let chart = null;
const COLOURS = ["#1f6f5c", "#e07a1f", "#2b7bd6", "#8a4fc7"];

function render() {
  if (!canvas.value) return;
  chart?.destroy();

  const series = props.blocks.map((b) => {
    const by = {};
    for (const t of b.transactions) if (t.flatType === props.flatType) (by[t.month] ??= []).push(t.resalePrice);
    return by;
  });
  const months = [...new Set(series.flatMap((s) => Object.keys(s)))].sort();

  chart = new Chart(canvas.value, {
    type: "line",
    data: {
      labels: months,
      datasets: props.blocks.map((b, i) => ({
        label: `Blk ${b.block} ${b.streetName}`,
        data: months.map((m) => (series[i][m] ? median(series[i][m]) : null)),
        borderColor: COLOURS[i % COLOURS.length],
        backgroundColor: COLOURS[i % COLOURS.length],
        spanGaps: true, tension: 0.25, pointRadius: 3,
      })),
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "bottom" },
        tooltip: { callbacks: { label: (c) => `${c.dataset.label}: S$${c.parsed.y.toLocaleString()}` } },
      },
      scales: { y: { ticks: { callback: (v) => `${(v / 1000).toFixed(0)}k` } } },
    },
  });
}

onMounted(render);
onBeforeUnmount(() => chart?.destroy());
watch(() => [props.blocks, props.flatType], render);
</script>

<template>
  <div class="chart-box" data-cy="compare-chart"><canvas ref="canvas"></canvas></div>
</template>
