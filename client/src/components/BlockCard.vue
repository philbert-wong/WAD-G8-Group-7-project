<script setup>
import { ref } from 'vue';
import * as api from '../api.js';

const props = defineProps({
  block: Object, // one card from /api/blocks
  saved: Boolean, // is it in the shortlist?
  budget: [String, Number], // the budget filter, used for the score
});
defineEmits(['toggle-save']);

// Amenities + score are only fetched when you press the button
const open = ref(false);
const loading = ref(false);
const error = ref('');
const score = ref(null);
const amenities = ref([]);

async function toggleDetails() {
  open.value = !open.value;
  if (!open.value) return;

  loading.value = true;
  error.value = '';
  try {
    const [amenityData, scoreData] = await Promise.all([
      api.getAmenities(props.block.id),
      api.getScore(props.block.id, props.budget),
    ]);
    amenities.value = amenityData.amenities;
    score.value = scoreData.score;
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}

function formatPrice(price) {
  return '$' + price.toLocaleString('en-SG');
}

const categoryNames = { mrt: 'MRT', hawker: 'Hawker centre', park: 'Park', school: 'Primary school' };
</script>

<template>
  <div class="card h-100 shadow-sm">
    <div class="card-body">
      <div class="d-flex justify-content-between align-items-start">
        <div>
          <h5 class="card-title mb-0">Blk {{ block.block }} {{ block.street }}</h5>
          <small class="text-muted">{{ block.town }}</small>
        </div>
        <span class="badge text-bg-secondary">{{ block.flatType }}</span>
      </div>

      <p class="fs-4 fw-bold my-2">{{ formatPrice(block.price) }}</p>

      <ul class="list-unstyled mb-3">
        <li>Remaining lease: <strong>{{ block.remainingLease }} years</strong></li>
        <li>{{ block.mrtWalkMinutes }} min walk to {{ block.mrtName }}</li>
      </ul>

      <div class="d-flex gap-2">
        <button
          class="btn btn-sm"
          :class="saved ? 'btn-warning' : 'btn-outline-warning'"
          @click="$emit('toggle-save', block)"
        >
          {{ saved ? '★ Saved' : '☆ Save' }}
        </button>
        <button class="btn btn-sm btn-outline-secondary" @click="toggleDetails">
          {{ open ? 'Hide details' : 'Amenities & score' }}
        </button>
      </div>

      <div v-if="open" class="mt-3 pt-3 border-top">
        <p v-if="loading" class="text-muted mb-0">Loading...</p>
        <p v-else-if="error" class="text-danger mb-0">{{ error }}</p>

        <template v-else>
          <p class="mb-1">Match score: <strong>{{ score }} / 100</strong></p>
          <div class="progress mb-3" style="height: 8px">
            <div class="progress-bar bg-success" :style="{ width: score + '%' }"></div>
          </div>

          <ul class="list-unstyled small mb-0">
            <li v-for="a in amenities" :key="a.category">
              {{ categoryNames[a.category] }}: {{ a.name }} ({{ a.distance }} m)
            </li>
          </ul>

          <p v-if="!budget" class="small text-muted mt-2 mb-0">Enter a max budget to include price in the score.</p>
        </template>
      </div>
    </div>
  </div>
</template>
