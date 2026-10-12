<script setup>
// The big search box. v-model works with the parent's value, so typing updates it directly.
const text = defineModel({ type: String });
defineEmits(['search', 'typing']);
</script>

<template>
  <form class="input-group input-group-lg mb-3" @submit.prevent="$emit('search')">
    <input
      v-model="text"
      type="search"
      class="form-control"
      placeholder="Search by town, street or block e.g. Punggol"
    />
    <button class="btn btn-primary" type="submit">Search</button>
  </form>
</template>
