<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import Chart from "chart.js/auto";

/** Price per sqm against remaining lease: the fitted line over the raw medians. OWNER: Frontend — Data Views */
const props = defineProps({ model: { type: Object, default: null } });
const canvas = ref(null);
let chart = null;

function render() {
  if (!canvas.value || !props.model) return;
  chart?.destroy();
  chart = new Chart(canvas.value, {
    type: "scatter",
    data: {
      datasets: [
        {
          label: "Estimated effect of lease",
          data: props.model.curve.map((p) => ({ x: p.lease, y: p.psm })),
          showLine: true, pointRadius: 0, borderColor: "#1f6f5c", borderWidth: 3,
        },
        {
          label: "Median by lease band",
          data: props.model.bins.map((p) => ({ x: p.lease, y: p.psm, n: p.n })),
          backgroundColor: "rgba(224, 122, 31, .85)", pointRadius: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "bottom" },
        tooltip: {
          callbacks: {
            label: (c) => c.raw.n
              ? `${Math.round(c.raw.y).toLocaleString()} $/sqm · ${c.raw.n} sales`
              : `${Math.round(c.raw.y).toLocaleString()} $/sqm`,
          },
        },
      },
      scales: {
        x: { title: { display: true, text: "Remaining lease (years)" } },
        y: { title: { display: true, text: "Price per sqm (S$)" }, ticks: { callback: (v) => v.toLocaleString() } },
      },
    },
  });
}

onMounted(render);
onBeforeUnmount(() => chart?.destroy());
watch(() => props.model, render);
</script>

<template>
  <div class="chart-box" data-cy="lease-chart"><canvas ref="canvas"></canvas></div>
</template>
