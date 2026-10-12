// HDB leases are 99 years long.
const LEASE_YEARS = 99;

// A block that started its lease in 1990 has 99 - (2026 - 1990) = 63 years left in 2026.
export function remainingLease(leaseCommenceYear) {
  const thisYear = new Date().getFullYear();
  return LEASE_YEARS - (thisYear - leaseCommenceYear);
}

// Used by the filter: "at least 60 years left" means "lease must have started in this year or later".
export function earliestCommenceYear(minLease) {
  const thisYear = new Date().getFullYear();
  return thisYear - LEASE_YEARS + minLease;
}
