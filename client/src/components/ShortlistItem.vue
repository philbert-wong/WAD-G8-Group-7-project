<script setup>
import { ref } from 'vue'
import BlockCard from './BlockCard.vue'

const props = defineProps({
  item: Object, // { id, note, block }
})
defineEmits(['remove', 'change-note'])

// What is typed in the box. "item.note" is what is already saved.
const draft = ref(props.item.note)
</script>

<template>
  <div>
    <!-- Same card as on the search page (price details, nearby amenities) -->
    <BlockCard :block="item.block" :show-save="false" />

    <!-- The note box, in its own card underneath -->
    <div class="card shadow-sm mt-2">
      <div class="card-body">
        <label class="form-label d-block small mb-1">My note</label>
        <textarea
          v-model="draft"
          class="form-control mb-2"
          rows="2"
          maxlength="500"
          placeholder="e.g. near my parents, viewing on Sunday"
        ></textarea>

        <div class="d-flex gap-2">
          <button
            class="btn btn-sm btn-primary"
            :disabled="draft === item.note"
            @click="$emit('change-note', { item, note: draft })"
          >
            Save note
          </button>
          <button class="btn btn-sm btn-outline-danger" @click="$emit('remove', item)">
            Remove
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
