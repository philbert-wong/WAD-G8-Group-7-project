import { connectDb, disconnectDb } from '../src/db.js';
import { Amenity } from '../src/models/Amenity.js';
import { searchOneMap } from '../src/services/onemap.js';
import axios from 'axios';

await connectDb();

try {
  // list of schools
  const url = 'https://data.gov.sg/api/action/datastore_search?resource_id=d_688b934f82c1059ed0a6993d2a829089&limit=500';
  const response = await axios.get(url);
  const schools = response.data.result.records;

  await Amenity.deleteMany({ category: 'school' });

  let count = 0;
  for (const school of schools) {
    try {
      // coordinates for this postal code
      const results = await searchOneMap(school.postal_code);
      if (results.length === 0) continue;

      const place = results[0];
      await Amenity.create({
        category: 'school',
        name: school.school_name,
        location: { type: 'Point', coordinates: [Number(place.LONGITUDE), Number(place.LATITUDE)] },
      });
      count++;
    } catch (error) {
      console.log(`Skipped ${school.school_name}: ${error.message}`);
    }
  }

  console.log(`school: ${count} saved`);
} catch (error) {
  console.log(`Could not load schools: ${error.message}`);
} finally {
  await disconnectDb();
}
