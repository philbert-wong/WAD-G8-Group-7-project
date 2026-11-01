// AFFORDABILITY RULES: every grant amount, income ceiling and loan number used by my part, in ONE place.
//
// These numbers change (e.g. income ceilings went up in Aug 2026), so each one says where it came from
// and when it was checked. Before the demo, open each source and tick it off.
//
//   ✅ = read on an official page (HDB / CPF / MAS)
//   ⚠️ VERIFY = only found on a non-official site, or the official page did not show it clearly
//   ❌ = not found anywhere, so it is left out; the calculator skips it
//
// All checked on 23 Oct 2026.
//
// Household types used below (same as the calculator's "Buying as"):
//   family = couple / family, ALL first-timers
//   single = one single buyer (Single Singapore Citizen scheme, 35 or older)
//   joint  = 2 to 4 singles buying together (Joint Singles Scheme)
//   mixed  = couple where one is a first-timer and the other a second-timer

// ---------- Sources ----------
// [CPF-GUIDE]  CPF Board, "A guide to Enhanced CPF Housing Grant and Proximity Housing Grant"
//              https://www.cpf.gov.sg/member/infohub/educational-resources/a-guide-to-enhanced-cpf-housing-and-proximity-grant
//              (page says last updated 25 Mar 2026, i.e. BEFORE the Aug 2026 income ceiling change)
// [HDB-2026]   HDB, "Increase in income ceilings and greater support for families with children", Annex A
//              https://www.hdb.gov.sg/-/media/hdb-pulse/news/2026/increase-in-income-ceilings-and-greater-support-for-families-with-children/Annex-A.pdf
//              (announced at National Day Rally 2026; news sites say it applies to HFE letters from 24 Aug 2026)
// [MAS-LOANS]  MAS, "Rules for New Housing Loans"
//              https://www.mas.gov.sg/regulation/explainers/new-housing-loans
// [CPF-LOAN]   CPF Board, "3 differences between HDB loan and bank loan"
//              https://www.cpf.gov.sg/member/infohub/educational-resources/3-differences-between-hdb-loan-and-bank-loan
// [HDB-AR2025] HDB Annual Report 2024/2025
//              https://www.hdb.gov.sg/-/media/hdb-pulse/reports/annual-reports-and-financial-statements/HDB_AR2025.pdf
// [HDB-2022]   HDB press release, property measures, 29 Sep 2022
//              https://www.hdb.gov.sg/about-us/news-and-publications/press-releases/29092022-propertymeasures2022
// [YUJIA-EHG]  The EHG band table from Yujia's CPFCalView.vue (CPFCal branch). Matches OhMyHome's table
//              https://ohmyhome.com/en-sg/blog/a-quick-guide-to-enhanced-cpf-housing-grant/ (NOT official),
//              but other sites show different amounts for the middle bands.
// [PG-2026]    PropertyGuru, "HDB resale grants in 2026: How much can you actually get?" (NOT official)
//              https://www.propertyguru.com.sg/property-guides/hdb-resale-grants-2026-how-much-can-you-get-pjx-98578

// ---------- HDB housing loan ----------

// ✅ [CPF-LOAN] HDB loan interest rate, % per year ("currently fixed at 2.6%", reviewed every quarter)
export const HDB_LOAN_INTEREST_RATE = 2.6

// ⚠️ VERIFY [HDB-2022] HDB works out how much you can borrow using a 3% "floor" rate,
// even though you are charged 2.6%. (Seen in a search summary of the press release, page not opened.)
export const HDB_LOAN_ASSESSMENT_RATE = 3.0

// ✅ [HDB-AR2025] Loan-to-Value limit for HDB loans: you can borrow at most 75% of the price
// ("lowered ... by 5 percentage points from 80% to 75%")
export const HDB_LOAN_LTV_PERCENT = 75

// ✅ [MAS-LOANS] Mortgage Servicing Ratio: at most 30% of gross monthly income on the monthly repayment
export const MSR_PERCENT = 30

// ⚠️ VERIFY [MAS-LOANS] says "30 years for HDB flats". That is the MAS rule for any loan on an HDB flat;
// check whether HDB's OWN loan has a shorter maximum and change this if so.
export const MAX_LOAN_YEARS = 30

// ✅ [HDB-2026] Income ceiling (average gross monthly household income) to get an HDB loan, after Aug 2026
export const HDB_LOAN_INCOME_CEILING = {
  family: 16000,
  mixed: 16000, // a couple, so the family ceiling
  single: 8000, // Single Singapore Citizen scheme
  joint: 16000, // Joint Singles Scheme
}

// ---------- Grants ----------

// ✅ [HDB-2026] Income ceiling for the CPF Housing Grant on a resale flat, after Aug 2026
export const CPF_HOUSING_GRANT_INCOME_CEILING = {
  family: 16000,
  single: 8000, // Single Singapore Citizen, up to a 5-room resale flat
  joint: 16000, // Joint Singles Scheme
}

// ⚠️ VERIFY [PG-2026] CPF Housing Grant for first-timers buying a resale flat (amount depends on flat size).
// Only found on non-official sites. Check on hdb.gov.sg or the HFE letter page.
// ⚠️ VERIFY: can a single get this grant for an EXECUTIVE flat at all? [HDB-2026] says the singles
// ceiling is "for the purchase of up to a 5-room resale flat". For now singles get room5OrBigger.
// ❌ Amounts for "mixed" couples and "joint" singles were not found anywhere, so they are left out.
// The calculator shows "not counted yet" for them instead of guessing.
export const CPF_HOUSING_GRANT = {
  family: { upTo4Room: 80000, room5OrBigger: 50000 },
  single: { upTo4Room: 40000, room5OrBigger: 25000 },
}

// ✅ [CPF-GUIDE] Enhanced CPF Housing Grant (EHG): highest amount, and income ceiling
// ⚠️ VERIFY the ceiling: the CPF page is from Mar 2026. News sites say the EHG ceiling stayed at $9,000
// after the Aug 2026 change, but I could not confirm it on an official page.
export const EHG_MAX_AMOUNT = {
  family: 120000,
  single: 60000,
}
export const EHG_INCOME_CEILING = {
  family: 9000,
  single: 4500,
  joint: 9000, // ✅ [CPF-GUIDE] "$9,000 if buying with other singles"
  mixed: 4500, // ✅ [CPF-GUIDE] first-timer + second-timer: "the ceiling is halved ... must not exceed $4,500"
}

// ✅ [CPF-GUIDE] EHG needs "at least one" applicant employed continuously for 12 months before applying
export const EHG_MONTHS_EMPLOYED = 12

// ⚠️ VERIFY [YUJIA-EHG] EHG amount by average gross monthly household income, lowest income first.
// The amount goes DOWN as income goes UP. The singles table is exactly half the family table.
// Check every row on hdb.gov.sg: other non-official sites show different middle bands.
// (If a list is emptied, the calculator shows "EHG: not counted yet" instead of guessing.)
//   family = used for couples/families AND joint singles ([CPF-GUIDE]: 2 first-timer singles
//            together "may be eligible for up to $120,000"; ⚠️ VERIFY for 3 or 4 singles)
//   single = used for one single AND for mixed couples (⚠️ VERIFY: [CPF-GUIDE] only gives the mixed
//            couple's $4,500 ceiling; using the singles table for them is Yujia's rule, not confirmed)
export const EHG_TIERS = {
  family: [
    { maxIncome: 1500, amount: 120000 },
    { maxIncome: 2000, amount: 110000 },
    { maxIncome: 2500, amount: 105000 },
    { maxIncome: 3000, amount: 95000 },
    { maxIncome: 3500, amount: 90000 },
    { maxIncome: 4000, amount: 80000 },
    { maxIncome: 4500, amount: 70000 },
    { maxIncome: 5000, amount: 65000 },
    { maxIncome: 5500, amount: 55000 },
    { maxIncome: 6000, amount: 50000 },
    { maxIncome: 6500, amount: 40000 },
    { maxIncome: 7000, amount: 30000 },
    { maxIncome: 7500, amount: 25000 },
    { maxIncome: 8000, amount: 20000 },
    { maxIncome: 8500, amount: 10000 },
    { maxIncome: 9000, amount: 5000 },
  ],
  single: [
    { maxIncome: 750, amount: 60000 },
    { maxIncome: 1000, amount: 55000 },
    { maxIncome: 1250, amount: 52500 },
    { maxIncome: 1500, amount: 47500 },
    { maxIncome: 1750, amount: 45000 },
    { maxIncome: 2000, amount: 40000 },
    { maxIncome: 2250, amount: 35000 },
    { maxIncome: 2500, amount: 32500 },
    { maxIncome: 2750, amount: 27500 },
    { maxIncome: 3000, amount: 25000 },
    { maxIncome: 3250, amount: 20000 },
    { maxIncome: 3500, amount: 15000 },
    { maxIncome: 3750, amount: 12500 },
    { maxIncome: 4000, amount: 10000 },
    { maxIncome: 4250, amount: 5000 },
    { maxIncome: 4500, amount: 2500 },
  ],
}

// ✅ [CPF-GUIDE] Proximity Housing Grant (PHG). No income ceiling. First-timers AND second-timers can get it.
// Couples (including mixed) use "family"; one single uses "single".
// ⚠️ VERIFY: joint singles also use "single" here; check whether that is right.
export const PHG_AMOUNT = {
  family: { liveWith: 30000, liveNear: 20000 },
  single: { liveWith: 15000, liveNear: 10000 },
}

// ✅ [CPF-GUIDE] "Live near" means within 4 km of parents / child
export const PHG_NEAR_DISTANCE_METRES = 4000

// ✅ [CPF-GUIDE] Singles living NEAR parents only get PHG for a 2- to 5-room resale flat
export const PHG_SINGLE_NEAR_FLAT_TYPES = ['2 ROOM', '3 ROOM', '4 ROOM', '5 ROOM']

// Flat types that count as "up to 4-room" for the CPF Housing Grant (5 ROOM and EXECUTIVE are bigger)
export const UP_TO_4_ROOM_FLAT_TYPES = ['2 ROOM', '3 ROOM', '4 ROOM']
