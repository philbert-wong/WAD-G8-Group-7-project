// AFFORDABILITY RULES: every grant amount, income ceiling and loan number  
//  
//  
// Household types used below (same as the calculator's "Buying as"):  
//   family = couple / family, ALL first-timers  
//   single = one single buyer (Single Singapore Citizen scheme, 35 or older) 
//   joint  = 2 to 4 singles buying together (Joint Singles Scheme) 
//   mixed  = couple where one is a first-timer and the other a second-timer 

// --- Sources ---
// Official sources
// [CPF-GUIDE]    CPF Board, "A guide to Enhanced CPF Housing Grant and Proximity Housing Grant"
//                https://www.cpf.gov.sg/member/infohub/educational-resources/a-guide-to-enhanced-cpf-housing-and-proximity-grant
// [CPF-LOAN]     CPF Board, "3 differences between HDB loan and bank loan"
//                https://www.cpf.gov.sg/member/infohub/educational-resources/3-differences-between-hdb-loan-and-bank-loan
// [HDB-NEWS-2026] HDB, "Increase in income ceilings and greater support for families with children"
//                https://www.hdb.gov.sg/hdb-pulse/news/2026/increase-in-income-ceilings-and-greater-support-for-families-with-children
// [HDB-AR2025]   HDB, "Annual Report 2024/2025"
//                https://www.hdb.gov.sg/-/media/hdb-pulse/reports/annual-reports-and-financial-statements/HDB_AR2025.pdf
// [HDB-CPFHG]    HDB, "CPF Housing Grants for Families Buying Resale Flats"
//                https://www.hdb.gov.sg/buying-a-flat/flat-grant-and-loan-eligibility/couples-and-families/cpf-housing-grants
// [HDB-CPFHG-SIN] HDB, "CPF Housing Grant for Singles Buying Resale Flats"
//                https://www.hdb.gov.sg/buying-a-flat/flat-grant-and-loan-eligibility/singles/cpf-housing-grant
// [HDB-EHG-FAM]  HDB, "Enhanced CPF Housing Grant for Families"
//                https://www.hdb.gov.sg/buying-a-flat/flat-grant-and-loan-eligibility/couples-and-families/enhanced-cpf-housing-grant
// [HDB-EHG-SIN]  HDB, "Enhanced CPF Housing Grant for Singles"
//                https://www.hdb.gov.sg/buying-a-flat/flat-grant-and-loan-eligibility/singles/enhanced-cpf-housing-grant
// [EHG]          HDB, "Enhanced CPF Housing Grant (EHG) amount for first-timer households" (PDF)
//                https://www.hdb.gov.sg/-/media/buying-a-flat/flat-grant-and-loan-eligibility/couples-and-families/enhanced-cpf-housing-grant/EHG-amount-Families.pdf
// [EHG-SIN]      HDB, "Grant amount for single applicant / two or more first-timer singles" (PDF)
//                https://www.hdb.gov.sg/-/media/buying-a-flat/flat-grant-and-loan-eligibility/singles/enhanced-cpf-housing-grant/EHG-amount-Singles-Aug-2024.pdf
// [HDB-PHG-SIN]  HDB, "Proximity Housing Grant for Singles Buying Resale Flats"
//                https://www.hdb.gov.sg/buying-a-flat/flat-grant-and-loan-eligibility/singles/proximity-housing-grant
// [NICE-LOANS]   MyNiceHome (HDB), "Housing Loans for HDB Flat Buyers"
//                https://www.mynicehome.gov.sg/get-started/hdb-loans-guide/
// [NICE-GRANTS]  MyNiceHome (HDB), "CPF Housing Grants for HDB Flat Buyers"
//                https://www.mynicehome.gov.sg/get-started/hdb-grants-guide/
// [SGW-CPFHG]    SupportGoWhere, "CPF Housing Grant"
//                https://supportgowhere.life.gov.sg/schemes/CPF-HG/cpf-housing-grant
// [MAS-LOANS]    MAS, "Rules for New Housing Loans"
//                https://www.mas.gov.sg/regulation/explainers/new-housing-loans
// [MAS-2022]     MAS, "Measures to Promote Sustainable Conditions in the Property Market"
//                https://www.mas.gov.sg/news/media-releases/2022/measures-to-promote-sustainable-conditions-in-the-property-market-by-ensuring-prudent-borrowing-and-moderating-demand
// [IRAS-BSD]     IRAS, "Buyer's Stamp Duty (BSD)"
//                https://www.iras.gov.sg/taxes/stamp-duty/for-property/buying-or-acquiring-property/buyer%27s-stamp-duty-%28bsd%29

// --- HDB housing loan ---

// ✅ [CPF-LOAN] HDB loan interest rate, % per year ("currently fixed at 2.6%", reviewed every quarter)
export const HDB_LOAN_INTEREST_RATE = 2.6

// ✅ [MAS-2022] HDB works out how much you can borrow using a 3% "floor" rate,
// even though you are charged 2.6% ("an interest rate floor of 3% p.a. to compute a borrower's eligible housing loan amount")
export const HDB_LOAN_ASSESSMENT_RATE = 3.0

// ✅ [HDB-AR2025] Loan-to-Value limit for HDB loans: you can borrow at most 75% of the price
export const HDB_LOAN_LTV_PERCENT = 75

// ✅ [MAS-LOANS] Mortgage Servicing Ratio: at most 30% of gross monthly income on the monthly repayment
export const MSR_PERCENT = 30

// ✅ [NICE-LOANS] Longest HDB loan: 25 years
export const MAX_LOAN_YEARS = 25

// ✅ [HDB-NEWS-2026] Income ceiling (average gross monthly household income) to get an HDB loan
export const HDB_LOAN_INCOME_CEILING = {
  family: 16000, // also used for "mixed" couples (see loanGroup in affordability.js)
  single: 8000, // Single Singapore Citizen scheme
  joint: 16000, // Joint Singles Scheme
}

// --- Grants ---

// ✅ [HDB-CPFHG] + [SGW-CPFHG] Income ceiling for the CPF Housing Grant on a resale flat
export const CPF_HOUSING_GRANT_INCOME_CEILING = {
  family: 16000,
  mixed: 16000, // mixed couples get the Family Grant, so the same ceiling
  single: 8000, // Single Singapore Citizen, up to a 5-room resale flat
  joint: 16000, // Joint Singles Scheme
}

// CPF Housing Grant for first-timers buying a resale flat, by flat size
//   family = ✅ [HDB-CPFHG] + [SGW-CPFHG] $80,000 (2- to 4-room), $50,000 (5-room or bigger)
//   mixed  = ✅ [HDB-CPFHG] "First-timer and second-timer couples": $40,000 and $25,000
//   single = ✅ [SGW-CPFHG] $40,000 (2- to 4-room), $25,000 (5-room only, see below)
//   joint  = ✅ [HDB-CPFHG-SIN] "up to 2 Singles Grant applicants": $40,000 each for 2- to 4-room ("a total of
//            $80,000 for 2 singles"), $25,000 each for 5-room or bigger ("a total of $50,000"). Any flat type.
export const CPF_HOUSING_GRANT = {
  family: { upTo4Room: 80000, room5OrBigger: 50000 },
  mixed: { upTo4Room: 40000, room5OrBigger: 25000 },
  single: { upTo4Room: 40000, room5OrBigger: 25000 },
  joint: { upTo4Room: 80000, room5OrBigger: 50000 },
}

// ✅ [NICE-GRANTS] + [SGW-CPFHG] A single gets the CPF Housing Grant only up to a 5-room flat (not EXECUTIVE)
export const CPF_HOUSING_GRANT_SINGLE_FLAT_TYPES = ['2 ROOM', '3 ROOM', '4 ROOM', '5 ROOM']

// ✅ [CPF-GUIDE] + [HDB-EHG-FAM] + [HDB-EHG-SIN] Enhanced CPF Housing Grant (EHG): income ceiling
export const EHG_INCOME_CEILING = {
  family: 9000,
  single: 4500,
  joint: 9000, // "$9,000 if you are buying a flat with other singles"
  // "Half of the average gross monthly household income ... must not exceed $4,500":
  // affordability.js halves a mixed couple's income first, then compares it with this
  mixed: 4500,
}

// ✅ [HDB-EHG-FAM] + [HDB-EHG-SIN] For a RESALE flat, "you must first qualify for the CPF Housing Grants for
// resale flats ... before you may be eligible for the EHG". affordability.js checks this in checkGrants().

// ✅ [HDB-EHG-FAM] + [HDB-EHG-SIN] EHG needs the applicant(s) to have "worked continuously for at least 12 months"
export const EHG_MONTHS_EMPLOYED = 12

// EHG amount by average gross monthly household income, lowest income first (lower income = bigger grant)
//   family = ✅ [EHG] page 1. Also used for joint singles: [HDB-EHG-SIN] "up to 2 singles may each be eligible
//            for an EHG (Singles), i.e., a total of up to $120,000", on the "Income of all persons"
//   single = ✅ [EHG] page 2 for mixed couples (on HALF the household income), and
//            ✅ [EHG-SIN] page 1 for one single on their own income. ([EHG-SIN] page 3, "two or more
//            first-timer singles", is the same as the family table.)
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

// ✅ [CPF-GUIDE] + [NICE-GRANTS] Proximity Housing Grant (PHG). No income ceiling. Second-timers can get it too.
// Couples (including mixed) use "family"; one single uses "single".
// ✅ [HDB-PHG-SIN] Joint singles also use "single" (singles "on their own or with other single citizens").
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

// ---------- Buyer's stamp duty ----------

// ✅ [IRAS-BSD] Buyer's stamp duty on a home, one slice of the price at a time:
// "First $180,000: 1%", "Next $180,000: 2%", "Next $640,000: 3%", "Next $500,000: 4%",
// "Next $1,500,000: 5%", "Remaining amount: 6%". slice = null means "everything that is left".
export const BSD_TIERS = [
  { slice: 180000, ratePercent: 1 },
  { slice: 180000, ratePercent: 2 },
  { slice: 640000, ratePercent: 3 },
  { slice: 500000, ratePercent: 4 },
  { slice: 1500000, ratePercent: 5 },
  { slice: null, ratePercent: 6 },
]
