import { defineStore } from "pinia";
import { fetchPreferences, savePreferences } from "../api/preferences.js";
import { useFilterStore } from "./filters.js";
import { useScoreStore } from "./score.js";
import { useMapStore } from "./map.js";

/** Saves and restores filters, score sliders and layer toggles for a signed-in user. OWNER: Maps & Location */
export const usePreferencesStore = defineStore("preferences", {
  state: () => ({ saving: false, message: "", failed: false }),
  actions: {
    async load() {
      try {
        const prefs = await fetchPreferences();
        if (!prefs || Object.keys(prefs).length === 0) return false;
        useFilterStore().apply(prefs.filters);
        useScoreStore().apply(prefs.weights);
        useMapStore().applyLayers(prefs.layers);
        return true;
      } catch {
        return false;   // a failed restore should never block signing in
      }
    },
    async save() {
      this.saving = true; this.message = ""; this.failed = false;
      try {
        await savePreferences({
          filters: useFilterStore().snapshot(),
          weights: { ...useScoreStore().weights },
          layers: { ...useMapStore().layers },
        });
        this.message = "Saved to your account";
      } catch (err) {
        this.failed = true;
        this.message = err.message;
      } finally {
        this.saving = false;
      }
    },
  },
});
