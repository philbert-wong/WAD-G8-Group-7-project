<script setup>
import { ref } from 'vue';

const props = defineProps({
  item: Object, // { id, note, block }
});
defineEmits(['remove', 'change-note']);

// What is typed in the box. "item.note" is what is already saved.
const draft = ref(props.item.note);

function formatPrice(price) {
  return '$' + price.toLocaleString('en-SG');
}
</script>

<template>
  <div class="card h-100 shadow-sm">
    <div class="card-body">
      <h5 class="card-title mb-0">Blk {{ item.block.block }} {{ item.block.street }}</h5>
      <small class="text-muted">
        {{ item.block.town }} · {{ item.block.flatType }} · {{ formatPrice(item.block.price) }}
      </small>

      <label class="form-label small mt-3 mb-1">My note</label>
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
        <button class="btn btn-sm btn-outline-danger" @click="$emit('remove', item)">Remove</button>
      </div>
    </div>
  </div>
</template>
