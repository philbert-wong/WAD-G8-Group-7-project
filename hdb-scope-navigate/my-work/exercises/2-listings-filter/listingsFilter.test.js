import { describe, it, expect } from "vitest";
import { buildListingsFilter, NEAR_CAP, ISLAND_CAP } from "./listingsFilter.js";

describe("buildListingsFilter", () => {
  it("with no query: whole island, and never includes un-geocoded blocks", () => {
    const { filter, limit, maxPriceAfterShaping } = buildListingsFilter({});
    expect(filter).toEqual({ "location.coordinates": { $ne: [0, 0] } });
    expect(limit).toBe(ISLAND_CAP);
    expect(maxPriceAfterShaping).toBeNull();
  });

  describe("searching near a point", () => {
    const q = { lat: "1.362", lng: "103.854", radius: "2000" };

    it("uses $near with [lng, lat] — longitude FIRST — and the radius in metres", () => {
      const { filter, limit } = buildListingsFilter(q);
      expect(filter.location).toEqual({
        $near: { $geometry: { type: "Point", coordinates: [103.854, 1.362] }, $maxDistance: 2000 },
      });
      expect(limit).toBe(NEAR_CAP);
    });

    it("is a whole-island search if radius is 0", () => {
      const { filter, limit } = buildListingsFilter({ ...q, radius: "0" });
      expect(filter.location).toBeUndefined();
      expect(limit).toBe(ISLAND_CAP);
    });

    it("is a whole-island search if lat or lng is missing or not a number", () => {
      expect(buildListingsFilter({ lng: "103.8", radius: "1000" }).filter.location).toBeUndefined();
      expect(buildListingsFilter({ lat: "abc", lng: "103.8", radius: "1000" }).filter.location).toBeUndefined();
    });
  });

  it("uppercases the town", () => {
    expect(buildListingsFilter({ town: "bishan" }).filter.town).toBe("BISHAN");
  });

  it("turns minLease into a >= test on remaining lease, as a number", () => {
    expect(buildListingsFilter({ minLease: "60" }).filter.remainingLeaseYears).toEqual({ $gte: 60 });
  });

  it("turns maxWalkMin into a <= test on the MRT walk, as a number", () => {
    expect(buildListingsFilter({ maxWalkMin: "8" }).filter["nearestMrt.walkMinutes"]).toEqual({ $lte: 8 });
  });

  describe("flat type and price", () => {
    it("flat type alone: the block must have sold that type", () => {
      const { filter } = buildListingsFilter({ flatType: "4 ROOM" });
      expect(filter["stats.4 ROOM"]).toEqual({ $exists: true });
    });

    it("flat type + max price: the price goes into the database query", () => {
      const { filter, maxPriceAfterShaping } = buildListingsFilter({ flatType: "4 ROOM", maxPrice: "600000" });
      expect(filter["stats.4 ROOM.medianPrice"]).toEqual({ $lte: 600000 });
      expect(maxPriceAfterShaping).toBeNull();
    });

    it("max price WITHOUT a flat type can't be a database filter — it's returned for later", () => {
      const { filter, maxPriceAfterShaping } = buildListingsFilter({ maxPrice: "600000" });
      expect(Object.keys(filter).some((k) => k.includes("medianPrice"))).toBe(false);
      expect(maxPriceAfterShaping).toBe(600000);
    });
  });

  it("ignores empty, missing and non-numeric values — never puts NaN in a query", () => {
    const { filter } = buildListingsFilter({ minLease: "", maxWalkMin: "abc", maxPrice: "x", flatType: "", town: "" });
    expect(filter).toEqual({ "location.coordinates": { $ne: [0, 0] } });
    expect(JSON.stringify(filter)).not.toContain("null");
  });

  it("combines everything at once", () => {
    const { filter, limit } = buildListingsFilter({
      lat: "1.35", lng: "103.85", radius: "1000", town: "toa payoh", flatType: "3 ROOM",
      maxPrice: "450000", minLease: "50", maxWalkMin: "10",
    });
    expect(Object.keys(filter).sort()).toEqual([
      "location", "location.coordinates", "nearestMrt.walkMinutes", "remainingLeaseYears",
      "stats.3 ROOM", "stats.3 ROOM.medianPrice", "town",
    ]);
    expect(limit).toBe(NEAR_CAP);
  });
});
