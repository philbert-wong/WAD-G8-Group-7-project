<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { fetchBlock } from "../api/blocks.js";
import { useScoreStore } from "../stores/score.js";
import { useShortlistStore, MAX_COMPARE } from "../stores/shortlist.js";
import { useTrendsStore } from "../stores/trends.js";
import { FLAT_TYPES } from "../lib/constants.js";
import { personalScore } from "../lib/score.js";
import { money, signedMoney, metres } from "../lib/format.js";
import CompareChart from "../components/CompareChart.vue";

/** OWNER: Frontend — Data Views — up to four blocks, side by side */
const shortlist = useShortlistStore();
const score = useScoreStore();
const trends = useTrendsStore();

const blocks = ref([]);
const loading = ref(false);
const error = ref("");
const flatType = ref("");

async function load() {
  const ids = shortlist.compareIds;
  if (ids.length === 0) { blocks.value = []; return; }
  loading.value = true; error.value = "";
  const settled = await Promise.allSettled(ids.map((id) => fetchBlock(id)));

  blocks.value = settled.filter((r) => r.status === "fulfilled").map((r) => r.value);
  const gone = ids.filter((id, i) => settled[i].status === "rejected");
  for (const id of gone) shortlist.toggleCompare(id);   // drop blocks that no longer exist
  if (gone.length) error.value = "One block could not be loaded and was removed from the comparison.";
  loading.value = false;
}

onMounted(load);
watch(() => shortlist.compareIds.join(","), load);

// Flat types that at least one block has sold, in the usual order. Opens on the type
// the most blocks share, preferring 4 room.
const types = computed(() => {
  const rank = (t) => (FLAT_TYPES.includes(t) ? FLAT_TYPES.indexOf(t) : FLAT_TYPES.length);
  const seen = new Set(blocks.value.flatMap((b) => Object.keys(b.statsByType ?? {})));
  return [...seen].sort((a, b) => rank(a) - rank(b));
});
function commonType(list) {
  const count = {};
  for (const b of blocks.value) for (const t of Object.keys(b.statsByType ?? {})) count[t] = (count[t] ?? 0) + 1;
  const most = Math.max(0, ...Object.values(count));
  const tied = list.filter((t) => count[t] === most);
  return tied.includes("4 ROOM") ? "4 ROOM" : tied[0] ?? "";
}
watch(types, (t) => { if (!t.includes(flatType.value)) flatType.value = commonType(t); }, { immediate: true });
watch(flatType, (t) => { if (t) trends.ensure(t).catch(() => {}); });

const stat = (b, key) => b.statsByType?.[flatType.value]?.[key] ?? null;

/** Each row: how to read a value off a block, and whether lower or higher is better. */
const rows = computed(() => [
  { label: "Median price",     get: (b) => stat(b, "medianPrice"), show: money, better: "low" },
  { label: "Price per sqm",    get: (b) => stat(b, "medianPsm"), show: money, better: "low" },
  { label: "Sales on record",  get: (b) => stat(b, "txnCount"), show: (v) => v ?? "—", better: null },
  { label: "Remaining lease",  get: (b) => b.remainingLeaseYears, show: (v) => (v == null ? "—" : `${Math.round(v)} yrs`), better: "high" },
  { label: "Walk to MRT",      get: (b) => b.nearestMrt?.walkMinutes ?? null, show: (v) => (v == null ? "—" : `${v} min`), better: "low" },
  { label: "Nearest school",   get: (b) => b.amenityAccess?.school ?? null, show: metres, better: "low" },
  { label: "Nearest park",     get: (b) => b.amenityAccess?.park ?? null, show: metres, better: "low" },
  { label: "Nearest hawker",   get: (b) => b.amenityAccess?.hawker ?? null, show: metres, better: "low" },
  { label: "Nearest clinic",   get: (b) => b.amenityAccess?.healthcare ?? null, show: metres, better: "low" },
  { label: "Nearest eldercare", get: (b) => b.amenityAccess?.eldercare ?? null, show: metres, better: "low" },
  ...(score.active ? [{ label: "My match score", get: (b) => personalScore(b, score.weights), show: (v) => (v == null ? "—" : `${v}/100`), better: "high" }] : []),
  { label: "Town price trend", get: (b) => trends.forTown(b.town, flatType.value)?.trendPerYear ?? null,
    show: (v) => (v == null ? "—" : `${signedMoney(v)}/yr`), better: null },
]);

/** The cells that hold the best value in a row (ties all count). Needs two or more to mean anything. */
function bestIndexes(row) {
  if (!row.better) return new Set();
  const vals = blocks.value.map((b) => row.get(b));
  const have = vals.filter((v) => v != null);
  if (have.length < 2) return new Set();
  const best = row.better === "low" ? Math.min(...have) : Math.max(...have);
  if (have.every((v) => v === best)) return new Set();
  return new Set(vals.map((v, i) => (v === best ? i : -1)).filter((i) => i >= 0));
}
const bests = computed(() => rows.value.map(bestIndexes));
</script>

<template>
  <div class="page" data-cy="compare-page">
    <div class="d-flex flex-wrap justify-content-between align-items-end gap-2 mb-3">
      <div>
        <h1 class="h3 mb-1">Compare blocks</h1>
        <p class="text-muted mb-0">Up to {{ MAX_COMPARE }} blocks side by side. The best value in each row is highlighted.</p>
      </div>
      <div v-if="blocks.length" class="d-flex gap-2 align-items-end">
        <div>
          <label class="form-label small text-muted mb-1" for="cft">Flat type</label>
          <select id="cft" v-model="flatType" class="form-select form-select-sm" data-cy="compare-flat-type">
            <option v-for="t in types" :key="t" :value="t">{{ t }}</option>
          </select>
        </div>
        <button class="btn btn-sm btn-outline-secondary" data-cy="clear-compare" @click="shortlist.clearCompare()">Clear all</button>
      </div>
    </div>

    <div v-if="error" class="alert alert-warning" role="alert">{{ error }}</div>

    <div v-if="loading && !blocks.length" class="text-muted py-5 text-center">
      <span class="spinner-border spinner-border-sm me-2" role="status"></span>Loading…
    </div>

    <div v-else-if="blocks.length < 2" class="text-center py-5" data-cy="compare-empty">
      <p class="lead mb-1">Pick at least two blocks to compare.</p>
      <p class="text-muted">
        Tick them on your shortlist, or press “Compare” on a block's details in the map.
        <span v-if="blocks.length === 1">You have 1 selected.</span>
      </p>
      <div class="d-flex gap-2 justify-content-center">
        <RouterLink class="btn btn-primary" to="/shortlist">Go to shortlist</RouterLink>
        <RouterLink class="btn btn-outline-primary" to="/explore">Open the map</RouterLink>
      </div>
    </div>

    <template v-else>
      <div class="table-responsive mb-4">
        <table class="table table-bordered compare-table align-middle" data-cy="compare-table">
          <thead>
            <tr>
              <th></th>
              <th v-for="b in blocks" :key="b.id" scope="col" style="min-width: 150px">
                <div class="d-flex justify-content-between align-items-start gap-2">
                  <div>
                    <div class="fw-semibold">Blk {{ b.block }}</div>
                    <div class="small text-muted fw-normal">{{ b.streetName }}<br>{{ b.town }}</div>
                  </div>
                  <button class="btn-close" :aria-label="`Remove Blk ${b.block}`" @click="shortlist.toggleCompare(b.id)"></button>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, ri) in rows" :key="row.label">
              <th scope="row">{{ row.label }}</th>
              <td v-for="(b, bi) in blocks" :key="b.id" :class="{ best: bests[ri].has(bi) }">
                {{ row.show(row.get(b)) }}
              </td>
            </tr>
            <tr>
              <th scope="row"></th>
              <td v-for="b in blocks" :key="b.id">
                <RouterLink class="btn btn-sm btn-outline-primary"
                            :to="{ path: '/explore', query: { block: b.id } }">View on map</RouterLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 class="h5">Price history · {{ flatType }}</h2>
      <CompareChart :blocks="blocks" :flat-type="flatType" />
      <p class="form-text">Median transacted price each month. Gaps mean no sale that month. Indicative only.</p>
    </template>
  </div>
</template>
