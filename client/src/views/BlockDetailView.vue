<script setup>
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import LeaseBar from '../components/LeaseBar.vue';
import PriceDashboard from '../components/PriceDashboard.vue';
import ShortlistButton from '../components/ShortlistButton.vue';
import { api } from '../services/api.js';
import { staticMapUrl } from '../services/onemap.js';
import { flatTypeLabel, money, titleCase } from '../services/format.js';

const route = useRoute();
const router = useRouter();

const block = ref(null);
const trend = ref(null);
const leaseDecay = ref(null);
const loading = ref(true);
const trendLoading = ref(false);
const error = ref('');

const flatType = computed(() => {
  const types = block.value?.flatTypes ?? [];
  const requested = types.find((f) => f.flatType === route.query.flatType);
  return (requested ?? [...types].sort((a, b) => b.totalSales - a.totalSales)[0])?.flatType ?? null;
});

const totalSales = computed(() => (block.value?.flatTypes ?? []).reduce((sum, f) => sum + f.totalSales, 0));

async function loadBlock(id) {
  loading.value = true;
  error.value = '';
  block.value = null;
  try {
    const [blockData, decay] = await Promise.all([
      api.getBlock(id),
      leaseDecay.value ? leaseDecay.value : api.leaseDecay().catch(() => null),
    ]);
    block.value = blockData;
    leaseDecay.value = decay;
  } catch (err) {
    error.value = err.status === 404 ? 'We could not find that block.' : err.message;
  } finally {
    loading.value = false;
  }
}

async function loadTrend() {
  if (!block.value || !flatType.value) return;
  trendLoading.value = true;
  trend.value = null;
  try {
    trend.value = await api.priceTrend(block.value.town, flatType.value);
  } catch {
    trend.value = null;
  } finally {
    trendLoading.value = false;
  }
}

function selectFlatType(type) {
  router.replace({ query: { ...route.query, flatType: type } });
}

function goBack() {
  if (window.history.state?.back) router.back();
  else router.push({ name: 'search' });
}

watch(() => route.params.blockId, (id) => id && loadBlock(id), { immediate: true });
watch([block, flatType], loadTrend);
</script>

<template>
  <div class="container py-4">
    <button type="button" class="btn btn-link px-0 mb-3 text-decoration-none" data-cy="back" @click="goBack">
      <i class="bi bi-arrow-left me-1" aria-hidden="true"></i>Back to results
    </button>

    <div v-if="loading" class="d-flex align-items-center gap-2 text-body-secondary py-5 justify-content-center">
      <span class="spinner-border spinner-border-sm" role="status"></span> Loading block…
    </div>
    <div v-else-if="error" class="alert alert-danger" role="alert">{{ error }}</div>

    <template v-else-if="block">
      <header class="card border-0 shadow-sm overflow-hidden mb-4">
        <div class="row g-0">
          <div class="col-md-5 col-lg-4">
            <img
              v-if="block.lat != null"
              :src="staticMapUrl(block.lat, block.lng, { width: 512, height: 384, zoom: 17 })"
              :alt="`Map showing Blk ${block.block} ${titleCase(block.street)}`"
              class="detail-map"
              width="512"
              height="384"
            />
            <div v-else class="detail-map block-card__placeholder" aria-hidden="true"><i class="bi bi-buildings"></i></div>
          </div>
          <div class="col-md-7 col-lg-8">
            <div class="card-body p-4 d-flex flex-column gap-3 h-100">
              <div class="d-flex flex-wrap justify-content-between gap-3">
                <div>
                  <p class="text-uppercase small fw-semibold text-primary mb-1">{{ titleCase(block.town) }}</p>
                  <h1 class="h3 mb-1" data-cy="block-title">Blk {{ block.block }} {{ titleCase(block.street) }}</h1>
                  <p class="text-body-secondary mb-0">
                    <template v-if="block.postal">Singapore {{ block.postal }} · </template>
                    {{ totalSales }} resale transaction{{ totalSales === 1 ? '' : 's' }} since 2017
                  </p>
                </div>
                <ShortlistButton v-if="flatType" :block-id="block.blockId" :flat-type="flatType" class="align-self-start" />
              </div>
              <LeaseBar :remaining="block.remainingLease" :commenced="block.leaseCommenceYear" />
              <div>
                <p class="small fw-semibold mb-2">Flat type</p>
                <div class="nav nav-pills gap-2" role="tablist" aria-label="Flat type" data-cy="flat-type-tabs">
                  <button
                    v-for="f in block.flatTypes"
                    :key="f.flatType"
                    type="button"
                    role="tab"
                    class="nav-link border"
                    :class="{ active: f.flatType === flatType }"
                    :aria-selected="f.flatType === flatType"
                    @click="selectFlatType(f.flatType)"
                  >
                    {{ flatTypeLabel(f.flatType) }}
                    <span class="small opacity-75 ms-1">{{ money(f.medianPrice) }}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div class="position-relative">
        <div v-if="trendLoading && !trend" class="text-center text-body-secondary py-5">
          <span class="spinner-border spinner-border-sm" role="status"></span> Loading price analysis…
        </div>
        <PriceDashboard
          v-else-if="flatType"
          :block="block"
          :flat-type="flatType"
          :trend="trend"
          :lease-decay="leaseDecay"
        />
      </div>

    </template>
  </div>
</template>
