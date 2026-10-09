import { defineStore } from "pinia";

/** OWNER: Frontend — Shell & UI */
const DEFAULTS = () => ({
  flatType: "",
  town: "",
  maxPrice: null,      // null = no limit
  minLease: null,
  maxWalkMin: null,
  radius: 0,           // metres around the pin; 0 = whole island
  colourBy: "psm",     // "psm" | "score"
  minScore: 0,         // personal-score cut-off, applied in the browser
});

export const useFilterStore = defineStore("filters", {
  state: DEFAULTS,
  getters: {
    // Only send the filters that are actually set — an empty string would
    // otherwise be sent as a real filter value.
    queryParams: (s) => {
      const p = { radius: s.radius };
      if (s.flatType) p.flatType = s.flatType;
      if (s.town) p.town = s.town;
      if (s.maxPrice) p.maxPrice = s.maxPrice;
      if (s.minLease) p.minLease = s.minLease;
      if (s.maxWalkMin) p.maxWalkMin = s.maxWalkMin;
      return p;
    },
    activeCount: (s) =>
      [s.flatType, s.town, s.maxPrice, s.minLease, s.maxWalkMin, s.radius, s.minScore].filter(Boolean).length,
  },
  actions: {
    reset() { Object.assign(this, DEFAULTS()); },
    /** What gets saved to the user's account. */
    snapshot() {
      const { flatType, town, maxPrice, minLease, maxWalkMin, radius, colourBy, minScore } = this;
      return { flatType, town, maxPrice, minLease, maxWalkMin, radius, colourBy, minScore };
    },
    apply(saved = {}) {
      Object.assign(this, DEFAULTS(), saved);
    },
  },
});
