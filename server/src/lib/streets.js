// HDB's resale data abbreviates street names ("ANG MO KIO AVE 10") but OneMap spells them
// out ("ANG MO KIO AVENUE 10"). Both sides are expanded to the same key so they can be matched.
const ABBREVIATIONS = {
  AVE: 'AVENUE',
  ST: 'STREET',
  'ST.': 'SAINT',
  RD: 'ROAD',
  DR: 'DRIVE',
  CRES: 'CRESCENT',
  CL: 'CLOSE',
  CTRL: 'CENTRAL',
  NTH: 'NORTH',
  STH: 'SOUTH',
  UPP: 'UPPER',
  LOR: 'LORONG',
  TER: 'TERRACE',
  PL: 'PLACE',
  PK: 'PARK',
  GDNS: 'GARDENS',
  HTS: 'HEIGHTS',
  BT: 'BUKIT',
  JLN: 'JALAN',
  KG: 'KAMPONG',
  TG: 'TANJONG',
  "C'WEALTH": 'COMMONWEALTH',
  MKT: 'MARKET',
  CTR: 'CENTRE',
  SQ: 'SQUARE',
};

export function streetKey(name = '') {
  return name
    .toUpperCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => ABBREVIATIONS[word] ?? word)
    .join(' ')
    .replace(/[^A-Z0-9 ]/g, '');
}

export function blockIdFor(block, street) {
  return `${block}-${street}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
