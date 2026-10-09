import { describe, it, expect } from "vitest";
import {
  htmlAttributes, pointFeatures, parseHawkers, parseParks, parseClinics, parseEldercare, primarySchools,
} from "../../server/lib/amenityParsers.js";
import { parseCsv } from "../../server/lib/csv.js";

const point = (lng, lat, properties) => ({ type: "Feature", geometry: { type: "Point", coordinates: [lng, lat] }, properties });
const fc = (...features) => ({ type: "FeatureCollection", features });

describe("htmlAttributes", () => {
  it("reads th/td pairs out of a KML description table", () => {
    const html = "<center><table><tr><th colspan='2'>Attributes</th></tr><tr bgcolor=\"x\"> <th>HCI_NAME</th> <td>Acumed Medical Group</td> </tr><tr><th>POSTAL_CD</th> <td>681001</td></tr></table></center>";
    expect(htmlAttributes(html)).toEqual({ HCI_NAME: "Acumed Medical Group", POSTAL_CD: "681001" });
  });

  it("copes with empty cells and missing input", () => {
    expect(htmlAttributes("<tr><th>A</th><td></td></tr>")).toEqual({ A: "" });
    expect(htmlAttributes(undefined)).toEqual({});
  });
});

describe("pointFeatures", () => {
  it("returns [lng, lat] the right way round, and ignores a third (altitude) value", () => {
    const f = { type: "Feature", geometry: { type: "Point", coordinates: [103.8, 1.35, 0.0] }, properties: {} };
    const [p] = pointFeatures(fc(f));
    expect(p.lat).toBeCloseTo(1.35);
    expect(p.lng).toBeCloseTo(103.8);
  });

  it("drops non-points and coordinates outside Singapore", () => {
    const out = pointFeatures(fc(
      point(103.8, 1.35, {}),
      point(0, 0, {}),                       // the "not geocoded" marker
      point(1.35, 103.8, {}),                // swapped
      { type: "Feature", geometry: { type: "Polygon", coordinates: [] }, properties: {} },
    ));
    expect(out).toHaveLength(1);
  });
});

describe("dataset parsers", () => {
  it("hawkers: keeps open centres, drops ones under construction", () => {
    const out = parseHawkers(fc(
      point(103.80, 1.30, { NAME: "Maxwell Food Centre", STATUS: "Existing" }),
      point(103.81, 1.31, { NAME: "Future Centre", STATUS: "Under Construction" }),
      point(103.82, 1.32, { NAME: "Temp Hall", STATUS: "Interim Centre" }),
    ));
    expect(out.map((a) => a.name)).toEqual(["Maxwell Food Centre", "Temp Hall"]);
    expect(out.every((a) => a.type === "hawker")).toBe(true);
  });

  it("parks: reads NAME", () => {
    const out = parseParks(fc(point(103.78, 1.31, { NAME: "GROVE LANE PG" })));
    expect(out).toEqual([{ type: "park", name: "GROVE LANE PG", lat: 1.31, lng: 103.78 }]);
  });

  it("clinics: reads the name from the HTML description", () => {
    const d = "<tr><th>HCI_NAME</th> <td>Affinity Medical Clinic</td></tr>";
    expect(parseClinics(fc(point(103.87, 1.35, { Description: d })))[0])
      .toMatchObject({ type: "healthcare", name: "Affinity Medical Clinic" });
  });

  it("eldercare: reads the name from the HTML description", () => {
    const d = "<tr><th>NAME</th> <td>PEACE-Connect Senior Activity Centre</td></tr>";
    expect(parseEldercare(fc(point(103.85, 1.30, { Description: d })))[0])
      .toMatchObject({ type: "eldercare", name: "PEACE-Connect Senior Activity Centre" });
  });

  it("skips features with no name rather than storing a blank", () => {
    expect(parseParks(fc(point(103.78, 1.31, { NAME: "  " })))).toEqual([]);
  });
});

describe("primarySchools", () => {
  const csv = [
    "school_name,address,postal_code,mainlevel_code",
    "ADMIRALTY PRIMARY SCHOOL,11 WOODLANDS CIRCLE   ,738907,PRIMARY",
    "ADMIRALTY SECONDARY SCHOOL,31 WOODLANDS CRESCENT,737916,SECONDARY (S1-S5)",
    "ANGLO-CHINESE SCHOOL (PRIMARY),50 BARKER ROAD,309918,MIXED LEVEL (P1-S4)",
    "NO POSTCODE PRIMARY,1 X ROAD,,PRIMARY",
  ].join("\n");

  it("keeps schools that take P1 pupils, including mixed-level ones, and drops secondary", () => {
    const out = primarySchools(parseCsv(csv));
    expect(out.map((s) => s.name)).toEqual(["ADMIRALTY PRIMARY SCHOOL", "ANGLO-CHINESE SCHOOL (PRIMARY)"]);
  });

  it("restores the leading zero that the source file drops from postal codes", () => {
    const rows = parseCsv("school_name,postal_code,mainlevel_code\nCANTONMENT PRIMARY SCHOOL,88256,PRIMARY");
    expect(primarySchools(rows)).toEqual([{ name: "CANTONMENT PRIMARY SCHOOL", postal: "088256" }]);
  });

  it("drops schools without a valid six-digit postal code, since we could not place them", () => {
    expect(primarySchools(parseCsv(csv)).some((s) => /NO POSTCODE/.test(s.name))).toBe(false);
    expect(primarySchools(parseCsv("school_name,postal_code,mainlevel_code\nX PRIMARY,,PRIMARY"))).toEqual([]);
  });
});

describe("parseCsv", () => {
  it("handles quoted commas, escaped quotes and a byte-order mark", () => {
    const rows = parseCsv('﻿a,b\n"x, y","say ""hi"""\n');
    expect(rows).toEqual([{ a: "x, y", b: 'say "hi"' }]);
  });
});
