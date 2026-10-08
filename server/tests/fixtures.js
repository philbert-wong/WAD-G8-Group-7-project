import { parseResaleRow } from '../src/lib/resale.js';

// A handful of data.gov.sg-shaped rows covering two towns, three flat types and old/new leases.
const row = (month, town, flat_type, block, street_name, storey_range, floor_area_sqm, lease_commence_date, remaining_lease, resale_price) => ({
  month, town, flat_type, block, street_name, storey_range, floor_area_sqm,
  flat_model: 'Model A', lease_commence_date, remaining_lease, resale_price,
});

export const csvRows = [
  row('2024-01', 'ANG MO KIO', '3 ROOM', '406', 'ANG MO KIO AVE 10', '10 TO 12', '67', '1979', '54 years 03 months', '330000'),
  row('2026-03', 'ANG MO KIO', '3 ROOM', '406', 'ANG MO KIO AVE 10', '04 TO 06', '67', '1979', '52 years 01 month', '350000'),
  row('2026-05', 'ANG MO KIO', '3 ROOM', '406', 'ANG MO KIO AVE 10', '07 TO 09', '67', '1979', '51 years 11 months', '370000'),
  row('2026-06', 'ANG MO KIO', '4 ROOM', '406', 'ANG MO KIO AVE 10', '07 TO 09', '92', '1979', '51 years 10 months', '520000'),
  row('2026-04', 'ANG MO KIO', '4 ROOM', '407', 'ANG MO KIO AVE 10', '01 TO 03', '92', '1980', '52 years 11 months', '480000'),
  row('2019-02', 'ANG MO KIO', '5 ROOM', '560', 'ANG MO KIO AVE 10', '13 TO 15', '120', '1980', '60 years 01 month', '600000'),
  row('2026-06', 'PUNGGOL', '4 ROOM', '233C', 'SUMANG LANE', '10 TO 12', '93', '2018', '90 years 06 months', '650000'),
  row('2026-02', 'PUNGGOL', '4 ROOM', '233C', 'SUMANG LANE', '13 TO 15', '93', '2018', '90 years 10 months', '670000'),
  row('2026-01', 'PUNGGOL', '5 ROOM', '227B', 'SUMANG LANE', '04 TO 06', '112', '2018', '90 years 11 months', '720000'),
];

export const transactions = csvRows.map(parseResaleRow);
