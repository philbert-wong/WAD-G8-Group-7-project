<script setup>
import { ref } from "vue";

/** A collapsible block in the left panel. OWNER: Frontend — Shell & UI */
const props = defineProps({
  title: { type: String, required: true },
  badge: { type: [String, Number], default: "" },
  startOpen: { type: Boolean, default: true },
  cy: { type: String, default: "" },
});
const open = ref(props.startOpen);
</script>

<template>
  <section class="panel-section" :data-cy="cy || undefined">
    <button class="panel-section__head" type="button" :aria-expanded="open" @click="open = !open">
      <span class="fw-semibold">{{ props.title }}</span>
      <span class="d-flex align-items-center gap-2">
        <span v-if="props.badge !== '' && props.badge != null" class="badge rounded-pill text-bg-primary">{{ props.badge }}</span>
        <span class="panel-section__chevron" :class="{ 'is-open': open }" aria-hidden="true">›</span>
      </span>
    </button>
    <div v-show="open" class="panel-section__body">
      <slot />
    </div>
  </section>
</template>
