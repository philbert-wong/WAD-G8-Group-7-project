import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../server/app.js';
import { Shortlist } from '../server/models/Shortlist.js';
import { getToken, loadTestData, startTestDb, stopTestDb } from './helpers.js';

const app = createApp();
let mongo;
let data;
let token;

function auth(req) {
  return req.set('Authorization', 'Bearer ' + token);
}

beforeAll(async () => {
  mongo = await startTestDb();
  data = await loadTestData();
  token = await getToken();
});



afterAll(() => stopTestDb(mongo));

beforeEach(() => Shortlist.deleteMany({}));

describe('/api/shortlist', () => {
  it('rejects a request with no token', async () => {
    const res = await request(app).get('/api/shortlist');
    expect(res.status).toBe(401);
  });

  it('starts empty', async () => {
    const res = await auth(request(app).get('/api/shortlist'));
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('creates an item (POST)', async () => {
    const res = await auth(request(app).post('/api/shortlist')).send({ blockId: data.punggol._id, note: 'near MRT' });
    expect(res.status).toBe(201);
    expect(res.body.note).toBe('near MRT');
    expect(res.body.block.town).toBe('PUNGGOL');
  });

  it('reads the items back with their block (GET)', async () => {
    await auth(request(app).post('/api/shortlist')).send({ blockId: data.punggol._id });
    const res = await auth(request(app).get('/api/shortlist'));
    expect(res.body).toHaveLength(1);
    expect(res.body[0].block.street).toBe('SUMANG LANE');
  });

  it('updates the note (PATCH)', async () => {
    const created = await auth(request(app).post('/api/shortlist')).send({ blockId: data.bedok._id });
    const res = await auth(request(app).patch(`/api/shortlist/${created.body.id}`)).send({ note: 'viewed Sunday' });
    expect(res.status).toBe(200);
    expect(res.body.note).toBe('viewed Sunday');
  });

  it('deletes an item (DELETE)', async () => {
    const created = await auth(request(app).post('/api/shortlist')).send({ blockId: data.bedok._id });
    const res = await auth(request(app).delete(`/api/shortlist/${created.body.id}`));
    expect(res.status).toBe(204);
    const list = await auth(request(app).get('/api/shortlist'));
    expect(list.body).toEqual([]);
  });

  it('does not save the same block twice', async () => {
    await auth(request(app).post('/api/shortlist')).send({ blockId: data.punggol._id });
    const res = await auth(request(app).post('/api/shortlist')).send({ blockId: data.punggol._id });
    expect(res.status).toBe(409);
  });

  it('needs a blockId', async () => {
    const res = await auth(request(app).post('/api/shortlist')).send({});
    expect(res.status).toBe(400);
  });

  it('404s for a block that does not exist', async () => {
    const res = await auth(request(app).post('/api/shortlist')).send({ blockId: '64b64b64b64b64b64b64b64b' });
    expect(res.status).toBe(404);
  });

  it('404s when updating or deleting something that is not there', async () => {
    const id = '64b64b64b64b64b64b64b64b';
    expect((await auth(request(app).patch(`/api/shortlist/${id}`)).send({ note: 'x' })).status).toBe(404);
    expect((await auth(request(app).delete(`/api/shortlist/${id}`))).status).toBe(404);
  });

  it('rejects a note that is too long', async () => {
    const created = await auth(request(app).post('/api/shortlist')).send({ blockId: data.punggol._id });
    const res = await auth(request(app).patch(`/api/shortlist/${created.body.id}`)).send({ note: 'x'.repeat(501) });
    expect(res.status).toBe(400);
  });
});
