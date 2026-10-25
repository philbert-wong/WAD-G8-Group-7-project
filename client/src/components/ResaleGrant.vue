<script setup>
import {ref,computed} from 'vue'

const props = defineProps({
  buyerDetails: Object
})

const emit = defineEmits(['updateResaleGrant'])

const flatType = ref('')

// Check first-timer status
const firstTimer = computed(() => {
  if (props.buyerDetails?.buyertype === 'single') {
    return props.buyerDetails.buyerstatus === 'first'
  }

  if (props.buyerDetails?.buyertype === 'couple') {
    return props.buyerDetails.buyerstatus === 'first' &&
      props.buyerDetails.coowners_status?.includes('first')
  }

  return false
})

// Check citizenship
const citizenshipEligible = computed(() => {
  if (props.buyerDetails?.citizenship === 'sc') {
    return true
  }

  return props.buyerDetails?.coowners_citizenship?.includes('sc') || false
})

// Calculate estimated CPF Housing Grant
const estimatedResaleGrant = computed(() => {
  if (!firstTimer.value) return 0
  if (!citizenshipEligible.value) return 0
  if (flatType.value === '' || flatType.value === 'unsure') return 0

  const smallFlat = ['2-room', '3-room', '4-room'].includes(flatType.value)

  // Single buyer
  if (props.buyerDetails?.buyertype === 'single') {
    return smallFlat ? 40000 : 25000
  }

  // Couple / Family
  if (props.buyerDetails?.buyertype === 'couple') {
    return smallFlat ? 80000 : 50000
  }

  return 0
})

// Automatically send result to GrantEligibility
function sendResaleGrant() {
  emit('updateResaleGrant', {
    flatType: flatType.value,
    estimatedResaleGrant: estimatedResaleGrant.value
  })
}
</script>

<template>
  <div>
    <hr/>

    <h5 class="mb-3">CPF Housing Grant (Resale Flats)</h5>

    <!-- Flat Type -->
    <div class="mb-3">
      <label class="form-label">
        What type of resale flat are you planning to buy?
      </label>

      <select
        v-model="flatType"
        class="form-select"
        @change="sendResaleGrant"
      >
        <option value="" disabled>Select flat type</option>
        <option value="2-room">2-room</option>
        <option value="3-room">3-room</option>
        <option value="4-room">4-room</option>
        <option value="5-room">5-room</option>
        <option value="executive">Executive</option>
        <option value="unsure">Not sure yet</option>
      </select>
    </div>

    <!-- Estimated Grant -->
    <div v-if="flatType !== ''">

      <div v-if="flatType === 'unsure'" class="alert alert-info">
        Your CPF Housing Grant will depend on the flat type
        you eventually select.
      </div>

      <div v-else-if="estimatedResaleGrant > 0" class="alert alert-success">
        <strong>Potential CPF Housing Grant:</strong>
        ${{ estimatedResaleGrant.toLocaleString() }}
      </div>

      <div v-else class="alert alert-warning">
        You may not meet the CPF Housing Grant eligibility requirements.
      </div>

    </div>

    <p class="text-muted small">
      This is a preliminary estimate. Actual eligibility and grant
      amounts depend on HDB's assessment, including household income,
      citizenship, buyer status and flat type.
    </p>
  </div>
</template>
