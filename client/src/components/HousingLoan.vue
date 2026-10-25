
<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  buyerDetails: Object,
  financialDetails: Object
})

const emit = defineEmits(['updateLoan'])

// Available savings
const totalOA = ref(0)
const totalCashSaving = ref(0)

// Housing loan details
const loantype = ref('')
const citizenship = ref('')
const previousloans = ref('')
const privateproperty = ref('')
const disposedproperty = ref('')

// Check income
const incomeEligible = computed(() => {
  if (props.buyerDetails.buyertype === 'single') {
    return Number(props.buyerDetails.totalIncome) <= 8000
  }

  if (props.buyerDetails.buyertype === 'couple') {
    return Number(props.buyerDetails.totalIncome) <= 16000
  }

  return null
})

// Check HDB loan eligibility
const hdbEligible = computed(() => {
  if (loantype.value !== 'hdb') return null

  if (
    citizenship.value === '' ||
    previousloans.value === '' ||
    privateproperty.value === '' ||
    disposedproperty.value === ''
  ) {
    return null
  }

  if (citizenship.value === 'no') return false
  if (previousloans.value === 'yes') return false
  if (privateproperty.value === 'yes') return false
  if (disposedproperty.value === 'yes') return false
  if (incomeEligible.value === false) return false
  if (incomeEligible.value === null) return null

  return true
})

// Average age of applicants
const averageAge = computed(() => {
  let total = Number(props.buyerDetails.age)
  let count = 1

  if (props.buyerDetails.buyertype !== 'single') {
    for (let i = 0; i < props.buyerDetails.coowners; i++) {
      total += Number(props.buyerDetails.coowners_age[i])
      count++
    }
  }

  return total / count
})

// Estimated loan tenure
const loanTenure = computed(() => {
  return Math.max(0, Math.min(25, 65 - averageAge.value))
})

// Maximum monthly repayment (30% MSR)
const maxRepayment = computed(() => {
  return Number(props.buyerDetails.totalIncome) * 0.30
})

// Estimated HDB loan amount
const estimatedLoan = computed(() => {
  if (hdbEligible.value !== true || loanTenure.value <= 0) {
    return 0
  }

  const monthlyRate = 0.03 / 12
  const months = loanTenure.value * 12

  return maxRepayment.value *
    (1 - Math.pow(1 + monthlyRate, -months)) / monthlyRate
})

// Send savings and loan details to parent
function sendLoanDetails() {
  if (totalOA.value < 0 || totalCashSaving.value < 0) {
    alert('Savings amounts cannot be negative.')
    return
  }

  emit('updateLoan', {
    // Savings
    totalOA: Number(totalOA.value) || 0,
    totalCashSaving: Number(totalCashSaving.value) || 0,

    // Loan details
    loantype: loantype.value,
    citizenship: loantype.value === 'hdb' ? citizenship.value : '',
    previousloans: loantype.value === 'hdb' ? previousloans.value : '',
    privateproperty: loantype.value === 'hdb' ? privateproperty.value : '',
    disposedproperty: loantype.value === 'hdb' ? disposedproperty.value : '',
    incomeEligible: loantype.value === 'hdb' ? incomeEligible.value : null,
    hdbEligible: loantype.value === 'hdb' ? hdbEligible.value : null,
    averageAge: averageAge.value,
    loanTenure: loantype.value === 'hdb' ? loanTenure.value : 0,
    maxRepayment: loantype.value === 'hdb' ? maxRepayment.value : 0,
    estimatedLoan: loantype.value === 'hdb' ? estimatedLoan.value : 0
  })
}
</script>

<template>
  <div>
    <h4 class="mb-3">Step 3: Housing Loan</h4>

    <div class="card shadow-sm">
      <div class="card-body p-4">

        <!-- Savings: Always visible -->
        <h5 class="mb-3">Available Savings</h5>

        <div class="mb-3">
          <label class="form-label">
            CPF Ordinary Account (OA) Savings ($)
          </label>

          <input
            v-model.number="totalOA"
            type="number"
            min="0"
            class="form-control"
            placeholder="e.g. 50000"
          />
        </div>

        <div class="mb-3">
          <label class="form-label">
            Cash Savings Available for Housing ($)
          </label>

          <input
            v-model.number="totalCashSaving"
            type="number"
            min="0"
            class="form-control"
            placeholder="e.g. 20000"
          />

          <small class="text-muted">
            Enter the cash savings you currently have available
            for purchasing a resale flat.
          </small>
        </div>

        <hr/>

        <h5 class="mb-3">Housing Loan Details</h5>

        <!-- Loan Type -->
        <div class="mb-3">
          <label class="form-label">Housing Loan Type</label>

          <div class="form-check">
            <input
              v-model="loantype"
              type="radio"
              value="hdb"
              name="loantype"
              class="form-check-input"
            />
            <label class="form-check-label">
              HDB Housing Loan
            </label>
          </div>

          <div class="form-check">
            <input
              v-model="loantype"
              type="radio"
              value="none"
              name="loantype"
              class="form-check-input"
            />
            <label class="form-check-label">
              No Housing Loan
            </label>
          </div>
        </div>

        <!-- HDB Loan Questions -->
        <div v-if="loantype === 'hdb'">
          <hr/>

          <h5 class="mb-3">HDB Housing Loan Eligibility</h5>

          <!-- Citizenship -->
          <div class="mb-3">
            <label class="form-label">
              Is at least one applicant a Singapore Citizen?
            </label>

            <div class="form-check">
              <input
                v-model="citizenship"
                type="radio"
                value="yes"
                name="citizenship"
                class="form-check-input"
              />
              <label class="form-check-label">Yes</label>
            </div>

            <div class="form-check">
              <input
                v-model="citizenship"
                type="radio"
                value="no"
                name="citizenship"
                class="form-check-input"
              />
              <label class="form-check-label">No</label>
            </div>
          </div>

          <!-- Previous HDB Loans -->
          <div class="mb-3">
            <label class="form-label">
              Have you or any member of your core family nucleus
              taken 2 or more HDB housing loans?
            </label>

            <div class="form-check">
              <input
                v-model="previousloans"
                type="radio"
                value="yes"
                name="previousloans"
                class="form-check-input"
              />
              <label class="form-check-label">Yes</label>
            </div>

            <div class="form-check">
              <input
                v-model="previousloans"
                type="radio"
                value="no"
                name="previousloans"
                class="form-check-input"
              />
              <label class="form-check-label">No</label>
            </div>
          </div>

          <!-- Private Property -->
          <div class="mb-3">
            <label class="form-label">
              Do you or any applicant/occupier own or have
              an interest in private residential property?
            </label>

            <div class="form-check">
              <input
                v-model="privateproperty"
                type="radio"
                value="yes"
                name="privateproperty"
                class="form-check-input"
              />
              <label class="form-check-label">Yes</label>
            </div>

            <div class="form-check">
              <input
                v-model="privateproperty"
                type="radio"
                value="no"
                name="privateproperty"
                class="form-check-input"
              />
              <label class="form-check-label">No</label>
            </div>
          </div>

          <!-- Disposed Property -->
          <div class="mb-3">
            <label class="form-label">
              Have you or any applicant/occupier disposed of
              private residential property in the last 30 months?
            </label>

            <div class="form-check">
              <input
                v-model="disposedproperty"
                type="radio"
                value="yes"
                name="disposedproperty"
                class="form-check-input"
              />
              <label class="form-check-label">Yes</label>
            </div>

            <div class="form-check">
              <input
                v-model="disposedproperty"
                type="radio"
                value="no"
                name="disposedproperty"
                class="form-check-input"
              />
              <label class="form-check-label">No</label>
            </div>
          </div>

          <!-- Income -->
          <div class="mb-3">
            <label class="form-label">
              Total Household Monthly Income
            </label>

            <p>
              ${{ Number(props.buyerDetails.totalIncome).toLocaleString() }}
            </p>
          </div>

          <!-- Eligibility Result -->
          <div v-if="hdbEligible === true" class="alert alert-success">
            Preliminary HDB loan checks passed.
          </div>

          <div v-else-if="hdbEligible === false" class="alert alert-danger">
            One or more HDB housing loan requirements are not met.
          </div>

          <div v-else class="alert alert-secondary">
            Complete the eligibility questions to check
            your preliminary eligibility.
          </div>

          <!-- Estimated Loan -->
          <div v-if="hdbEligible === true" class="mb-3">
            <hr/>

            <h5 class="mb-3">Estimated HDB Loan</h5>

            <p>
              Average Applicant Age:
              {{ averageAge.toFixed(1) }}
            </p>

            <p>
              Estimated Loan Tenure:
              {{ loanTenure.toFixed(1) }} years
            </p>

            <p>
              Maximum Monthly Repayment:
              ${{ maxRepayment.toLocaleString() }}
            </p>

            <h5>
              Estimated Maximum Loan Based on Income:
              ${{ Math.round(estimatedLoan).toLocaleString() }}
            </h5>
          </div>

          <p class="text-muted small">
            This is a preliminary estimate using a 3% annual
            assessment rate and the 30% MSR. The actual loan
            amount is subject to HDB's approval through the
            HFE assessment and the selected flat's details.
          </p>
        </div>

        <!-- No Loan -->
        <div v-if="loantype === 'none'" class="alert alert-info">
          You have selected No Housing Loan.
          Your estimated affordability will be calculated using
          your CPF OA savings, cash savings and eligible housing grants.
        </div>

        <!-- Next -->
        <button
          type="button"
          class="btn btn-primary mt-3"
          :disabled="!loantype || (loantype === 'hdb' && hdbEligible === null)"
          @click="sendLoanDetails"
        >
          Next
        </button>

      </div>
    </div>
  </div>
</template>
