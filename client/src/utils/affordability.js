// AFFORDABILITY CALCULATOR + GRANT RULES 

// Every number (grant amounts, ceilings, loan rules) comes from affordabilityRules.js.
// This file only does the maths, so if HDB changes a number we only edit the rules file.

import {
  HDB_LOAN_INTEREST_RATE,
  HDB_LOAN_ASSESSMENT_RATE,
  HDB_LOAN_LTV_PERCENT,
  MSR_PERCENT,
  MAX_LOAN_YEARS,
  HDB_LOAN_INCOME_CEILING,
  CPF_HOUSING_GRANT_INCOME_CEILING,
  CPF_HOUSING_GRANT,
  CPF_HOUSING_GRANT_SINGLE_FLAT_TYPES,
  EHG_INCOME_CEILING,
  EHG_MONTHS_EMPLOYED,
  EHG_TIERS,
  PHG_AMOUNT,
  PHG_SINGLE_NEAR_FLAT_TYPES,
  UP_TO_4_ROOM_FLAT_TYPES,
  BSD_TIERS,
} from './affordabilityRules.js'

// --- Loan maths ---

// How much $1 grows to after this many months of interest.
// Each month it is multiplied by (1 + monthly rate), e.g. 300 months at 0.2167% a month -> about 1.91
function growthOverMonths(monthlyRate, months) {
  let growth = 1
  for (let month = 1; month <= months; month++) {
    growth = growth * (1 + monthlyRate)
  }
  return growth
}

// Monthly repayment for a loan.
// loan = 400000, ratePercent = 2.6, years = 25  ->  about 1815
export function monthlyRepayment(loan, ratePercent, years) {
  const months = years * 12
  const monthlyRate = ratePercent / 100 / 12

  // A 0% loan is just the loan split evenly over the months
  if (monthlyRate === 0) {
    return loan / months
  }

  // Bank formula: repayment = loan × rate × growth ÷ (growth − 1)
  const growth = growthOverMonths(monthlyRate, months)
  return (loan * monthlyRate * growth) / (growth - 1)
}

// The opposite of monthlyRepayment: how big a loan this monthly repayment can pay off.
// payment = 1800, ratePercent = 3, years = 25  ->  about 379000
export function loanForRepayment(payment, ratePercent, years) {
  const months = years * 12
  const monthlyRate = ratePercent / 100 / 12

  if (monthlyRate === 0) {
    return payment * months
  }

  // The same formula, turned around: loan = payment × (growth − 1) ÷ (rate × growth)
  const growth = growthOverMonths(monthlyRate, months)
  return (payment * (growth - 1)) / (monthlyRate * growth)
}

// Rough monthly repayment for a flat at this price, if you borrow the most an HDB loan allows.
// Used by the Compare page, which does not know the user's savings.
export function estimateMonthlyCost(price) {
  const loan = (price * HDB_LOAN_LTV_PERCENT) / 100
  return monthlyRepayment(loan, HDB_LOAN_INTEREST_RATE, MAX_LOAN_YEARS)
}

// --- The household ---

// Adds up everyone's income, CPF and cash, and counts first- and second-timers.
export function householdTotals(owners) {
  const totals = { buyers: 0, income: 0, cpf: 0, cash: 0, firstTimers: 0, secondTimers: 0 }

  for (const owner of owners) {
    totals.buyers = totals.buyers + 1
    totals.income = totals.income + owner.income
    totals.cpf = totals.cpf + owner.cpf
    totals.cash = totals.cash + owner.cash
    if (owner.status === 'first') {
      totals.firstTimers = totals.firstTimers + 1
    } else {
      totals.secondTimers = totals.secondTimers + 1
    }
  }

  return totals
}

// Which grant rules apply to this household:
//   'family' = couple / family, all first-timers
//   'single' = one single first-timer
//   'joint'  = joint singles, all first-timers
//   'mixed'  = couple of exactly 2: one first-timer + one second-timer
//   'second' = everyone is a second-timer (only the PHG is possible)
//   'other'  = a mix we have no rules for (e.g. 3 people, or joint singles with a second-timer)
export function householdType(buyerType, totals) {
  if (totals.firstTimers === 0) {
    return 'second'
  }

  if (buyerType === 'single') {
    return 'single'
  }

  if (buyerType === 'couple') {
    if (totals.firstTimers === totals.buyers) {
      return 'family'
    }
    if (totals.buyers === 2 && totals.firstTimers === 1) {
      return 'mixed'
    }
    return 'other'
  }

  // Joint singles: only when everyone is a first-timer
  if (totals.firstTimers === totals.buyers) {
    return 'joint'
  }
  return 'other'
}

// ---------- Grants ----------
// Each grant function gives back one row for the results table:
// { name, amount, status, reason }
//   status 'yes'     = eligible, amount is counted in the budget
//   status 'no'      = not eligible (reason says why), amount 0
//   status 'unknown' = no rule for this case yet (see affordabilityRules.js), amount 0

// Shows a number as money, e.g. 682000 -> "$682,000" (also used by CPFCalView and PhgChecker)
// Goes through the digits from the right and puts a comma before every group of 3
export function money(amount) {
  const digits = String(Math.round(amount)) // 682000 -> "682000" (whole dollars only)
  let result = ''
  let count = 0
  for (let i = digits.length - 1; i >= 0; i--) {
    result = digits[i] + result // add one digit to the front
    count = count + 1
    if (count % 3 === 0 && i > 0) {
      result = ',' + result // every 3 digits, but not at the very front
    }
  }
  return '$' + result
}

// Enhanced CPF Housing Grant (EHG): first-timers, 12 months' work, amount depends on income band
export function enhancedHousingGrant(inputs, totals, type) {
  const name = 'Enhanced CPF Housing Grant (EHG)'

  if (type === 'second') {
    return { name: name, amount: 0, status: 'no', reason: 'Only for first-timers' }
  }
  if (type === 'other') {
    return { name: name, amount: 0, status: 'unknown', reason: 'No rule for this mix of buyers yet' }
  }
  if (!inputs.employed12Months) {
    return { name: name, amount: 0, status: 'no', reason: 'Needs ' + EHG_MONTHS_EMPLOYED + ' months of continuous work' }
  }

  // Mixed couples (first-timer + second-timer) are assessed on HALF the household income (HDB's EHG table, page 2)
  let income = totals.income
  let incomeLabel = 'Household income'
  if (type === 'mixed') {
    income = totals.income / 2
    incomeLabel = 'Half of the household income'
  }

  const ceiling = EHG_INCOME_CEILING[type]
  if (income > ceiling) {
    return { name: name, amount: 0, status: 'no', reason: incomeLabel + ' is above ' + money(ceiling) }
  }

  // Couples and joint singles use the family table; one single and mixed couples use the singles table
  let tiers = EHG_TIERS.family
  if (type === 'single' || type === 'mixed') {
    tiers = EHG_TIERS.single
  }

  // The income bands are not filled in, so we do not guess an amount
  if (tiers.length === 0) {
    return { name: name, amount: 0, status: 'unknown', reason: 'Income bands not filled in yet, so not counted' }
  }

  // Tiers are lowest income first: take the first band the income fits into
  for (const tier of tiers) {
    if (income <= tier.maxIncome) {
      return { name: name, amount: tier.amount, status: 'yes', reason: incomeLabel + ' band up to ' + money(tier.maxIncome) }
    }
  }
  return { name: name, amount: 0, status: 'no', reason: 'Income is above every band' }
}

// CPF Housing Grant: first-timers, fixed amount by flat size, has an income ceiling
export function cpfHousingGrant(inputs, totals, type) {
  const name = 'CPF Housing Grant'

  if (type === 'second') {
    return { name: name, amount: 0, status: 'no', reason: 'Only for first-timers' }
  }
  // No rule for this mix of buyers
  if (type === 'other') {
    return { name: name, amount: 0, status: 'unknown', reason: 'No rule for this mix of buyers yet' }
  }

  const ceiling = CPF_HOUSING_GRANT_INCOME_CEILING[type]
  if (totals.income > ceiling) {
    return { name: name, amount: 0, status: 'no', reason: 'Household income is above ' + money(ceiling) }
  }

  // Singles only get it for flats up to 5-room (not EXECUTIVE)
  if (type === 'single' && !CPF_HOUSING_GRANT_SINGLE_FLAT_TYPES.includes(inputs.flatType)) {
    return { name: name, amount: 0, status: 'no', reason: 'Singles: up to 5-room flats only' }
  }

  // Bigger flats get a smaller grant
  let amount = 0
  if (UP_TO_4_ROOM_FLAT_TYPES.includes(inputs.flatType)) {
    amount = CPF_HOUSING_GRANT[type].upTo4Room
  } else {
    amount = CPF_HOUSING_GRANT[type].room5OrBigger
  }
  return { name: name, amount: amount, status: 'yes', reason: 'First-timer, income within ceiling' }
}

// Proximity Housing Grant (PHG): live with / near (within 4 km of) parents or child.
// No income ceiling, and second-timers can get it too.
export function proximityHousingGrant(inputs) {
  const name = 'Proximity Housing Grant (PHG)'

  // Couples get the family amount; singles (one or joint) get the singles amount
  let group = 'single'
  if (inputs.buyerType === 'couple') {
    group = 'family'
  }

  if (inputs.phgOption === 'with') {
    return { name: name, amount: PHG_AMOUNT[group].liveWith, status: 'yes', reason: 'Living with parents / child' }
  }

  if (inputs.phgOption === 'near') {
    // Singles living near parents can only get it for a 2- to 5-room flat
    if (group === 'single' && !PHG_SINGLE_NEAR_FLAT_TYPES.includes(inputs.flatType)) {
      return { name: name, amount: 0, status: 'no', reason: 'Singles living near parents: 2- to 5-room only' }
    }
    return { name: name, amount: PHG_AMOUNT[group].liveNear, status: 'yes', reason: 'Living within 4 km of parents / child' }
  }

  return { name: name, amount: 0, status: 'no', reason: 'Not living with or near parents / child' }
}

// All three grants, in the order the results table shows them
export function checkGrants(inputs, totals, type) {
  let ehg = enhancedHousingGrant(inputs, totals, type)
  const cpfGrant = cpfHousingGrant(inputs, totals, type)
  const phg = proximityHousingGrant(inputs)

  // HDB: for a resale flat you must first qualify for the CPF Housing Grant before you can get the EHG.
  // So if the CPF Housing Grant is a clear "no", the EHG is "no" too.
  if (cpfGrant.status === 'no' && ehg.status === 'yes') {
    ehg = { name: ehg.name, amount: 0, status: 'no', reason: 'Must qualify for the CPF Housing Grant first' }
  }

  return [ehg, cpfGrant, phg]
}

// --- Buyer's stamp duty ---

// Stamp duty for a home at this price, one slice at a time (tiers in affordabilityRules.js).
// price = 682000 -> 1% of 180,000 + 2% of 180,000 + 3% of 322,000 = 15,060
export function buyersStampDuty(price) {
  let duty = 0
  let left = price

  for (const tier of BSD_TIERS) {
    if (left <= 0) {
      break
    }
    // This tier taxes its slice, or whatever is left if that is smaller (null = no limit)
    let part = left
    if (tier.slice !== null && tier.slice < left) {
      part = tier.slice
    }
    duty = duty + (part * tier.ratePercent) / 100
    left = left - part
  }
  return duty
}

// --- Max budget --

// Share of the price you must pay yourself: 100% - 75% loan = 25%
const OWN_SHARE = (100 - HDB_LOAN_LTV_PERCENT) / 100

// Can the household buy a flat at this price, once the stamp duty is paid?
//   ownMoney = savings + grants, savings = CPF + cash.
//   Stamp duty must come from savings: HDB says grants can only "Offset the purchase price of the flat"
//   or "Reduce the housing loan".
function priceFits(price, ownMoney, savings, maxLoanByIncome) {
  const stampDuty = buyersStampDuty(price)
  if (stampDuty > savings) {
    return false
  }
  const moneyForFlat = ownMoney - stampDuty
  // Loan-to-Value: your own money must cover 25% of the price
  if (price * OWN_SHARE > moneyForFlat) {
    return false
  }
  // Income: the loan you need must not be bigger than your income allows
  if (price - moneyForFlat > maxLoanByIncome) {
    return false
  }
  return true
}

// Works out the most the household can pay for a resale flat with an HDB loan.
// Returns everything the wizard shows:
// { totals, type, grants, grantsTotal, maxBudget, loan, monthlyRepayment,
//   fromGrants, fromCpf, fromCash, maxLoanByIncome, loanAllowed, limitedBy, hasUnknownGrant }
export function calculateBudget(inputs) {
  // Step 1: the household and its grants
  const totals = householdTotals(inputs.owners)
  const type = householdType(inputs.buyerType, totals)
  const grants = checkGrants(inputs, totals, type)

  let grantsTotal = 0
  let hasUnknownGrant = false
  for (const grant of grants) {
    grantsTotal = grantsTotal + grant.amount
    if (grant.status === 'unknown') {
      hasUnknownGrant = true
    }
  }

  // Step 2: the money the household already has (savings + grants)
  const ownMoney = totals.cash + totals.cpf + grantsTotal

  // Step 3: the biggest loan the income allows.
  // MSR: the monthly repayment can be at most 30% of income.
  // HDB checks this at its 3% "floor" rate, not the 2.6% you actually pay.
  let loanGroup = 'family'
  if (inputs.buyerType === 'single') {
    loanGroup = 'single'
  } else if (inputs.buyerType === 'joint') {
    loanGroup = 'joint'
  }

  let loanAllowed = true
  let maxLoanByIncome = 0
  if (totals.income > HDB_LOAN_INCOME_CEILING[loanGroup]) {
    // Above the ceiling: no HDB loan (a bank loan has different rules, not built yet)
    loanAllowed = false
  } else {
    const maxPayment = (totals.income * MSR_PERCENT) / 100
    maxLoanByIncome = loanForRepayment(maxPayment, HDB_LOAN_ASSESSMENT_RATE, inputs.loanYears)
  }

  // Step 4: two limits on the price.
  //  (a) Loan-to-Value: the loan is at most 75% of the price, so your own money must cover 25%.
  //      price x 25% <= ownMoney   ->   price <= ownMoney / 25%
  //  (b) Income: price <= ownMoney + the biggest loan your income allows
  // Start from the lower of the two, rounded down to the nearest $1,000.
  let maxBudget = ownMoney / OWN_SHARE
  if (ownMoney + maxLoanByIncome < maxBudget) {
    maxBudget = ownMoney + maxLoanByIncome
  }
  maxBudget = Math.floor(maxBudget / 1000) * 1000

  // Stamp duty is paid from your own money too, so that price may not fit any more.
  // Lower it $1,000 at a time until price + stamp duty fits.
  while (maxBudget > 0 && !priceFits(maxBudget, ownMoney, totals.cpf + totals.cash, maxLoanByIncome)) {
    maxBudget = maxBudget - 1000
  }

  // What is left for the flat after the stamp duty, and which limit stopped the price
  const stampDuty = buyersStampDuty(maxBudget)
  const moneyForFlat = ownMoney - stampDuty
  let limitedBy = 'income'
  if (moneyForFlat / OWN_SHARE < moneyForFlat + maxLoanByIncome) {
    limitedBy = 'savings'
  }

  // Step 5: how the budget is paid for. Loan first, then grants, then CPF, then cash.
  // (The stamp duty comes on top, from your CPF / cash.)
  let loan = maxBudget - moneyForFlat
  if (loan < 0) {
    loan = 0
  }
  let stillToPay = maxBudget - loan

  const fromGrants = Math.min(grantsTotal, stillToPay)
  stillToPay = stillToPay - fromGrants

  const fromCpf = Math.min(totals.cpf, stillToPay)
  stillToPay = stillToPay - fromCpf

  const fromCash = stillToPay

  // Step 6: the real monthly repayment, at the rate HDB actually charges
  const repayment = monthlyRepayment(loan, HDB_LOAN_INTEREST_RATE, inputs.loanYears)

  return {
    totals: totals,
    type: type,
    grants: grants,
    grantsTotal: grantsTotal,
    hasUnknownGrant: hasUnknownGrant,
    maxBudget: maxBudget,
    loan: Math.round(loan),
    monthlyRepayment: Math.round(repayment),
    fromGrants: Math.round(fromGrants),
    fromCpf: Math.round(fromCpf),
    fromCash: Math.round(fromCash),
    stampDuty: Math.round(stampDuty),
    maxLoanByIncome: Math.round(maxLoanByIncome),
    loanAllowed: loanAllowed,
    limitedBy: limitedBy,
  }
}
