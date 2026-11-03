import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { BASE_URL, getToken, startTestDb, stopTestDb } from './helpers.js';

beforeAll(async () => {
  await startTestDb();
});

afterAll(() => stopTestDb());


describe('/api/auth', () => {
  it('registers a user and returns a token', async () => {
    const res = await request(BASE_URL)
      .post('/api/auth/register')
      .send({ email: 'new@example.com', password: 'password123' });

    expect(res.status).toBe(201);
    expect(typeof res.body.token).toBe('string');
    expect(res.body.user.email).toBe('new@example.com');
    expect(res.body.user.passwordHash).toBeUndefined();
  });


 it('rejects a duplicate email', async () => {
    const body = { email: 'dup@example.com', password: 'password123' };
    await request(BASE_URL).post('/api/auth/register').send(body);
    const res = await request(BASE_URL).post('/api/auth/register').send(body);

    expect(res.status).toBe(409);
  });

  it('rejects a short password', async () => {
    const res = await request(BASE_URL)
      .post('/api/auth/register')
      .send({ email: 'short@example.com', password: '123' });

    expect(res.status).toBe(400);
  });

  it('logs in with the right password', async () => {
    const body = { email: 'login@example.com', password: 'password123' };
    await request(BASE_URL).post('/api/auth/register').send(body);
    const res = await request(BASE_URL).post('/api/auth/login').send(body);

    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe('string');
  });

  it('rejects a wrong password', async () => {
    await request(BASE_URL)
      .post('/api/auth/register')
      .send({ email: 'wrong@example.com', password: 'password123' });
    const res = await request(BASE_URL)
      .post('/api/auth/login')
      .send({ email: 'wrong@example.com', password: 'not-the-password' });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Wrong email or password');
});
});

describe('/api/auth/profile', () => {
  it('needs a login', async () => {
    const res = await request(BASE_URL).get('/api/auth/profile');

    expect(res.status).toBe(401);
  });

  it('is null for a new user (so the sign-up popup shows)', async () => {
    const token = await getToken('profile-new@example.com');
    const res = await request(BASE_URL)
      .get('/api/auth/profile')
      .set('Authorization', 'Bearer ' + token);

    expect(res.status).toBe(200);
    expect(res.body.profile).toBeNull();
  });

  it('saves the answers and gives them back', async () => {
    const token = await getToken('profile-save@example.com');
    const answers = { town: 'PUNGGOL', parentsPostal: '560314', flatType: '4 ROOM', maxPrice: '700000', minLease: '60', showPhg: false };

    const saved = await request(BASE_URL)
      .put('/api/auth/profile')
      .set('Authorization', 'Bearer ' + token)
      .send({ profile: answers });
    expect(saved.status).toBe(200);
    expect(saved.body.profile).toEqual(answers);

    const res = await request(BASE_URL)
      .get('/api/auth/profile')
      .set('Authorization', 'Bearer ' + token);
    expect(res.body.profile).toEqual(answers);
  });

  it('remembers "Skip for now"', async () => {
    const token = await getToken('profile-skip@example.com');
    const saved = await request(BASE_URL)
      .put('/api/auth/profile')
      .set('Authorization', 'Bearer ' + token)
      .send({ profile: { skipped: true } });

    expect(saved.status).toBe(200);
    expect(saved.body.profile).toEqual({ skipped: true, showPhg: true });
  });

  it('keeps the PHG switch on unless it was switched off', async () => {
    const token = await getToken('profile-phg@example.com');
    const answers = { town: '', parentsPostal: '560314', flatType: '', maxPrice: '', minLease: '60' };
    const res = await request(BASE_URL)
      .put('/api/auth/profile')
      .set('Authorization', 'Bearer ' + token)
      .send({ profile: answers });

    expect(res.body.profile.showPhg).toBe(true);
  });

  it('rejects a postal code that is not 6 digits', async () => {
    const token = await getToken('profile-bad@example.com');
    const res = await request(BASE_URL)
      .put('/api/auth/profile')
      .set('Authorization', 'Bearer ' + token)
      .send({ profile: { town: 'PUNGGOL', parentsPostal: '5603', flatType: '', maxPrice: '', minLease: '60' } });

    expect(res.status).toBe(400);
  });

  it('does not touch the "What matters to you?" preferences', async () => {
    const token = await getToken('profile-prefs@example.com');
    await request(BASE_URL)
      .put('/api/auth/preferences')
      .set('Authorization', 'Bearer ' + token)
      .send({ preferences: { sortBy: 'match' } });
    await request(BASE_URL)
      .put('/api/auth/profile')
      .set('Authorization', 'Bearer ' + token)
      .send({ profile: { skipped: true } });

    const res = await request(BASE_URL)
      .get('/api/auth/preferences')
      .set('Authorization', 'Bearer ' + token);
    expect(res.body.preferences.sortBy).toBe('match');
  });
});

