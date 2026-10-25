<script setup>
// The "Price details" panel inside a card: median prices and a table of recent sales
import { onMounted, ref } from 'vue'
import axios from 'axios'
import { formatPrice } from '../utils/format.js'
import { getErrorMessage } from '../utils/errorMessage.js'

const props = defineProps({
  blockId: String,
})

const loading = ref(true)
const errorMessage = ref('')
const details = ref(null)

// Gets the recent sales of this block from the server
async function load() {
  try {
    const response = await axios.get('/api/blocks/' + props.blockId + '/sales')
    details.value = response.data
  } catch (error) {
    errorMessage.value = getErrorMessage(error)
  }
  loading.value = false
}

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
  <div class="price-details">
    <p v-if="loading" class="text-muted mb-0">Loading...</p>
    <p v-else-if="errorMessage" class="note text-danger mb-0">{{ errorMessage }}</p>

    <template v-else>
      <!-- <ul class="stats">

        <li>
          Median price: <strong>{{ formatPrice(details.medianPrice) }}</strong>
        </li>
        <li>
          Median price per m²: <strong>{{ formatPrice(details.medianPricePerSqm) }}</strong>
        </li>
        <li class="text-muted">Based on {{ details.count }} sale(s) in the last 12 months</li>
      </ul> -->
      <div class="stats">
        <div class="stat">
          <span class="stat-label">Median price</span>
          <strong class="stat-value">{{ formatPrice(details.medianPrice) }}</strong>
        </div>
        <div class="stat">
          <span class="stat-label">Median price per m²</span>
          <strong class="stat-value">{{ formatPrice(details.medianPricePerSqm) }}</strong>
        </div>
      </div>
      <p class="note">Based on {{ details.count }} sale(s) in the last 12 months</p>

      <div class="table-wrap">
        <table class="sales-table">
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

<style scoped>
.stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 12px 14px;
  border-radius: 12px;
  background: rgba(248, 220, 220, 0.45);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.6);
}

.stat-label {
  color: var(--ink-soft);
  font-size: 12px;
}

.stat-value {
  color: #111827;
  font-size: 17px;
  font-variant-numeric: tabular-nums;
}

/* Small grey text: "Loading...", "Based on ..." */
.note {
  margin: 10px 0 14px;
  color: var(--ink-soft);
  font-size: 13px;
}

/* The table sits in a rounded box; it scrolls sideways on narrow screens */
.table-wrap {
  overflow-x: auto;
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: 12px;
}

.sales-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  background: rgba(248, 220, 220, 0.45);
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: 12px;
}

.sales-table th {
  padding: 10px 14px;
  background: rgba(248, 220, 220, 0.45);
  color: var(--ink-soft);
  font-size: 12px;
  font-weight: 600;
  border: 1px solid rgba(255, 255, 255, 0.6);
}

.sales-table td {
  padding: 10px 14px;
  
  color: var(--ink-soft);
  border: 1px solid rgba(255, 255, 255, 0.6);
  font-variant-numeric: tabular-nums; /* digits line up in columns */
}

.sales-table tbody tr:last-child td {
  border-bottom: 0; /* no line under the final row */
}

.sales-table tbody tr:hover {
  background: rgba(248, 220, 220, 0.45);
}

</style>