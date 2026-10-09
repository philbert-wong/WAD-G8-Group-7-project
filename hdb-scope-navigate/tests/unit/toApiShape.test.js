import { describe, it, expect } from "vitest";
import { blockToApiShape } from "../../server/lib/toApiShape.js";

/**
 * This test is the guard on the API contract agreed in Week 5.
 * If someone changes the shape, this fails and they have to tell the team.
 */
const doc = {
  _id: "abc123",
  block: "406",
  streetName: "ANG MO KIO AVE 10",
  town: "ANG MO KIO",
  location: { coordinates: [103.8540, 1.3620] },
  stats: { "4 ROOM": { medianPrice: 528000, medianPsm: 5739, txnCount: 37 } },
  remainingLeaseYears: 52,
  nearestMrt: { name: "Ang Mo Kio", walkMinutes: 8, distanceM: 640 },
  amenityAccess: { school: 320, park: 150, hawker: 410, healthcare: 90, eldercare: null },
};

describe("blockToApiShape", () => {
  it("returns exactly the agreed fields", () => {
    const out = blockToApiShape(doc, { flatType: "4 ROOM" });
    expect(Object.keys(out).sort()).toEqual([
      "amenityAccess", "block", "id", "lat", "lng", "medianPrice", "medianPsm",
      "nearestMrt", "remainingLeaseYears", "streetName", "town", "txnCount",
    ]);
  });

  it("reports amenity distances in metres, null where unknown", () => {
    const out = blockToApiShape(doc);
    expect(out.amenityAccess).toEqual({
      school: 320, park: 150, hawker: 410, healthcare: 90, eldercare: null,
    });
  });

  it("with no flat type chosen, reports 4 ROOM so blocks compare like for like", () => {
    const mixed = { ...doc, stats: {
      "3 ROOM": { medianPrice: 400000, medianPsm: 5900, txnCount: 90 },
      "4 ROOM": { medianPrice: 528000, medianPsm: 5739, txnCount: 12 },
    } };
    expect(blockToApiShape(mixed).medianPrice).toBe(528000);
  });

  it("falls back to the busiest type when a block has no 4 ROOM sales", () => {
    const noFour = { ...doc, stats: {
      "3 ROOM": { medianPrice: 400000, txnCount: 5 },
      "5 ROOM": { medianPrice: 700000, txnCount: 20 },
    } };
    expect(blockToApiShape(noFour).medianPrice).toBe(700000);
  });

  it("gives null amenityAccess for a block that has none", () => {
    const { amenityAccess, ...bare } = doc;
    expect(blockToApiShape(bare).amenityAccess).toBeNull();
  });

  it("puts lat and lng the right way round", () => {
    const out = blockToApiShape(doc);
    expect(out.lat).toBeCloseTo(1.3620);   // NOT 103.x
    expect(out.lng).toBeCloseTo(103.8540);
  });

  it("only exposes name and walkMinutes for the MRT", () => {
    const out = blockToApiShape(doc);
    expect(out.nearestMrt).toEqual({ name: "Ang Mo Kio", walkMinutes: 8 });
  });
});
