<script setup>
import { onMounted, onBeforeUnmount, ref, watch } from "vue";
import Chart from "chart.js/auto";

/**
 * OWNER: Frontend — Data Views
 * Plots median resale price per month for one block.
 */
const props = defineProps({
  transactions: { type: Array, default: () => [] },
});

const canvas = ref(null);
let chart = null;

function seriesFrom(transactions) {
  // Group by month, take the median of each month.
  const byMonth = {};
  for (const t of transactions) (byMonth[t.month] ??= []).push(t.resalePrice);

  const months = Object.keys(byMonth).sort();
  const values = months.map((m) => {
    const xs = byMonth[m].slice().sort((a, b) => a - b);
    const mid = Math.floor(xs.length / 2);
    return xs.length % 2 ? xs[mid] : Math.round((xs[mid - 1] + xs[mid]) / 2);
  });
  return { months, values };
}

function render() {
  if (!canvas.value) return;
  chart?.destroy();

  const { months, values } = seriesFrom(props.transactions);

  chart = new Chart(canvas.value, {
    type: "line",
    data: {
      labels: months,
      datasets: [{
        label: "Median resale price",
        data: values,
        borderColor: "#1f6f5c",
        backgroundColor: "rgba(31,111,92,0.12)",
        fill: true,
        tension: 0.25,
        pointRadius: 2,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: { label: (c) => `S$${c.parsed.y.toLocaleString()}` },
        },
      },
      scales: {
        y: {
          ticks: { callback: (v) => `${(v / 1000).toFixed(0)}k` },
        },
      },
    },
  });
}

onMounted(render);
onBeforeUnmount(() => chart?.destroy());
watch(() => props.transactions, render, { deep: true });
</script>

<template>
  <div style="height: 200px" data-cy="price-chart">
    <canvas ref="canvas"></canvas>
  </div>
</template>
