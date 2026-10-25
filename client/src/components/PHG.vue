<script setup>
import {ref,computed,nextTick} from 'vue'

const props = defineProps({
  buyerDetails: Object
})

const emit = defineEmits(['updatePHG'])

const grant = ref('')
const nearparents = ref('')

// Check citizenship
const citizenshipEligible = computed(() => {
  if (props.buyerDetails?.citizenship === 'sc') {
    return true
  }

  return props.buyerDetails?.coowners_citizenship?.includes('sc') || false
})

// Calculate estimated PHG
const estimatedPHG = computed(() => {

  // Check if questions are answered
  if (grant.value !== 'no') return 0

  // Check living arrangement
  if (nearparents.value === '' || nearparents.value === 'neither') {
    return 0
  }

  // Check citizenship
  if (!citizenshipEligible.value) return 0

  // Single buyer
  if (props.buyerDetails?.buyertype === 'single') {
    if (nearparents.value === 'with') return 15000
    if (nearparents.value === 'near') return 10000
  }

  // Couple / Family
  if (props.buyerDetails?.buyertype === 'couple') {
    if (nearparents.value === 'with') return 30000
    if (nearparents.value === 'near') return 20000
  }

  return 0
})

// Automatically send PHG result
async function sendPHG() {
  await nextTick()

  const complete =
    grant.value !== '' &&
    (grant.value === 'yes' || nearparents.value !== '')

  emit('updatePHG', complete ? {
    grant: grant.value,
    nearparents: grant.value === 'no' ? nearparents.value : '',
    estimatedPHG: estimatedPHG.value
  } : null)
}
</script>

<template>
  <div>
    <hr/>

    <h5 class="mb-3">Proximity Housing Grant (PHG)</h5>

    <!-- Previous PHG -->
    <div class="mb-3">
      <label class="form-label">
        Have you received the Proximity Housing Grant (PHG) before?
      </label>

      <div class="form-check">
        <input
          v-model="grant"
          type="radio"
          value="yes"
          name="grant"
          class="form-check-input"
          @change="sendPHG"
        />
        <label class="form-check-label">Yes</label>
      </div>

      <div class="form-check">
        <input
          v-model="grant"
          type="radio"
          value="no"
          name="grant"
          class="form-check-input"
          @change="sendPHG"
        />
        <label class="form-check-label">No</label>
      </div>
    </div>

    <!-- Living Arrangement -->
    <div v-if="grant === 'no'" class="mb-3">
      <label class="form-label">
        Are you planning to live with or near your parents/children?
      </label>

      <div class="form-check">
        <input
          v-model="nearparents"
          type="radio"
          value="with"
          name="nearparents"
          class="form-check-input"
          @change="sendPHG"
        />
        <label class="form-check-label">
          Live with parents/children
        </label>
      </div>

      <div class="form-check">
        <input
          v-model="nearparents"
          type="radio"
          value="near"
          name="nearparents"
          class="form-check-input"
          @change="sendPHG"
        />
        <label class="form-check-label">
          Live near parents/children (within 4 km)
        </label>
      </div>

      <div class="form-check">
        <input
          v-model="nearparents"
          type="radio"
          value="neither"
          name="nearparents"
          class="form-check-input"
          @change="sendPHG"
        />
        <label class="form-check-label">
          Neither
        </label>
      </div>
    </div>

    <!-- PHG Result -->
    <div v-if="grant === 'yes' || (grant === 'no' && nearparents !== '')">

      <div v-if="estimatedPHG > 0" class="alert alert-success">
        <strong>Potential PHG:</strong>
        ${{ estimatedPHG.toLocaleString() }}
      </div>

      <div v-else class="alert alert-warning">
        You may not be eligible for PHG.
      </div>

    </div>

    <p class="text-muted small">
      This is a preliminary estimate. Actual eligibility and grant amount
      depend on HDB's assessment and the selected resale flat.
    </p>

  </div>
</template>
