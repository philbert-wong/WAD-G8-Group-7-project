<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { fetchTrends, fetchLeaseModel } from "../api/trends.js";
import { useFilterStore } from "../stores/filters.js";
import { money, signedMoney } from "../lib/format.js";
import TrendBarChart from "../components/TrendBarChart.vue";
import LeaseChart from "../components/LeaseChart.vue";

/**
 * OWNER: Frontend — Data Views
 * Price trend per town and flat type, and what a year of lease is worth.
 * Both come from regressions fitted on the server (see server/lib/trends.js).
 */
const router = useRouter();
const filters = useFilterStore();

const flatType = ref("4 ROOM");
const sort = ref("rising");
const trend = ref(null);
const lease = ref(null);
const loading = ref(true);
const error = ref("");
const leaseError = ref("");

async function load() {
  loading.value = true; error.value = "";
  try {
    trend.value = await fetchTrends(flatType.value);
    flatType.value = trend.value.flatType ?? flatType.value;
  } catch (err) {
    error.value = err.message;
    trend.value = null;
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  load();
  try { lease.value = await fetchLeaseModel(); } catch (err) { leaseError.value = err.message; }
});
watch(flatType, (now, before) => { if (trend.value && now !== trend.value.flatType) load(); });

const SORTS = {
  rising:  { label: "Fastest rising",  fn: (a, b) => b.trendPerYear - a.trendPerYear },
  falling: { label: "Slowest rising",  fn: (a, b) => a.trendPerYear - b.trendPerYear },
  pct:     { label: "Highest % a year", fn: (a, b) => b.pctPerYear - a.pctPerYear },
  data:    { label: "Most sales",      fn: (a, b) => b.n - a.n },
  name:    { label: "Town A–Z",        fn: (a, b) => a.town.localeCompare(b.town) },
};
const towns = computed(() => [...(trend.value?.towns ?? [])].sort(SORTS[sort.value].fn));
// The chart always reads best from highest to lowest.
const chartTowns = computed(() => [...(trend.value?.towns ?? [])].sort(SORTS.rising.fn));

function viewOnMap(town) {
  filters.flatType = flatType.value;
  filters.town = town;
  router.push("/explore");
}
</script>

<template>
  <div class="page" data-cy="trends-page">
    <h1 class="h3 mb-1">Price trends</h1>
    <p class="text-muted">
      How resale prices are moving, from a regression on every transaction — controlling for sale date,
      remaining lease, floor area and storey — and what each year of lease is worth.
      <strong>Indicative only; not a valuation.</strong>
    </p>

    <div class="row g-2 align-items-end mb-3">
      <div class="col-auto">
        <label class="form-label small text-muted mb-1" for="tt">Flat type</label>
        <select id="tt" v-model="flatType" class="form-select" data-cy="trend-flat-type">
          <option v-for="t in trend?.available ?? [flatType]" :key="t" :value="t">{{ t }}</option>
        </select>
      </div>
    </div>

    <div v-if="loading" class="text-muted py-5 text-center">
      <span class="spinner-border spinner-border-sm me-2" role="status"></span>Fitting models…
    </div>
    <div v-else-if="error" class="alert alert-danger" role="alert">{{ error }}</div>

    <template v-else-if="trend">
      <div class="row g-3 mb-4">
        <div class="col-6 col-lg-3">
          <div class="stat-card">
            <div class="stat-card__label">Singapore-wide, {{ trend.flatType }}</div>
            <div class="stat-card__value" :class="trend.island?.trendPerYear >= 0 ? 'text-success' : 'text-danger'"
                 data-cy="island-trend">
              {{ trend.island ? `${signedMoney(trend.island.trendPerYear)}/yr` : "—" }}
            </div>
            <div class="small text-muted" v-if="trend.island">
              {{ trend.island.pctPerYear }}% a year · {{ trend.island.n.toLocaleString() }} sales · R² {{ trend.island.r2 }}
            </div>
          </div>
        </div>
        <div class="col-6 col-lg-3">
          <div class="stat-card">
            <div class="stat-card__label">Typical price now</div>
            <div class="stat-card__value">{{ money(trend.island?.medianPrice) }}</div>
            <div class="small text-muted">median, latest 12 months</div>
          </div>
        </div>
        <div class="col-6 col-lg-3">
          <div class="stat-card">
            <div class="stat-card__label">One year of lease is worth</div>
            <div class="stat-card__value" data-cy="lease-effect">
              {{ lease ? `${money(lease.psmPerLeaseYear)}/sqm` : "—" }}
            </div>
            <div class="small text-muted" v-if="lease">on average, all flat types</div>
            <div class="small text-muted" v-else>{{ leaseError || "loading…" }}</div>
          </div>
        </div>
        <div class="col-6 col-lg-3">
          <div class="stat-card">
            <div class="stat-card__label">Towns with a trend</div>
            <div class="stat-card__value">{{ trend.towns.length }}</div>
            <div class="small text-muted">towns with enough sales to fit</div>
          </div>
        </div>
      </div>

      <div class="row g-4">
        <div class="col-lg-5">
          <h2 class="h5">Change per year, by town</h2>
          <TrendBarChart :towns="chartTowns" />
        </div>

        <div class="col-lg-7">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <h2 class="h5 mb-0">All towns</h2>
            <select v-model="sort" class="form-select form-select-sm w-auto" aria-label="Sort towns" data-cy="trend-sort">
              <option v-for="(s, key) in SORTS" :key="key" :value="key">{{ s.label }}</option>
            </select>
          </div>
          <div class="table-responsive">
            <table class="table table-sm align-middle" data-cy="trend-table">
              <thead>
                <tr>
                  <th>Town</th><th class="text-end">Per year</th><th class="text-end">%/yr</th>
                  <th class="text-end">Sales</th><th class="text-end">R²</th><th></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="t in towns" :key="t.town">
                  <td>{{ t.town }}</td>
                  <td class="text-end fw-semibold" :class="t.trendPerYear >= 0 ? 'text-success' : 'text-danger'">
                    {{ signedMoney(t.trendPerYear) }}
                  </td>
                  <td class="text-end">{{ t.pctPerYear }}%</td>
                  <td class="text-end" :class="{ 'text-warning-emphasis': t.n < 20 }">{{ t.n }}</td>
                  <td class="text-end text-muted">{{ t.r2 }}</td>
                  <td class="text-end">
                    <button class="btn btn-sm btn-link p-0" @click="viewOnMap(t.town)">Map</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="form-text">
            Towns with few sales (under 20) give rougher estimates. Where a town's blocks all share one lease
            start date, lease and sale date can't be told apart, so lease is left out of that fit.
          </p>
        </div>
      </div>
    </template>

    <hr class="my-4" />

    <h2 class="h5">Lease decay</h2>
    <p class="text-muted">
      The shorter the lease left, the lower the price per square metre. This line isolates that effect,
      holding sale date, size, storey, town and flat type constant.
    </p>
    <div v-if="lease" class="row g-4">
      <div class="col-lg-8"><LeaseChart :model="lease" /></div>
      <div class="col-lg-4">
        <div class="stat-card mb-3">
          <div class="stat-card__label">Each lease year ≈</div>
          <div class="stat-card__value">{{ money(lease.psmPerLeaseYear) }}<small class="fs-6 text-muted"> per sqm</small></div>
          <div class="small text-muted">
            About {{ money(lease.psmPerLeaseYear * 92) }} on a 4-room flat (92 sqm).
          </div>
        </div>
        <ul class="small text-muted ps-3">
          <li>Fitted on {{ lease.n.toLocaleString() }} sales, R² {{ lease.r2 }}.</li>
          <li>Controls: {{ lease.controls.join(", ") }}.</li>
          <li>Lease range in the data: {{ lease.leaseRange[0] }}–{{ lease.leaseRange[1] }} years.</li>
          <li>Orange dots are real medians, so you can see how well the line fits.</li>
        </ul>
      </div>
    </div>
    <p v-else class="text-muted">{{ leaseError || "Loading…" }}</p>
  </div>
</template>
