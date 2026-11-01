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
  <form class="search-box d-flex gap-2 mb-3" @submit.prevent="onSubmit">
    <input
      :value="text"
      type="search"
      class="form-control cosy-input flex-grow-1"
      placeholder="Town, street, block, postal code or any place e.g. Punggol, 560314"
      @input="onInput"
    />
    <button class="act-btn primary" type="submit">Search</button>
  </form>
</template>

<style scoped>
/* Slightly bigger text in the search box */
.search-box input {
  font-size: 16px;
  padding: 11px 14px;
}
</style>
