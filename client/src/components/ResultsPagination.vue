<script setup>
import { computed } from 'vue';

const props = defineProps({
  page: { type: Number, required: true },
  pageCount: { type: Number, required: true },
});
const emit = defineEmits(['change']);

// Current page with up to two neighbours each side, plus first and last.
const pages = computed(() => {
  const set = new Set([1, props.pageCount]);
  for (let p = props.page - 2; p <= props.page + 2; p++) if (p >= 1 && p <= props.pageCount) set.add(p);
  const sorted = [...set].sort((a, b) => a - b);
  return sorted.flatMap((p, i) => (i && p - sorted[i - 1] > 1 ? ['…', p] : [p]));
});

function go(p) {
  if (p < 1 || p > props.pageCount || p === props.page) return;
  emit('change', p);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
</script>

<template>
  <nav aria-label="Result pages" data-cy="pagination">
    <ul class="pagination pagination-sm justify-content-center flex-wrap">
      <li class="page-item" :class="{ disabled: page === 1 }">
        <button class="page-link" type="button" aria-label="Previous page" @click="go(page - 1)">&laquo;</button>
      </li>
      <li
        v-for="(p, i) in pages"
        :key="`${p}-${i}`"
        class="page-item"
        :class="{ active: p === page, disabled: p === '…' }"
        :aria-current="p === page ? 'page' : undefined"
      >
        <button class="page-link" type="button" @click="typeof p === 'number' && go(p)">{{ p }}</button>
      </li>
      <li class="page-item" :class="{ disabled: page === pageCount }">
        <button class="page-link" type="button" aria-label="Next page" data-cy="next-page" @click="go(page + 1)">&raquo;</button>
      </li>
    </ul>
  </nav>
</template>
