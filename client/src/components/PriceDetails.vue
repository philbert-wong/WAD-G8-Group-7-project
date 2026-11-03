<script setup>
// The "Price details" panel inside a card: median prices, the price model's trend and factors, and recent sales
// Price chart: the model's price line for this flat since Jan 2021, with every real sale as a dot.
// ⚠️ NOT IN OUR COURSE: the Chart.js library (new npm package), nextTick, and drawing on a <canvas>.
import { onMounted, onUnmounted, ref, nextTick } from 'vue'
import { Chart, registerables } from 'chart.js'
import axios from 'axios'
// The "Title … Show ▾" bar from the Map page, so each section below can be opened and closed
import CollapsiblePanel from './map/CollapsiblePanel.vue'

// Our Express server's address, from one shared place (see config.js; it changes for deployment)
import { BASE_URL } from '../config.js'

const props = defineProps({
  blockId: String,
})

// Chart.js needs its parts registered once before it can draw
Chart.register(...registerables)
// Chart text in the app's font (Chart.js uses Helvetica otherwise)
Chart.defaults.font.family = "'DM Sans', sans-serif"

const loading = ref(true)
const chartCanvas = ref(null)
let chart = null // a normal variable, not a ref (Chart.js does not like Vue's ref)
let observer = null // watches the chart box and draws the chart when it scrolls into view
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

  // The <canvas> only exists after Vue has shown the results, so wait for that (nextTick),
  // then draw the chart when it scrolls into view (so the user sees the line animate)
  if (details.value !== null) {
    await nextTick()
    drawWhenVisible()
  }
}

// Chart colours: from the app's cosy theme (the blue / terracotta pair passes a colour-blind check)
const MODEL_COLOUR = '#1f6fa3'
const BAND_COLOUR = 'rgba(31, 111, 163, 0.10)' // the model's blue as a light wash
const SALE_COLOUR = 'rgba(192, 97, 74, 0.85)' // terracotta, slightly see-through for busy blocks
const GRID_COLOUR = '#efe7db'
const AXIS_TEXT_COLOUR = '#7a7166'

// 367000 -> "$367k"
function formatK(price) {
  return '$' + Math.round(price / 1000) + 'k'
}

// Draws the chart the first time at least 40% of it is on screen.
// this is not taught in our course - IntersectionObserver (a browser feature that tells us when an element becomes visible).
function drawWhenVisible() {
  observer = new IntersectionObserver(function (entries) {
    for (const entry of entries) {
      if (entry.isIntersecting && chart === null) {
        drawChart()
        observer.disconnect() // only once: scrolling away and back does not replay it
      }
    }
  }, { threshold: 0.4 })
  observer.observe(chartCanvas.value)
}

// A soft blue glow under the model line, so it looks lifted off the chart (depth without a 3D chart)
const lineGlow = {
  id: 'lineGlow',
  beforeDatasetDraw: function (chart, args) {
    if (chart.data.datasets[args.index].label === 'Model price (this flat)') {
      chart.ctx.save()
      chart.ctx.shadowColor = 'rgba(31, 111, 163, 0.35)'
      chart.ctx.shadowBlur = 10
      chart.ctx.shadowOffsetY = 4
    }
  },
  afterDatasetDraw: function (chart, args) {
    if (chart.data.datasets[args.index].label === 'Model price (this flat)') {
      chart.ctx.restore()
    }
  },
}


// A thin vertical line that follows the mouse, so a month is easy to read (Chart.js has no built-in one)
const crosshair = {
  id: 'crosshair',
  afterDatasetsDraw: function (chart) {
    const active = chart.tooltip.getActiveElements()
    if (active.length === 0) {
      return
    }
    const x = active[0].element.x
    const ctx = chart.ctx
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(x, chart.chartArea.top)
    ctx.lineTo(x, chart.chartArea.bottom)
    ctx.lineWidth = 1
    ctx.strokeStyle = '#b8ab9c'
    ctx.stroke()
    ctx.restore()
  },
}

// Draws the model's line with its typical error band, and each real sale as a dot on its month
function drawChart() {
  const labels = []
  const datasets = []

  // Real sales since Jan 2021, oldest first (the server sends newest first, so we go backwards).
  // The floor is kept on each point for the tooltip.
  const salePoints = []
  for (let i = history.value.length - 1; i >= 0; i--) {
    const sale = history.value[i]
    salePoints.push({ x: formatMonth(sale.month), y: sale.price, storey: sale.storey })
  }

  if (model.value !== null) {
    // Model line, plus a band of ± the model's average miss (MAE) on sales it never saw
    const modelPrices = []
    const lowPrices = []
    const highPrices = []
    for (const point of model.value.trend) {
      labels.push(formatMonth(point.month))
      modelPrices.push(point.price)
      lowPrices.push(point.price - model.value.maeDollars)
      highPrices.push(point.price + model.value.maeDollars)
    }

    // Band: the low edge is drawn invisibly, then the high edge fills down to it ('-1' = the dataset just before)
    datasets.push({
      label: 'low edge',
      data: lowPrices,
      borderWidth: 0,
      pointRadius: 0,
      pointHoverRadius: 0,
      fill: false,
    })
    datasets.push({
      label: 'Typical error (±' + formatK(model.value.maeDollars) + ')',
      data: highPrices,
      borderWidth: 0,
      pointRadius: 0,
      pointHoverRadius: 0,
      pointStyle: 'rect',
      backgroundColor: BAND_COLOUR,
      fill: '-1',
    })
    datasets.push({
      label: 'Model price (this flat)',
      data: modelPrices,
      borderColor: MODEL_COLOUR,
      backgroundColor: MODEL_COLOUR,
      borderWidth: 2,
      pointRadius: 0,
      pointHoverRadius: 0,
      pointStyle: 'line',
    })
  } else {
    // No model: the months on the bottom are just the sale months
    for (const point of salePoints) {
      labels.push(point.x)
    }
  }

  // Real sales: solid dots with a thin white ring, so overlapping dots stay readable
  datasets.push({
    label: 'Real sale',
    data: salePoints,
    showLine: false,
    backgroundColor: SALE_COLOUR,
    borderColor: '#ffffff',
    borderWidth: 1.5,
    pointRadius: 4,
    pointHoverRadius: 6,
    pointStyle: 'circle',
  })

  // Bottom axis: with the model's months (Jan 2021 to now), only label each January with its year
  const xTicks = { color: AXIS_TEXT_COLOUR, font: { size: 11 }, maxRotation: 0 }
  if (model.value !== null) {
    xTicks.autoSkip = false
    xTicks.callback = function (value) {
      const label = labels[value] // e.g. "Jan 2022"
      if (label.startsWith('Jan')) {
        return label.slice(4) // "2022"
      }
      return null
    }
  }

  // The line draws itself from 2021 to now in about 1.5 s: each month starts a little after the one before,
  // and each sale dot appears when the line reaches its month (Chart.js "progressive line" animation).
  // Chart.js animation options is not taught in our course
  const totalDuration = 1500
  const stepTime = totalDuration / labels.length

  // Which month (0, 1, 2, ...) a point belongs to: its position for the line, its month label for a sale dot
  function monthIndex(context) {
    if (context.raw !== null && typeof context.raw === 'object') {
      return labels.indexOf(context.raw.x)
    }
    return context.index
  }

  // How long a point waits before it starts: later months wait longer (only the first time it is drawn)
  function delayFor(context, flag) {
    if (context.type !== 'data' || context[flag]) {
      return 0
    }
    context[flag] = true
    return monthIndex(context) * stepTime
  }

  // Where a point's height starts: at the previous month's point, so the line grows out of itself.
  // Sale dots and the first month start where they end (they appear instead of sliding).
  function startY(context) {
    if (context.raw !== null && typeof context.raw === 'object') {
      return context.chart.scales.y.getPixelForValue(context.raw.y)
    }
    if (context.index === 0) {
      return context.chart.scales.y.getPixelForValue(context.raw)
    }
    const previousPoint = context.chart.getDatasetMeta(context.datasetIndex).data[context.index - 1]
    return previousPoint.getProps(['y'], true).y
  }

  let animation = {
    x: {
      type: 'number',
      easing: 'linear',
      duration: stepTime,
      from: NaN, // hidden until its turn
      delay: function (context) {
        return delayFor(context, 'xStarted')
      },
    },
    y: {
      type: 'number',
      easing: 'linear',
      duration: stepTime,
      from: startY,
      delay: function (context) {
        return delayFor(context, 'yStarted')
      },
    },
  }

  // Users who turned on "Reduce motion" in their computer's settings get the chart straight away
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    animation = false
  }

  chart = new Chart(chartCanvas.value, {
    type: 'line',
    data: { labels: labels, datasets: datasets },
    plugins: [crosshair, lineGlow],
    options: {
      animation: animation,
      // Hovering anywhere above a month shows that month (no need to aim at the thin line)
      interaction: { mode: 'x', intersect: false },
      plugins: {
        legend: {
          position: 'top',
          align: 'start',
          labels: {
            usePointStyle: true,
            boxWidth: 8,
            boxHeight: 8,
            color: AXIS_TEXT_COLOUR,
            font: { size: 11 },
            // The invisible low edge of the band is not shown in the legend
            filter: function (item) {
              return item.text !== 'low edge'
            },
          },
        },
        tooltip: {
          backgroundColor: '#2d2d2d',
          padding: 10,
          cornerRadius: 6,
          usePointStyle: true,
          boxWidth: 8,
          boxHeight: 8,
          // Only the model and the sales in the tooltip (not the two band edges)
          filter: function (item) {
            return item.dataset.label === 'Model price (this flat)' || item.dataset.label === 'Real sale'
          },
          callbacks: {
            label: function (item) {
              if (item.dataset.label === 'Real sale') {
                return ' Sale: ' + formatK(item.raw.y) + ' · floor ' + formatStorey(item.raw.storey)
              }
              return ' Model: ' + formatK(item.raw)
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          border: { display: false },
          ticks: xTicks,
        },
        y: {
          grid: { color: GRID_COLOUR },
          border: { display: false },
          ticks: {
            color: AXIS_TEXT_COLOUR,
            font: { size: 11 },
            maxTicksLimit: 5,
            callback: function (value) {
              return formatK(value)
            },
          },
        },
      },
    },
  })
}

// Remove the chart (and stop watching for it) when the panel closes
onUnmounted(function () {
  if (observer !== null) {
    observer.disconnect()
  }
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

// The factors as bars: without the market (it is the same for every flat, so it is shown under the chart),
// biggest effect first, each with its bar width as a % of the biggest one
function factorBars() {
  const bars = []
  for (const factor of model.value.factors) {
    if (factor.key !== 'market') {
      bars.push(factor)
    }
  }

  // Biggest effect first, whether it makes the flat dearer or cheaper
  bars.sort(function (a, b) { return Math.abs(b.pct) - Math.abs(a.pct) })

  // The biggest effect gets the full half-width; the others are drawn in proportion
  let biggest = 0
  for (const bar of bars) {
    if (Math.abs(bar.pct) > biggest) {
      biggest = Math.abs(bar.pct)
    }
  }

  const rows = []
  for (const bar of bars) {
    let width = 0
    if (biggest > 0) {
      width = (Math.abs(bar.pct) / biggest) * 100
    }
    rows.push({ key: bar.key, name: bar.name, thisFlat: bar.thisFlat, compare: bar.compare, pct: bar.pct, width: width })

  }
  return rows
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

      <!-- Each section below opens and closes on its own, so the panel is not one long page.
           Only the price trend starts open. CollapsiblePanel uses v-show, so a closed chart still exists
           and draws itself the first time it is opened (the IntersectionObserver sees it appear). -->

      <!-- Price chart: model line + real sales -->
      <CollapsiblePanel title="Price trend since 2021">
        <div class="chart-box mb-2">
          <canvas ref="chartCanvas" height="190"></canvas>
        </div>

        <!-- The two forces behind the line -->
        <p v-if="model !== null" class="small text-muted mb-0">
          Price trend for this flat: market {{ formatPct(model.yearly.marketPct) }} a year,
          lease ageing {{ formatPct(model.yearly.leasePct) }} a year (since Jan 2021).
        </p>
      </CollapsiblePanel>

      <!-- Price by year: real sales since Jan 2021, so buyers can check the trend themselves -->
      <CollapsiblePanel v-if="yearRows.length > 0" title="Price by year" :start-open="false">
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
      </CollapsiblePanel>

      <!-- How this flat compares with a typical flat: bars going left (costs less) or right (costs more) from the centre line -->
      <CollapsiblePanel v-if="model !== null" title="Compared with a typical flat" :start-open="false">
        <!-- Direction labels, above the bar area only -->
        <div class="factor-row factor-head small text-muted">
          <span class="factor-label"></span>
          <div class="factor-track-labels">
            <span>◀ less expensive</span>
            <span>more expensive ▶</span>
          </div>
          <span class="factor-value"></span>
        </div>

        <div v-for="bar in factorBars()" :key="bar.key" class="factor-row small">
          <span class="factor-label">
            <strong>{{ bar.name }}:</strong> {{ bar.thisFlat }}
            <span class="text-muted">({{ bar.compare }})</span>
          </span>
          <div class="factor-track">
            <!-- Left half: only cheaper factors draw here, growing out from the centre -->
            <div class="factor-half factor-left">
              <div v-if="bar.pct < 0" class="factor-bar factor-cheaper" :style="{ width: bar.width + '%' }"></div>
            </div>
            <!-- Right half: only dearer factors draw here -->
            <div class="factor-half">
              <div v-if="bar.pct > 0" class="factor-bar factor-dearer" :style="{ width: bar.width + '%' }"></div>
            </div>
          </div>
          <span class="factor-value" :class="bar.pct < 0 ? 'text-success' : 'text-danger'">{{ formatPct(bar.pct) }}</span>
        </div>

        <p class="small text-muted mt-2 mb-0">
          Each bar compares this flat with a typical resale flat (town vs Ang Mo Kio, flat type vs 2-room),
          with everything else held the same. The market rise since 2021 applies to every flat, so it is shown under the chart.
        </p>
      </CollapsiblePanel>

      <!-- Each sale in the last 12 months, with the count in the title -->
      <CollapsiblePanel :title="'Sales in the last 12 months (' + details.sales.length + ')'" :start-open="false">
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
      </CollapsiblePanel>
    </template>
  </div>
</template>


<style scoped>
/* Soft card around the price chart */
.chart-box {
  background: #fffdf9;
  border: 1px solid #efe7db;
  border-radius: 10px;
  padding: 10px 12px 6px;
}

/* "What drives this flat's price": one row = label | bar area | % */
.factor-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 0;
  border-bottom: 1px solid #f0ebe6;
}
.factor-head {
  border-bottom: none;
  padding-bottom: 0;
}
.factor-label {
  flex: 0 0 42%;
}
.factor-value {
  flex: 0 0 3.6rem;
  text-align: right;
  font-weight: 600;
  font-variant-numeric: tabular-nums; /* digits line up in a column */
}

/* Bar area: two halves with the centre line between them */
.factor-track,
.factor-track-labels {
  flex: 1;
  display: flex;
}
.factor-track-labels {
  justify-content: space-between;
}
.factor-track {
  height: 10px;
}
.factor-half {
  flex: 1;
  display: flex;
}
.factor-left {
  justify-content: flex-end; /* cheaper bars grow leftwards from the centre */
  border-right: 2px solid #9a8f86;
}

.factor-bar {
  height: 100%;
  border-radius: 3px;
}
.factor-cheaper {
  background: #3b8a5a;
}
.factor-dearer {
  background: #c0614a;
}
</style>
