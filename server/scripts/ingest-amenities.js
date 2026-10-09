import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { connectDb, disconnectDb } from '../src/db.js';
import { Amenity, CATEGORIES } from '../src/models/Amenity.js';

await connectDb();
await Amenity.deleteMany({});

for (const category of CATEGORIES) {
  const file = fileURLToPath(new URL(`../data/${category}.geojson`, import.meta.url));
  if (!existsSync(file)) {
    console.log(`${category}: skipped, ${file} not found`);
    continue;
  }

  const data = JSON.parse(await readFile(file, 'utf8'));
  let count = 0;

  for (const feature of data.features) {
    if (feature.geometry.type !== 'Point') continue;

    const props = feature.properties;
    await Amenity.create({
      category,
      name: props.NAME ?? props.STATION_NA ?? props.Name,
      location: { type: 'Point', coordinates: feature.geometry.coordinates.slice(0, 2) },
    });
    count++;
  }
  console.log(`${category}: ${count} saved`);
}

await disconnectDb();
