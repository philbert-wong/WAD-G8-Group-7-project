<script setup>
// "What matters to you?" panel.
// The page (SearchView) owns the choices and passes them in as a prop.
// When the user clicks something, this panel tells the page with emit, and the page updates the choices.
// The importance level is one dropdown per category, so it fits the narrow sidebar.
import { CATEGORIES, IMPORTANCE_LEVELS } from '../utils/matchScore.js'

defineProps({
  preferences: Object, // { school: { ticked: true, level: 3 }, mrt: { ... }, ... }
  onMap: { type: Boolean, default: false }, // true on the Map page, which colours dots instead of sorting cards
  // The ids of the panel and its tick boxes. The presets form shows this panel too, so it gives its own ids:
  // two panels on the same page (the popup over Search) must not share ids.
  panelId: { type: String, default: 'priorities-panel' },
  idPrefix: { type: String, default: 'matters-' },
})
const emit = defineEmits(['change-ticked', 'change-level'])

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
  <div :id="panelId" class="prio">
    <h4 class="serif">Your Priorities</h4>
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
  font-size: 14px;
  margin-bottom: 10px;
}
/* "priority score" in the hint: bold, in the accent colour, so the eye lands on it */
.key-word {
  color: var(--terra);
}

/* One row per category: tick box on the left, dropdown on the right (Flexbox) */
.prio-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 0;
}
.prio-row + .prio-row {
  border-top: 1px solid var(--beige);
}
.chk {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
}
.chk input {
  width: 17px;
  height: 17px;
}
/* The dropdown sits under its name, lined up with the text (17px box + 10px gap = 27px) */
.level {
  width: calc(100% - 27px);
  margin-left: 27px;
  font-size: 14px;
  min-height: 38px;
}
/* Green tick boxes (accent-color) */
.chk input {
  accent-color: var(--sage);
}
</style>
