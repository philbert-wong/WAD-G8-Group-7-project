<script setup>
// The "Price details" panel inside a card: median prices and a table of recent sales
// FINAL DRAFT, FEATURE: PRICE CHART (Shaun's area, first draft by Jihao + AI): a line of every sale's price.
// ⚠️ NOT IN OUR COURSE: the Chart.js library (new npm package), nextTick, and drawing on a <canvas>.
import { onMounted, onUnmounted, ref, nextTick } from 'vue'
import { Chart, registerables } from 'chart.js'
import axios from 'axios'
import { formatPrice } from '../utils/format.js'
import { getErrorMessage } from '../utils/errorMessage.js'

const props = defineProps({
  blockId: String,
})

// Chart.js needs its parts registered once before it can draw
Chart.register(...registerables)

const loading = ref(true)
const chartCanvas = ref(null)
let chart = null // a normal variable, not a ref (Chart.js does not like Vue's ref)
const errorMessage = ref('')
const details = ref(null)

// Gets the recent sales of this block from the server
async function load() {
  try {
    const response = await axios.get('/api/blocks/' + props.blockId + '/live-sales')
    details.value = response.data
  } catch (error) {
    errorMessage.value = getErrorMessage(error)
  }
  loading.value = false

  // The <canvas> only exists after Vue has shown the results, so wait for that (nextTick)
  if (details.value !== null) {
    await nextTick()
    drawChart()
  }
}

// Draws each sale's price, oldest on the left (the server sends newest first, so we go backwards)
function drawChart() {
  const labels = []
  const prices = []
  for (let i = details.value.sales.length - 1; i >= 0; i--) {
    const sale = details.value.sales[i]
    labels.push(formatMonth(sale.month))
    prices.push(sale.price)
  }

  chart = new Chart(chartCanvas.value, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Sale price',
          data: prices,
          borderColor: '#c0614a',
          backgroundColor: '#c0614a',
          tension: 0.3,
        },
      ],
    },
    options: {
      plugins: { legend: { display: false } },
      scales: { y: { ticks: { callback: function (value) { return '$' + value / 1000 + 'k' } } } },
    },
  })
}

// Remove the chart when the panel closes
onUnmounted(function () {
  if (chart !== null) {
    chart.destroy()
  }
})

// Fetched once, when the panel is first opened
onMounted(load)

const monthNames = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

// "2026-08" -> "Aug 2026"
function formatMonth(month) {
  const parts = month.split('-') // ["2026", "08"]
  const year = parts[0]
  const monthNumber = Number(parts[1]) // 8
  return monthNames[monthNumber - 1] + ' ' + year
}

// "04 TO 06" -> "4–6"
function formatStorey(storey) {
  const parts = storey.split(' TO ') // ["04", "06"]
  return Number(parts[0]) + '–' + Number(parts[1])
}
</script>

<template>
  <div class="mt-3 pt-3 border-top">
    <p v-if="loading" class="text-muted mb-0">Loading...</p>
    <p v-else-if="errorMessage" class="text-danger mb-0">{{ errorMessage }}</p>

    <template v-else>
      <ul class="list-unstyled small mb-2">
        <li>
          Median price: <strong>{{ formatPrice(details.medianPrice) }}</strong>
        </li>
        <li>
          Median price per m²: <strong>{{ formatPrice(details.medianPricePerSqm) }}</strong>
        </li>
        <li class="text-muted">Based on {{ details.count }} recent sales</li>
        <li class="text-muted">Source: {{ details.source === 'live' ? 'data.gov.sg (live)' : 'Stored data' }}</li>
      </ul>

      <!-- FINAL DRAFT: price chart -->
      <div class="mb-3"><canvas ref="chartCanvas" height="140"></canvas></div>

      <div class="table-responsive">
        <table class="table table-sm small mb-0">
          <thead>
            <tr>
              <th>Month</th>
              <th>Floor</th>
              <th class="text-end">Size</th>
              <th class="text-end">Price</th>
              <th class="text-end">Per m²</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(sale, i) in details.sales" :key="i">
              <td class="text-nowrap">{{ formatMonth(sale.month) }}</td>
              <td class="text-nowrap">{{ formatStorey(sale.storey) }}</td>
              <td class="text-end text-nowrap">{{ sale.areaSqm }} m²</td>
              <td class="text-end">{{ formatPrice(sale.price) }}</td>
              <td class="text-end">{{ formatPrice(sale.pricePerSqm) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>
