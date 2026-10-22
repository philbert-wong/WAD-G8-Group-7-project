<script setup>
// The three filters: flat type, budget and remaining lease.
// (Closeness to MRT is handled by the "What matters to you?" panel instead.)
// The page (SearchView) owns the filter values and passes them in as a prop.
// When the user changes a box, we send the change up with emit.
const props = defineProps({
  filters: Object, // { flatType, maxPrice, minLease, ... }
})
const emit = defineEmits(['change-filter', 'search', 'clear'])

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
</script>

<template>
  <form class="row g-2 mb-2" @submit.prevent="onSubmit">
    <div class="col-12 col-md-4">
      <label class="form-label small mb-1">Flat type</label>
      <select :value="props.filters.flatType" class="form-select" @change="onFlatTypeChange">
        <option value="">Any</option>
        <option v-for="type in flatTypes" :key="type" :value="type">{{ type }}</option>
      </select>
      <!-- <label class="form-label small mb-1">Flat type</label>
      <div v-for="type in flatTypes" :key="type">
        <input 
          type="checkbox" 
          :id="type"
          :value="type" 
          :checked="props.filters.flatType.includes(type)"
          @change="onFlatTypeChange"
        />
        <label :for="type" class="small ms-1">{{ type }}</label>
      </div> -->
    </div> 

    <div class="col-12 col-md-4">
      <!-- <label class="form-label small mb-1">Max budget ($)</label>
      <input
        :value="props.filters.maxPrice"
        type="number"
        min="0"
        step="10000"
        class="form-control"
        placeholder="e.g. 600000"
        @input="onChange('maxPrice', $event)"
      /> -->
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

    <div class="col-12 col-md-4">
      <!-- <label class="form-label small mb-1">Min remaining lease (years)</label>
      <input
        :value="props.filters.minLease"
        type="number"
        min="0"
        max="99"
        class="form-control"
        placeholder="e.g. 60"
        @input="onChange('minLease', $event)"
      /> -->
    
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

    <!-- pressing Enter in any box searches; this button is for people who prefer clicking -->
    <div class="col-12 d-flex gap-2">
      <button type="submit" class="btn btn-outline-primary btn-sm">Apply filters</button>
      <button type="button" class="btn btn-link btn-sm" @click="onClear">Clear all</button>
    </div>
  </form>
</template>

<style scoped>
.zoom-control {
  padding: 24px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 18px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
  font-family: inherit;
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
  position: relative;
  display: flex;
  align-items: center;
  height: 24px;
  margin: 0 10px;
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
.zoom-slider:focus-visible::-moz-range-thumb {
  transform: scale(1.4);
  box-shadow: 0 0 0 7px rgba(79, 70, 229, 0.13);
}

.zoom-slider:focus-visible {
  outline: 2px solid #4f46e5;
  outline-offset: 7px;
  border-radius: 20px;
}

</style>
