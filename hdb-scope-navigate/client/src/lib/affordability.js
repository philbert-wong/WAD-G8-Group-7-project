/**
 * The affordability calculator, as pure functions over a set of grant/loan rules
 * (served by /api/grants). Indicative only — it is not financial advice.
 * OWNER: Maps & Location
 */

/** Monthly instalment for a loan (standard amortisation). */
export function monthlyPayment(principal, ratePct, years) {
  const n = Math.round(years * 12);
  const r = ratePct / 100 / 12;
  if (n <= 0 || principal <= 0) return 0;
  return r === 0 ? principal / n : (principal * r) / (1 - (1 + r) ** -n);
}

/** The inverse: the biggest loan a given monthly payment can service. */
export function loanForPayment(payment, ratePct, years) {
  const n = Math.round(years * 12);
  const r = ratePct / 100 / 12;
  if (n <= 0 || payment <= 0) return 0;
  return r === 0 ? payment * n : (payment * (1 - (1 + r) ** -n)) / r;
}

/** Enhanced CPF Housing Grant for a monthly household income, or 0 above the ceiling. */
export function ehgAmount(income, kind, rules) {
  const table = rules.ehg[kind];
  if (income > table.incomeCeiling) return 0;
  const band = table.bands.find((b) => income <= b.upTo);
  return band ? band.amount : 0;
}

/**
 * Every grant this household could get on a resale flat, with the reason when
 * it could not. Grants are for first-timers only in this model.
 */
export function grantsFor(inp, rules) {
  const single = inp.household === "SINGLE";
  const kind = single ? "single" : "family";
  const items = [];

  const add = (key, label, amount, why) =>
    items.push({ key, label, amount: amount || 0, eligible: amount > 0, why: amount > 0 ? "" : why });

  if (!inp.firstTimer) {
    add("cpf", "CPF Housing Grant", 0, "Grants are for first-timer applicants");
    add("ehg", "Enhanced CPF Housing Grant", 0, "Grants are for first-timer applicants");
    add("phg", "Proximity Housing Grant", 0, "Grants are for first-timer applicants");
    return { items, total: 0 };
  }

  // CPF Housing Grant
  const cpf = rules.cpfGrant;
  if (single) {
    add("cpf", "CPF Housing Grant (Singles)",
      inp.income <= cpf.single.incomeCeiling ? cpf.single.amounts[inp.flatSize] : 0,
      `Income is above the S$${cpf.single.incomeCeiling.toLocaleString()} ceiling`);
  } else {
    const ceiling = inp.extendedFamily ? cpf.family.extendedFamilyCeiling : cpf.family.incomeCeiling;
    add("cpf", "CPF Housing Grant (Family)",
      inp.income <= ceiling ? cpf.family.amounts[inp.household][inp.flatSize] : 0,
      `Income is above the S$${ceiling.toLocaleString()} ceiling`);
  }

  // Enhanced CPF Housing Grant
  add("ehg", "Enhanced CPF Housing Grant", ehgAmount(inp.income, kind, rules),
    `Income is above the S$${rules.ehg[kind].incomeCeiling.toLocaleString()} ceiling`);

  // Proximity Housing Grant — no income ceiling
  const phg = rules.phg[kind];
  const phgAmount = inp.proximity === "with" ? phg.withParents : inp.proximity === "near" ? phg.near : 0;
  add("phg", "Proximity Housing Grant", phgAmount,
    `Only if you buy to live with, or within ${rules.phg.nearKm} km of, your parents or child`);

  return { items, total: items.reduce((s, i) => s + i.amount, 0) };
}

/**
 * How much can this household borrow, and what is the dearest flat it can buy?
 *
 * The loan is capped by the monthly-payment rules (MSR 30% for HDB flats, plus
 * TDSR 55% for bank loans, stress-tested at the bank floor rate). The price is
 * then capped by whichever runs out first: the loan plus the money for the
 * downpayment, the downpayment the LTV limit demands, or — for bank loans — the
 * minimum cash share.
 */
export function affordability(inp, rules) {
  const loanRules = rules.loans[inp.loanType];
  const ratePct = inp.ratePct ?? loanRules.ratePct;
  const tenure = Math.min(inp.tenureYears ?? loanRules.maxTenureYears, loanRules.maxTenureYears);
  const income = Math.max(0, inp.income || 0);
  const debts = Math.max(0, inp.debts || 0);
  const cash = Math.max(0, inp.cash || 0);
  const cpf = Math.max(0, inp.cpf || 0);

  // Bank loans are tested at the higher of the actual rate and the stress rate.
  const testRate = inp.loanType === "bank" ? Math.max(ratePct, loanRules.stressRatePct ?? ratePct) : ratePct;
  const msrCap = rules.loans.msr * income;
  const tdsrCap = Math.max(0, rules.loans.tdsr * income - debts);
  const paymentCap = inp.loanType === "bank" ? Math.min(msrCap, tdsrCap) : msrCap;
  const maxLoan = loanForPayment(paymentCap, testRate, tenure);

  const grants = grantsFor({ ...inp, income }, rules);
  const funds = cash + cpf + grants.total;

  const caps = [
    { limit: "income",  price: maxLoan + funds },
    { limit: "savings", price: funds / (1 - loanRules.ltv) },
  ];
  if (loanRules.minCashPct > 0) caps.push({ limit: "cash", price: cash / loanRules.minCashPct });

  const binding = caps.reduce((a, b) => (b.price < a.price ? b : a));
  const maxPrice = Math.max(0, binding.price);

  const loan = Math.min(maxLoan, loanRules.ltv * maxPrice);
  const downpayment = maxPrice - loan;

  // Pay the downpayment from grants first, then CPF savings, then cash — except
  // that a bank loan always needs its minimum share in cash.
  const cashNeeded = Math.max(loanRules.minCashPct * maxPrice, downpayment - cpf - grants.total);
  const fromCash = Math.min(cashNeeded, downpayment);
  const fromGrants = Math.min(grants.total, downpayment - fromCash);
  const fromCpf = downpayment - fromCash - fromGrants;

  return {
    maxLoan: Math.round(maxLoan),
    maxPrice: Math.round(maxPrice),
    loan: Math.round(loan),
    downpayment: Math.round(downpayment),
    fromGrants: Math.round(fromGrants),
    fromCpf: Math.round(fromCpf),
    fromCash: Math.round(fromCash),
    monthlyPayment: Math.round(monthlyPayment(loan, ratePct, tenure)),
    paymentCap: Math.round(paymentCap),
    limitedBy: income === 0 ? "income" : binding.limit,
    ratePct, tenure, testRate,
    grants,
  };
}
