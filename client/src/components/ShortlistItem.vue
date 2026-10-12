<script setup>
// One saved flat on the Shortlist page: its card plus a note box
import { ref } from 'vue'
import BlockCard from './BlockCard.vue'

const props = defineProps({
  item: Object, // { id, note, block }
})
const emit = defineEmits(['remove', 'change-note'])

// What is typed in the box. "item.note" is what is already saved.
const draft = ref(props.item.note)

// "Save note" button: send the item and the new note to the page
function saveNote() {
  emit('change-note', props.item, draft.value)
}

// "Remove" button: send the item to the page
function removeItem() {
  emit('remove', props.item)
}
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
          <button class="btn btn-sm btn-primary" :disabled="draft === item.note" @click="saveNote">
            Save note
          </button>
          <button class="btn btn-sm btn-outline-danger" @click="removeItem">Remove</button>
        </div>
      </div>
    </div>
  </div>
</template>
