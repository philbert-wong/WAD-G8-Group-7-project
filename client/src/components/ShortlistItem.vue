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
    <!-- DESIGN PREVIEW: note box in the cosy card style, sitting under the flat card -->
    <div class="cosy-card note-card">
      <div>
        <label class="form-label d-block small mb-1">My note</label>
        <textarea
          v-model="draft"
          class="form-control cosy-input mb-2"
          rows="2"
          maxlength="500"
          placeholder="e.g. near my parents, viewing on Sunday"
        ></textarea>

        <div class="d-flex gap-2">
          <button class="act-btn primary" :disabled="draft === item.note" @click="saveNote">
            Save note
          </button>
          <button class="act-btn ghost" @click="removeItem">Remove</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* [COURSE] Pull the note box up so it tucks under the flat card */
.note-card {
  margin-top: -10px;
}
</style>
