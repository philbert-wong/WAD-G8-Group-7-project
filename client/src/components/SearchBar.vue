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

// Enter or the Search button: tell the page to search
function onSubmit() {
  emit('search')
}
</script>

<template>
  <form class="search-bar input-group input-group-lg mb-3" @submit.prevent="onSubmit">
    <!-- not sure if i should add a search icon or add back the btn but the button looks a little weird.. -->
    <input
      :value="text"
      type="search"
      class="form-control search-input"
      placeholder="Search by town, street or block e.g. Punggol"
      @input="onInput"
    />
    <!-- <button class="btn btn-primary search-btn" type="submit">Search</button> -->
  </form>
</template>

<style scoped>
/* The form is the pill; the input and button sit inside it */
.search-bar {
  border-radius: 5px;            
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
  background: rgba(255, 255, 255, 0.45);
  backdrop-filter: blur(10px);
  border: 1.5px solid rgba(229, 231, 235, 0.6);
  box-shadow:0 4px 12px rgba(0, 0, 0, 0.05);
}

/* when the user clicks into the input, the whole bar gets the indigo outline */
.search-bar:focus-within {
  border-color: #4f46e5;
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.15);
}

/* remove the input's own border so only the bar's border shows */
.search-input {
  padding-left: 24px;
  border: 0;
  box-shadow: none;
  font-size: 16px;
}

.search-input:focus {
  box-shadow: none;
}

/* .search-btn {
  --bs-btn-bg: #4f46e5;
  --bs-btn-border-color: #4f46e5;
  --bs-btn-hover-bg: #4338ca;
  --bs-btn-hover-border-color: #4338ca;
  --bs-btn-active-bg: #3730a3;
  --bs-btn-active-border-color: #3730a3;
  padding: 0 28px;
  font-weight: 600;
} */

</style>
