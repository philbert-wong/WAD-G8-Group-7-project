import { defineStore } from "pinia";
import { DEFAULT_WEIGHTS } from "../lib/constants.js";
import { hasWeights } from "../lib/score.js";

/** The sliders behind the personal score. OWNER: Frontend — Shell & UI */
export const PRESETS = {
  commuter: { label: "Commuter", weights: { transport: 10, food: 3, greenery: 1, healthcare: 1, schools: 0, eldercare: 0 } },
  family:   { label: "Young family", weights: { transport: 4, food: 4, greenery: 6, healthcare: 4, schools: 10, eldercare: 0 } },
  retiree:  { label: "Retiree", weights: { transport: 5, food: 6, greenery: 8, healthcare: 10, schools: 0, eldercare: 8 } },
};

export const useScoreStore = defineStore("score", {
  state: () => ({ weights: { ...DEFAULT_WEIGHTS } }),
  getters: { active: (s) => hasWeights(s.weights) },
  actions: {
    set(id, value) { this.weights[id] = Number(value); },
    preset(key) { this.weights = { ...PRESETS[key].weights }; },
    clear() { this.weights = Object.fromEntries(Object.keys(DEFAULT_WEIGHTS).map((k) => [k, 0])); },
    reset() { this.weights = { ...DEFAULT_WEIGHTS }; },
    apply(saved) { this.weights = { ...DEFAULT_WEIGHTS, ...(saved || {}) }; },
  },
});
