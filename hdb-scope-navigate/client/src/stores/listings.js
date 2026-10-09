import { defineStore } from "pinia";
import { computed, ref, shallowRef } from "vue";
import { fetchListings } from "../api/listings.js";
import { useFilterStore } from "./filters.js";
import { useMapStore } from "./map.js";
import { useScoreStore } from "./score.js";
import { personalScore } from "../lib/score.js";
import { withinKm } from "../lib/geo.js";

/**
 * The blocks on the map, and everything derived from them (scores, grant
 * eligibility, the colour range). OWNER: Maps & Location
 *
 * `blocks` is a shallowRef on purpose: there can be 10,000 of them and Vue
 * should not make every field reactive. We only ever replace the whole list.
 */
const PHG_KM = 4;

export const useListingsStore = defineStore("listings", () => {
  const filters = useFilterStore();
  const mapStore = useMapStore();
  const score = useScoreStore();

  const blocks = shallowRef([]);
  const loading = ref(false);
  const error = ref("");
  const phgOnly = ref(false);   // show only blocks that qualify for the proximity grant
  let token = 0;               // guards against out-of-order responses

  async function load() {
    const mine = ++token;
    loading.value = true;
    error.value = "";

    const params = { ...filters.queryParams };
    if (filters.radius > 0) [params.lat, params.lng] = mapStore.centre;

    try {
      const { blocks: list } = await fetchListings(params);
      if (mine !== token) return;   // a newer request has already replaced this one
      blocks.value = list;
    } catch (err) {
      if (mine !== token) return;
      blocks.value = [];
      error.value = err.message;
    } finally {
      if (mine === token) loading.value = false;
    }
  }

  /** id → personal score. Empty when every slider is at zero. */
  const scores = computed(() => {
    const m = new Map();
    if (!score.active) return m;
    for (const b of blocks.value) m.set(b.id, personalScore(b, score.weights));
    return m;
  });

  /** Blocks within 4 km of the parent's address, or null when the layer is off. */
  const phgIds = computed(() => {
    if (!mapStore.phg) return null;
    const ids = new Set();
    for (const b of blocks.value) if (withinKm(mapStore.phg, b, PHG_KM)) ids.add(b.id);
    return ids;
  });

  /** After the browser-side filters (score cut-off, grant layer). */
  const visible = computed(() => {
    let list = blocks.value;
    if (score.active && filters.minScore > 0) {
      list = list.filter((b) => (scores.value.get(b.id) ?? -1) >= filters.minScore);
    }
    if (phgOnly.value && phgIds.value) list = list.filter((b) => phgIds.value.has(b.id));
    return list;
  });

  /** The 5th–95th percentile of price per sqm, so a few outliers don't wash out the colours. */
  const psmRange = computed(() => {
    const xs = blocks.value.map((b) => b.medianPsm).filter(Number.isFinite).sort((a, b) => a - b);
    if (xs.length === 0) return [0, 1];
    const at = (p) => xs[Math.min(xs.length - 1, Math.floor(p * xs.length))];
    const lo = at(0.05), hi = at(0.95);
    return hi > lo ? [lo, hi] : [lo, lo + 1];
  });

  /** The best matches for this buyer's priorities. */
  const ranked = computed(() => {
    if (!score.active) return [];
    return visible.value
      .map((b) => ({ block: b, score: scores.value.get(b.id) }))
      .filter((r) => r.score != null)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
  });

  return { blocks, loading, error, phgOnly, load, scores, phgIds, visible, psmRange, ranked };
});
