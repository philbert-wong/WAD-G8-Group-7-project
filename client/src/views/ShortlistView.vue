<script setup>
import ShortlistItem from '../components/ShortlistItem.vue'

defineProps({
  shortlist: Array,
})
defineEmits(['remove', 'change-note'])
</script>

<template>
  <section>
    <h2 class="h4 mb-3">My shortlist</h2>

    <p v-if="shortlist.length === 0" class="text-muted">
      Nothing saved yet. Go to Search and press "Save" on a flat.
    </p>

    <div class="row row-cols-1 row-cols-md-2 g-3">
      <div v-for="item in shortlist" :key="item.id" class="col">
        <ShortlistItem
          :item="item"
          @remove="$emit('remove', $event)"
          @change-note="$emit('change-note', $event)"
        />
      </div>
    </div>
  </section>
</template>
