<script setup>
import { onMounted, reactive, ref } from 'vue';
import SearchBar from '../components/SearchBar.vue';
import FilterPanel from '../components/FilterPanel.vue';
import BlockCard from '../components/BlockCard.vue';
import * as api from '../api.js';

const props = defineProps({
  shortlist: Array,
});
defineEmits(['save', 'unsave']);

const filters = reactive({ q: '', flatType: '', maxPrice: '', minLease: '', maxWalk: '' });
const results = ref([]);
const total = ref(0);
const loading = ref(false);
const error = ref('');

async function search() {
  loading.value = true;
  error.value = '';
  try {
    const data = await api.searchBlocks(filters);
    results.value = data.results;
    total.value = data.total;
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}

function clearFilters() {
  Object.assign(filters, { q: '', flatType: '', maxPrice: '', minLease: '', maxWalk: '' });
  search();
}

function isSaved(blockId) {
  return props.shortlist.some((item) => item.block.id === blockId);
}

onMounted(search);
</script>

<template>
  <section>
    <SearchBar v-model="filters.q" @search="search" />
    <FilterPanel :filters="filters" @search="search" @clear="clearFilters" />

    <div v-if="error" class="alert alert-danger mt-3">{{ error }}</div>
    <p v-else-if="loading" class="text-muted mt-3">Loading...</p>
    <p v-else class="text-muted mt-3">{{ total }} flat(s) found</p>

    <div class="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-3">
      <div v-for="block in results" :key="block.id" class="col">
        <BlockCard
          :block="block"
          :saved="isSaved(block.id)"
          @toggle-save="isSaved(block.id) ? $emit('unsave', block) : $emit('save', block)"
        />
      </div>
    </div>
  </section>
</template>
