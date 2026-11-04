// Server tests for /api/affordability: the calculator answers saved for a logged-in user (Yujia's auto-save).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { BASE_URL, getToken, startTestDb, stopTestDb } from './helpers.js';

let token;

function auth(req) {
  return req.set('Authorization', 'Bearer ' + token);
}

// The answers the calculator sends for a couple (one box left empty, like a half-filled form)
function goodDetails() {
  return {
    buyerType: 'couple',
    coOwnerCount: 1,
    owners: [
      { status: 'first', income: 4000, cpf: 50000, cash: 20000 },
      { status: 'first', income: 3000, cpf: 30000, cash: '' },
    ],
    flatType: '4 ROOM',
    employed12Months: true,
    phgOption: 'none',
    loanYears: 25,
  };
}

beforeAll(async () => {
  await startTestDb();
  token = await getToken('afford@example.com');
});

afterAll(() => stopTestDb());

describe('/api/affordability', () => {
  it('rejects a request with no token', async () => {
    const res = await request(BASE_URL).put('/api/affordability').send(goodDetails());
    expect(res.status).toBe(401);
  });

  it('saves the answers (PUT) and gives them back (GET)', async () => {
    const saved = await auth(request(BASE_URL).put('/api/affordability')).send(goodDetails());
    expect(saved.status).toBe(200);
    const res = await auth(request(BASE_URL).get('/api/affordability'));
    expect(res.status).toBe(200);
    expect(res.body.buyerType).toBe('couple');
    expect(res.body.owners).toHaveLength(2);
    expect(res.body.owners[0].income).toBe(4000);
  });

  it('refuses a negative income', async () => {
    const details = goodDetails();
    details.owners[0].income = -100;
    const res = await auth(request(BASE_URL).put('/api/affordability')).send(details);
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('0 or more');
  });

  it('refuses a loan period longer than 25 years', async () => {
    const details = goodDetails();
    details.loanYears = 30;
    const res = await auth(request(BASE_URL).put('/api/affordability')).send(details);
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('loanYears');
  });

  it('refuses a buyer type the calculator does not have', async () => {
    const details = goodDetails();
    details.buyerType = 'company';
    const res = await auth(request(BASE_URL).put('/api/affordability')).send(details);
    expect(res.status).toBe(400);
  });
});
