/**
 * Turns the five government amenity datasets into one shape:
 *   { type, name, lat, lng }
 * Each dataset is formatted differently, which is exactly why this is a file of
 * pure functions that tests can feed small fixtures. OWNER: Data pipeline & QA
 */

// Anything outside this box isn't Singapore — a bad coordinate would otherwise
// quietly become "the nearest park" for a block on the other side of the island.
const SG = { minLat: 1.15, maxLat: 1.48, minLng: 103.6, maxLng: 104.1 };
const inSingapore = (lat, lng) =>
  lat >= SG.minLat && lat <= SG.maxLat && lng >= SG.minLng && lng <= SG.maxLng;

const clean = (s) => String(s ?? "").replace(/\s+/g, " ").trim();

/** Pull the <th>name</th><td>value</td> pairs out of the HTML table in a KML description. */
export function htmlAttributes(html) {
  const out = {};
  for (const m of String(html ?? "").matchAll(/<th>([^<]+)<\/th>\s*<td>([^<]*)<\/td>/g)) {
    out[m[1].trim()] = clean(m[2]);
  }
  return out;
}

/** Every Point feature in a GeoJSON file with usable coordinates, as { lat, lng, props }. */
export function pointFeatures(geojson) {
  const out = [];
  for (const f of geojson?.features ?? []) {
    if (f.geometry?.type !== "Point") continue;
    const [lng, lat] = f.geometry.coordinates ?? [];
    if (Number.isFinite(lat) && Number.isFinite(lng) && inSingapore(lat, lng)) {
      out.push({ lat, lng, props: f.properties ?? {} });
    }
  }
  return out;
}

const keep = (type, rows) => rows.filter((r) => r.name).map((r) => ({ type, ...r }));

/** NEA hawker centres — skips ones still under construction. */
export function parseHawkers(geojson) {
  return keep("hawker", pointFeatures(geojson)
    .filter((f) => !/construction/i.test(f.props.STATUS ?? ""))
    .map((f) => ({ name: clean(f.props.NAME), lat: f.lat, lng: f.lng })));
}

/** NParks parks and park connectors. */
export function parseParks(geojson) {
  return keep("park", pointFeatures(geojson).map((f) => ({ name: clean(f.props.NAME), lat: f.lat, lng: f.lng })));
}

/** MOH CHAS clinics — the details are in an HTML table inside `Description`. */
export function parseClinics(geojson) {
  return keep("healthcare", pointFeatures(geojson).map((f) => ({
    name: htmlAttributes(f.props.Description).HCI_NAME, lat: f.lat, lng: f.lng,
  })));
}

/** Eldercare services — same HTML-table format as the clinics. */
export function parseEldercare(geojson) {
  return keep("eldercare", pointFeatures(geojson).map((f) => ({
    name: htmlAttributes(f.props.Description).NAME, lat: f.lat, lng: f.lng,
  })));
}

/**
 * The file stores postal codes as numbers, so 088256 arrives as "88256". Put the
 * zero back — but only on a real code: a blank must stay blank, not become 000000.
 */
function fixPostal(value) {
  const p = clean(value);
  return /^\d{1,5}$/.test(p) ? p.padStart(6, "0") : p;
}

/**
 * MOE schools come as a CSV with a postal code and NO coordinates. This keeps
 * the schools that take P1 pupils — "PRIMARY" and the mixed-level "(P1-S4)"
 * schools — and returns what the script needs to geocode them.
 */
export function primarySchools(rows) {
  return rows
    .filter((r) => /PRIMARY|\bP1\b/i.test(r.mainlevel_code ?? ""))
    .map((r) => ({ name: clean(r.school_name), postal: fixPostal(r.postal_code) }))
    .filter((r) => r.name && /^\d{6}$/.test(r.postal));
}
