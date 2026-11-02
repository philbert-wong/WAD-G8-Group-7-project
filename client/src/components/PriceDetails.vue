<script setup>
// The "Price details" panel inside a card: median prices, the price model's trend and factors, and recent sales
// Price chart: the model's price line for this flat since Jan 2021, with every real sale as a dot.
// ⚠️ NOT IN OUR COURSE: the Chart.js library (new npm package), nextTick, and drawing on a <canvas>.
import { onMounted, onUnmounted, ref, nextTick } from 'vue'
import { Chart, registerables } from 'chart.js'
import axios from 'axios'

// Our Express server's address, from one shared place (see config.js; it changes for deployment)
import { BASE_URL } from '../config.js'

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
const model = ref(null) // the price model's answer: estimate, yearly, factors, trend (null = not available)
const history = ref([]) // every sale since Jan 2021 (newest first), for the chart dots and the price-by-year table
const yearRows = ref([]) // one row per year: sales, median, change, latest sale

// Gets the recent sales of this block from the server and then the price model's estimate for it
async function load() {
  try {
    const response = await axios.get(`${BASE_URL}/api/blocks/${props.blockId}/live-sales`)
    details.value = response.data

    // Sales since Jan 2021 if the server sent them, otherwise just the recent ones (stored data)
    if (response.data.history !== undefined) {
      history.value = response.data.history
    } else {
      history.value = response.data.sales
    }
    yearRows.value = buildYearRows(history.value)
  } catch (error) {
    // Show our server's message if it sent one, otherwise axios's own (e.g. "Network Error")
    if (error.response && error.response.data && error.response.data.message) {
      errorMessage.value = error.response.data.message
    } else {
      errorMessage.value = error.message
    }
  }

  // The model is extra: if it fails (e.g. no estimate for this flat type), the sales still show
  try {
    const response = await axios.get(`${BASE_URL}/api/blocks/${props.blockId}/estimate`)
    model.value = response.data
  } catch (error) {
    model.value = null
  }
  loading.value = false

  // The <canvas> only exists after Vue has shown the results, so wait for that (nextTick)
  if (details.value !== null) {
    await nextTick()
    drawChart()
  }
}

// Draws the model's line (one point per month) and each real sale as a dot on the same months
function drawChart() {
  const labels = []
  const datasets = []

  // Real sales since Jan 2021, oldest first (the server sends newest first, so we go backwards)
  const salePoints = []
  for (let i = history.value.length - 1; i >= 0; i--) {
    const sale = history.value[i]
    salePoints.push({ x: formatMonth(sale.month), y: sale.price })
  }

  if (model.value !== null) {
    // Model line: the months on the bottom come from the trend (Jan 2021 to now)
    const modelPrices = []
    for (const point of model.value.trend) {
      labels.push(formatMonth(point.month))
      modelPrices.push(point.price)
    }
    datasets.push({
      label: 'Model price (this flat)',
      data: modelPrices,
      borderColor: '#2f6f8f',
      backgroundColor: '#2f6f8f',
      pointRadius: 0,
      tension: 0.3,
    })
  } else {
    // No model: the months on the bottom are just the sale months (the old chart)
    for (const point of salePoints) {
      labels.push(point.x)
    }
  }

  // Sales as small see-through dots (no line), placed on their month, so busy blocks stay readable
  datasets.push({
    label: 'Real sale',
    data: salePoints,
    borderColor: 'rgba(192, 97, 74, 0.6)',
    backgroundColor: 'rgba(192, 97, 74, 0.45)',
    showLine: false,
    pointRadius: 3,
  })

  // Bottom axis: with the model's months (Jan 2021 to now), only label each January with its year
  const xAxis = {}
  if (model.value !== null) {
    xAxis.ticks = {
      autoSkip: false,
      maxRotation: 0,
      callback: function (value) {
        const label = labels[value] // e.g. "Jan 2022"
        if (label.startsWith('Jan')) {
          return label.slice(4) // "2022"
        }
        return null // no label for the other months
      },
    }
  }

  chart = new Chart(chartCanvas.value, {
    type: 'line',
    data: {
      labels: labels,
      datasets: datasets,
    },
    options: {
      plugins: { legend: { display: true, labels: { boxWidth: 12 } } },
      scales: {
        x: xAxis,
        y: { ticks: { callback: function (value) { return '$' + value / 1000 + 'k' } } },
      },
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

// 16.6 -> "+16.6%", -2.3 -> "-2.3%", 0 -> "0%"
function formatPct(pct) {
  if (pct > 0) {
    return '+' + pct.toFixed(1) + '%'
  }
  return pct.toFixed(1) + '%'
}

// Badge colour from a buyer's view: red = makes the flat dearer, green = makes it cheaper
function badgeClass(pct) {
  if (pct > 0) {
    return 'text-bg-danger'
  } else if (pct < 0) {
    return 'text-bg-success'
  }
  return 'text-bg-secondary'
}


// Groups the sales since 2021 by year: how many, the median price, the change from the year before, and the latest sale
// sales: newest first, so the first sale seen in each year is that year's latest
function buildYearRows(sales) {
  // Sales of each year, e.g. { "2026": [...], "2025": [...] }, and the years in the order seen (newest first)
  const salesByYear = {}
  const years = []
  for (const sale of sales) {
    const year = sale.month.slice(0, 4)
    if (salesByYear[year] === undefined) {
      salesByYear[year] = []
      years.push(year)
    }
    salesByYear[year].push(sale)
  }

  const rows = []
  for (const year of years) {
    const yearSales = salesByYear[year]

    // Median price of the year: sort the prices, take the middle one (or the average of the middle two)
    const prices = []
    for (const sale of yearSales) {
      prices.push(sale.price)
    }
    prices.sort(function (a, b) { return a - b })
    const middle = Math.floor(prices.length / 2)
    let median
    if (prices.length % 2 === 1) {
      median = prices[middle]
    } else {
      median = Math.round((prices[middle - 1] + prices[middle]) / 2)
    }

    rows.push({ year: year, count: yearSales.length, median: median, changePct: null, latest: yearSales[0] })
  }

  // Change from the year before (rows are newest first, so the year before is the next row)
  // Only when that year really is the year before (a block may have a year with no sales)
  for (let i = 0; i < rows.length - 1; i++) {
    const before = rows[i + 1]
    if (Number(before.year) === Number(rows[i].year) - 1) {
      rows[i].changePct = Math.round((rows[i].median / before.median - 1) * 1000) / 10
    }
  }

  return rows
}

</script>

<template>
  <div class="mt-3 pt-3 border-top">
    <p v-if="loading" class="text-muted mb-0">Loading...</p>
    <p v-else-if="errorMessage" class="text-danger mb-0">{{ errorMessage }}</p>

    <template v-else>
      <ul class="list-unstyled small mb-2">
        <li>
          Median price:
          <!-- a block with no recent sales has no median (null), so show N/A instead -->
          <strong v-if="details.medianPrice !== null">{{ '$' + details.medianPrice.toLocaleString('en-SG') }}</strong>
          <strong v-else>N/A</strong>
        </li>
        <li>
          Median price per m²:
          <strong v-if="details.medianPricePerSqm !== null">{{ '$' + details.medianPricePerSqm.toLocaleString('en-SG') }}</strong>
          <strong v-else>N/A</strong>
        </li>
        <li v-if="model !== null">
          Model estimate today:
          <strong>{{ '$' + model.estimate.toLocaleString('en-SG') }}</strong>
          <span class="text-muted"> (usually within ±{{ '$' + model.maeDollars.toLocaleString('en-SG') }})</span>
        </li>
        <li class="text-muted">Based on {{ details.count }} recent sales</li>
        <li class="text-muted">Source: {{ details.source === 'live' ? 'data.gov.sg (live)' : 'Stored data' }}</li>
      </ul>

      <!-- Price chart: model line + real sales -->
      <div class="mb-2"><canvas ref="chartCanvas" height="160"></canvas></div>

      <!-- The two forces behind the line -->
      <p v-if="model !== null" class="small text-muted mb-3">
        Price trend for this flat: market {{ formatPct(model.yearly.marketPct) }} a year,
        lease ageing {{ formatPct(model.yearly.leasePct) }} a year (since Jan 2021).
      </p>

      <!-- Price by year: real sales since Jan 2021, so buyers can check the trend themselves -->
      <div v-if="yearRows.length > 0" class="mb-3">
        <h6 class="small fw-bold mb-2">Price by year</h6>
        <div class="table-responsive">
          <table class="table table-sm small mb-0">
            <thead>
              <tr>
                <th>Year</th>
                <th class="text-end">Sales</th>
                <th class="text-end">Median</th>
                <th class="text-end">Change</th>
                <th>Latest sale</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in yearRows" :key="row.year">
                <td>{{ row.year }}</td>
                <td class="text-end">{{ row.count }}</td>
                <td class="text-end">{{ '$' + row.median.toLocaleString('en-SG') }}</td>
                <td class="text-end">
                  <span v-if="row.changePct !== null">{{ formatPct(row.changePct) }}</span>
                  <span v-else class="text-muted">–</span>
                </td>
                <td class="text-nowrap">
                  {{ formatMonth(row.latest.month) }}, floor {{ formatStorey(row.latest.storey) }},
                  {{ row.latest.areaSqm }} m², {{ '$' + row.latest.price.toLocaleString('en-SG') }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="small text-muted mt-1 mb-0">Real sales of this block and flat type. The current year is only part of a year.</p>
      </div>

      <!-- What drives this flat's price: each factor vs a typical flat, all else equal -->
      <div v-if="model !== null" class="mb-3">
        <h6 class="small fw-bold mb-2">What drives this flat's price</h6>
        <ul class="list-group list-group-flush small">
          <li
            v-for="(factor, i) in model.factors"
            :key="i"
            class="list-group-item d-flex justify-content-between align-items-center px-0"
          >
            <span>{{ factor.label }}</span>
            <span class="badge" :class="badgeClass(factor.pct)">{{ formatPct(factor.pct) }}</span>
          </li>
        </ul>
        <p class="small text-muted mt-1 mb-0">
          Each effect is from our price model, with everything else held the same. The effects multiply, so they do not simply add up.
        </p>
      </div>

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
              <td class="text-end">{{ '$' + sale.price.toLocaleString('en-SG') }}</td>
              <td class="text-end">{{ '$' + sale.pricePerSqm.toLocaleString('en-SG') }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>
