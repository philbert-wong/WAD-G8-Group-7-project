<script setup>
// "What matters to you?" panel.
// The page (SearchView) owns the choices and passes them in as a prop.
// When the user clicks something, this panel tells the page with emit, and the page updates the choices.
// The importance level is one dropdown per category, so it fits the narrow sidebar.
import { ref } from 'vue'
import { CATEGORIES, IMPORTANCE_LEVELS } from '../utils/matchScore.js'

const props = defineProps({
  preferences: Object, // { school: { ticked: true, level: 3 }, mrt: { ... }, ... }
  onMap: { type: Boolean, default: false }, // true on the Map page, which colours dots instead of sorting cards
  // The ids of the panel and its tick boxes. The presets form shows this panel too, so it gives its own ids:
  // two panels on the same page (the popup over Search) must not share ids.
  panelId: { type: String, default: 'priorities-panel' },
  idPrefix: { type: String, default: 'matters-' },
  // The Map makes the card foldable: "Hide ▴ / Show ▾" next to the title folds it down to just the title row
  // (Search leaves it always open)
  collapsible: { type: Boolean, default: false },
  startOpen: { type: Boolean, default: true }, // open or closed at the start, when collapsible
})
const emit = defineEmits(['change-ticked', 'change-level'])

// Open or folded (only used when collapsible). Only this card needs it, so it lives here.
const open = ref(props.startOpen)

// A tick box was clicked: send the category and whether it is now ticked
function onTickChange(key, event) {
  emit('change-ticked', key, event.target.checked)
}

// A level was picked in the dropdown: send the category and the new level (1 to 5)
function onLevelChange(key, event) {
  emit('change-level', key, Number(event.target.value))
}
</script>

<template>
  <div :id="panelId" class="prio" :class="{ folded: collapsible && !open }">
    <!-- Title row; on the Map also the Hide / Show button (open = !open flips it, like the Week 4 vue-example) -->
    <div class="d-flex justify-content-between align-items-center">
      <h4 class="serif">Your Priorities</h4>
      <button v-if="collapsible" type="button" class="fold-toggle" :aria-expanded="open" @click="open = !open">
        {{ open ? 'Hide ▴' : 'Show ▾' }}
      </button>
    </div>

    <!-- Everything under the title: folded away on the Map when closed (v-show keeps the choices while hidden) -->
    <div v-show="!collapsible || open">
    <!-- How these change what you see: the sort on Search, the dot colours on the Map.
         "priority score" stands out (.key-word), so it is clear these set the score on every card / dot -->
    <div v-if="onMap" class="hint">
      Tick what matters. These set each block's <strong class="key-word">priority score</strong>: colour the dots by
      "Priority score" to see it.
    </div>
    <div v-else class="hint">
      Tick what matters. These set each flat's <strong class="key-word">priority score</strong>, and
      "Sort: Priority score" puts the best first.
    </div>

    <div v-for="category in CATEGORIES" :key="category.key" class="prio-row">
      <!-- Tick box: unticked means this category is ignored (weight 0) -->
      <label class="chk" :for="idPrefix + category.key">
        <input
          :id="idPrefix + category.key"
          type="checkbox"
          :checked="preferences[category.key].ticked"
          @change="onTickChange(category.key, $event)"
        />
        {{ category.label }}
      </label>

      <!-- How important it is: Low (1) to Extremely (5). Greyed out when unticked. -->
      <select
        class="form-select form-select-sm cosy-input level"
        :value="preferences[category.key].level"
        :disabled="!preferences[category.key].ticked"
        :aria-label="'How important is ' + category.label"
        @change="onLevelChange(category.key, $event)"
      >
        <option v-for="level in IMPORTANCE_LEVELS" :key="level.value" :value="level.value">
          {{ level.label }}
        </option>
      </select>
    </div>
    </div>
  </div>
</template>

<style scoped>
/* Same sidebar card look as the filters */
.prio {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 18px;
  padding: 22px;
}
/* Shadow under the card */
.prio {
  box-shadow: 0 14px 34px -20px rgba(80, 50, 30, 0.25);
}
.prio h4 {
  font-size: 24px;
  margin: 0;
}
.hint {
  color: var(--muted);
  font-size: 13px;
  margin-bottom: 10px;
}
/* "priority score" in the hint: bold, in the accent colour, so the eye lands on it */
.key-word {
  color: var(--terra);
}

/* One row per category: tick box on the left, dropdown on the right (Flexbox) */
.prio-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 0;
}
.chk {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  cursor: pointer;
}
.chk input {
  width: 17px;
  height: 17px;
}
.level {
  width: 135px;
  flex-shrink: 0;
}
/* Green tick boxes (accent-color) */
.chk input {
  accent-color: var(--sage);
}

/* Hide / Show next to the title (only when the page makes the card foldable, e.g. on the Map) */
.fold-toggle {
  border: none;
  background: none;
  padding: 4px 0 4px 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--terra);
  white-space: nowrap;
}
.fold-toggle:hover {
  text-decoration: underline;
}

/* Folded (Map): a thin bar, just the title row with less padding and a smaller title */
.prio.folded {
  padding-top: 10px;
  padding-bottom: 10px;
}
.prio.folded h4 {
  font-size: 19px;
}
</style>
