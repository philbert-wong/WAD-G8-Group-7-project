import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../server/app.js';
import { loadTestData, startTestDb, stopTestDb } from './helpers.js';

const app = createApp();
let mongo;
let data;

beforeAll(async () => {
  mongo = await startTestDb();
  data = await loadTestData();
});

afterAll(() => stopTestDb(mongo));

describe('GET /api/blocks (search and filter)', () => {
  const search = (query) => request(app).get('/api/blocks').query(query);

  it('returns everything, cheapest first', async () => {
    const res = await search({});
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(3);
    const prices = res.body.results.map((b) => b.price);
    expect(prices).toEqual([360000, 560000, 680000]);
  });

  it('includes the remaining lease on each card', async () => {
    const res = await search({});
    expect(res.body.results[0]).toHaveProperty('remainingLease');
  });

  it('includes the nearest amenity distances on each card (for the match score)', async () => {
    const res = await search({ q: 'punggol' });
    expect(res.body.results[0].distances).toEqual({ school: 900, mrt: 110, hawker: 560, park: 600 });
  });

  it('searches by text', async () => {
    const res = await search({ q: 'punggol' });
    expect(res.body.results.map((b) => b.town)).toEqual(['PUNGGOL']);
  });

  it('filters by flat type', async () => {
    const res = await search({ flatType: '3 ROOM' });
    expect(res.body.results.map((b) => b.town)).toEqual(['BEDOK']);
  });

  it('filters by budget', async () => {
    const res = await search({ maxPrice: 600000 });
    expect(res.body.total).toBe(2);
  });

  it('filters by remaining lease', async () => {
    const res = await search({ minLease: 80 });
    expect(res.body.results.map((b) => b.town)).toEqual(['PUNGGOL']);
  });

  it('filters by walking minutes to MRT', async () => {
    const res = await search({ maxWalk: 5 });
    expect(res.body.results.map((b) => b.town)).toEqual(['PUNGGOL']);
  });

  it('combines filters', async () => {
    const res = await search({ flatType: '4 ROOM', maxPrice: 600000, maxWalk: 10 });
    expect(res.body.results.map((b) => b.town)).toEqual(['ANG MO KIO']);
  });

  it('rejects a value that is not a number', async () => {
    const res = await search({ maxPrice: 'cheap' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/maxPrice/);
  });
});

describe('GET /api/blocks/nearby (geospatial)', () => {
  const nearby = (query) => request(app).get('/api/blocks/nearby').query(query);

  it('needs lat and lng', async () => {
    expect((await nearby({})).status).toBe(400);
  });

  it('finds the closest block first, with a distance', async () => {
    const res = await nearby({ lat: 1.4, lng: 103.9, radius: 5000 });
    expect(res.status).toBe(200);
    expect(res.body.results[0].town).toBe('PUNGGOL');
    expect(res.body.results[0].distance).toBeLessThan(10);
  });

  it('only returns blocks inside the radius', async () => {
    const res = await nearby({ lat: 1.4, lng: 103.9, radius: 500 });
    expect(res.body.total).toBe(1);
  });
});

describe('GET /api/blocks/:id', () => {
  it('returns one block', async () => {
    const res = await request(app).get(`/api/blocks/${data.punggol._id}`);
    expect(res.status).toBe(200);
    expect(res.body.town).toBe('PUNGGOL');
  });

  it('404s for an id that does not exist', async () => {
    const res = await request(app).get('/api/blocks/64b64b64b64b64b64b64b64b');
    expect(res.status).toBe(404);
  });

  it('404s for an id that is not a real id', async () => {
    const res = await request(app).get('/api/blocks/abc');
    expect(res.status).toBe(404);
  });
});

describe('GET /api/blocks/:id/sales', () => {
  it('returns the price range on the card', async () => {
    const res = await request(app).get(`/api/blocks/${data.punggol._id}`);
    expect(res.body.priceLow).toBe(650000);
    expect(res.body.priceHigh).toBe(720000);
    expect(res.body.salesCount).toBe(3);
  });

  it('returns each sale with its price per square metre, plus a summary', async () => {
    const res = await request(app).get(`/api/blocks/${data.punggol._id}/sales`);
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(3);
    expect(res.body.lowest).toBe(650000);
    expect(res.body.highest).toBe(720000);
    expect(res.body.medianPrice).toBe(680000);
    expect(res.body.medianPricePerSqm).toBe(7312); // 680000 / 93

    const newest = res.body.sales[0];
    expect(newest.month).toBe('2026-09');
    expect(newest.storey).toBe('13 TO 15');
    expect(newest.pricePerSqm).toBe(7742); // 720000 / 93
  });

  it('works for a block with no sales stored', async () => {
    const res = await request(app).get(`/api/blocks/${data.bedok._id}/sales`);
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(0);
  });
});

describe('GET /api/blocks/:id/amenities', () => {
  it('returns the nearest amenity of each type with distance', async () => {
    const res = await request(app).get(`/api/blocks/${data.punggol._id}/amenities`);
    expect(res.status).toBe(200);
    const mrt = res.body.amenities.find((a) => a.category === 'mrt');
    expect(mrt.name).toBe('Test MRT');
    expect(mrt.distance).toBeGreaterThan(50);
    expect(mrt.distance).toBeLessThan(200);
  });
});
