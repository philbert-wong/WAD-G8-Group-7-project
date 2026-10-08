import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { connectDb, disconnectDb } from '../src/db.js';
import { createApp } from '../src/app.js';
import { Block } from '../src/models/Block.js';
import { RegressionModel } from '../src/models/RegressionModel.js';
import { Shortlist } from '../src/models/Shortlist.js';
import { Transaction } from '../src/models/Transaction.js';
import { buildBlocks } from '../src/lib/resale.js';
import { transactions } from './fixtures.js';

// Keep tests offline and repeatable: never call the real OneMap API.
vi.mock('../src/services/onemap.js', () => ({ ensureGeocoded: async (blocks) => blocks }));

const app = createApp();
let mongo;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await connectDb(mongo.getUri());
  await Transaction.insertMany(transactions);
  await Block.insertMany(buildBlocks(transactions));
});

afterAll(async () => {
  await disconnectDb();
  await mongo.stop();
});

describe('GET /api/blocks', () => {
  const search = (query) => request(app).get('/api/blocks').query(query);

  it('returns one card per block and flat type', async () => {
    const res = await search({});
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(6);
    expect(res.body.results[0]).toHaveProperty('remainingLease');
  });

  it('matches OneMap street spellings and pins the searched block first', async () => {
    const res = await search({ street: 'ANG MO KIO AVENUE 10', block: '407' });
    expect(res.body.total).toBe(4);
    expect(res.body.results[0]).toMatchObject({ block: '407', isSearchedBlock: true });
    expect(res.body.results.every((r) => r.street === 'ANG MO KIO AVE 10')).toBe(true);
  });

  it('filters by flat type, budget and remaining lease', async () => {
    const res = await search({ flatType: '4 ROOM,5 ROOM', maxPrice: 700000, minLease: 80 });
    expect(res.body.results.map((r) => r.blockId)).toEqual(['233c-sumang-lane']);
  });

  it('lists the cheapest first', async () => {
    const res = await search({ town: 'PUNGGOL' });
    const prices = res.body.results.map((r) => r.medianPrice);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
  });

  it('paginates', async () => {
    const res = await search({ pageSize: 2, page: 2 });
    expect(res.body).toMatchObject({ total: 6, page: 2, pageSize: 2 });
    expect(res.body.results).toHaveLength(2);
  });

  it('rejects invalid numbers', async () => {
    expect((await search({ maxPrice: 'cheap' })).status).toBe(400);
    expect((await search({ minLease: 'long' })).status).toBe(400);
  });
});

describe('GET /api/blocks/:id', () => {
  it('returns the block with prices per flat type', async () => {
    const res = await request(app).get('/api/blocks/406-ang-mo-kio-ave-10');
    expect(res.status).toBe(200);
    expect(res.body.flatTypes.map((f) => f.flatType).sort()).toEqual(['3 ROOM', '4 ROOM']);
  });

  it('404s for unknown blocks', async () => {
    expect((await request(app).get('/api/blocks/nope')).status).toBe(404);
  });
});

describe('GET /api/analysis', () => {
  it('returns quarterly medians and the fitted trend line', async () => {
    await RegressionModel.create({
      kind: 'price-trend', town: 'ANG MO KIO', flatType: '3 ROOM', n: 3, r2: 0.9,
      result: {
        intercept: 100000, pricePerYear: 20000,
        coefficients: { t: 20000, remainingLease: 1000, floorArea: 0, storeyMid: 0 },
        featureMeans: { t: 8, remainingLease: 50, floorArea: 67, storeyMid: 8 },
      },
    });
    const res = await request(app).get('/api/analysis/price-trend').query({ town: 'ANG MO KIO', flatType: '3 ROOM' });
    expect(res.status).toBe(200);
    expect(res.body.quarterly.map((q) => q.quarter)).toEqual(['2024 Q1', '2026 Q1', '2026 Q2']);
    // 100000 + 1000*50 + 20000*t
    expect(res.body.fitted[0].price).toBeCloseTo(150000 + 20000 * res.body.fitted[0].t);
  });

  it('returns model: null when no trend model has been fitted', async () => {
    const res = await request(app).get('/api/analysis/price-trend').query({ town: 'PUNGGOL', flatType: '4 ROOM' });
    expect(res.body.model).toBeNull();
    expect(res.body.quarterly.map((q) => q.quarter)).toEqual(['2026 Q1', '2026 Q2']);
  });

  it('requires town and flat type', async () => {
    expect((await request(app).get('/api/analysis/price-trend')).status).toBe(400);
  });

  it('404s for lease decay before models are fitted', async () => {
    expect((await request(app).get('/api/analysis/lease-decay')).status).toBe(404);
  });
});

describe('/api/shortlist CRUD', () => {
  const owner = 'test-owner-0001';
  const as = (id) => ({ 'X-Client-Id': id });
  const add = (body, id = owner) => request(app).post('/api/shortlist').set(as(id)).send(body);

  beforeEach(() => Shortlist.deleteMany({}));

  it('creates, lists, updates and deletes an item', async () => {
    const created = await add({ blockId: '406-ang-mo-kio-ave-10', flatType: '3 ROOM', note: 'near market' });
    expect(created.status).toBe(201);
    expect(created.body.block).toMatchObject({ town: 'ANG MO KIO', medianPrice: 360000 });

    const list = await request(app).get('/api/shortlist').set(as(owner));
    expect(list.body).toHaveLength(1);

    const updated = await request(app).patch(`/api/shortlist/${created.body.id}`).set(as(owner)).send({ note: 'viewed' });
    expect(updated.body.note).toBe('viewed');

    expect((await request(app).delete(`/api/shortlist/${created.body.id}`).set(as(owner))).status).toBe(204);
    expect((await request(app).get('/api/shortlist').set(as(owner))).body).toHaveLength(0);
  });

  it('rejects duplicates and unknown blocks', async () => {
    await add({ blockId: '406-ang-mo-kio-ave-10', flatType: '3 ROOM' });
    expect((await add({ blockId: '406-ang-mo-kio-ave-10', flatType: '3 ROOM' })).status).toBe(409);
    expect((await add({ blockId: '406-ang-mo-kio-ave-10', flatType: 'EXECUTIVE' })).status).toBe(404);
    expect((await add({ flatType: '3 ROOM' })).status).toBe(400);
  });

  it("keeps each owner's shortlist private", async () => {
    const { body } = await add({ blockId: '233c-sumang-lane', flatType: '4 ROOM' });
    expect((await request(app).get('/api/shortlist').set(as('someone-else'))).body).toHaveLength(0);
    expect((await request(app).patch(`/api/shortlist/${body.id}`).set(as('someone-else')).send({ note: 'x' })).status).toBe(404);
    expect((await request(app).delete(`/api/shortlist/${body.id}`).set(as('someone-else'))).status).toBe(404);
  });

  it('requires a client id and validates notes', async () => {
    expect((await request(app).get('/api/shortlist')).status).toBe(400);
    const tooLong = await add({ blockId: '233c-sumang-lane', flatType: '4 ROOM', note: 'x'.repeat(501) });
    expect(tooLong.status).toBe(400);
  });
});
