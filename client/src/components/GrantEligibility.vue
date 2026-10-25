
<script setup>
import {ref} from 'vue'
import EHG from './EHG.vue'
import PHG from './PHG.vue'
import ResaleGrant from './ResaleGrant.vue'

const props = defineProps({
  buyerDetails: Object
})

const emit = defineEmits(['updateFinancial'])

const grants = ref('')
const ehgDetails = ref(null)
const phgDetails = ref(null)
const resaleDetails = ref(null)

// Receive result from EHG
function updateEHG(data) {
  ehgDetails.value = data
}

// Receive result from PHG
function updatePHG(data) {
  phgDetails.value = data
}

// Receive result from CPF Housing Grant
function updateResaleGrant(data) {
  resaleDetails.value = data
}

// Continue to Step 3
function sendFinancialDetails() {
  if (grants.value === '') {
    alert('Please select whether you want to check housing grants.')
    return
  }

  if (grants.value === 'yes' && ehgDetails.value === null) {
    alert('Please complete the EHG questions.')
    return
  }

  if (grants.value === 'yes' && phgDetails.value === null) {
    alert('Please complete the PHG questions.')
    return
  }

  if (grants.value === 'yes' && resaleDetails.value === null) {
    alert('Please select a resale flat type.')
    return
  }

  const estimatedEHG = grants.value === 'yes'
    ? ehgDetails.value.estimatedEHG
    : 0

  const estimatedPHG = grants.value === 'yes'
    ? phgDetails.value.estimatedPHG
    : 0

  const estimatedResaleGrant = grants.value === 'yes'
    ? resaleDetails.value.estimatedResaleGrant
    : 0

  emit('updateFinancial', {
    grants: grants.value,

    employment: grants.value === 'yes' ? ehgDetails.value.employment : '',
    working: grants.value === 'yes' ? ehgDetails.value.working : '',
    averageIncome: grants.value === 'yes' ? ehgDetails.value.averageIncome : 0,
    ehgEligible: grants.value === 'yes' ? ehgDetails.value.ehgEligible : false,

    flatType: grants.value === 'yes' ? resaleDetails.value.flatType : '',

    estimatedEHG: estimatedEHG,
    estimatedPHG: estimatedPHG,
    estimatedResaleGrant: estimatedResaleGrant,

    estimatedGrant: estimatedEHG + estimatedPHG + estimatedResaleGrant
  })
}
</script>

<template>
  <div>
    <h4 class="mb-3">Step 2: Housing Grants</h4>

    <div class="card shadow-sm">
      <div class="card-body p-4">

        <h5 class="mb-3">Housing Grant Eligibility</h5>

        <div class="mb-3">
          <label class="form-label">
            Would you like to check your eligibility for housing grants?
          </label>

          <div class="form-check">
            <input v-model="grants" type="radio" value="yes"
              name="grants" class="form-check-input"/>
            <label class="form-check-label">Yes, check my eligibility</label>
          </div>

          <div class="form-check">
            <input v-model="grants" type="radio" value="no"
              name="grants" class="form-check-input"/>
            <label class="form-check-label">No, exclude housing grants</label>
          </div>
        </div>

        <!-- EHG -->
        <div v-if="grants === 'yes'">
          <EHG :buyerDetails="buyerDetails" @updateEHG="updateEHG"/>
        </div>

        <!-- PHG -->
        <div v-if="grants === 'yes'">
          <PHG :buyerDetails="buyerDetails" @updatePHG="updatePHG"/>
        </div>

        <!-- CPF Housing Grant -->
        <div v-if="grants === 'yes'">
          <ResaleGrant
            :buyerDetails="buyerDetails"
            @updateResaleGrant="updateResaleGrant"
          />
        </div>

        <div v-if="grants === 'no'" class="alert alert-info">
          Housing grants will not be included in your estimated budget.
        </div>

        <!-- Total Grant -->
        <div v-if="grants === 'yes'" class="alert alert-primary mt-3">
          <strong>Total Potential Housing Grants:</strong>
          ${{
            (
              (ehgDetails?.estimatedEHG || 0) +
              (phgDetails?.estimatedPHG || 0) +
              (resaleDetails?.estimatedResaleGrant || 0)
            ).toLocaleString()
          }}
        </div>

        <p v-if="grants === 'yes'" class="text-muted small">
          Grant amounts are preliminary estimates and subject to HDB eligibility requirements.
        </p>

        <button type="button" class="btn btn-primary mt-3"
          @click="sendFinancialDetails">
          Next
        </button>

      </div>
    </div>
  </div>
</template>
