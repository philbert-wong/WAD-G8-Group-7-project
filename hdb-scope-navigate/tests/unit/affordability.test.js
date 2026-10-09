import { describe, it, expect } from "vitest";
import {
  monthlyPayment, loanForPayment, ehgAmount, grantsFor, affordability,
} from "../../client/src/lib/affordability.js";
import { GRANT_DEFAULTS as rules } from "../../server/lib/grantDefaults.js";

const family = {
  household: "SC_SC", firstTimer: true, extendedFamily: false, flatSize: "room2to4",
  proximity: "none", loanType: "hdb", income: 8000, debts: 0, cash: 60000, cpf: 120000,
};

describe("loan maths", () => {
  it("monthlyPayment matches a known figure", () => {
    // $400,000 over 25 years at 2.6% ≈ $1,815 a month
    expect(monthlyPayment(400000, 2.6, 25)).toBeGreaterThan(1805);
    expect(monthlyPayment(400000, 2.6, 25)).toBeLessThan(1825);
  });

  it("loanForPayment inverts monthlyPayment", () => {
    const loan = loanForPayment(monthlyPayment(350000, 3, 30), 3, 30);
    expect(loan).toBeCloseTo(350000, 0);
  });

  it("handles a zero rate and a zero payment", () => {
    expect(monthlyPayment(120000, 0, 10)).toBeCloseTo(1000);
    expect(loanForPayment(0, 2.6, 25)).toBe(0);
  });
});

describe("grants", () => {
  it("EHG falls as income rises and stops at the ceiling", () => {
    expect(ehgAmount(1500, "family", rules)).toBe(120000);
    expect(ehgAmount(4000, "family", rules)).toBeLessThan(120000);
    expect(ehgAmount(8900, "family", rules)).toBeLessThan(ehgAmount(4000, "family", rules));
    expect(ehgAmount(9000, "family", rules)).toBeGreaterThan(0);
    expect(ehgAmount(9001, "family", rules)).toBe(0);
  });

  it("gives a first-timer couple the family grant by flat size", () => {
    const small = grantsFor({ ...family, income: 12000 }, rules).items.find((i) => i.key === "cpf");
    const big = grantsFor({ ...family, income: 12000, flatSize: "room5plus" }, rules).items.find((i) => i.key === "cpf");
    expect(small.amount).toBe(80000);
    expect(big.amount).toBe(50000);
  });

  it("pays less to an SC/PR household", () => {
    const cpf = grantsFor({ ...family, household: "SC_PR" }, rules).items.find((i) => i.key === "cpf");
    expect(cpf.amount).toBe(60000);
  });

  it("applies the income ceilings and says why a grant is missing", () => {
    const g = grantsFor({ ...family, income: 15000 }, rules);
    const cpf = g.items.find((i) => i.key === "cpf");
    expect(cpf.eligible).toBe(false);
    expect(cpf.why).toMatch(/ceiling/);
    expect(grantsFor({ ...family, income: 15000, extendedFamily: true }, rules)
      .items.find((i) => i.key === "cpf").amount).toBe(80000);
  });

  it("pays the proximity grant by distance, with no income ceiling", () => {
    const near = grantsFor({ ...family, income: 30000, proximity: "near" }, rules).items.find((i) => i.key === "phg");
    const with_ = grantsFor({ ...family, income: 30000, proximity: "with" }, rules).items.find((i) => i.key === "phg");
    expect(near.amount).toBe(20000);
    expect(with_.amount).toBe(30000);
  });

  it("reaches the S$230k maximum for the lowest-income family living with parents", () => {
    const g = grantsFor({ ...family, income: 1000, proximity: "with" }, rules);
    expect(g.total).toBe(120000 + 80000 + 30000);
  });

  it("pays singles the singles amounts", () => {
    const g = grantsFor({ ...family, household: "SINGLE", income: 3000, proximity: "near" }, rules);
    expect(g.items.find((i) => i.key === "cpf").amount).toBe(40000);
    expect(g.items.find((i) => i.key === "phg").amount).toBe(10000);
  });

  it("gives nothing to a second-timer", () => {
    expect(grantsFor({ ...family, firstTimer: false, proximity: "with" }, rules).total).toBe(0);
  });
});

describe("affordability", () => {
  it("caps the HDB loan at 30% of income (MSR)", () => {
    const r = affordability(family, rules);
    expect(r.paymentCap).toBe(2400);
    expect(r.monthlyPayment).toBeLessThanOrEqual(2400);
  });

  it("caps a bank loan on TDSR when existing debts are heavy", () => {
    const clean = affordability({ ...family, loanType: "bank", income: 10000 }, rules);
    const indebted = affordability({ ...family, loanType: "bank", income: 10000, debts: 3000 }, rules);
    expect(clean.paymentCap).toBe(3000);          // MSR 30% is the tighter one
    expect(indebted.paymentCap).toBe(2500);       // TDSR 55% − debts is tighter
    expect(indebted.maxLoan).toBeLessThan(clean.maxLoan);
  });

  it("stress-tests a bank loan at the higher floor rate", () => {
    const r = affordability({ ...family, loanType: "bank", ratePct: 3.0 }, rules);
    expect(r.testRate).toBe(4);
    expect(r.ratePct).toBe(3);
  });

  it("never lets the loan exceed the LTV limit", () => {
    const r = affordability({ ...family, income: 20000, cash: 5000, cpf: 5000 }, rules);
    expect(r.loan).toBeLessThanOrEqual(Math.round(0.8 * r.maxPrice) + 1);
    expect(r.limitedBy).toBe("savings");
  });

  it("splits the downpayment into grants, CPF and cash that add up", () => {
    const r = affordability({ ...family, proximity: "near" }, rules);
    expect(r.fromGrants + r.fromCpf + r.fromCash).toBeCloseTo(r.downpayment, -1);
    expect(r.loan + r.downpayment).toBeCloseTo(r.maxPrice, -1);
  });

  it("requires 5% of a bank-financed price in cash", () => {
    const r = affordability({ ...family, loanType: "bank", cash: 10000, cpf: 400000, income: 20000 }, rules);
    expect(r.fromCash).toBeGreaterThanOrEqual(Math.round(0.05 * r.maxPrice) - 1);
    expect(r.limitedBy).toBe("cash");
  });

  it("can afford more with grants than without", () => {
    const withGrants = affordability(family, rules);
    const without = affordability({ ...family, firstTimer: false }, rules);
    expect(withGrants.maxPrice).toBeGreaterThan(without.maxPrice);
  });

  it("returns zeros, not NaN, for no income", () => {
    const r = affordability({ ...family, income: 0, cash: 0, cpf: 0, firstTimer: false }, rules);
    expect(r.maxPrice).toBe(0);
    expect(Number.isFinite(r.monthlyPayment)).toBe(true);
  });
});
