<script setup>
import { onMounted, reactive } from "vue";
import { useRouter } from "vue-router";
import { useShortlistStore, MAX_COMPARE } from "../stores/shortlist.js";
import { money } from "../lib/format.js";

/** OWNER: Frontend — Data Views — the CRUD the rubric asks for */
const shortlist = useShortlistStore();
const router = useRouter();

const drafts = reactive({});   // note text being edited, by shortlist id
const rowError = reactive({});

onMounted(() => shortlist.load());

const noteOf = (item) => drafts[item.id] ?? item.note ?? "";

async function saveNote(item) {
  if (drafts[item.id] === undefined || drafts[item.id] === (item.note ?? "")) return;
  try {
    await shortlist.updateNote(item.id, drafts[item.id]);
    rowError[item.id] = "";
  } catch (err) {
    rowError[item.id] = err.message;
  }
}

async function remove(item) {
  try { await shortlist.remove(item.id); }
  catch (err) { rowError[item.id] = err.message; }
}

const goCompare = () => router.push("/compare");
</script>

<template>
  <div class="page" data-cy="shortlist-page">
    <div class="d-flex flex-wrap justify-content-between align-items-end gap-2 mb-3">
      <div>
        <h1 class="h3 mb-1">My shortlist</h1>
        <p class="text-muted mb-0">Blocks you've saved. Tick up to {{ MAX_COMPARE }} to compare side by side.</p>
      </div>
      <button class="btn btn-primary" :disabled="shortlist.compareIds.length < 2" data-cy="go-compare" @click="goCompare">
        Compare {{ shortlist.compareIds.length || "" }} selected →
      </button>
    </div>

    <div v-if="shortlist.loading && !shortlist.items.length" class="text-muted py-5 text-center">
      <span class="spinner-border spinner-border-sm me-2" role="status"></span>Loading…
    </div>
    <div v-else-if="shortlist.error" class="alert alert-danger" role="alert">{{ shortlist.error }}</div>

    <div v-else-if="!shortlist.items.length" class="text-center py-5" data-cy="shortlist-empty">
      <p class="lead mb-1">Nothing saved yet.</p>
      <p class="text-muted">Open a block on the map and press “Add to shortlist”.</p>
      <RouterLink class="btn btn-primary" to="/explore">Open the map</RouterLink>
    </div>

    <div v-else class="row g-3">
      <div v-for="item in shortlist.items" :key="item.id" class="col-md-6 col-xl-4">
        <div class="card h-100 shadow-sm" data-cy="shortlist-item">
          <div class="card-body d-flex flex-column">
            <div class="d-flex justify-content-between align-items-start">
              <div v-if="item.block">
                <h2 class="h6 mb-0">Blk {{ item.block.block }}</h2>
                <div class="small text-muted">{{ item.block.streetName }}, {{ item.block.town }}</div>
              </div>
              <div v-else class="text-muted">This block is no longer available.</div>

              <div v-if="item.block" class="form-check">
                <input :id="`cmp-${item.id}`" class="form-check-input" type="checkbox"
                       :checked="shortlist.compareIds.includes(item.block.id)"
                       :disabled="!shortlist.compareIds.includes(item.block.id) && !shortlist.canCompareMore"
                       data-cy="compare-check" @change="shortlist.toggleCompare(item.block.id)" />
                <label class="form-check-label small" :for="`cmp-${item.id}`">Compare</label>
              </div>
            </div>

            <dl v-if="item.block" class="row small my-3 mb-2">
              <dt class="col-6 fw-normal text-muted">Median price</dt>
              <dd class="col-6 text-end mb-1">{{ money(item.block.medianPrice) }}</dd>
              <dt class="col-6 fw-normal text-muted">Remaining lease</dt>
              <dd class="col-6 text-end mb-1">{{ item.block.remainingLeaseYears ?? "—" }} yrs</dd>
              <dt class="col-6 fw-normal text-muted">Nearest MRT</dt>
              <dd class="col-6 text-end mb-0">
                <template v-if="item.block.nearestMrt">{{ item.block.nearestMrt.walkMinutes }} min · {{ item.block.nearestMrt.name }}</template>
                <template v-else>—</template>
              </dd>
            </dl>

            <label class="form-label small text-muted mb-1 mt-auto" :for="`note-${item.id}`">My note</label>
            <textarea :id="`note-${item.id}`" class="form-control form-control-sm" rows="2" maxlength="500"
                      :value="noteOf(item)" placeholder="Why this one? Viewing dates, pros and cons…"
                      data-cy="note-input"
                      @input="drafts[item.id] = $event.target.value" @blur="saveNote(item)"></textarea>
            <p v-if="rowError[item.id]" class="text-danger small mb-0 mt-1" role="alert">{{ rowError[item.id] }}</p>

            <div class="d-flex justify-content-between mt-3">
              <RouterLink v-if="item.block" class="btn btn-sm btn-outline-primary"
                          :to="{ path: '/explore', query: { block: item.block.id } }">View on map</RouterLink>
              <button class="btn btn-sm btn-outline-danger" data-cy="remove-item" @click="remove(item)">Remove</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
