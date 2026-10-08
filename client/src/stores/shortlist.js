import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { api } from '../services/api.js';

export const useShortlistStore = defineStore('shortlist', () => {
  const items = ref([]);
  const loaded = ref(false);
  const loading = ref(false);
  const error = ref('');

  const count = computed(() => items.value.length);
  const find = (blockId, flatType) => items.value.find((i) => i.blockId === blockId && i.flatType === flatType);

  async function load() {
    loading.value = true;
    error.value = '';
    try {
      items.value = await api.shortlist.list();
      loaded.value = true;
    } catch (err) {
      error.value = err.message;
    } finally {
      loading.value = false;
    }
  }

  async function add(blockId, flatType, note = '') {
    const item = await api.shortlist.add(blockId, flatType, note);
    items.value.unshift(item);
    return item;
  }

  async function updateNote(id, note) {
    const updated = await api.shortlist.update(id, note);
    const index = items.value.findIndex((i) => i.id === id);
    if (index !== -1) items.value[index] = updated;
    return updated;
  }

  async function remove(id) {
    await api.shortlist.remove(id);
    items.value = items.value.filter((i) => i.id !== id);
  }

  async function toggle(blockId, flatType) {
    const existing = find(blockId, flatType);
    return existing ? remove(existing.id) : add(blockId, flatType);
  }

  return { items, loaded, loading, error, count, find, load, add, updateNote, remove, toggle };
});
