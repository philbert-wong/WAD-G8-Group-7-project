<script setup>
import { computed, ref } from 'vue';
import LeaseBar from './LeaseBar.vue';
import ShortlistButton from './ShortlistButton.vue';
import { staticMapUrl } from '../services/onemap.js';
import { flatTypeLabel, money, monthLabel, titleCase } from '../services/format.js';

const props = defineProps({ card: { type: Object, required: true } });

const imageFailed = ref(false);
const imageUrl = computed(() =>
  props.card.lat != null && !imageFailed.value ? staticMapUrl(props.card.lat, props.card.lng) : null,
);
const title = computed(() => `Blk ${props.card.block} ${titleCase(props.card.street)}`);
const detailLink = computed(() => ({
  name: 'block',
  params: { blockId: props.card.blockId },
  query: { flatType: props.card.flatType },
}));
</script>

<template>
  <article
    class="card block-card h-100 border-0 shadow-sm"
    :class="{ 'block-card--pinned': card.isSearchedBlock }"
    data-cy="block-card"
  >
    <div class="block-card__media">
      <img
        v-if="imageUrl"
        :src="imageUrl"
        :alt="`Map showing ${title}`"
        class="card-img-top"
        loading="lazy"
        width="512"
        height="256"
        @error="imageFailed = true"
      />
      <div v-else class="block-card__placeholder" aria-hidden="true">
        <i class="bi bi-buildings"></i>
        <span>Blk {{ card.block }}</span>
      </div>
      <span class="badge text-bg-light block-card__type">{{ flatTypeLabel(card.flatType) }}</span>
      <span v-if="card.isSearchedBlock" class="badge text-bg-warning block-card__pin">
        <i class="bi bi-pin-angle-fill me-1" aria-hidden="true"></i>Your search
      </span>
    </div>

    <div class="card-body d-flex flex-column gap-2">
      <div class="d-flex justify-content-between gap-2">
        <div class="min-w-0">
          <h3 class="h6 card-title mb-0 text-truncate">
            <RouterLink :to="detailLink" class="stretched-link text-reset text-decoration-none" data-cy="block-card-link">
              {{ title }}
            </RouterLink>
          </h3>
          <p class="small text-body-secondary mb-0">{{ titleCase(card.town) }}</p>
        </div>
        <ShortlistButton class="position-relative z-2" :block-id="card.blockId" :flat-type="card.flatType" compact />
      </div>

      <div>
        <div class="fs-4 fw-bold lh-1" data-cy="block-card-price">{{ money(card.medianPrice) }}</div>
        <div class="small text-body-secondary">
          <template v-if="card.priceBasis === 'last12m'">
            Median of {{ card.salesLast12m }} sale{{ card.salesLast12m === 1 ? '' : 's' }} in the last 12 months
          </template>
          <template v-else>
            <i class="bi bi-clock-history text-warning" aria-hidden="true"></i>
            Older price · last sold {{ monthLabel(card.lastSaleMonth) }}
          </template>
        </div>
        <div class="small text-body-secondary">
          {{ money(card.medianPricePsm) }}/m² · {{ card.medianFloorArea }} m²
        </div>
      </div>

      <LeaseBar class="mt-auto" :remaining="card.remainingLease" :commenced="card.leaseCommenceYear" />
    </div>
  </article>
</template>
