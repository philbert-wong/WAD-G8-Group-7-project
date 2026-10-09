import axios from 'axios';
import { config } from '../src/config.js';
import { connectDb, disconnectDb } from '../src/db.js';
import { streetKey } from '../src/lib/streets.js';
import { Block } from '../src/models/Block.js';

const needsCoordinates = { location: { $exists: false }, geocodeFailed: { $ne: true } };

async function geocode(block) {
  const response = await axios.get('https://www.onemap.gov.sg/api/common/elastic/search', {
    params: { searchVal: `${block.block} ${block.street}`, returnGeom: 'Y', getAddrDetails: 'Y', pageNum: 1 },
    headers: { Authorization: config.onemapToken },
  });

  const results = response.data.results;
  const match = results.find((r) => r.BLK_NO === block.block && streetKey(r.ROAD_NAME) === streetKey(block.street));

  const update = match
    ? { postal: match.POSTAL, location: { type: 'Point', coordinates: [Number(match.LONGITUDE), Number(match.LATITUDE)] } }
    : { geocodeFailed: true };
  await Block.updateOne({ _id: block._id }, { $set: update });
}

await connectDb();

let skipped = 0; // blocks that hit an error, so we step over them
let blocks = await Block.find(needsCoordinates).skip(skipped).limit(2);

while (blocks.length > 0) {
  await Promise.all(blocks.map(async (block) => {
    try {
      await geocode(block);
    } catch (error) {
      skipped++;
      console.log(`Skipped ${block._id}: ${error.message}`);
    }
  }));

  console.log(`${await Block.countDocuments(needsCoordinates)} blocks left`);
  blocks = await Block.find(needsCoordinates).skip(skipped).limit(4);
}

console.log('Done');
await disconnectDb();

