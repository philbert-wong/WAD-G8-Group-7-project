<script setup>
// "What matters to you?" panel.
// The page (SearchView) owns the choices and passes them in as a prop.
// When the user clicks something, this panel tells the page with emit, and the page updates the choices.
// DESIGN PREVIEW (Cosy Professional): now the "Priorities" card in the sidebar.
// The 5 importance buttons became one dropdown so it fits the narrow sidebar. Emits are the same.
import { CATEGORIES, IMPORTANCE_LEVELS } from '../utils/matchScore.js'

defineProps({
  preferences: Object, // { school: { ticked: true, level: 3 }, mrt: { ... }, ... }
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
  <div id="priorities-panel" class="prio">
    <h4 class="serif">Your Priorities</h4>
    <div class="hint">Tick what matters. The match score on each card follows these.</div>

    <div v-for="category in CATEGORIES" :key="category.key" class="prio-row">
      <!-- Tick box: unticked means this category is ignored (weight 0) -->
      <label class="chk" :for="'matters-' + category.key">
        <input
          :id="'matters-' + category.key"
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
/* [COURSE] Same sidebar card look as the filters */
.prio {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 18px;
  padding: 22px;
}
/* [AI-ASSISTED] Shadow under the card */
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

/* [COURSE] One row per category: tick box on the left, dropdown on the right (Flexbox) */
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
/* [AI-ASSISTED] Green tick boxes (accent-color) */
.chk input {
  accent-color: var(--sage);
}
</style>
