// OneMap (Singapore Land Authority) APIs, called directly from the browser.
// Docs: https://www.onemap.gov.sg/apidocs/

const SEARCH_URL = 'https://www.onemap.gov.sg/api/common/elastic/search';
const STATIC_MAP_URL = 'https://www.onemap.gov.sg/api/staticmap/getStaticImage';

export class OneMapBusyError extends Error {}

// Live address / postal code search. Returns [{ label, block, road, postal, lat, lng }].
export async function searchAddress(query, { signal } = {}) {
  const url = new URL(SEARCH_URL);
  url.search = new URLSearchParams({ searchVal: query, returnGeom: 'Y', getAddrDetails: 'Y', pageNum: '1' });
  const res = await fetch(url, { signal });
  if (res.status === 429) throw new OneMapBusyError('OneMap is busy - wait a moment and try again');
  if (!res.ok) throw new Error(`OneMap search failed (${res.status})`);
  const { results = [] } = await res.json();
  return results.map((r) => ({
    label: r.ADDRESS,
    building: r.BUILDING !== 'NIL' ? r.BUILDING : '',
    block: r.BLK_NO !== 'NIL' ? r.BLK_NO : '',
    road: r.ROAD_NAME,
    postal: r.POSTAL !== 'NIL' ? r.POSTAL : '',
    lat: Number(r.LATITUDE),
    lng: Number(r.LONGITUDE),
  }));
}

// Map snapshot centred on a block, with a marker. OneMap allows up to 512x512.
export function staticMapUrl(lat, lng, { width = 512, height = 256, zoom = 17 } = {}) {
  const url = new URL(STATIC_MAP_URL);
  url.search = new URLSearchParams({
    layerchosen: 'default',
    latitude: lat,
    longitude: lng,
    zoom,
    width,
    height,
    points: `[${lat},${lng},"15,118,110"]`,
  });
  return url.toString();
}
