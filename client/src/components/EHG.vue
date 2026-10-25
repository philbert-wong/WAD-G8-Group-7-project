
<script setup>
import {ref,computed,nextTick} from 'vue'

const props = defineProps({
  buyerDetails: Object
})

const emit = defineEmits(['updateEHG'])

const employment = ref('')
const working = ref('')
const averageIncome = ref('')

// EHG amount for singles
function calculateSinglesGrant(income) {
  if (income <= 0) return 0
  if (income <= 750) return 60000
  if (income <= 1000) return 55000
  if (income <= 1250) return 52500
  if (income <= 1500) return 47500
  if (income <= 1750) return 45000
  if (income <= 2000) return 40000
  if (income <= 2250) return 35000
  if (income <= 2500) return 32500
  if (income <= 2750) return 27500
  if (income <= 3000) return 25000
  if (income <= 3250) return 20000
  if (income <= 3500) return 15000
  if (income <= 3750) return 12500
  if (income <= 4000) return 10000
  if (income <= 4250) return 5000
  if (income <= 4500) return 2500
  return 0
}

// EHG amount for families
function calculateFamilyGrant(income) {
  if (income <= 0) return 0
  if (income <= 1500) return 120000
  if (income <= 2000) return 110000
  if (income <= 2500) return 105000
  if (income <= 3000) return 95000
  if (income <= 3500) return 90000
  if (income <= 4000) return 80000
  if (income <= 4500) return 70000
  if (income <= 5000) return 65000
  if (income <= 5500) return 55000
  if (income <= 6000) return 50000
  if (income <= 6500) return 40000
  if (income <= 7000) return 30000
  if (income <= 7500) return 25000
  if (income <= 8000) return 20000
  if (income <= 8500) return 10000
  if (income <= 9000) return 5000
  return 0
}

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

// Preliminary EHG eligibility
const ehgEligible = computed(() => {
  if (employment.value !== 'yes') return false
  if (working.value !== 'yes') return false
  if (!firstTimer.value) return false
  if (!citizenshipEligible.value) return false
  if (averageIncome.value === '') return false

  const income = Number(averageIncome.value)

  if (isNaN(income) || income <= 0) return false

  if (props.buyerDetails?.buyertype === 'single') {
    return income <= 4500
  }

  if (props.buyerDetails?.buyertype === 'couple') {
    return income <= 9000
  }

  return false
})

// Calculate EHG
const estimatedEHG = computed(() => {
  if (!ehgEligible.value) return 0

  const income = Number(averageIncome.value)

  if (props.buyerDetails?.buyertype === 'single') {
    return calculateSinglesGrant(income)
  }

  if (props.buyerDetails?.buyertype === 'couple') {
    return calculateFamilyGrant(income)
  }

  return 0
})

// Automatically send updated result
async function sendEHG() {
  await nextTick()

  const complete =
    employment.value !== '' &&
    working.value !== '' &&
    averageIncome.value !== '' &&
    !isNaN(Number(averageIncome.value)) &&
    Number(averageIncome.value) >= 0

  emit('updateEHG', complete ? {
    employment: employment.value,
    working: working.value,
    averageIncome: Number(averageIncome.value),
    ehgEligible: ehgEligible.value,
    estimatedEHG: estimatedEHG.value
  } : null)
}
</script>

<template>
  <div>
    <hr/>

    <h5 class="mb-3">Enhanced CPF Housing Grant (EHG)</h5>

    <!-- Employment History -->
    <div class="mb-3">
      <label class="form-label">
        Have you or any qualifying household member worked
        continuously for at least 12 months during the required assessment period?
      </label>

      <div class="form-check">
        <input v-model="employment" type="radio" value="yes"
          name="employment" class="form-check-input"
          @change="sendEHG"/>
        <label class="form-check-label">Yes</label>
      </div>

      <div class="form-check">
        <input v-model="employment" type="radio" value="no"
          name="employment" class="form-check-input"
          @change="sendEHG"/>
        <label class="form-check-label">No</label>
      </div>
    </div>

    <!-- Current Employment -->
    <div class="mb-3">
      <label class="form-label">
        Are you or any qualifying household members currently working?
      </label>

      <div class="form-check">
        <input v-model="working" type="radio" value="yes"
          name="working" class="form-check-input"
          @change="sendEHG"/>
        <label class="form-check-label">Yes</label>
      </div>

      <div class="form-check">
        <input v-model="working" type="radio" value="no"
          name="working" class="form-check-input"
          @change="sendEHG"/>
        <label class="form-check-label">No</label>
      </div>
    </div>

    <!-- Average Income -->
    <div class="mb-3">
      <label class="form-label">
        Average Monthly Household Income During the EHG Assessment Period ($)
      </label>

      <input v-model.number="averageIncome" type="number" min="0"
        class="form-control" placeholder="Enter average monthly income"
        @input="sendEHG"/>

      <small class="text-muted">
        This may differ from your current monthly income in Step 1.
      </small>
    </div>

    <!-- EHG Result -->
    <div v-if="employment && working && averageIncome !== ''">
      <div v-if="ehgEligible" class="alert alert-success">
        <strong>Potential EHG:</strong>
        ${{ estimatedEHG.toLocaleString() }}
      </div>

      <div v-else class="alert alert-warning">
        You may not meet the EHG eligibility requirements.
      </div>
    </div>

    <p class="text-muted small">
      This is a preliminary estimate. Actual eligibility and grant amount
      depend on HDB's assessment.
    </p>
  </div>
</template>
