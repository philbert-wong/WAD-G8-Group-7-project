<script setup>
// The big search box: towns, streets, block addresses, postal codes or any place (SearchView decides how to search).
// The page (SearchView) owns the text and passes it in as a prop.
// While the user types, we send the new text up with emit.
defineProps({
  text: String,
})
const emit = defineEmits(['change-text', 'search'])

// Each key press: tell the page the new text
function onInput(event) {
  emit('change-text', event.target.value)
}

// Enter or the Search button: tell the page to search
function onSubmit() {
  emit('search')
}
</script>

<template>
  <form class="search-box mb-3" role="search" @submit.prevent="onSubmit">
    <!-- A short placeholder that fits on a phone; the examples are written out underneath, where they never get cut off -->
    <label for="flat-search" class="visually-hidden">Search for flats</label>
    <div class="d-flex gap-2">
      <input
        id="flat-search"
        :value="text"
        type="search"
        class="form-control cosy-input flex-grow-1"
        placeholder="Town or postal code"
        aria-describedby="flat-search-hint"
        @input="onInput"
      />
      <button class="act-btn primary search-btn" type="submit">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-4-4" />
        </svg>
        Search
      </button>
    </div>
    <div id="flat-search-hint" class="search-hint">For example: Punggol, Tampines St 21, Blk 314, or 560314</div>
  </form>
</template>

<style scoped>
/* A big, easy box (48px tall) with 16px text, so phones do not zoom in when you tap it */
.search-box input {
  font-size: 16px;
  min-height: 48px;
  padding: 11px 14px;
}
.search-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 48px;
  padding: 0 18px;
  font-size: 15px;
}
/* The examples under the box */
.search-hint {
  margin-top: 6px;
  font-size: 14px;
  color: var(--muted);
}
</style>
