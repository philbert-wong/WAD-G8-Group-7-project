<script setup>
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { fetchGrantRules } from "../api/grants.js";
import { affordability } from "../lib/affordability.js";
import { LIMITS } from "../lib/constants.js";
import { money } from "../lib/format.js";
import { useFilterStore } from "../stores/filters.js";

/**
 * OWNER: Maps & Location — affordability calculator
 * Estimates the loan, the dearest flat and the grants a household could get, then
 * hands the result to the map as a budget. Every figure is indicative only.
 */
const route = useRoute();
const router = useRouter();
const filters = useFilterStore();

const rules = ref(null);
const loadError = ref("");

const STORAGE_KEY = "affordability:v1";
const defaults = () => ({
  household: "SC_SC", firstTimer: true, extendedFamily: false,
  income: 7000, debts: 0, cpf: 100000, cash: 50000,
  flatSize: "room2to4", proximity: "none",
  loanType: "hdb", ratePct: null, tenureYears: null,
});

function restore() {
  try { return { ...defaults(), ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") }; }
  catch { return defaults(); }
}

const form = reactive(restore());
watch(form, () => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(form)); } catch { /* private mode */ }
}, { deep: true });

onMounted(async () => {
  // Arriving from the grant layer on the map: pre-select "near parents".
  if (["near", "with"].includes(route.query.proximity)) form.proximity = route.query.proximity;
  try {
    rules.value = await fetchGrantRules();
  } catch (err) {
    loadError.value = err.message;
  }
});

const loan = computed(() => rules.value?.loans[form.loanType]);
const isSingle = computed(() => form.household === "SINGLE");

// Switching loan type should show that loan's own default rate and tenure.
watch(() => form.loanType, () => { form.ratePct = null; form.tenureYears = null; });

const result = computed(() => (rules.value ? affordability({
  ...form,
  income: Number(form.income) || 0,
  debts: Number(form.debts) || 0,
  cash: Number(form.cash) || 0,
  cpf: Number(form.cpf) || 0,
  ratePct: form.ratePct === null || form.ratePct === "" ? null : Number(form.ratePct),
  tenureYears: form.tenureYears === null || form.tenureYears === "" ? null : Number(form.tenureYears),
}, rules.value) : null));

const LIMIT_TEXT = {
  income:  "Your income is the limit: the loan you can service sets the price, not your savings.",
  savings: "Your savings are the limit: the downpayment, not the loan, sets the price.",
  cash:    "Cash is the limit: a bank loan needs at least 5% of the price in cash.",
};

const split = computed(() => {
  const r = result.value;
  if (!r || !r.downpayment) return [];
  return [
    { key: "grants", label: "Grants", value: r.fromGrants, cls: "bg-warning" },
    { key: "cpf", label: "CPF savings", value: r.fromCpf, cls: "bg-primary" },
    { key: "cash", label: "Cash", value: r.fromCash, cls: "bg-secondary" },
  ].filter((p) => p.value > 0);
});

const budget = computed(() => Math.floor((result.value?.maxPrice ?? 0) / LIMITS.price.step) * LIMITS.price.step);

function useAsBudget() {
  // At or past the slider's far end means "no limit".
  filters.maxPrice = budget.value >= LIMITS.price.max ? null : Math.max(LIMITS.price.min, budget.value);
  router.push("/explore");
}
</script>

<template>
  <div class="page" data-cy="afford-page">
    <h1 class="h3 mb-1">Affordability calculator</h1>
    <p class="text-muted">
      Work out how much you could borrow, which grants you may qualify for on a resale flat, and the
      dearest flat you can realistically buy. <strong>Indicative only — not financial advice.</strong>
    </p>

    <div v-if="loadError" class="alert alert-danger" role="alert">{{ loadError }}</div>

    <div v-else-if="rules" class="row g-4">
      <!-- ---- Inputs ---- -->
      <div class="col-lg-5">
        <form class="card shadow-sm" @submit.prevent>
          <div class="card-body">
            <h2 class="h6 text-uppercase text-muted">About you</h2>

            <div class="mb-3">
              <label class="form-label" for="household">Who is buying?</label>
              <select id="household" v-model="form.household" class="form-select" data-cy="af-household">
                <option value="SC_SC">Couple or family — both Singapore citizens</option>
                <option value="SC_PR">Couple or family — citizen + permanent resident</option>
                <option value="SINGLE">Single Singapore citizen</option>
              </select>
            </div>

            <div class="form-check mb-1">
              <input id="first" v-model="form.firstTimer" class="form-check-input" type="checkbox" data-cy="af-first" />
              <label class="form-check-label" for="first">First-timer (grants only apply to first-timers)</label>
            </div>
            <div v-if="!isSingle" class="form-check mb-3">
              <input id="ext" v-model="form.extendedFamily" class="form-check-input" type="checkbox" />
              <label class="form-check-label" for="ext">Buying with extended family (higher income ceiling)</label>
            </div>

            <div class="row g-2 mb-3">
              <div class="col-6">
                <label class="form-label" for="income">Gross monthly household income</label>
                <div class="input-group">
                  <span class="input-group-text">S$</span>
                  <input id="income" v-model.number="form.income" type="number" min="0" step="100"
                         class="form-control" data-cy="af-income" />
                </div>
              </div>
              <div class="col-6">
                <label class="form-label" for="debts">Monthly debt repayments</label>
                <div class="input-group">
                  <span class="input-group-text">S$</span>
                  <input id="debts" v-model.number="form.debts" type="number" min="0" step="50"
                         class="form-control" data-cy="af-debts" />
                </div>
              </div>
              <div class="col-6">
                <label class="form-label" for="cpf">CPF Ordinary Account</label>
                <div class="input-group">
                  <span class="input-group-text">S$</span>
                  <input id="cpf" v-model.number="form.cpf" type="number" min="0" step="1000"
                         class="form-control" data-cy="af-cpf" />
                </div>
              </div>
              <div class="col-6">
                <label class="form-label" for="cash">Cash savings</label>
                <div class="input-group">
                  <span class="input-group-text">S$</span>
                  <input id="cash" v-model.number="form.cash" type="number" min="0" step="1000"
                         class="form-control" data-cy="af-cash" />
                </div>
              </div>
            </div>

            <h2 class="h6 text-uppercase text-muted">The flat</h2>
            <div class="mb-3">
              <div class="btn-group w-100" role="group" aria-label="Flat size">
                <input id="fs1" v-model="form.flatSize" type="radio" class="btn-check" value="room2to4" />
                <label class="btn btn-outline-primary" for="fs1">2 to 4-room</label>
                <input id="fs2" v-model="form.flatSize" type="radio" class="btn-check" value="room5plus" />
                <label class="btn btn-outline-primary" for="fs2">5-room or larger</label>
              </div>
            </div>
            <div class="mb-3">
              <label class="form-label" for="prox">Buying near your parents or child?</label>
              <select id="prox" v-model="form.proximity" class="form-select" data-cy="af-proximity">
                <option value="none">No</option>
                <option value="near">Yes — within {{ rules.phg.nearKm }} km</option>
                <option value="with">Yes — living with them</option>
              </select>
              <RouterLink class="small" to="/explore">Find blocks near them on the map →</RouterLink>
            </div>

            <h2 class="h6 text-uppercase text-muted">The loan</h2>
            <div class="btn-group w-100 mb-2" role="group" aria-label="Loan type">
              <input id="lt1" v-model="form.loanType" type="radio" class="btn-check" value="hdb" />
              <label class="btn btn-outline-primary" for="lt1" data-cy="af-hdb">HDB loan</label>
              <input id="lt2" v-model="form.loanType" type="radio" class="btn-check" value="bank" />
              <label class="btn btn-outline-primary" for="lt2" data-cy="af-bank">Bank loan</label>
            </div>
            <div class="row g-2">
              <div class="col-6">
                <label class="form-label small" for="rate">Interest rate (% a year)</label>
                <input id="rate" v-model.number="form.ratePct" type="number" min="0" max="15" step="0.1"
                       class="form-control form-control-sm" :placeholder="String(loan.ratePct)" />
              </div>
              <div class="col-6">
                <label class="form-label small" for="tenure">Tenure (max {{ loan.maxTenureYears }} yrs)</label>
                <input id="tenure" v-model.number="form.tenureYears" type="number" min="5"
                       :max="loan.maxTenureYears" step="1" class="form-control form-control-sm"
                       :placeholder="String(loan.maxTenureYears)" />
              </div>
            </div>
          </div>
        </form>
      </div>

      <!-- ---- Results ---- -->
      <div class="col-lg-7" data-cy="af-results" aria-live="polite">
        <div class="stat-card mb-3 border-primary" style="border-width: 2px">
          <div class="stat-card__label">The dearest flat you could buy</div>
          <div class="stat-card__value display-6 text-primary" data-cy="af-max-price">{{ money(result.maxPrice) }}</div>
          <p class="small text-muted mb-2">{{ LIMIT_TEXT[result.limitedBy] }}</p>
          <button class="btn btn-primary" :disabled="!result.maxPrice" data-cy="af-use-budget" @click="useAsBudget">
            Use {{ money(budget) }} as my budget on the map →
          </button>
        </div>

        <div class="row g-3 mb-3">
          <div class="col-6">
            <div class="stat-card">
              <div class="stat-card__label">Loan</div>
              <div class="stat-card__value" data-cy="af-loan">{{ money(result.loan) }}</div>
              <div class="small text-muted">up to {{ money(result.maxLoan) }} by income</div>
            </div>
          </div>
          <div class="col-6">
            <div class="stat-card">
              <div class="stat-card__label">Monthly instalment</div>
              <div class="stat-card__value" data-cy="af-monthly">{{ money(result.monthlyPayment) }}</div>
              <div class="small text-muted">{{ result.ratePct }}% over {{ result.tenure }} yrs</div>
            </div>
          </div>
        </div>

        <div class="stat-card mb-3">
          <div class="d-flex justify-content-between">
            <div class="stat-card__label">Downpayment</div>
            <strong data-cy="af-down">{{ money(result.downpayment) }}</strong>
          </div>
          <div class="progress my-2" style="height: 18px" v-if="split.length">
            <div v-for="p in split" :key="p.key" class="progress-bar" :class="p.cls"
                 :style="{ width: (p.value / result.downpayment) * 100 + '%' }" :title="`${p.label} ${money(p.value)}`"></div>
          </div>
          <ul class="list-unstyled small mb-0">
            <li class="d-flex justify-content-between"><span><span class="dot bg-warning me-2"></span>Paid by grants</span><span>{{ money(result.fromGrants) }}</span></li>
            <li class="d-flex justify-content-between"><span><span class="dot bg-primary me-2"></span>From CPF savings</span><span data-cy="af-from-cpf">{{ money(result.fromCpf) }}</span></li>
            <li class="d-flex justify-content-between"><span><span class="dot bg-secondary me-2"></span>Cash outlay</span><span data-cy="af-from-cash">{{ money(result.fromCash) }}</span></li>
          </ul>
        </div>

        <div class="stat-card mb-3">
          <div class="d-flex justify-content-between mb-2">
            <div class="stat-card__label">Housing grants (resale)</div>
            <strong data-cy="af-grants-total">{{ money(result.grants.total) }}</strong>
          </div>
          <table class="table table-sm small mb-0">
            <tbody>
              <tr v-for="g in result.grants.items" :key="g.key" :data-cy="`grant-${g.key}`">
                <td>{{ g.label }}</td>
                <td class="text-end">
                  <strong v-if="g.eligible">{{ money(g.amount) }}</strong>
                  <span v-else class="text-muted">{{ g.why }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="small text-muted">
          <p class="mb-1">
            Rules: MSR {{ rules.loans.msr * 100 }}% of income for HDB flats; TDSR {{ rules.loans.tdsr * 100 }}%
            for bank loans, tested at {{ rules.loans.bank.stressRatePct }}%. Loan-to-value
            {{ rules.loans.hdb.ltv * 100 }}% (HDB) / {{ rules.loans.bank.ltv * 100 }}% (bank).
          </p>
          <p v-if="rules.ehg.approximate" class="mb-1">
            HDB publishes only the maximum and ceiling of the Enhanced CPF Housing Grant, so the amounts in
            between are estimated.
          </p>
          <p class="mb-0">
            Grant and loan rules as of {{ rules.asOf }}.
            <a :href="rules.sourceUrl" target="_blank" rel="noopener">Check HDB for current figures</a>.
            Excludes stamp duty, legal fees and renovation.
          </p>
        </div>
      </div>
    </div>

    <div v-else class="text-muted py-5 text-center">
      <span class="spinner-border spinner-border-sm me-2" role="status"></span>Loading rules…
    </div>
  </div>
</template>
