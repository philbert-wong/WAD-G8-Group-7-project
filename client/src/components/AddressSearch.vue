<script setup>
import { onBeforeUnmount, ref } from 'vue';
import { OneMapBusyError, searchAddress } from '../services/onemap.js';
import { titleCase } from '../services/format.js';

const emit = defineEmits(['select']);

const DEBOUNCE_MS = 400;
const MAX_SUGGESTIONS = 8;

const query = ref('');
const suggestions = ref([]);
const open = ref(false);
const active = ref(-1);
const loading = ref(false);
const error = ref('');
let timer;
let controller;

function dedupe(results) {
  const seen = new Set();
  return results.filter((r) => {
    const key = `${r.block}|${r.road}|${r.postal}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function lookup(text) {
  controller?.abort();
  controller = new AbortController();
  loading.value = true;
  error.value = '';
  try {
    suggestions.value = dedupe(await searchAddress(text, { signal: controller.signal })).slice(0, MAX_SUGGESTIONS);
    active.value = suggestions.value.length ? 0 : -1;
    open.value = true;
  } catch (err) {
    if (err.name === 'AbortError') return;
    error.value = err instanceof OneMapBusyError ? err.message : 'Address search is unavailable right now.';
    open.value = false;
  } finally {
    loading.value = false;
  }
}

function onInput() {
  clearTimeout(timer);
  const text = query.value.trim();
  if (text.length < 2) {
    controller?.abort();
    loading.value = false;
    open.value = false;
    suggestions.value = [];
    return;
  }
  timer = setTimeout(() => lookup(text), DEBOUNCE_MS);
}

function choose(place) {
  query.value = place.block ? `${place.block} ${titleCase(place.road)}` : titleCase(place.road);
  open.value = false;
  emit('select', place);
}

function move(step) {
  if (!open.value || !suggestions.value.length) return;
  active.value = (active.value + step + suggestions.value.length) % suggestions.value.length;
}

function onEnter() {
  if (open.value && suggestions.value[active.value]) choose(suggestions.value[active.value]);
  else if (query.value.trim().length >= 2) lookup(query.value.trim());
}

function clear() {
  query.value = '';
  onInput();
}

onBeforeUnmount(() => {
  clearTimeout(timer);
  controller?.abort();
});

defineExpose({ clear });
</script>

<template>
  <div class="address-search position-relative">
    <label class="visually-hidden" for="address-input">Search by postal code or address</label>
    <div class="input-group input-group-lg search-input-group">
      <span class="input-group-text"><i class="bi bi-geo-alt" aria-hidden="true"></i></span>
      <input
        id="address-input"
        v-model="query"
        data-cy="address-input"
        type="search"
        class="form-control"
        placeholder="Postal code or address, e.g. 560406"
        autocomplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-controls="address-suggestions"
        :aria-expanded="open"
        :aria-activedescendant="open && active >= 0 ? `suggestion-${active}` : undefined"
        @input="onInput"
        @keydown.down.prevent="move(1)"
        @keydown.up.prevent="move(-1)"
        @keydown.enter.prevent="onEnter"
        @keydown.esc="open = false"
        @blur="open = false"
      />
      <span v-if="loading" class="input-group-text" aria-live="polite">
        <span class="spinner-border spinner-border-sm text-secondary" role="status">
          <span class="visually-hidden">Searching…</span>
        </span>
      </span>
    </div>

    <ul
      v-if="open"
      id="address-suggestions"
      class="list-group suggestions shadow"
      role="listbox"
      data-cy="address-suggestions"
    >
      <li
        v-for="(place, i) in suggestions"
        :id="`suggestion-${i}`"
        :key="`${place.postal}-${place.road}-${i}`"
        role="option"
        :aria-selected="i === active"
        class="list-group-item list-group-item-action"
        :class="{ active: i === active }"
        data-cy="address-suggestion"
        @mousedown.prevent="choose(place)"
        @mouseenter="active = i"
      >
        <div class="fw-semibold">{{ place.block ? `Blk ${place.block} ` : '' }}{{ titleCase(place.road) }}</div>
        <small :class="i === active ? 'text-white-50' : 'text-body-secondary'">
          {{ place.building ? `${titleCase(place.building)} · ` : '' }}Singapore {{ place.postal }}
        </small>
      </li>
      <li v-if="!suggestions.length" class="list-group-item text-body-secondary">No matching address found</li>
    </ul>
    <div v-if="error" class="form-text text-danger mt-2" role="alert">{{ error }}</div>
  </div>
</template>
