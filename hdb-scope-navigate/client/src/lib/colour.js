/** Colour ramps for the map markers. OWNER: Maps & Location */

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const toHex = (rgb) => `#${rgb.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;

/** Blend through a list of hex stops; t runs 0..1. */
export function ramp(stops, t) {
  const x = Math.min(1, Math.max(0, Number.isFinite(t) ? t : 0)) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(x));
  const f = x - i;
  const a = hex(stops[i]), b = hex(stops[i + 1]);
  return toHex(a.map((v, k) => v + (b[k] - v) * f));
}

// Cheaper = green, dearer = red, so the map reads like a heat map.
export const PRICE_STOPS = ["#2a9d8f", "#e9c46a", "#e76f51", "#b2243b"];
// Low fit = pale, high fit = deep green.
export const SCORE_STOPS = ["#d6dcd9", "#8fc9a4", "#1f6f5c"];

export const priceColour = (t) => ramp(PRICE_STOPS, t);
export const scoreColour = (t) => ramp(SCORE_STOPS, t);
