
<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const props = defineProps({
  buyerDetails: Object,
  financialDetails: Object,
  loanDetails: Object
})

// Savings from Step 3
const totalOA = computed(() => {
  return Number(props.loanDetails?.totalOA) || 0
})

const totalCash = computed(() => {
  return Number(props.loanDetails?.totalCashSaving) || 0
})

// Enhanced CPF Housing Grant
const estimatedEHG = computed(() => {
  return Number(props.financialDetails?.estimatedEHG) || 0
})

// Proximity Housing Grant
const estimatedPHG = computed(() => {
  return Number(props.financialDetails?.estimatedPHG) || 0
})

// CPF Housing Grant (Resale)
const estimatedResaleGrant = computed(() => {
  return Number(props.financialDetails?.estimatedResaleGrant) || 0
})

// Total housing grants
const estimatedGrant = computed(() => {
  return estimatedEHG.value +
         estimatedPHG.value +
         estimatedResaleGrant.value
})

// Estimated housing loan
const estimatedLoan = computed(() => {
  return Number(props.loanDetails?.estimatedLoan) || 0
})

// Total estimated housing budget
const estimatedBudget = computed(() => {
  return totalOA.value +
         totalCash.value +
         estimatedGrant.value +
         estimatedLoan.value
})

// Total household income
const totalIncome = computed(() => {
  return Number(props.buyerDetails?.totalIncome) || 0
})

// Return to Search page with calculated budget
function findFlats() {
  const budget = Math.floor(estimatedBudget.value / 10000) * 10000

  router.push({
    path: '/',
    query: {
      maxPrice: budget
    }
  })
}
</script>

<template>
  <div>
    <h4 class="mb-3">Step 4: Affordability Results</h4>

    <div class="card shadow-sm">
      <div class="card-body p-4">

        <h5 class="mb-3">Your Financial Summary</h5>

        <!-- Income -->
        <div class="mb-3">
          <p>
            Total Household Monthly Income:
            ${{ totalIncome.toLocaleString() }}
          </p>
        </div>

        <hr/>

        <!-- Savings -->
        <h5 class="mb-3">Available Savings</h5>

        <p>
          Total CPF OA Savings:
          ${{ totalOA.toLocaleString() }}
        </p>

        <p>
          Total Cash Savings:
          ${{ totalCash.toLocaleString() }}
        </p>

        <hr/>

        <!-- Housing Grants -->
        <h5 class="mb-3">Housing Grants</h5>

        <p>
          Estimated EHG:
          ${{ estimatedEHG.toLocaleString() }}
        </p>

        <p>
          Estimated PHG:
          ${{ estimatedPHG.toLocaleString() }}
        </p>

        <p>
          Estimated CPF Housing Grant (Resale):
          ${{ estimatedResaleGrant.toLocaleString() }}
        </p>

        <p>
          <strong>
            Total Estimated Housing Grants:
            ${{ estimatedGrant.toLocaleString() }}
          </strong>
        </p>

        <p
          v-if="financialDetails?.flatType === 'unsure'"
          class="text-muted small"
        >
          The CPF Housing Grant has not been estimated because
          you have not selected a resale flat type.
        </p>

        <hr/>

        <!-- Loan -->
        <h5 class="mb-3">Housing Loan</h5>

        <div v-if="loanDetails?.loantype === 'hdb'">

          <p>Loan Type: HDB Housing Loan</p>

          <div v-if="loanDetails.hdbEligible === true">
            <p>
              Estimated Loan Tenure:
              {{ Number(loanDetails.loanTenure).toFixed(1) }} years
            </p>

            <p>
              Maximum Monthly Repayment (MSR):
              ${{ Number(loanDetails.maxRepayment).toLocaleString() }}
            </p>

            <p>
              Estimated HDB Loan:
              ${{ Math.round(estimatedLoan).toLocaleString() }}
            </p>
          </div>

          <div v-else class="alert alert-warning">
            Your preliminary HDB loan eligibility checks were not passed.
            No HDB loan amount has been included in your budget.
          </div>

        </div>

        <div v-else-if="loanDetails?.loantype === 'bank'">
          <p>Loan Type: Bank Loan</p>

          <div class="alert alert-info">
            Bank loan estimation is not available yet.
            Your housing budget currently excludes any bank loan.
          </div>
        </div>

        <div v-else>
          <p>Loan Type: No Housing Loan</p>
          <p>Your budget is calculated without a housing loan.</p>
        </div>

        <hr/>

        <!-- Estimated Budget -->
        <div class="bg-light rounded p-4 mb-3">
          <h5>Estimated Housing Budget</h5>

          <h2 class="text-success">
            ${{ Math.round(estimatedBudget).toLocaleString() }}
          </h2>

          <p class="mb-0">
            CPF OA + Cash Savings + Total Estimated Housing Grants
            + Estimated Loan
          </p>
        </div>

        <p class="text-muted small">
          This is a preliminary gross housing budget, not a confirmed
          maximum purchase price. It assumes the entered CPF OA and cash
          savings can be used for the purchase. Actual affordability
          depends on CPF usage limits, housing grant eligibility,
          stamp duties, legal fees, other purchase costs, loan approval
          and the selected flat's valuation and remaining lease.
        </p>

        <div class="alert alert-info">
          You can use this estimated budget as a starting point
          when searching for HDB resale flats.
        </div>

        <!-- Find Flats Button -->
        <button
          type="button"
          class="btn btn-primary w-100"
          @click="findFlats"
        >
          Find Flats Within My Budget
        </button>

      </div>
    </div>
  </div>
</template>
