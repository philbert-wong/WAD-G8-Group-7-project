<script setup>
// The three filters: flat type, budget and remaining lease.
// (Closeness to MRT is handled by the "What matters to you?" panel instead.)
// The page (SearchView) owns the filter values and passes them in as a prop.
// When the user changes a box, we send the change up with emit.
import { CATEGORIES, IMPORTANCE_LEVELS } from '../utils/matchScore.js'
import {ref} from 'vue'

//general filters
const props = defineProps({
  filters: Object, // { flatType, maxPrice, minLease, ... }
  preferences: Object, // { school: { ticked: true, level: 3 }, mrt: { ... }, ... }
})
const emit = defineEmits(['change-filter', 'search', 'clear','change-ticked', 'change-level'])

const flatTypes = ['2 ROOM', '3 ROOM', '4 ROOM', '5 ROOM', 'EXECUTIVE']

// A box changed: send which filter it was and its new value
function onChange(name, event) {
  emit('change-filter', name, event.target.value)
}

// Choosing a flat type searches straight away
function onFlatTypeChange(event) {
  emit('change-filter', 'flatType', event.target.value)
  emit('search')
}

// Enter in any box, or the "Apply filters" button
function onSubmit() {
  emit('search')
}

// The "Clear all" button
function onClear() {
  emit('clear')
}

//hamburger 1
const openFilters = ref(false)
const openPreferences = ref(false)

//importance filters
// defineProps({
//   preferences: Object, // { school: { ticked: true, level: 3 }, mrt: { ... }, ... }
// })

// A tick box was clicked: send the category and whether it is now ticked
function  onTickChange(key, event) {
  emit('change-ticked', key, event.target.checked)
}

// An importance button was clicked: send the category and the new level (1 to 5)
function onLevelChange(key, level) {
  emit('change-level', key, level)
}
</script>

<template>
  <!-- hamburger 1 to show the filters -->
  <form class="mb-2" @submit.prevent="onSubmit">
    <button
      type="button"
      class="menu-btn"
      :class="{ 'is-open': openFilters }"
      :aria-expanded="openFilters"
      aria-controls="filter-body"
      @click="openFilters = !openFilters"
    >
      <span class="burger" aria-hidden="true">
        <span></span>
        <span></span>
        <span></span>
      </span>
      <span>Filters</span>
    </button>
    <div id="filter-body" class="collapse-wrap" :class="{ open: openFilters }">
      <div class="collapse-inner" :inert="!openFilters">
        <div class="row g-2">
          <div class="col-12 col-md-4 mb-2">
            <div class="zoom-control">
              <div class="zoom-header">
                <span class="zoom-title">Room Type</span>
              </div>
              <div class="type-chips" role="radiogroup">
                <label class="type-chip">
                  <input
                    type="radio"
                    name="flatType"
                    class="type-input"
                    value=""
                    :checked="!props.filters.flatType"
                    @change="onFlatTypeChange"
                  />
                  <span class="type-face">
                    <span class="type-text">Any</span>
                  </span>
                </label>

                <label
                  v-for="type in flatTypes"
                  :key="type"
                  class="type-chip"
                >
                  <input
                    type="radio"
                    name="flatType"
                    class="type-input"
                    :value="type"
                    :checked="props.filters.flatType === type"
                    @change="onFlatTypeChange"
                  />
                  <span class="type-face">
                    <span class="type-text">{{ type }}</span>
                  </span>
                </label>
              </div>
            </div>
          </div>
          <div class="col-12 col-md-4 mb-2">
            <div class="zoom-control">
              <div class="zoom-header">
                <span class="zoom-title">Max budget</span>
                <span class="zoom-value">
                  {{ Number(props.filters.maxPrice).toLocaleString('en-SG', {
                    style: 'currency',
                    currency: 'SGD',
                    maximumFractionDigits: 0
                  }) }}
                </span>
              </div>

              <div class="slider-wrapper">
                <div class="slider-track">
                  <div
                    class="slider-progress"
                    :style="{
                      width: `${((Number(props.filters.maxPrice || 300000) - 300000) / 700000) * 100}%`
                    }"
                  ></div>

                  
                </div>

                <input
                  :value="props.filters.maxPrice"
                  type="range"
                  min="300000"
                  max="1000000"
                  step="10000"
                  class="zoom-slider"
                  @input="onChange('maxPrice', $event)"
                />
              </div>

              
            </div>
          </div>
          <div class="col-12 col-md-4 mb-2">
            <div class="zoom-control">
                <div class="zoom-header">
                  <span class="zoom-title">Min Remaining Lease (years)</span>
                  <span class="zoom-value">
                    {{ Number(props.filters.minLease) }}
                  </span>
                </div>

                <div class="slider-wrapper">
                  <div class="slider-track">
                    <div
                      class="slider-progress"
                      :style="{
                        width: `${((Number(props.filters.minLease || 20) - 20) / 79) * 100}%`
                      }"
                    ></div>

                    
                  </div>

                  <input
                    :value="props.filters.minLease"
                    type="range"
                    min="20"
                    max="99"
                    step="1"
                    class="zoom-slider"
                    @input="onChange('minLease', $event)"
                  />
                </div>

              
            </div>

          </div>
        </div>
    

    <!-- pressing Enter in any box searches; this button is for people who prefer clicking -->
        <div class="col-12 d-flex gap-2">
          <button type="submit" class="btn btn-outline-primary btn-sm">Apply filters</button>
          <button type="button" class="btn btn-link btn-sm" @click="onClear">Reset</button>
        </div>
      </div>
    </div>
  </form>
  <!-- hamburget 2 to show the preference filter-->
  <div class="col-12 mb-2">
    <button
      type="button"
      class="menu-btn"
      :class="{ 'is-open': openPreferences }"
      :aria-expanded="openPreferences"
      aria-controls="filter-body"
      @click="openPreferences = !openPreferences"
    >
      <span class="burger" aria-hidden="true">
        <span></span>
        <span></span>
        <span></span>
      </span>
      <span>Preferences</span>
    </button>
    <div id="filter-body" class="collapse-wrap" :class="{ open: openPreferences }">
      <div class="collapse-inner" :inert="!openPreferences">
        <div class="zoom-control">
          <div class="card-body">
            <h6 class="card-title">What matters to you?</h6>

            <div
              v-for="category in CATEGORIES"
              :key="category.key"
              class="row g-2 align-items-center mb-2"
            >
              <!-- Tick box: unticked means this category is ignored (weight 0) -->
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

              <!-- How important it is: Low (1) to Extremely (5). Greyed out when unticked. -->
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
      </div>
    </div>
  </div>
</template>

<style scoped>
/* for the room type */
.type-chips {

  display: flex;

  flex-wrap: wrap;

  gap: 8px;

}

.type-chip {
  position: relative;
  display: inline-flex;
  margin: 0;
  cursor: pointer;
}

.type-input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  opacity: 0;
  cursor: pointer;
  z-index: 1;
}

.type-face {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 64px;
  padding: 9px 16px;

  border: 1.5px solid #cbd5e1;
  border-radius: 999px;

  background: #ffffff;
  color: #374151;
  font-size: 14px;
  font-weight: 500;

  transition: background 0.15s ease,
              border-color 0.15s ease,
              color 0.15s ease,
              box-shadow 0.15s ease;
}

.type-input:checked + .type-face {
  background: #dbeafe;
  border-color: #60a5fa;
  color: #1d4ed8;
  box-shadow: 0 2px 6px rgba(59, 130, 246, 0.18);
}

.type-chip:hover .type-face {
  border-color: #93c5fd;
  background: #eff6ff;
}

.type-input:focus-visible + .type-face {
  outline: 2px solid  #4f46e5;
  outline-offset: 3px;
}

/* mostly for sliders */
.zoom-control {
  height: 100%; /* fill the column, so all three bottoms line up */
  display: flex;
  flex-direction: column;
  padding: 24px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 18px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
  font-family: inherit;
}

.zoom-control:hover {
  border-color: #c7d2fe;
  box-shadow: 0 10px 28px rgba(79, 70, 229, 0.12);
}

.zoom-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 28px;
}

.zoom-title {
  color: #374151;
  font-size: 15px;
  font-weight: 600;
}

.zoom-value {
  padding: 7px 13px;
  border-radius: 10px;
  background: #f3f4f6;
  color: #111827;
  font-size: 18px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.slider-wrapper {
  margin: auto 10px;         
  width: calc(100% - 20px); 
  flex-shrink: 0;
  position: relative;
  display: flex;
  align-items: center;
  height: 24px;
  
}

.slider-track {
  position: absolute;
  width: 100%;
  height: 8px;
  overflow: hidden;
  border-radius: 20px;
  background: #e5e7eb;
}

.slider-progress {
  height: 100%;
  border-radius: 20px;
  background: #4f46e5;
  transition: width 0.12s ease;
}

.zoom-slider {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  appearance: none;
  -webkit-appearance: none;
  background: transparent;
  cursor: pointer;
}

/* keep track of thumb */
.zoom-slider::-webkit-slider-runnable-track {
  height: 8px;
  background: transparent;
}

.zoom-slider::-moz-range-track {
  height: 8px;
  background: transparent;
}

.zoom-slider::-webkit-slider-thumb {
  appearance: none;
  -webkit-appearance: none;
  width: 22px;
  height: 22px;
  margin-top: -7px;
  border: 2px solid #ffffff;
  border-radius: 50%;
  background: #4f46e5;
  box-shadow: 0 1px 5px rgba(0, 0, 0, 0.2);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.zoom-slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border: 2px solid #ffffff;
  border-radius: 50%;
  background: #4f46e5;
  box-shadow: 0 1px 5px rgba(0, 0, 0, 0.2);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.zoom-slider:hover::-webkit-slider-thumb,
.zoom-slider:focus-visible::-webkit-slider-thumb {
  transform: scale(1.4);
  box-shadow: 0 0 0 7px rgba(79, 70, 229, 0.13);
}

.zoom-slider:hover::-moz-range-thumb,

/* make thumb bigger */
.zoom-slider:focus-visible::-moz-range-thumb {
  transform: scale(1.4);
  box-shadow: 0 0 0 7px rgba(79, 70, 229, 0.13);
}



/* for hamburger */
.menu-btn {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px 8px 14px;
  border: 1.5px solid var(--line);
  border-radius: 999px;
  background: #f3f9ff00;
  color: #374151;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease, color 0.15s ease;
}
 
.menu-btn:hover {
  border-color: #c7d2fe;
  background: #f8f9ff;
}
 
.menu-btn.is-open {
  border-color: var(--accent);
  background: var(--accent-soft);
  color: var(--accent);
}
 
.menu-btn:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
}
 
.burger {
  position: relative;
  display: inline-block;
  width: 16px;
  height: 12px;
}
 
.burger span {
  position: absolute;
  left: 0;
  width: 100%;
  height: 2px;
  border-radius: 2px;
  background: currentColor;
  transition: transform 0.2s ease, opacity 0.2s ease, top 0.2s ease;
}
 
.burger span:nth-child(1) { top: 0; }
.burger span:nth-child(2) { top: 5px; }
.burger span:nth-child(3) { top: 10px; }
 
.is-open .burger span:nth-child(1) { top: 5px; transform: rotate(45deg); }
.is-open .burger span:nth-child(2) { opacity: 0; }
.is-open .burger span:nth-child(3) { top: 5px; transform: rotate(-45deg); }
.collapse-wrap {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.25s ease;
}
 
.collapse-wrap.open {
  grid-template-rows: 1fr;
}
 
.collapse-inner {
  min-height: 0;
  overflow: hidden;
  visibility: hidden;
  transition: visibility 0s linear 0.25s;
}
 
.collapse-wrap.open .collapse-inner {
  visibility: visible;
  transition-delay: 0s;
}

</style>
