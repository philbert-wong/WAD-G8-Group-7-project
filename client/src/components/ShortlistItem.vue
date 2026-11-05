<script setup>
// One saved flat on the Shortlist page: its card plus a note box
import { ref, watch, onBeforeUnmount } from 'vue'
import BlockCard from './BlockCard.vue'

const props = defineProps({
  item: Object, // { id, note, block }
  score: { type: Number, default: null }, // match score 0 to 100, or null for "–"
  weights: { type: Object, default: null }, // Your Priorities as weights, for the match score's "i" breakdown
})
const emit = defineEmits(['remove', 'change-note'])

// What is typed in the box. "item.note" is what is already saved.
const draft = ref(props.item.note)

// The "Note saved" message. item.note only changes once the server has accepted the note, so that is when it shows.
// It goes away after 3 seconds, or when the box is edited again.
const justSaved = ref(false)
let hideTimer = null

watch(
  function () {
    return props.item.note
  },
  function (savedNote) {
    if (savedNote === draft.value) {
      justSaved.value = true
      clearTimeout(hideTimer)
      hideTimer = setTimeout(function () {
        justSaved.value = false
      }, 3000)
    }
  },
)

watch(draft, function () {
  justSaved.value = false
})

onBeforeUnmount(function () {
  clearTimeout(hideTimer)
})

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
    <BlockCard :block="item.block" :show-save="false" :score="score" :weights="weights" show-match />

    <!-- Note box in the cosy card style, sitting under the flat card -->
    <div class="cosy-card note-card">
      <div>
        <!-- for / id link the label to its box -->
        <label :for="'note-' + item.id" class="form-label d-block small mb-1">My note</label>
        <textarea :id="'note-' + item.id" v-model="draft" class="form-control cosy-input mb-2" rows="2" maxlength="500"
          :aria-label="'My note for Blk ' + item.block.block + ' ' + item.block.street"
          placeholder="e.g. near my parents, viewing on Sunday"></textarea>

        <div class="d-flex flex-wrap align-items-center gap-2">
          <button class="act-btn primary" :disabled="draft === item.note" @click="saveNote">
            Save note
          </button>
          <button class="act-btn ghost" @click="removeItem">Remove</button>
          <!-- role="status": a screen reader reads this out when it appears -->
          <span v-if="justSaved" class="note-saved" role="status">✓ Note saved</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Pull the note box up so it tucks under the flat card */
.note-card {
  margin-top: -10px;
}
/* The green "saved" message (sage passes the 4.5:1 contrast check on white) */
.note-saved {
  color: var(--sage);
  font-size: 14px;
  font-weight: 600;
}
</style>
