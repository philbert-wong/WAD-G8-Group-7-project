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
  <!-- One card: the title bar on top, the content underneath (no second box inside) -->
  <div class="cpanel mb-3">
    <!-- open = !open flips true/false, like "showModules = !showModules" in the Week 4 vue-example -->
    <button type="button" class="panel-toggle" :aria-expanded="open" @click="open = !open">
      <span class="panel-title">{{ title }}</span>
      <span class="panel-state">
        <span v-if="open">Hide ▴</span>
        <span v-else>Show ▾</span>
      </span>
    </button>

    <!-- v-show only hides the content, so whatever is inside keeps its state while closed -->
    <div v-show="open" class="cpanel-body">
      <slot></slot>
    </div>
  </div>
</template>

<style scoped>
/* The card around the title bar and the content */
.cpanel {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 12px 30px -22px rgba(30, 30, 80, 0.35);
}
/* The title bar: full width, title on the left, Show/Hide on the right (Flexbox), big enough to tap */
.panel-toggle {
  width: 100%;
  min-height: 52px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fff;
  border: 0;
  padding: 12px 18px;
  color: var(--char);
  text-align: left;
}
.panel-toggle:hover .panel-state {
  color: var(--terra);
}
.panel-title {
  font-size: 17px;
  font-weight: 700;
}
.panel-state {
  font-size: 14px;
  color: var(--muted);
  white-space: nowrap;
}
/* The content, with a thin line under the title bar */
.cpanel-body {
  border-top: 1px solid var(--line);
  padding: 16px 18px 18px;
}
</style>
