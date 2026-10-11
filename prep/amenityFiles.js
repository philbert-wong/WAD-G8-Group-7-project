// Downloads the government datasets once and turns them into simple { category, name, lat, lng } rows.
import { parse } from 'csv-parse/sync';

const BULK = 'https://api-open.data.gov.sg/v1/public/api/datasets';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const DATASETS = {
  hawker: 'd_4a086da0a5553be1d89383cd90d07ecd', // NEA hawker centres (GeoJSON)
  park: 'd_0542d48f0991541706b58059381a6eca', // NParks parks (GeoJSON)
  school: 'd_688b934f82c1059ed0a6993d2a829089', // MOE schools (CSV, postal codes only)
};

// data.gov.sg makes a download in two steps: ask for it, then wait until a link is ready.
// It rejects fast repeat requests, so we retry slowly.
export async function downloadDataset(id) {
  for (let attempt = 1; attempt <= 6; attempt++) {
    try {
      const start = await fetch(`${BULK}/${id}/initiate-download`);
      if (!start.ok) throw new Error(`initiate-download ${start.status}`);

      for (let poll = 0; poll < 20; poll++) {
        await sleep(3000);
        const check = await fetch(`${BULK}/${id}/poll-download`);
        if (!check.ok) throw new Error(`poll-download ${check.status}`);
        const url = (await check.json())?.data?.url;
        if (url) {
          const file = await fetch(url);
          if (!file.ok) throw new Error(`file ${file.status}`);
          return await file.text();
        }
      }
      throw new Error('download never became ready');
    } catch (err) {
      if (attempt === 6) throw err;
      console.log(`  ${err.message}; waiting before retry ${attempt}/5`);
      await sleep(12000);
    }
  }
}

const tidy = (text) => String(text ?? '').replace(/\s+/g, ' ').trim();

// Some files hide the name inside an HTML table in "Description"
function nameOf(properties) {
  if (properties.NAME) return tidy(properties.NAME);
  const match = /<th>NAME<\/th>\s*<td>([^<]*)<\/td>/.exec(properties.Description ?? '');
  return match ? tidy(match[1]) : '';
}

// GeoJSON file -> [{ category, name, lat, lng }]
export function parsePoints(geojsonText, category) {
  const rows = [];
  for (const feature of JSON.parse(geojsonText).features ?? []) {
    if (feature.geometry?.type !== 'Point') continue;
    const [lng, lat] = feature.geometry.coordinates;
    const name = nameOf(feature.properties ?? {});
    if (name && Number.isFinite(lat) && Number.isFinite(lng)) {
      rows.push({ category, name, lat, lng });
    }
  }
  return rows;
}

// School CSV -> [{ name, postal }] for primary schools only
export function parseSchools(csvText) {
  return parse(csvText, { columns: true, skip_empty_lines: true })
    .filter((row) => /PRIMARY|\bP1\b/i.test(row.mainlevel_code ?? ''))
    .map((row) => ({
      name: tidy(row.school_name),
      postal: tidy(row.postal_code).padStart(6, '0'), // 88256 -> 088256
    }))
    .filter((school) => school.name && /^\d{6}$/.test(school.postal));
}
