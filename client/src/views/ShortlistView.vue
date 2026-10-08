<script setup>
import { reactive } from 'vue';
import { useShortlistStore } from '../stores/shortlist.js';
import { staticMapUrl } from '../services/onemap.js';
import { flatTypeLabel, money, titleCase } from '../services/format.js';

const shortlist = useShortlistStore();

// Per-item UI state: { [id]: { editing, draft, saving, confirmRemove, error } }
const ui = reactive({});
const state = (id) => (ui[id] ??= { editing: false, draft: '', saving: false, confirmRemove: false, error: '' });

function startEdit(item) {
  Object.assign(state(item.id), { editing: true, draft: item.note, error: '' });
}

async function saveNote(item) {
  const s = state(item.id);
  s.saving = true;
  s.error = '';
  try {
    await shortlist.updateNote(item.id, s.draft);
    s.editing = false;
  } catch (err) {
    s.error = err.message;
  } finally {
    s.saving = false;
  }
}

async function remove(item) {
  const s = state(item.id);
  s.saving = true;
  try {
    await shortlist.remove(item.id);
    delete ui[item.id];
  } catch (err) {
    s.error = err.message;
    s.saving = false;
  }
}
</script>

<template>
  <div class="container py-4">
    <div class="d-flex flex-wrap justify-content-between align-items-end gap-2 mb-4">
      <div>
        <h1 class="h3 mb-1">My shortlist</h1>
        <p class="text-body-secondary mb-0">Blocks you saved, with your own notes. Saved on this browser until accounts are added.</p>
      </div>
      <RouterLink class="btn btn-outline-primary" to="/"><i class="bi bi-plus-lg me-1" aria-hidden="true"></i>Find more blocks</RouterLink>
    </div>

    <div v-if="shortlist.error" class="alert alert-danger" role="alert">{{ shortlist.error }}</div>
    <div v-if="shortlist.loading && !shortlist.loaded" class="text-center text-body-secondary py-5">
      <span class="spinner-border spinner-border-sm" role="status"></span> Loading…
    </div>

    <div v-else-if="!shortlist.items.length" class="empty-state text-center py-5" data-cy="shortlist-empty">
      <i class="bi bi-bookmark-heart display-5 text-body-tertiary" aria-hidden="true"></i>
      <h2 class="h5 mt-3">Nothing saved yet</h2>
      <p class="text-body-secondary">Tap the bookmark on any block to save it here.</p>
    </div>

    <div v-else class="row row-cols-1 row-cols-md-2 g-3" data-cy="shortlist">
      <div v-for="item in shortlist.items" :key="item.id" class="col">
        <article class="card border-0 shadow-sm h-100" data-cy="shortlist-item">
          <div class="row g-0 h-100">
            <div class="col-4 d-none d-sm-block">
              <img
                v-if="item.block?.lat != null"
                :src="staticMapUrl(item.block.lat, item.block.lng, { width: 256, height: 256, zoom: 17 })"
                alt=""
                class="shortlist-thumb"
                loading="lazy"
              />
              <div v-else class="shortlist-thumb block-card__placeholder" aria-hidden="true"><i class="bi bi-buildings"></i></div>
            </div>
            <div class="col-12 col-sm-8">
              <div class="card-body d-flex flex-column gap-2 h-100">
                <div>
                  <span class="badge text-bg-light border mb-1">{{ flatTypeLabel(item.flatType) }}</span>
                  <h2 class="h6 mb-0">
                    <RouterLink
                      v-if="item.block"
                      :to="{ name: 'block', params: { blockId: item.blockId }, query: { flatType: item.flatType } }"
                      class="text-reset"
                    >
                      Blk {{ item.block.block }} {{ titleCase(item.block.street) }}
                    </RouterLink>
                    <span v-else class="text-body-secondary">Block no longer in the data</span>
                  </h2>
                  <p v-if="item.block" class="small text-body-secondary mb-0">
                    {{ titleCase(item.block.town) }} · {{ money(item.block.medianPrice) }} · {{ Math.floor(item.block.remainingLease) }} yrs lease left
                  </p>
                </div>

                <form v-if="state(item.id).editing" class="d-flex flex-column gap-2" @submit.prevent="saveNote(item)">
                  <label :for="`note-${item.id}`" class="visually-hidden">Note</label>
                  <textarea
                    :id="`note-${item.id}`"
                    v-model="state(item.id).draft"
                    class="form-control form-control-sm"
                    rows="3"
                    maxlength="500"
                    placeholder="e.g. Near grandparents, check the 7th floor unit"
                    data-cy="note-input"
                  ></textarea>
                  <div class="d-flex gap-2">
                    <button class="btn btn-primary btn-sm" type="submit" :disabled="state(item.id).saving" data-cy="note-save">Save note</button>
                    <button class="btn btn-link btn-sm" type="button" @click="state(item.id).editing = false">Cancel</button>
                    <span class="ms-auto small text-body-secondary align-self-center">{{ state(item.id).draft.length }}/500</span>
                  </div>
                </form>
                <p v-else class="small mb-0 note" :class="{ 'text-body-secondary fst-italic': !item.note }" data-cy="note-text">
                  {{ item.note || 'No note yet' }}
                </p>

                <div v-if="state(item.id).error" class="small text-danger" role="alert">{{ state(item.id).error }}</div>

                <div v-if="!state(item.id).editing" class="d-flex gap-2 mt-auto pt-1">
                  <button class="btn btn-outline-secondary btn-sm" type="button" data-cy="note-edit" @click="startEdit(item)">
                    <i class="bi bi-pencil me-1" aria-hidden="true"></i>{{ item.note ? 'Edit note' : 'Add note' }}
                  </button>
                  <template v-if="state(item.id).confirmRemove">
                    <button class="btn btn-danger btn-sm" type="button" :disabled="state(item.id).saving" data-cy="remove-confirm" @click="remove(item)">
                      Remove
                    </button>
                    <button class="btn btn-link btn-sm" type="button" @click="state(item.id).confirmRemove = false">Keep</button>
                  </template>
                  <button
                    v-else
                    class="btn btn-outline-danger btn-sm"
                    type="button"
                    data-cy="remove"
                    @click="state(item.id).confirmRemove = true"
                  >
                    <i class="bi bi-trash me-1" aria-hidden="true"></i>Remove
                  </button>
                </div>
              </div>
            </div>
          </div>
        </article>
      </div>
    </div>
  </div>
</template>
