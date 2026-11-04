<script setup>
// A header bar like "Filters   Show ▾" that opens / closes whatever the page puts inside it.
// The content comes in through a <slot> (Week 6: props and slots pass content into a component),
// so the same panel works for the Filters and for Your Priorities.
import { ref } from 'vue'

const props = defineProps({
  title: String, // the text on the bar, e.g. "Filters"
  startOpen: { type: Boolean, default: true }, // open or closed when the page first shows
})

// Open or closed (starts the way the page asked). Only this panel needs it, so it lives here.
const open = ref(props.startOpen)
</script>

<template>
  <div class="mb-3">
    <!-- open = !open flips true/false, like "showModules = !showModules" in the Week 4 vue-example -->
    <button type="button" class="panel-toggle" @click="open = !open">
      <span>{{ title }}</span>
      <span v-if="open">Hide ▴</span>
      <span v-else>Show ▾</span>
    </button>

    <!-- v-show only hides the content, so whatever is inside keeps its state while closed -->
    <div v-show="open">
      <slot></slot>
    </div>
  </div>
</template>

<style scoped>
/* The header bar: full width, title on the left, Show/Hide on the right (Flexbox) */
.panel-toggle {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 10px 16px;
  margin-bottom: 8px;
  font-weight: 600;
  color: var(--char);
}
.panel-toggle:hover {
  border-color: var(--terra);
}
</style>
