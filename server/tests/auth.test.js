import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { Shortlist } from '../models/shortlist-model.js';
import { getToken, loadTestData, startTestDb, stopTestDb } from './helpers.js';

const app = createApp();
let mongo;

beforeAll(async () => {
  mongo = await startTestDb();
});

afterAll(() => stopTestDb(mongo));


describe('/api/auth', () => {
  it('registers a user and returns a token', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'new@example.com', password: 'password123' });

    expect(res.status).toBe(201);
    expect(typeof res.body.token).toBe('string');
    expect(res.body.user.email).toBe('new@example.com');
    expect(res.body.user.passwordHash).toBeUndefined();
  });


 it('rejects a duplicate email', async () => {
    const body = { email: 'dup@example.com', password: 'password123' };
    await request(app).post('/api/auth/register').send(body);
    const res = await request(app).post('/api/auth/register').send(body);

    expect(res.status).toBe(409);
  });

  it('rejects a short password', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'short@example.com', password: '123' });

    expect(res.status).toBe(400);
  });

  it('logs in with the right password', async () => {
    const body = { email: 'login@example.com', password: 'password123' };
    await request(app).post('/api/auth/register').send(body);
    const res = await request(app).post('/api/auth/login').send(body);

    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe('string');
  });

  it('rejects a wrong password', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ email: 'wrong@example.com', password: 'password123' });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'wrong@example.com', password: 'not-the-password' });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Wrong email or password');
});
});
