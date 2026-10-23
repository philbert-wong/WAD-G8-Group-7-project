<script setup>
  import { useRouter } from 'vue-router'
  import { ref, computed } from 'vue'

  const currentStep = ref(1)
  const router = useRouter()

  // buyer details
  const buyerType = ref('couple')
  const buyerStatus = ref('first')

  // co-owner
  const coowners = ref(0)
  const coowners_status = ref([])
  const coowners_income = ref([])
  const coowners_cpf = ref([])
  const coowners_cashsavings = ref([])

  // main owner
  const income = ref(0)
  const cpf = ref(0)
  const cashsavings = ref(0)

  // household income
  const totalIncome = computed(() => {
    let total = Number(income.value) || 0

    for (let i = 0; i < coowners.value; i++) {
      total += Number(coowners_income.value[i]) || 0
    }

    return total
  })

  // household CPF OA
  const totalOA = computed(() => {
    let total = Number(cpf.value) || 0

    for (let i = 0; i < coowners.value; i++) {
      total += Number(coowners_cpf.value[i]) || 0
    }

    return total
  })

  // household cash savings
  const totalCashSaving = computed(() => {
    let total = Number(cashsavings.value) || 0

    for (let i = 0; i < coowners.value; i++) {
      total += Number(coowners_cashsavings.value[i]) || 0
    }

    return total
  })

  // number of buyers
  const totalBuyers = computed(() => {
    if (buyerType.value === 'single') return 1
    return coowners.value + 1
  })

  // first-timer count
  const firstTimers = computed(() => {
    let total = buyerStatus.value === 'first' ? 1 : 0

    if (buyerType.value !== 'single') {
      for (let i = 0; i < coowners.value; i++) {
        if (coowners_status.value[i] === 'first') {
          total++
        }
      }
    }

    return total
  })

  // second-timer count
  const secondTimers = computed(() => {
    let total = buyerStatus.value === 'second' ? 1 : 0

    if (buyerType.value !== 'single') {
      for (let i = 0; i < coowners.value; i++) {
        if (coowners_status.value[i] === 'second') {
          total++
        }
      }
    }

    return total
  })

  // EHG family grant
  function calculateFamilyGrant() {
    const householdIncome = totalIncome.value

    if (householdIncome <= 0) return 0
    if (householdIncome <= 1500) return 120000
    if (householdIncome <= 2000) return 110000
    if (householdIncome <= 2500) return 105000
    if (householdIncome <= 3000) return 95000
    if (householdIncome <= 3500) return 90000
    if (householdIncome <= 4000) return 80000
    if (householdIncome <= 4500) return 70000
    if (householdIncome <= 5000) return 65000
    if (householdIncome <= 5500) return 55000
    if (householdIncome <= 6000) return 50000
    if (householdIncome <= 6500) return 40000
    if (householdIncome <= 7000) return 30000
    if (householdIncome <= 7500) return 25000
    if (householdIncome <= 8000) return 20000
    if (householdIncome <= 8500) return 10000
    if (householdIncome <= 9000) return 5000

    return 0
  }

  // EHG singles grant
  function calculateSinglesGrant(monthlyIncome) {
    if (monthlyIncome <= 0) return 0
    if (monthlyIncome <= 750) return 60000
    if (monthlyIncome <= 1000) return 55000
    if (monthlyIncome <= 1250) return 52500
    if (monthlyIncome <= 1500) return 47500
    if (monthlyIncome <= 1750) return 45000
    if (monthlyIncome <= 2000) return 40000
    if (monthlyIncome <= 2250) return 35000
    if (monthlyIncome <= 2500) return 32500
    if (monthlyIncome <= 2750) return 27500
    if (monthlyIncome <= 3000) return 25000
    if (monthlyIncome <= 3250) return 20000
    if (monthlyIncome <= 3500) return 15000
    if (monthlyIncome <= 3750) return 12500
    if (monthlyIncome <= 4000) return 10000
    if (monthlyIncome <= 4250) return 5000
    if (monthlyIncome <= 4500) return 2500

    return 0
  }

  // estimated housing grant
  const estimatedGrant = computed(() => {
    // single first-timer
    if (buyerType.value === 'single') {
      if (buyerStatus.value === 'first') {
        return calculateSinglesGrant(Number(income.value) || 0)
      }
      return 0
    }

    // buyer status must be selected for all owners
    if (coowners_status.value.slice(0, coowners.value).some(status => status !== 'first' && status !== 'second')) {
      return null
    }

    // all second-timers
    if (firstTimers.value === 0) {
      return 0
    }

    // couple / family
    if (buyerType.value === 'couple') {
      // two first-timers
      if (totalBuyers.value === 2 && firstTimers.value === 2) {
        return calculateFamilyGrant()
      }

      // one first-timer and one second-timer
      if (totalBuyers.value === 2 && firstTimers.value === 1) {
        return calculateSinglesGrant(totalIncome.value / 2)
      }

      return null
    }

    // joint singles: all first-timers
    if (buyerType.value === 'joint') {
      if (totalBuyers.value >= 2 && firstTimers.value === totalBuyers.value) {
        return calculateFamilyGrant()
      }

      return null
    }

    return null
  })

  // total available funds
  const totalAvailableFunds = computed(() => {
    return totalOA.value + totalCashSaving.value + (estimatedGrant.value || 0)
  })

  // apply budget to search
  function applybudget() {
    const budget = totalAvailableFunds.value

    router.push({
      path: '/',
      query: { maxPrice: budget }
    })
  }
</script>

<template>
  <div class="container mt-4 mb-5">

    <h2 class="mb-4">HDB Affordability Calculator</h2>

    <!-- Step 1 -->
    <div v-if="currentStep === 1">

      <h4 class="mt-4 mb-3">Step 1: Household Finances</h4>

      <div class="card shadow-sm">
        <div class="card-body p-4">

          <!-- Buyer Type -->
          <div class="mb-3">
            <label class="form-label">Buying As</label>
            <select v-model="buyerType" class="form-select w-50">
              <option value="single">Single Buyer</option>
              <option value="couple">Couple / Family</option>
              <option value="joint">Joint Singles</option>
            </select>
          </div>

          <!-- Number of Co-Owners -->
          <div v-if="buyerType !== 'single'" class="mb-3">
            <label class="form-label">Number of Co-Owners</label>
            <select v-model.number="coowners" class="form-select w-50">
              <option v-for="n in 4" :key="n" :value="n - 1">{{ n - 1 }}</option>
            </select>
          </div>

          <hr />

          <h5 class="mb-3">Main Owner</h5>

          <!-- Buyer Status -->
          <div class="mb-3">
            <label class="form-label">Buyer Status</label>
            <select v-model="buyerStatus" class="form-select w-50">
              <option value="first">First-Timer</option>
              <option value="second">Second-Timer</option>
            </select>
          </div>

          <!-- Monthly Income -->
          <div class="mb-3">
            <label class="form-label">Average Monthly Gross Income ($)</label>
            <input v-model.number="income" type="number" min="0" class="form-control w-50" />
          </div>

          <!-- CPF OA -->
          <div class="mb-3">
            <label class="form-label">CPF OA Savings ($)</label>
            <input v-model.number="cpf" type="number" min="0" class="form-control w-50" />
          </div>

          <!-- Cash Savings -->
          <div class="mb-3">
            <label class="form-label">Cash Savings ($)</label>
            <input v-model.number="cashsavings" type="number" min="0" class="form-control w-50" />
          </div>

          <!-- Co-Owners -->
          <div v-if="buyerType !== 'single'">
            <div v-for="n in coowners" :key="n">

              <hr />

              <h5 class="mb-3">Co-Owner {{ n }}</h5>

              <!-- Buyer Status -->
              <div class="mb-3">
                <label class="form-label">Buyer Status</label>
                <select v-model="coowners_status[n - 1]" class="form-select w-50">
                  <option value="first">First-Timer</option>
                  <option value="second">Second-Timer</option>
                </select>
              </div>

              <!-- Monthly Income -->
              <div class="mb-3">
                <label class="form-label">Average Monthly Gross Income ($)</label>
                <input v-model.number="coowners_income[n - 1]" type="number" min="0" class="form-control w-50" />
              </div>

              <!-- CPF OA -->
              <div class="mb-3">
                <label class="form-label">CPF OA Savings ($)</label>
                <input v-model.number="coowners_cpf[n - 1]" type="number" min="0" class="form-control w-50" />
              </div>

              <!-- Cash Savings -->
              <div class="mb-3">
                <label class="form-label">Cash Savings ($)</label>
                <input v-model.number="coowners_cashsavings[n - 1]" type="number" min="0" class="form-control w-50" />
              </div>

            </div>
          </div>

          <hr />

          <!-- Household Summary -->
          <h5 class="mb-3">Household Summary</h5>

          <p>Total Buyers: {{ totalBuyers }}</p>
          <p>First-Timers: {{ firstTimers }}</p>
          <p>Second-Timers: {{ secondTimers }}</p>
          <p>Total Monthly Income: ${{ totalIncome.toLocaleString() }}</p>
          <p>Total CPF OA: ${{ totalOA.toLocaleString() }}</p>
          <p>Total Cash Savings: ${{ totalCashSaving.toLocaleString() }}</p>

          <button type="button" class="btn btn-primary mt-3" @click="currentStep = 2">
            Next
          </button>

        </div>
      </div>
    </div>

    <!-- Step 2 -->
    <div v-if="currentStep === 2">

      <h4 class="mt-4 mb-3">Step 2: Estimated Housing Grant</h4>

      <div class="card shadow-sm">
        <div class="card-body p-4">

          <h5>Estimated Enhanced CPF Housing Grant (EHG)</h5>

          <h3 v-if="estimatedGrant !== null" class="mt-3">
            ${{ estimatedGrant.toLocaleString() }}
          </h3>

          <p v-else class="mt-3">
            Grant estimate unavailable for this buyer combination.
          </p>

          <p class="mt-3">
            Household Monthly Income: ${{ totalIncome.toLocaleString() }}
          </p>

          <p class="text-muted small">
            This is an indicative estimate based on buyer status and average monthly income.
            Actual grant eligibility depends on HDB requirements, household composition,
            income assessment and other conditions.
          </p>

          <button type="button" class="btn btn-secondary mt-3" @click="currentStep = 1">
            Back
          </button>

          <button type="button" class="btn btn-primary mt-3 ms-2" @click="currentStep = 3">
            Next
          </button>

        </div>
      </div>
    </div>

    <!-- Step 3 -->
    <div v-if="currentStep === 3">

      <h4 class="mt-4 mb-3">Step 3: Estimated Available Funds</h4>

      <div class="card shadow-sm">
        <div class="card-body p-4">

          <h5>Total Available Funds</h5>

          <h3 class="mt-3">
            ${{ totalAvailableFunds.toLocaleString() }}
          </h3>

          <hr />

          <p>CPF OA Savings: ${{ totalOA.toLocaleString() }}</p>
          <p>Cash Savings: ${{ totalCashSaving.toLocaleString() }}</p>

          <p v-if="estimatedGrant !== null">
            Estimated Housing Grant: ${{ estimatedGrant.toLocaleString() }}
          </p>

          <p v-else>
            Estimated Housing Grant: Not included (eligibility requires further assessment)
          </p>

          <p class="text-muted small">
            This is an estimate of available funds, not your maximum affordable flat price.
            Actual CPF usage and grant eligibility depend on applicable rules.
            Housing loans, purchase costs and other restrictions are not included.
          </p>

          <button type="button" class="btn btn-secondary mt-3" @click="currentStep = 2">
            Back
          </button>

          <button type="button" class="btn btn-primary mt-3 ms-2" @click="applybudget">
            Apply Budget to Search
          </button>

        </div>
      </div>
    </div>

  </div>
</template>
