<!-- <script setup>
// "What matters to you?" panel.
// The page (SearchView) owns the choices and passes them in as a prop.
// When the user clicks something, this panel tells the page with emit, and the page updates the choices.
import { CATEGORIES, IMPORTANCE_LEVELS } from '../utils/matchScore.js'

defineProps({
  preferences: Object, // { school: { ticked: true, level: 3 }, mrt: { ... }, ... }
})
const emit = defineEmits(['change-ticked', 'change-level'])

// A tick box was clicked: send the category and whether it is now ticked
function onTickChange(key, event) {
  emit('change-ticked', key, event.target.checked)
}

// An importance button was clicked: send the category and the new level (1 to 5)
function onLevelChange(key, level) {
  emit('change-level', key, level)
}
</script> -->

<!-- <template>
  <div class="card shadow-sm mt-3">
    <div class="card-body">
      <h6 class="card-title">What matters to you?</h6>

      <div
        v-for="category in CATEGORIES"
        :key="category.key"
        class="row g-2 align-items-center mb-2"
      >
        Tick box: unticked means this category is ignored (weight 0) 
        <div class="col-12 col-md-4">
          <div class="form-check">
            <input
              :id="'matters-' + category.key"
              type="checkbox"
              class="form-check-input"
              :checked="preferences[category.key].ticked"
              @change="onTickChange(category.key, $event)"
            />
            <label :for="'matters-' + category.key" class="form-check-label">{{
              category.label
            }}</label>
          </div>
        </div>

How important it is: Low (1) to Extremely (5). Greyed out when unticked. 
        <div class="col-12 col-md-8">
          <div class="btn-group btn-group-sm flex-wrap" role="group">
            <template v-for="level in IMPORTANCE_LEVELS" :key="level.value">
              <input
                :id="'level-' + category.key + '-' + level.value"
                type="radio"
                class="btn-check"
                :name="'level-' + category.key"
                :checked="preferences[category.key].level === level.value"
                :disabled="!preferences[category.key].ticked"
                @change="onLevelChange(category.key, level.value)"
              />
              <label
                class="btn btn-outline-primary"
                :for="'level-' + category.key + '-' + level.value"
              >
                {{ level.label }}
              </label>
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template> -->
