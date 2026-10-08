const sgd = new Intl.NumberFormat('en-SG', { style: 'currency', currency: 'SGD', maximumFractionDigits: 0 });
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const money = (n) => (n == null ? '-' : sgd.format(n));

export const compactMoney = (n) => {
  if (n == null) return '-';
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e3) return `$${Math.round(n / 1e3)}k`;
  return `$${Math.round(n)}`;
};

export const signedMoney = (n) => `${n >= 0 ? '+' : '-'}${money(Math.abs(n))}`;

// "2026-03" -> "Mar 2026"
export const monthLabel = (month) => {
  const [y, m] = month.split('-').map(Number);
  return `${MONTHS[m - 1]} ${y}`;
};

// "ANG MO KIO AVE 10" -> "Ang Mo Kio Ave 10"
export const titleCase = (text = '') =>
  text.toLowerCase().replace(/(^|[\s/(-])([a-z])/g, (_, sep, ch) => sep + ch.toUpperCase());

export const flatTypeLabel = (flatType) => titleCase(flatType).replace('Multi-generation', 'Multi-Gen');
