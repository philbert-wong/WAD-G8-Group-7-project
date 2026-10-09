<script setup>
import { computed, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { fetchBlock } from "../api/blocks.js";
import { useMapStore } from "../stores/map.js";
import { useFilterStore } from "../stores/filters.js";
import { useAuthStore } from "../stores/auth.js";
import { useShortlistStore } from "../stores/shortlist.js";
import { useTrendsStore } from "../stores/trends.js";
import { FLAT_TYPES } from "../lib/constants.js";
import { money, signedMoney } from "../lib/format.js";
import PriceChart from "./PriceChart.vue";
import LeaseBar from "./LeaseBar.vue";
import AccessBars from "./AccessBars.vue";

/** OWNER: Frontend — Data Views — walkthrough step 08 */
const mapStore = useMapStore();
const filters = useFilterStore();
const auth = useAuthStore();
const shortlist = useShortlistStore();
const trends = useTrendsStore();
const router = useRouter();

const block = ref(null);
const loading = ref(false);
const error = ref("");
const flatType = ref("");
const showRoute = ref(true);
const actionError = ref("");
const saving = ref(false);   // the shortlist call is a round trip to the database

// Flat types in the usual order (2 room → executive), not sale-count order.
const rank = (t) => (FLAT_TYPES.includes(t) ? FLAT_TYPES.indexOf(t) : FLAT_TYPES.length);
const types = computed(() => Object.keys(block.value?.statsByType ?? {}).sort((a, b) => rank(a) - rank(b)));
const stats = computed(() => block.value?.statsByType?.[flatType.value] ?? null);
const typeTxns = computed(() => (block.value?.transactions ?? []).filter((t) => t.flatType === flatType.value));

const townTrend = computed(() => trends.forTown(block.value?.town, flatType.value));
const islandTrend = computed(() => trends.byType[flatType.value]?.island ?? null);
const lease = computed(() => trends.lease);
const leaseValue = computed(() => {
  const b = block.value;
  return lease.value && b?.remainingLeaseYears != null && stats.value?.medianPsm
    ? Math.round(lease.value.psmPerLeaseYear * (stats.value.medianPrice / stats.value.medianPsm)) : null;
});

const saved = computed(() => block.value && shortlist.isSaved(block.value.id));
const inCompare = computed(() => block.value && shortlist.compareIds.includes(block.value.id));

watch(() => mapStore.selectedBlockId, async (id) => {
  block.value = null; error.value = ""; actionError.value = "";
  if (!id) return;
  loading.value = true;
  try {
    const data = await fetchBlock(id);
    if (mapStore.selectedBlockId !== id) return;   // user already clicked another block
    block.value = data;

    // Open on the flat type being filtered, else the most common one (4 room).
    flatType.value = [filters.flatType, "4 ROOM"].find((t) => types.value.includes(t)) ?? types.value[0] ?? "";

    if (mapStore.focusSelected) {
      mapStore.focusSelected = false;
      mapStore.setCentre(data.lat, data.lng, 16);
    }
  } catch (err) {
    error.value = err.message;
  } finally {
    if (mapStore.selectedBlockId === id) loading.value = false;
  }
}, { immediate: true });

// Trend numbers for whichever flat type is showing.
watch(flatType, (t) => { if (t) trends.ensure(t).catch(() => {}); trends.ensureLease(); });

// Draw (or clear) the walk to the MRT on the map.
watch([block, showRoute], () => {
  const m = block.value?.nearestMrt;
  if (showRoute.value && m?.lat != null) {
    mapStore.setRoute({ from: [block.value.lat, block.value.lng], to: [m.lat, m.lng],
      path: m.path, name: m.name, minutes: m.walkMinutes });
  } else {
    mapStore.setRoute(null);
  }
});

async function toggleSave() {
  actionError.value = "";
  if (!auth.isSignedIn) {
    router.push({ name: "login", query: { redirect: "/explore" } });
    return;
  }
  saving.value = true;
  try {
    if (saved.value) await shortlist.remove(shortlist.itemFor(block.value.id).id);
    else await shortlist.add(block.value.id);
  } catch (err) {
    actionError.value = err.message;
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <aside v-if="mapStore.selectedBlockId" class="block-sidebar" data-cy="block-sidebar">
    <div class="block-sidebar__bar">
      <span class="small text-muted">Block details</span>
      <button class="btn-close" aria-label="Close" data-cy="sidebar-close" @click="mapStore.clearSelection()"></button>
    </div>

    <div class="block-sidebar__body">
      <div v-if="loading" class="text-muted py-4 text-center">
        <span class="spinner-border spinner-border-sm me-2" role="status"></span>Loading…
      </div>
      <p v-else-if="error" class="text-danger" role="alert">{{ error }}</p>

      <template v-else-if="block">
        <h2 class="h5 mb-0" data-cy="block-title">Blk {{ block.block }}</h2>
        <p class="text-muted small mb-2">{{ block.streetName }}, {{ block.town }}</p>

        <div class="d-flex gap-2 mb-1">
          <button class="btn btn-sm flex-fill" :class="saved ? 'btn-primary' : 'btn-outline-primary'"
                  :disabled="saving" data-cy="save-block" @click="toggleSave">
            {{ saving ? "Saving…" : saved ? "★ On shortlist" : "☆ Add to shortlist" }}
          </button>
          <button class="btn btn-sm flex-fill" :class="inCompare ? 'btn-secondary' : 'btn-outline-secondary'"
                  :disabled="!inCompare && !shortlist.canCompareMore" data-cy="compare-block"
                  @click="shortlist.toggleCompare(block.id)">
            {{ inCompare ? "✓ Comparing" : "Compare" }}
          </button>
        </div>
        <p v-if="!auth.isSignedIn" class="form-text mt-0">Sign in to save blocks to a shortlist.</p>
        <p v-if="!inCompare && !shortlist.canCompareMore" class="form-text mt-0">You can compare up to 4 blocks.</p>
        <p v-if="actionError" class="text-danger small mb-1" role="alert">{{ actionError }}</p>
        <RouterLink v-if="shortlist.compareIds.length > 1" to="/compare" class="small d-block mb-2">
          Open comparison ({{ shortlist.compareIds.length }}) →
        </RouterLink>

        <div v-if="types.length > 1" class="mb-3 mt-2">
          <div class="btn-group btn-group-sm flex-wrap" role="group" aria-label="Flat type">
            <button v-for="t in types" :key="t" type="button" class="btn"
                    :class="flatType === t ? 'btn-primary' : 'btn-outline-primary'"
                    :data-cy="`type-${t}`" @click="flatType = t">{{ t }}</button>
          </div>
        </div>

        <dl class="row small mb-3 mt-2">
          <dt class="col-7">Median price</dt>
          <dd class="col-5 text-end" data-cy="block-price">{{ money(stats?.medianPrice) }}</dd>
          <dt class="col-7">Per sqm</dt>
          <dd class="col-5 text-end">{{ money(stats?.medianPsm) }}</dd>
          <dt class="col-7">Sales on record</dt>
          <dd class="col-5 text-end">{{ stats?.txnCount ?? "—" }}</dd>
          <dt class="col-7">Latest sale</dt>
          <dd class="col-5 text-end">{{ stats?.lastTxnMonth ?? "—" }}</dd>
        </dl>

        <h3 class="h6">Lease</h3>
        <LeaseBar :years="block.remainingLeaseYears" class="mb-1" />
        <p v-if="leaseValue != null" class="small text-muted mb-3" data-cy="lease-value">
          Across Singapore, each extra year of lease is worth about
          <strong>{{ money(leaseValue) }}</strong> on a flat like this
          <span class="d-block">(estimate, controlling for town, size and storey).</span>
        </p>
        <div v-else class="mb-3"></div>

        <h3 class="h6">Nearest MRT</h3>
        <div v-if="block.nearestMrt" class="small mb-3">
          <strong>{{ block.nearestMrt.name }}</strong> — {{ block.nearestMrt.walkMinutes }} min walk
          <span v-if="block.nearestMrt.distanceM" class="text-muted">({{ Math.round(block.nearestMrt.distanceM) }} m)</span>
          <div v-if="block.nearestMrt.lat != null" class="form-check form-switch mt-1">
            <input id="showRoute" v-model="showRoute" class="form-check-input" type="checkbox" role="switch" data-cy="toggle-route" />
            <label class="form-check-label" for="showRoute">Show walking route on map</label>
          </div>
        </div>
        <p v-else class="small text-muted mb-3">No walking time yet for this block.</p>

        <h3 class="h6">What's nearby</h3>
        <AccessBars :block="block" class="mb-3" />

        <h3 class="h6">Price trend</h3>
        <div class="small mb-3" data-cy="trend-card">
          <template v-if="townTrend">
            <div>
              <strong>{{ block.town }}</strong>, {{ flatType }}:
              <span :class="townTrend.trendPerYear >= 0 ? 'text-success' : 'text-danger'" class="fw-semibold">
                {{ signedMoney(townTrend.trendPerYear) }}/yr
              </span>
              <span class="text-muted">({{ townTrend.pctPerYear >= 0 ? "+" : "" }}{{ townTrend.pctPerYear }}%)</span>
            </div>
            <div class="text-muted">Based on {{ townTrend.n }} sales · R² {{ townTrend.r2 }} · indicative only</div>
          </template>
          <template v-else-if="islandTrend">
            <div>Singapore-wide, {{ flatType }}:
              <span class="fw-semibold">{{ signedMoney(islandTrend.trendPerYear) }}/yr</span></div>
            <div class="text-muted">Too few sales in {{ block.town }} to fit its own trend · indicative only</div>
          </template>
          <span v-else class="text-muted">Not enough sales to estimate a trend.</span>
          <RouterLink class="d-block" to="/trends">See all towns →</RouterLink>
        </div>

        <h3 class="h6">Price history <span class="text-muted fw-normal">· {{ flatType }}</span></h3>
        <PriceChart :transactions="typeTxns" />

        <h3 class="h6 mt-3">Recent transactions</h3>
        <div class="table-responsive">
          <table class="table table-sm small mb-0">
            <thead><tr><th>Month</th><th>Storey</th><th class="text-end">Price</th></tr></thead>
            <tbody>
              <tr v-for="(t, i) in typeTxns.slice(0, 10)" :key="i">
                <td>{{ t.month }}</td>
                <td>{{ t.storeyRange }}</td>
                <td class="text-end">{{ money(t.resalePrice) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="form-text mt-2">Prices are transacted resale prices, not asking prices.</p>
      </template>
    </div>
  </aside>
</template>
