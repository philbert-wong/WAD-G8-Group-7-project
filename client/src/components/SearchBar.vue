<script setup>
// The big search box.
// The page (SearchView) owns the text and passes it in as a prop.
// While the user types, we send the new text up with emit.
// DESIGN PREVIEW: restyled to the Cosy Professional look (logic unchanged).
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
      placeholder="Search by town, street or block e.g. Punggol"
      @input="onInput"
    />
    <button class="act-btn primary" type="submit">Search</button>
  </form>
</template>

<style scoped>
/* [COURSE] Slightly bigger text in the search box */
.search-box input {
  font-size: 16px;
  padding: 11px 14px;
}
</style>
