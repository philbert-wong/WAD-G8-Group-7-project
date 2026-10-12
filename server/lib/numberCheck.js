// Helpers for numbers that arrive in the URL, e.g. ?maxPrice=600000
// (everything in a URL arrives as text at first)

// True when the value was not sent at all, or sent empty (?maxPrice=)
export function isBlank(value) {
  if (value === undefined || value === '') {
    return true;
  }
  return false;
}

// True when the text is a real number: "600000" yes, "abc" no
export function isNumber(value) {
  return Number.isFinite(Number(value));
}
