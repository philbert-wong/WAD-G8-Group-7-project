import { describe, it, expect } from "vitest";
import { haversineM } from "./haversine.js";

describe("haversineM", () => {
  it("is zero for the same point", () => {
    expect(haversineM({ lat: 1.35, lng: 103.8 }, { lat: 1.35, lng: 103.8 })).toBe(0);
  });

  it("is about 111 km for one degree of latitude", () => {
    const d = haversineM({ lat: 0, lng: 0 }, { lat: 1, lng: 0 });
    expect(d).toBeGreaterThan(110500);
    expect(d).toBeLessThan(111700);
  });

  it("matches a known Singapore distance (Ang Mo Kio MRT to Bishan MRT, about 2.1 km)", () => {
    const d = haversineM({ lat: 1.3700, lng: 103.8495 }, { lat: 1.3512, lng: 103.8485 });
    expect(d).toBeGreaterThan(2000);
    expect(d).toBeLessThan(2200);
  });

  it("gives the same answer in either direction", () => {
    const a = { lat: 1.3327, lng: 103.8474 }, b = { lat: 1.3057, lng: 103.7647 };
    expect(haversineM(a, b)).toBeCloseTo(haversineM(b, a), 6);
  });

  it("shrinks east-west distance away from the equator", () => {
    const atEquator = haversineM({ lat: 0, lng: 100 }, { lat: 0, lng: 101 });
    const nearPole = haversineM({ lat: 60, lng: 100 }, { lat: 60, lng: 101 });
    expect(nearPole).toBeLessThan(atEquator * 0.55);
  });

  it("returns metres, not kilometres", () => {
    const d = haversineM({ lat: 1.30, lng: 103.8 }, { lat: 1.31, lng: 103.8 });
    expect(d).toBeGreaterThan(1000);   // ~1,111 m; in km it would be ~1.1
  });
});
