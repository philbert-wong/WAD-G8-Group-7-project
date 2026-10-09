import { describe, it, expect } from "vitest";
import { haversineM, nearestByType } from "../../server/lib/geo.js";
import { encodePolyline, decodePolyline } from "../../server/lib/polyline.js";

describe("haversineM", () => {
  it("is zero for the same point", () => {
    expect(haversineM({ lat: 1.35, lng: 103.8 }, { lat: 1.35, lng: 103.8 })).toBe(0);
  });

  it("matches a known distance (Ang Mo Kio MRT to Bishan MRT ≈ 2.1 km)", () => {
    const d = haversineM({ lat: 1.3700, lng: 103.8495 }, { lat: 1.3512, lng: 103.8485 });
    expect(d).toBeGreaterThan(2000);
    expect(d).toBeLessThan(2200);
  });
});

describe("nearestByType", () => {
  const here = { lat: 1.35, lng: 103.85 };
  const amenities = [
    { type: "park", lat: 1.351, lng: 103.85 },     // ~111 m
    { type: "park", lat: 1.36, lng: 103.85 },      // ~1.1 km
    { type: "school", lat: 1.35, lng: 103.855 },   // ~556 m
  ];

  it("keeps the closest of each kind, rounded to metres", () => {
    const out = nearestByType(here, amenities);
    expect(out.park).toBeGreaterThan(105);
    expect(out.park).toBeLessThan(118);
    expect(Number.isInteger(out.park)).toBe(true);
    expect(out.school).toBeGreaterThan(540);
  });

  it("leaves out kinds with no amenity", () => {
    expect(nearestByType(here, amenities)).not.toHaveProperty("hawker");
  });
});

describe("polyline", () => {
  it("round-trips a route", () => {
    const route = [[1.362, 103.854], [1.3655, 103.8521], [1.37, 103.8495]];
    const back = decodePolyline(encodePolyline(route));
    back.forEach(([lat, lng], i) => {
      expect(lat).toBeCloseTo(route[i][0], 5);
      expect(lng).toBeCloseTo(route[i][1], 5);
    });
  });

  it("decodes the reference example from Google's documentation", () => {
    const pts = decodePolyline("_p~iF~ps|U_ulLnnqC_mqNvxq`@");
    expect(pts[0][0]).toBeCloseTo(38.5, 5);
    expect(pts[0][1]).toBeCloseTo(-120.2, 5);
    expect(pts[2][0]).toBeCloseTo(43.252, 5);
  });
});
