import { defineStore } from "pinia";
import { markRaw } from "vue";
import { fetchTrends, fetchLeaseModel } from "../api/trends.js";

/** Caches the regression results so the sidebar doesn't refetch them. OWNER: Frontend — Data Views */
export const useTrendsStore = defineStore("trends", {
  state: () => ({
    byType: {},        // flatType → { island, towns, available }
    lease: null,
    leaseError: "",
  }),
  actions: {
    async ensure(flatType) {
      if (!flatType || this.byType[flatType]) return this.byType[flatType];
      const data = await fetchTrends(flatType);
      this.byType[flatType] = markRaw(data);
      return data;
    },
    async ensureLease() {
      if (this.lease) return this.lease;
      try {
        this.lease = markRaw(await fetchLeaseModel());
      } catch (err) {
        this.leaseError = err.message;
      }
      return this.lease;
    },
    /** The fit for one town, or null if that town has too little data. */
    forTown(town, flatType) {
      return this.byType[flatType]?.towns.find((t) => t.town === town) ?? null;
    },
  },
});
