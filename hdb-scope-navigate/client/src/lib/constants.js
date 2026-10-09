/** Shared lists and settings. OWNER: Frontend — Shell & UI */

export const TOWNS = [
  "ANG MO KIO", "BEDOK", "BISHAN", "BUKIT BATOK", "BUKIT MERAH", "BUKIT PANJANG", "BUKIT TIMAH",
  "CENTRAL AREA", "CHOA CHU KANG", "CLEMENTI", "GEYLANG", "HOUGANG", "JURONG EAST", "JURONG WEST",
  "KALLANG/WHAMPOA", "MARINE PARADE", "PASIR RIS", "PUNGGOL", "QUEENSTOWN", "SEMBAWANG",
  "SENGKANG", "SERANGOON", "TAMPINES", "TOA PAYOH", "WOODLANDS", "YISHUN",
];

export const FLAT_TYPES = ["2 ROOM", "3 ROOM", "4 ROOM", "5 ROOM", "EXECUTIVE"];

/** Amenity kinds as stored on the server, with the colour used on the map. */
export const AMENITY_TYPES = [
  { id: "school",     label: "Schools",         colour: "#e8890c" },
  { id: "park",       label: "Parks",           colour: "#2e9d4f" },
  { id: "hawker",     label: "Hawker centres",  colour: "#d9363e" },
  { id: "healthcare", label: "Clinics (CHAS)",  colour: "#2b7bd6" },
  { id: "eldercare",  label: "Eldercare",       colour: "#8a4fc7" },
];

/**
 * The personal-score categories. Each one turns a distance into 0–100:
 * 100 at `best` or closer, 0 at `worst` or further, a straight line between.
 * Transport reads walking minutes to the MRT; the rest read metres to the
 * nearest amenity of that kind.
 */
export const SCORE_CATEGORIES = [
  { id: "transport",  label: "Transport",  hint: "Walk to the MRT",      source: "mrt",     best: 3,   worst: 20,   unit: "min" },
  { id: "food",       label: "Food",       hint: "Hawker centre nearby", amenity: "hawker",     best: 150, worst: 1200, unit: "m" },
  { id: "greenery",   label: "Greenery",   hint: "Park nearby",          amenity: "park",       best: 150, worst: 1000, unit: "m" },
  { id: "healthcare", label: "Healthcare", hint: "CHAS clinic nearby",   amenity: "healthcare", best: 200, worst: 1200, unit: "m" },
  { id: "schools",    label: "Schools",    hint: "Primary school nearby", amenity: "school",    best: 300, worst: 2000, unit: "m" },
  { id: "eldercare",  label: "Eldercare",  hint: "Eldercare service",    amenity: "eldercare",  best: 300, worst: 1500, unit: "m" },
];

export const DEFAULT_WEIGHTS = {
  transport: 5, food: 3, greenery: 3, healthcare: 2, schools: 3, eldercare: 0,
};

/** Slider limits. The far end of each slider means "no limit". */
export const LIMITS = {
  price: { min: 200000, max: 1500000, step: 10000 },
  walk:  { min: 3, max: 20, step: 1 },
  lease: { min: 0, max: 95, step: 5 },
};

export const SCOPES = [
  { value: 0,    label: "Whole island" },
  { value: 1000, label: "Within 1 km of the pin" },
  { value: 2000, label: "Within 2 km of the pin" },
  { value: 5000, label: "Within 5 km of the pin" },
];
