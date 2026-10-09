import { defineStore } from "pinia";
import { AMENITY_TYPES } from "../lib/constants.js";

/** OWNER: Maps & Location */
const noLayers = () => Object.fromEntries(AMENITY_TYPES.map((t) => [t.id, false]));

export const useMapStore = defineStore("map", {
  state: () => ({
    centre: [1.3521, 103.8198],   // Singapore
    zoom: 12,
    selectedBlockId: null,
    focusSelected: false,         // recentre on the block once its details load
    pin: null,                    // { lat, lng, label } — a search result or dropped pin
    dropMode: false,              // next map click drops the pin
    phg: null,                    // { lat, lng, address } — parent's address for the grant layer
    layers: noLayers(),           // which amenity layers are switched on
    route: null,                  // walking route to draw for the selected block
  }),
  actions: {
    setCentre(lat, lng, zoom = 16) {
      this.centre = [lat, lng];
      this.zoom = zoom;
    },
    setPin(lat, lng, label = "", zoom = 16) {
      this.pin = { lat, lng, label };
      this.setCentre(lat, lng, zoom);
    },
    clearPin() { this.pin = null; },
    select(id) { this.selectedBlockId = id; this.route = null; },
    selectAndFocus(id) { this.focusSelected = true; this.select(id); },
    clearSelection() { this.selectedBlockId = null; this.route = null; },
    setPhg(origin) { this.phg = origin; },
    clearPhg() { this.phg = null; },
    setRoute(route) { this.route = route; },
    applyLayers(saved = {}) { this.layers = { ...noLayers(), ...saved }; },
  },
});
