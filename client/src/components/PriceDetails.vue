<script setup>
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
        <li class="text-muted">Based on {{ details.count }} sale(s) in the last 12 months</li>
      </ul>

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
