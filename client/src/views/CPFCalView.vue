<script setup>
// HDB AFFORDABILITY CALCULATOR (combined version: Yujia's wizard + Jihao's loan and grant maths)
//
// FEATURES (each one is marked in the code below, so we can remove any we decide not to keep)
//   FEATURE 1 (Yujia)  3-step wizard and household input: single / couple / joint singles,
//                      co-owners, each with first- or second-timer status, income, CPF and cash
//   FEATURE 2 (Jihao)  Extra questions the grants and loan need: flat type, 12 months' work,
//                      living with / near parents, loan period
//   FEATURE 3 (both)   Grants: EHG (Yujia's income bands) + CPF Housing Grant + PHG (Jihao),
//                      each with the reason you do or do not get it
//   FEATURE 4 (Jihao)  Max flat price INCLUDING the HDB loan, how it is paid
//                      (loan / grants / CPF / cash) and the monthly repayment
//   FEATURE 5 (Yujia)  "Apply Budget to Search" (now sends the max flat price, see applyBudget)
//   FEATURE 6 (Jihao)  PHG checker: which blocks are within 4 km of your parents (Step 2)
//   FEATURE 7 (Jihao)  Link to the Compare page (CompareView.vue, route /compare)
//
// All the maths is in utils/affordability.js and every number in utils/affordabilityRules.js.
import { ref, computed } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { calculateBudget } from '../utils/affordability.js'
import { MAX_LOAN_YEARS, HDB_LOAN_INTEREST_RATE, HDB_LOAN_LTV_PERCENT, MSR_PERCENT } from '../utils/affordabilityRules.js'
import PhgChecker from '../components/PhgChecker.vue'

// =====================================================================================
// TO DECIDE: how the results update. Change this ONE line to switch.
//
//   true  = OPTION A (Yujia's way): results update LIVE as you type, using computed().
//           + the Step 1 summary changes straight away
//           - computed() is not in our course list (SearchView already uses it, though)
//
//   false = OPTION B (course-only way): results are worked out when you press "Next".
//           + only ref and plain functions
//           - no live summary on Step 1; you see the numbers on Step 2
// =====================================================================================
const USE_LIVE_UPDATES = true

const router = useRouter()

// Which step of the wizard is showing: 1, 2 or 3
const currentStep = ref(1)
const errorMessage = ref('')

const flatTypes = ['2 ROOM', '3 ROOM', '4 ROOM', '5 ROOM', 'EXECUTIVE']

// ---------- FEATURE 1 (Yujia): household input ----------

// 'single', 'couple' (couple / family) or 'joint' (joint singles)
const buyerType = ref('couple')

// How many co-owners besides the main owner (0 to 3).
// Starts at 1, so the default "couple" has 2 people (Yujia's version started at 0,
// which made the grant "unavailable" until you changed it).
const coOwnerCount = ref(1)

// One owner's details. income, cpf and cash start empty ('') until typed.
function makeOwner() {
  return { status: 'first', income: '', cpf: '', cash: '' }
}

// Room for the main owner + up to 3 co-owners. We only SHOW the ones in use (activeOwners),
// so if you lower the count and raise it again, what you typed is still there.
const owners = ref([makeOwner(), makeOwner(), makeOwner(), makeOwner()])

// The owners in use: just the main owner for a single buyer, otherwise main + co-owners
function activeOwners() {
  let count = 1
  if (buyerType.value !== 'single') {
    count = coOwnerCount.value + 1
  }

  const list = []
  for (let i = 0; i < count; i++) {
    list.push(owners.value[i])
  }
  return list
}

// ---------- FEATURE 2 (Jihao): extra questions ----------
const flatType = ref('4 ROOM')
const employed12Months = ref(true)
const phgOption = ref('none') // 'none', 'with' or 'near'
const loanYears = ref(MAX_LOAN_YEARS)

// ---------- Turning the form into numbers ----------

// Turns a box's value into a number. An empty box counts as 0.
function toNumber(value) {
  if (value === '' || value === null || value === undefined) {
    return 0
  }
  return Number(value)
}

// Checks the form. Returns an error message, or '' when everything is fine.
function checkForm() {
  const list = activeOwners()

  if (buyerType.value === 'joint' && list.length < 2) {
    return 'Joint singles need at least 1 co-owner'
  }

  let totalIncome = 0
  for (const owner of list) {
    const income = toNumber(owner.income)
    const cpf = toNumber(owner.cpf)
    const cash = toNumber(owner.cash)
    if (isNaN(income) || isNaN(cpf) || isNaN(cash)) {
      return 'Please type numbers only'
    }
    if (income < 0 || cpf < 0 || cash < 0) {
      return 'Amounts cannot be negative'
    }
    totalIncome = totalIncome + income
  }

  if (totalIncome <= 0) {
    return 'Please enter the monthly income'
  }

  const years = toNumber(loanYears.value)
  if (isNaN(years) || years < 1 || years > MAX_LOAN_YEARS) {
    return 'Loan period must be between 1 and ' + MAX_LOAN_YEARS + ' years'
  }
  return ''
}

// Puts the whole form into the "inputs" object that affordability.js expects
function buildInputs() {
  const ownerNumbers = []
  for (const owner of activeOwners()) {
    ownerNumbers.push({
      status: owner.status,
      income: toNumber(owner.income),
      cpf: toNumber(owner.cpf),
      cash: toNumber(owner.cash),
    })
  }

  return {
    buyerType: buyerType.value,
    owners: ownerNumbers,
    employed12Months: employed12Months.value,
    flatType: flatType.value,
    phgOption: phgOption.value,
    loanYears: toNumber(loanYears.value),
  }
}

// ---------- OPTION A: live results with computed() ----------
// computed() re-runs this function by itself whenever anything it reads changes
// (any box in the form), and remembers the answer until then.
const liveResult = computed(function () {
  if (checkForm() !== '') {
    return null
  }
  return calculateBudget(buildInputs())
})

// ---------- OPTION B: results only when "Next" is pressed ----------
// A normal ref that we fill in ourselves in calculateNow()
const buttonResult = ref(null)

function calculateNow() {
  buttonResult.value = calculateBudget(buildInputs())
}

// The result the page shows, from whichever option is switched on (null = nothing to show yet)
function getResult() {
  if (USE_LIVE_UPDATES) {
    return liveResult.value
  }
  return buttonResult.value
}

// ---------- Moving between steps ----------

// "Next" on Step 1: check the form first; Option B also works out the result here
function goToStep2() {
  errorMessage.value = checkForm()
  if (errorMessage.value !== '') {
    return
  }
  if (!USE_LIVE_UPDATES) {
    calculateNow()
  }
  currentStep.value = 2
}

function goToStep(step) {
  currentStep.value = step
}

// ---------- Showing results ----------

// A friendly name for the household type that affordability.js worked out
function householdLabel(type) {
  if (type === 'family') {
    return 'Couple / family, all first-timers'
  } else if (type === 'single') {
    return 'Single first-timer'
  } else if (type === 'joint') {
    return 'Joint singles, all first-timers'
  } else if (type === 'mixed') {
    return 'Couple: one first-timer + one second-timer'
  } else if (type === 'second') {
    return 'Second-timers only'
  } else {
    return 'A mix of first- and second-timers we have no rules for yet'
  }
}

// ---------- FEATURE 5 (Yujia): Apply Budget to Search ----------
// Opens the Search page with the budget in the address, e.g. /?maxPrice=550000.
// SearchView reads it and sets the budget filter.
// CHANGED from Yujia's version: it now sends the max flat price INCLUDING the loan.
// Before, it sent only savings + EHG, which is far below what people can actually pay.
function applyBudget() {
  router.push({ path: '/', query: { maxPrice: getResult().maxBudget } })
}
</script>

<template>
  <div class="mb-5">
    <!-- FINAL DRAFT: cosy page heading -->
    <span class="eyebrow">Affordability</span>
    <h1 class="page-title serif">How much can I <em>afford?</em></h1>
    <p class="text-muted small mb-4">Step {{ currentStep }} of 3 · an estimate for a resale flat with an HDB loan</p>

    <!-- ===================== STEP 1: Household (FEATURE 1 + FEATURE 2) ===================== -->
    <div v-if="currentStep === 1">
      <h4 class="mb-3">Step 1: Household finances</h4>

      <div class="card shadow-sm">
        <div class="card-body p-4">
          <!-- FEATURE 1 (Yujia): who is buying -->
          <div class="row g-3">
            <div class="col-12 col-md-6">
              <label for="cal-buyer-type" class="form-label">Buying as</label>
              <select id="cal-buyer-type" v-model="buyerType" class="form-select">
                <option value="single">Single buyer (35 or older)</option>
                <option value="couple">Couple / family</option>
                <option value="joint">Joint singles</option>
              </select>
            </div>

            <div v-if="buyerType !== 'single'" class="col-12 col-md-6">
              <label for="cal-co-owners" class="form-label">Number of co-owners</label>
              <select id="cal-co-owners" v-model="coOwnerCount" class="form-select">
                <option :value="0">0</option>
                <option :value="1">1</option>
                <option :value="2">2</option>
                <option :value="3">3</option>
              </select>
            </div>
          </div>

          <!-- FEATURE 1 (Yujia): one block per owner -->
          <div v-for="(owner, index) in activeOwners()" :key="index">
            <hr />
            <h5 class="mb-3">
              <span v-if="index === 0">Main owner</span>
              <span v-else>Co-owner {{ index }}</span>
            </h5>

            <div class="row g-3">
              <div class="col-12 col-md-6 col-lg-3">
                <label :for="'cal-status-' + index" class="form-label">Buyer status</label>
                <select :id="'cal-status-' + index" v-model="owner.status" class="form-select">
                  <option value="first">First-timer</option>
                  <option value="second">Second-timer</option>
                </select>
              </div>
              <div class="col-12 col-md-6 col-lg-3">
                <label :for="'cal-income-' + index" class="form-label">Monthly gross income ($)</label>
                <input :id="'cal-income-' + index" v-model="owner.income" type="number" min="0" step="100" class="form-control" placeholder="e.g. 4000" />
              </div>
              <div class="col-12 col-md-6 col-lg-3">
                <label :for="'cal-cpf-' + index" class="form-label">CPF OA savings ($)</label>
                <input :id="'cal-cpf-' + index" v-model="owner.cpf" type="number" min="0" step="1000" class="form-control" placeholder="e.g. 50000" />
              </div>
              <div class="col-12 col-md-6 col-lg-3">
                <label :for="'cal-cash-' + index" class="form-label">Cash savings ($)</label>
                <input :id="'cal-cash-' + index" v-model="owner.cash" type="number" min="0" step="1000" class="form-control" placeholder="e.g. 20000" />
              </div>
            </div>
          </div>

          <!-- FEATURE 2 (Jihao): extra questions for the grants and the loan -->
          <hr />
          <h5 class="mb-3">About the flat</h5>
          <div class="row g-3">
            <div class="col-12 col-md-6 col-lg-3">
              <label for="cal-flat-type" class="form-label">Flat type</label>
              <select id="cal-flat-type" v-model="flatType" class="form-select">
                <option v-for="type in flatTypes" :key="type" :value="type">{{ type }}</option>
              </select>
            </div>
            <div class="col-12 col-md-6 col-lg-3">
              <label for="cal-phg" class="form-label">Parents / child</label>
              <select id="cal-phg" v-model="phgOption" class="form-select">
                <option value="none">Not living with or near them</option>
                <option value="with">Will live WITH them</option>
                <option value="near">Will live NEAR them (within 4 km)</option>
              </select>
            </div>
            <div class="col-12 col-md-6 col-lg-3">
              <label for="cal-years" class="form-label">Loan period (years)</label>
              <input id="cal-years" v-model="loanYears" type="number" min="1" :max="MAX_LOAN_YEARS" class="form-control" />
            </div>
            <div class="col-12 col-md-6 col-lg-3 d-flex align-items-end">
              <div class="form-check mb-2">
                <input id="cal-employed" v-model="employed12Months" type="checkbox" class="form-check-input" />
                <label for="cal-employed" class="form-check-label">Working for the past 12 months</label>
              </div>
            </div>
          </div>

          <!-- OPTION A only: Yujia's live household summary -->
          <div v-if="USE_LIVE_UPDATES && getResult()" class="mt-4 p-3 bg-light rounded">
            <h6 class="mb-2">Household summary</h6>
            <div class="row small">
              <div class="col-6 col-md-3">Buyers: {{ getResult().totals.buyers }}</div>
              <div class="col-6 col-md-3">First-timers: {{ getResult().totals.firstTimers }}</div>
              <div class="col-6 col-md-3">Second-timers: {{ getResult().totals.secondTimers }}</div>
              <div class="col-6 col-md-3">Income: {{ '$' + getResult().totals.income.toLocaleString('en-SG') }}</div>
              <div class="col-6 col-md-3">CPF OA: {{ '$' + getResult().totals.cpf.toLocaleString('en-SG') }}</div>
              <div class="col-6 col-md-3">Cash: {{ '$' + getResult().totals.cash.toLocaleString('en-SG') }}</div>
            </div>
          </div>

          <div v-if="errorMessage" class="alert alert-danger mt-3 mb-0">{{ errorMessage }}</div>

          <button type="button" class="btn btn-primary mt-3" @click="goToStep2">Next</button>
        </div>
      </div>
    </div>

    <!-- ===================== STEP 2: Grants (FEATURE 3 + FEATURE 6) ===================== -->
    <div v-if="currentStep === 2 && getResult()">
      <h4 class="mb-3">Step 2: Estimated housing grants</h4>

      <div class="card shadow-sm">
        <div class="card-body p-4">
          <p class="mb-1">
            Household: <strong>{{ householdLabel(getResult().type) }}</strong>
          </p>
          <p class="text-muted small">Household monthly income: {{ '$' + getResult().totals.income.toLocaleString('en-SG') }}</p>

          <!-- FEATURE 3 (both): every grant, with the reason -->
          <table class="table align-middle">
            <tbody>
              <tr v-for="grant in getResult().grants" :key="grant.name">
                <td>
                  {{ grant.name }}
                  <div class="small text-muted">{{ grant.reason }}</div>
                </td>
                <td class="text-end">
                  <span v-if="grant.status === 'yes'" class="text-success fw-semibold">{{ '$' + grant.amount.toLocaleString('en-SG') }}</span>
                  <span v-else-if="grant.status === 'unknown'" class="text-warning">Not counted yet</span>
                  <span v-else class="text-muted">$0</span>
                </td>
              </tr>
              <tr class="fw-bold">
                <td>Total grants</td>
                <td class="text-end">{{ '$' + getResult().grantsTotal.toLocaleString('en-SG') }}</td>
              </tr>
            </tbody>
          </table>

          <div v-if="getResult().hasUnknownGrant" class="alert alert-warning small">
            Some grants are not counted because we have no rule for your case yet, so your real total may be higher.
          </div>

          <p class="text-muted small">
            This is an indicative estimate. Actual grant eligibility depends on HDB requirements,
            household composition, income assessment and other conditions. Your HFE letter has the real amounts.
          </p>

          <button type="button" class="btn btn-secondary" @click="goToStep(1)">Back</button>
          <button type="button" class="btn btn-primary ms-2" @click="goToStep(3)">Next</button>
        </div>
      </div>

      <!-- FEATURE 6 (Jihao): PHG checker, only when they plan to live near parents / child -->
      <div v-if="phgOption === 'near'" class="mt-3">
        <PhgChecker />
      </div>
    </div>

    <!-- ===================== STEP 3: Budget (FEATURE 4 + FEATURE 5 + FEATURE 7) ===================== -->
    <div v-if="currentStep === 3 && getResult()">
      <h4 class="mb-3">Step 3: Your max flat price</h4>

      <div class="card shadow-sm">
        <div class="card-body p-4">
          <!-- FEATURE 4 (Jihao): max price including the HDB loan -->
          <p class="text-muted small mb-1">Estimated max flat price</p>
          <h3 class="mb-1">{{ '$' + getResult().maxBudget.toLocaleString('en-SG') }}</h3>
          <p class="small text-muted">
            <span v-if="getResult().limitedBy === 'savings'">
              Limited by your savings and grants: they must cover at least {{ 100 - HDB_LOAN_LTV_PERCENT }}% of the price.
            </span>
            <span v-else>Limited by your income: the loan repayment can be at most {{ MSR_PERCENT }}% of it.</span>
          </p>

          <div v-if="!getResult().loanAllowed" class="alert alert-warning small">
            Your household income is above the HDB loan ceiling, so no HDB loan is counted.
            A bank loan is not built into this calculator yet.
          </div>

          <h6 class="mt-3">How it is paid for</h6>
          <table class="table table-sm">
            <tbody>
              <tr><td>HDB loan ({{ HDB_LOAN_INTEREST_RATE }}% a year)</td><td class="text-end">{{ '$' + getResult().loan.toLocaleString('en-SG') }}</td></tr>
              <tr><td>Grants</td><td class="text-end">{{ '$' + getResult().fromGrants.toLocaleString('en-SG') }}</td></tr>
              <tr><td>CPF OA savings</td><td class="text-end">{{ '$' + getResult().fromCpf.toLocaleString('en-SG') }}</td></tr>
              <tr><td>Cash savings</td><td class="text-end">{{ '$' + getResult().fromCash.toLocaleString('en-SG') }}</td></tr>
              <tr class="fw-bold"><td>Monthly loan repayment</td><td class="text-end">{{ '$' + getResult().monthlyRepayment.toLocaleString('en-SG') }}</td></tr>
            </tbody>
          </table>

          <p class="text-muted small">
            Not included: stamp duty, legal fees, cash over valuation, bank loans, and the remaining-lease limit on the loan.
          </p>

          <button type="button" class="btn btn-secondary" @click="goToStep(2)">Back</button>
          <!-- FEATURE 5 (Yujia): send the budget to the Search page -->
          <button type="button" class="btn btn-primary ms-2" @click="applyBudget">Apply Budget to Search</button>
          <!-- FEATURE 7 (Jihao): Compare page -->
          <RouterLink to="/compare" class="btn btn-link ms-2">Compare my shortlisted flats</RouterLink>
        </div>
      </div>
    </div>
  </div>
</template>
