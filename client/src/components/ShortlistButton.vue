<script setup>
import { computed, ref } from 'vue';
import { useShortlistStore } from '../stores/shortlist.js';

const props = defineProps({
  blockId: { type: String, required: true },
  flatType: { type: String, required: true },
  compact: Boolean,
});

const shortlist = useShortlistStore();
const saved = computed(() => Boolean(shortlist.find(props.blockId, props.flatType)));
const busy = ref(false);
const error = ref('');

async function toggle() {
  busy.value = true;
  error.value = '';
  try {
    await shortlist.toggle(props.blockId, props.flatType);
  } catch (err) {
    error.value = err.message;
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <button
    type="button"
    class="btn shortlist-btn"
    :class="[compact ? 'btn-sm btn-icon' : '', saved ? 'btn-warning' : 'btn-outline-secondary']"
    :aria-pressed="saved"
    :aria-label="saved ? 'Remove from shortlist' : 'Save to shortlist'"
    :title="error || (saved ? 'Remove from shortlist' : 'Save to shortlist')"
    :disabled="busy"
    data-cy="shortlist-toggle"
    @click.stop.prevent="toggle"
  >
    <i class="bi" :class="saved ? 'bi-bookmark-check-fill' : 'bi-bookmark-plus'" aria-hidden="true"></i>
    <span v-if="!compact" class="ms-1">{{ saved ? 'Saved to shortlist' : 'Save to shortlist' }}</span>
  </button>
</template>
