import { describe, it, expect } from "vitest";
import { median, statsByFlatType, remainingLeaseYears } from "../../server/lib/stats.js";
import { parseRemainingLease, blockKey } from "../../server/services/datagov.js";

/** OWNER: Data pipeline & QA — but everyone adds tests for their own code. */

describe("median", () => {
  it("handles an odd count", () => expect(median([3, 1, 2])).toBe(2));
  it("handles an even count", () => expect(median([1, 2, 3, 4])).toBe(3));
  it("ignores non-numbers", () => expect(median([1, NaN, 3])).toBe(2));
  it("returns null when empty", () => expect(median([])).toBeNull());
});

describe("parseRemainingLease", () => {
  it("parses years and months", () => expect(parseRemainingLease("52 years 04 months")).toBe(52.33));
  it("parses years only", () => expect(parseRemainingLease("61 years")).toBe(61));
  it("returns null for junk", () => expect(parseRemainingLease("")).toBeNull());
});

describe("blockKey", () => {
  it("normalises case and whitespace", () => {
    expect(blockKey(" 406 ", "ang mo kio ave 10")).toBe("406|ANG MO KIO AVE 10");
  });
});

describe("statsByFlatType", () => {
  it("groups and summarises", () => {
    const txns = [
      { flatType: "4 ROOM", resalePrice: 500000, pricePsm: 5000, month: "2026-01" },
      { flatType: "4 ROOM", resalePrice: 600000, pricePsm: 6000, month: "2026-03" },
      { flatType: "3 ROOM", resalePrice: 400000, pricePsm: 5800, month: "2026-02" },
    ];
    const out = statsByFlatType(txns);
    expect(out["4 ROOM"].txnCount).toBe(2);
    expect(out["4 ROOM"].medianPrice).toBe(550000);
    expect(out["4 ROOM"].lastTxnMonth).toBe("2026-03");
    expect(out["3 ROOM"].txnCount).toBe(1);
  });
});

describe("remainingLeaseYears", () => {
  it("counts down from 99", () => {
    expect(remainingLeaseYears(1979, new Date("2026-01-01"))).toBe(52);
  });
  it("never goes negative", () => {
    expect(remainingLeaseYears(1900, new Date("2026-01-01"))).toBe(0);
  });
});
