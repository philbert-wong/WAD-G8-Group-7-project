<script setup>
// HDB AFFORDABILITY CALCULATOR 
// All the maths is in utils/affordability.js and every number in utils/affordabilityRules.js.

import { ref, computed, onMounted } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { calculateBudget, money } from '../utils/affordability.js'
import { MAX_LOAN_YEARS, HDB_LOAN_INTEREST_RATE, HDB_LOAN_LTV_PERCENT, MSR_PERCENT } from '../utils/affordabilityRules.js'
import PhgChecker from '../components/PhgChecker.vue'
import axios from 'axios'
import { BASE_URL } from '../config.js'
import { useAuthStore } from '../stores/auth'

const router = useRouter()

// Pinia store (Week 11): saving the inputs needs an account, so we check if someone is logged in
const auth = useAuthStore()

// Which step of the wizard is showing: 1, 2 or 3
const currentStep = ref(1)
const errorMessage = ref('')

const flatTypes = ['2 ROOM', '3 ROOM', '4 ROOM', '5 ROOM', 'EXECUTIVE']

// 'single', 'couple' (couple / family) or 'joint' (joint singles)
const buyerType = ref('couple')

// How many co-owners besides the main owner (0 to 3).
const coOwnerCount = ref(1)

// One owner's details. income, cpf and cash start empty ('') until typed.
function makeOwner() {
  return { status: 'first', income: '', cpf: '', cash: '' }
}

// Room for the main owner + up to 3 co-owners. We only SHOW the ones in use (activeOwners),
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

const flatType = ref('4 ROOM')
const employed12Months = ref(true)
const phgOption = ref('none') // 'none', 'with' or 'near'
const loanYears = ref(MAX_LOAN_YEARS)

// A saved amount, or '' (an empty box) if nothing was saved for it
function savedValueOrEmpty(value) {
  if (value === null || value === undefined) {
    return ''
  }
  return value
}

//load the users saved inputs (yujia)
async function loadDetails() {
  // Guests have nothing saved, so do not ask the server
  if (!auth.isLoggedIn) {
    return
  }
  try {
    const response = await axios.get(`${BASE_URL}/api/affordability`)
    const data = response.data

    if (data) {
      buyerType.value = data.buyerType
      coOwnerCount.value = data.coOwnerCount

      for (let i = 0; i < data.owners.length; i++) {
        owners.value[i] = {
          status: data.owners[i].status,
          income: savedValueOrEmpty(data.owners[i].income),
          cpf: savedValueOrEmpty(data.owners[i].cpf),
          cash: savedValueOrEmpty(data.owners[i].cash)
        }
      }

      flatType.value = data.flatType
      employed12Months.value = data.employed12Months
      phgOption.value = data.phgOption
      loanYears.value = data.loanYears

      if (loanYears.value > MAX_LOAN_YEARS) {
        loanYears.value = MAX_LOAN_YEARS
      }
    }
  } catch (error) {
    console.log('Cannot load affordability details')
  }
}

onMounted(loadDetails)
async function saveDetails() {
  if (!auth.isLoggedIn) {
    return
  }
  try {
    await axios.put(`${BASE_URL}/api/affordability`, {
      buyerType: buyerType.value,
      coOwnerCount: coOwnerCount.value,
      owners: owners.value,
      flatType: flatType.value,
      employed12Months: employed12Months.value,
      phgOption: phgOption.value,
      loanYears: loanYears.value
    })
  } catch (error) {
    console.log('Cannot save affordability details')
  }
}


// Turns a box's value into a number
function toNumber(value) {
  if (value === '' || value === null || value === undefined) {
    return 0
  }
  return Number(value)
}

// checks the form
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

// --- The result ---
// computed() re-runs this function by itself whenever anything it reads changes
// (any box in the form), and remembers the answer until then.
// null = the form is not valid yet, so there is nothing to show.
const result = computed(function () {
  if (checkForm() !== '') {
    return null
  }
  return calculateBudget(buildInputs())
})

// Step 1: check the form first
function goToStep2() {
  errorMessage.value = checkForm()
  if (errorMessage.value !== '') {
    return
  }
  currentStep.value = 2
}

function goToStep(step) {
  currentStep.value = step
}



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

// --- Apply Budget to Search ----
// Opens the Search page with the budget in the address, e.g. /?maxPrice=550000.
// SearchView reads it and sets the budget filter.
// CHANGED from Yujia's version: it now sends the max flat price INCLUDING the loan.
// Before, it sent only savings + EHG, which is far below what people can actually pay.
function applyBudget() {
  // ⚠️ NOT IN COURSE (D): query strings (?maxPrice=...). Week 4 taught route params, not query.
  // Simplest course way: save the budget in the Pinia filters store (Week 11), then router.push('/').
  router.push({ path: '/', query: { maxPrice: result.value.maxBudget } })
}
</script>

<template>
  <div class="mb-5">
    <!-- Page heading -->
    <span class="eyebrow">Affordability</span>
    <h1 class="page-title serif">How much can I <em>afford?</em></h1>
    <p class="text-muted small mb-4">Step {{ currentStep }} of 3 · an estimate for a resale flat with an HDB loan</p>

    <!-- ===================== STEP 1: Household (FEATURE 1 + FEATURE 2) ===================== -->
    <div v-if="currentStep === 1">
      <h4 class="mb-3">Step 1: Household finances</h4>

      <div class="card shadow-sm">
        <div class="card-body p-4" @change="saveDetails" >
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
                <input :id="'cal-income-' + index" v-model="owner.income" type="number" min="0" step="100" class="form-control" placeholder="e.g. 4000"   />
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

          <!-- Yujia's live household summary (shows once the form is valid) -->
          <div v-if="result" class="mt-4 p-3 bg-light rounded">
            <h6 class="mb-2">Household summary</h6>
            <div class="row small">
              <div class="col-6 col-md-3">Buyers: {{ result.totals.buyers }}</div>
              <div class="col-6 col-md-3">First-timers: {{ result.totals.firstTimers }}</div>
              <div class="col-6 col-md-3">Second-timers: {{ result.totals.secondTimers }}</div>
              <div class="col-6 col-md-3">Income: {{ money(result.totals.income) }}</div>
              <div class="col-6 col-md-3">CPF OA: {{ money(result.totals.cpf) }}</div>
              <div class="col-6 col-md-3">Cash: {{ money(result.totals.cash) }}</div>
            </div>
          </div>

          <div v-if="errorMessage" class="alert alert-danger mt-3 mb-0">{{ errorMessage }}</div>

          <button type="button" class="btn btn-primary mt-3" @click="goToStep2">Next</button>
        </div>
      </div>
    </div>

    <!-- ===================== STEP 2: Grants (FEATURE 3 + FEATURE 6) ===================== -->
    <div v-if="currentStep === 2 && result">
      <h4 class="mb-3">Step 2: Estimated housing grants</h4>

      <div class="card shadow-sm">
        <div class="card-body p-4">
          <p class="mb-1">
            Household: <strong>{{ householdLabel(result.type) }}</strong>
          </p>
          <p class="text-muted small">Household monthly income: {{ money(result.totals.income) }}</p>

          <!-- FEATURE 3 (both): every grant, with the reason -->
          <table class="table align-middle">
            <tbody>
              <tr v-for="grant in result.grants" :key="grant.name">
                <td>
                  {{ grant.name }}
                  <div class="small text-muted">{{ grant.reason }}</div>
                </td>
                <td class="text-end">
                  <span v-if="grant.status === 'yes'" class="text-success fw-semibold">{{ money(grant.amount) }}</span>
                  <span v-else-if="grant.status === 'unknown'" class="text-warning">Not counted yet</span>
                  <span v-else class="text-muted">$0</span>
                </td>
              </tr>
              <tr class="fw-bold">
                <td>Total grants</td>
                <td class="text-end">{{ money(result.grantsTotal) }}</td>
              </tr>
            </tbody>
          </table>

          <div v-if="result.hasUnknownGrant" class="alert alert-warning small">
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
    <div v-if="currentStep === 3 && result">
      <h4 class="mb-3">Step 3: Your max flat price</h4>

      <div class="card shadow-sm">
        <div class="card-body p-4">
          <!-- FEATURE 4 (Jihao): max price including the HDB loan -->
          <p class="text-muted small mb-1">Estimated max flat price</p>
          <h3 class="mb-1">{{ money(result.maxBudget) }}</h3>
          <p class="small text-muted">
            <span v-if="result.limitedBy === 'savings'">
              Limited by your savings and grants: they must cover at least {{ 100 - HDB_LOAN_LTV_PERCENT }}% of the price.
            </span>
            <span v-else>Limited by your income: the loan repayment can be at most {{ MSR_PERCENT }}% of it.</span>
          </p>

          <div v-if="!result.loanAllowed" class="alert alert-warning small">
            Your household income is above the HDB loan ceiling, so no HDB loan is counted.
          </div>

          <!-- Grants can only pay for the flat, so the stamp duty needs some CPF or cash -->
          <div v-if="result.maxBudget === 0" class="alert alert-warning small">
            You need some CPF or cash savings to pay the buyer's stamp duty. Grants can only be used for the flat itself.
          </div>

          <h6 class="mt-3">How it is paid for</h6>
          <table class="table table-sm">
            <tbody>
              <tr><td>HDB loan ({{ HDB_LOAN_INTEREST_RATE }}% a year)</td><td class="text-end">{{ money(result.loan) }}</td></tr>
              <tr><td>Grants</td><td class="text-end">{{ money(result.fromGrants) }}</td></tr>
              <tr><td>CPF OA savings</td><td class="text-end">{{ money(result.fromCpf) }}</td></tr>
              <tr><td>Cash savings</td><td class="text-end">{{ money(result.fromCash) }}</td></tr>
              <tr class="fw-bold"><td>Monthly loan repayment</td><td class="text-end">{{ money(result.monthlyRepayment) }}</td></tr>
            </tbody>
          </table>

          <!-- Buyer's stamp duty: paid on top of the price, from CPF / cash -->
          <h6 class="mt-3">On top of the price</h6>
          <table class="table table-sm">
            <tbody>
              <tr><td>Buyer's stamp duty (from your CPF / cash)</td><td class="text-end">{{ money(result.stampDuty) }}</td></tr>
            </tbody>
          </table>

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
