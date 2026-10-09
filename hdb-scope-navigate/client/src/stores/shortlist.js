import { defineStore } from "pinia";
import * as shortlistApi from "../api/shortlist.js";

/** The user's saved blocks, plus the (up to four) blocks picked for comparison. OWNER: Frontend — Data Views */
export const MAX_COMPARE = 4;

function readCompare() {
  try {
    const ids = JSON.parse(localStorage.getItem("compareIds") || "[]");
    return Array.isArray(ids) ? ids.slice(0, MAX_COMPARE) : [];
  } catch {
    return [];
  }
}

export const useShortlistStore = defineStore("shortlist", {
  state: () => ({
    items: [],            // [{ id, note, block }]
    loading: false,
    error: "",
    compareIds: readCompare(),
  }),
  getters: {
    savedBlockIds: (s) => new Set(s.items.map((i) => i.block?.id).filter(Boolean)),
    isSaved: (s) => (blockId) => s.items.some((i) => i.block?.id === blockId),
    itemFor: (s) => (blockId) => s.items.find((i) => i.block?.id === blockId),
    canCompareMore: (s) => s.compareIds.length < MAX_COMPARE,
  },
  actions: {
    async load() {
      this.loading = true; this.error = "";
      try {
        this.items = await shortlistApi.fetchShortlist();
      } catch (err) {
        this.error = err.message;
      } finally {
        this.loading = false;
      }
    },
    async add(blockId, note = "") {
      await shortlistApi.addToShortlist(blockId, note);
      await this.load();
    },
    async updateNote(id, note) {
      await shortlistApi.updateShortlistNote(id, note);
      const row = this.items.find((i) => i.id === id);
      if (row) row.note = note;
    },
    async remove(id) {
      await shortlistApi.removeFromShortlist(id);
      this.items = this.items.filter((i) => i.id !== id);
    },
    toggleCompare(blockId) {
      if (this.compareIds.includes(blockId)) this.compareIds = this.compareIds.filter((x) => x !== blockId);
      else if (this.canCompareMore) this.compareIds = [...this.compareIds, blockId];
      this.persistCompare();
    },
    clearCompare() { this.compareIds = []; this.persistCompare(); },
    persistCompare() {
      try { localStorage.setItem("compareIds", JSON.stringify(this.compareIds)); } catch { /* private mode */ }
    },
    /** Called on sign-out: the shortlist belongs to the account, not the browser. */
    clear() { this.items = []; this.error = ""; },
  },
});
