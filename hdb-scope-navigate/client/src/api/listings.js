/**
 * OWNER: Project Lead (the API contract)
 *
 * ── WEEK 6: THE MOCK ──────────────────────────────────────────────
 * While the backend is being built, flip USE_MOCK to true. The frontend gets
 * the exact shape agreed in week 5, so the map and filters can be built today.
 * In week 7, flip it back to false and nothing else in the app changes.
 */
import api from "./client.js";

const USE_MOCK = false;

const MOCK = {
  count: 2,
  blocks: [
    { id: "mock-a", block: "406", streetName: "ANG MO KIO AVE 10", town: "ANG MO KIO",
      lat: 1.3620, lng: 103.8540, medianPrice: 528000, medianPsm: 5739, txnCount: 37,
      remainingLeaseYears: 52, nearestMrt: { name: "Ang Mo Kio", walkMinutes: 8 } },
    { id: "mock-b", block: "215", streetName: "ANG MO KIO AVE 1", town: "ANG MO KIO",
      lat: 1.3691, lng: 103.8398, medianPrice: 615000, medianPsm: 6250, txnCount: 21,
      remainingLeaseYears: 50, nearestMrt: { name: "Ang Mo Kio", walkMinutes: 4 } },
  ],
};

export async function fetchListings(params) {
  if (USE_MOCK) return structuredClone(MOCK);
  const { data } = await api.get("/listings", { params });
  return data;
}
