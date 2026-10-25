<script setup>
// The big search box.
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

// Enter or the Search button: tell thAe page to search
function onSubmit() {
  emit('search')
}
</script>

<template>
  <form class="input-group input-group-lg mb-3" @submit.prevent="onSubmit">
    <input
      :value="text"
      type="search"
      class="form-control"
      placeholder="Search by town, street or block e.g. Punggol"
      @input="onInput"
    />
    <button class="btn btn-primary" type="submit">Search</button>
  </form>
</template>
