import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { ANSWERS, BASE_URL, getToken, startTestDb, stopTestDb } from './helpers.js';

beforeAll(async () => {
  await startTestDb();
});

afterAll(() => stopTestDb());


describe('/api/auth', () => {
  it('registers a user and returns a token', async () => {
    const res = await request(BASE_URL)
      .post('/api/auth/register')
      .send({ email: 'new@example.com', password: 'password123', securityAnswers: ANSWERS });

    expect(res.status).toBe(201);
    expect(typeof res.body.token).toBe('string');
    expect(res.body.user.email).toBe('new@example.com');
    expect(res.body.user.passwordHash).toBeUndefined();
  });


 it('rejects a duplicate email', async () => {
    const body = { email: 'dup@example.com', password: 'password123', securityAnswers: ANSWERS };
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
    const body = { email: 'login@example.com', password: 'password123', securityAnswers: ANSWERS };
    await request(BASE_URL).post('/api/auth/register').send(body);
    const res = await request(BASE_URL).post('/api/auth/login').send(body);

    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe('string');
  });

  it('rejects a wrong password', async () => {
    await request(BASE_URL)
      .post('/api/auth/register')
      .send({ email: 'wrong@example.com', password: 'password123', securityAnswers: ANSWERS });
    const res = await request(BASE_URL)
      .post('/api/auth/login')
      .send({ email: 'wrong@example.com', password: 'not-the-password' });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Wrong email or password');
});

  it('gives an unknown email the same message as a wrong password', async () => {
    const res = await request(BASE_URL)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'not-the-password' });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Wrong email or password');
  });
});

// Stricter register checks. Written FIRST (TDD red step): the "rejects" tests fail until register() checks them.
describe('/api/auth/register input checks', () => {
  function register(email, password) {
    return request(BASE_URL).post('/api/auth/register').send({ email: email, password: password, securityAnswers: ANSWERS });
  }

  it('rejects an email without @', async () => {
    const res = await register('abc', 'goodpass123');
    expect(res.status).toBe(400);
  });

  it('rejects an email with no dot in the domain', async () => {
    const res = await register('a@b', 'goodpass123');
    expect(res.status).toBe(400);
  });

  it('rejects an email whose domain starts with a dot', async () => {
    const res = await register('a@.com', 'goodpass123');
    expect(res.status).toBe(400);
  });

  it('still accepts a normal email with dots and a + tag', async () => {
    const res = await register('first.last+tag@mail.example.com', 'goodpass123');
    expect(res.status).toBe(201);
  });

  it('rejects a password of only spaces', async () => {
    const res = await register('spaces@example.com', '        ');
    expect(res.status).toBe(400);
  });

  it('rejects a very common password', async () => {
    const res = await register('common1@example.com', 'password');
    expect(res.status).toBe(400);
    const res2 = await register('common2@example.com', '12345678');
    expect(res2.status).toBe(400);
  });

  it('rejects a password that is the same as the email', async () => {
    const res = await register('same@example.com', 'same@example.com');
    expect(res.status).toBe(400);
  });

  it('rejects a password longer than 72 bytes (bcrypt ignores the rest)', async () => {
    const res = await register('long73@example.com', 'x'.repeat(73));
    expect(res.status).toBe(400);
  });

  it('accepts a password of exactly 72 bytes', async () => {
    const res = await register('long72@example.com', 'x'.repeat(72));
    expect(res.status).toBe(201);
  });

  it('counts bytes, not characters, for the 72 limit', async () => {
    // 40 letters "é" are 40 characters but 80 bytes
    const res = await register('bytes@example.com', 'é'.repeat(40));
    expect(res.status).toBe(400);
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
    expect(saved.body.profile).toEqual({ skipped: true, showPhg: false });
  });

  it('keeps the PHG switch off unless it was switched on', async () => {
    const token = await getToken('profile-phg@example.com');
    const answers = { town: '', parentsPostal: '560314', flatType: '', maxPrice: '', minLease: '60' };
    const res = await request(BASE_URL)
      .put('/api/auth/profile')
      .set('Authorization', 'Bearer ' + token)
      .send({ profile: answers });

    expect(res.body.profile.showPhg).toBe(false);
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

describe('/api/auth/reset-password (forgot password)', () => {
  it('chooses a new password with the email and all 3 right answers', async () => {
    await getToken('forgot@example.com'); // registers with password123 and ANSWERS

    // Capitals and spaces at the ends do not matter
    const reset = await request(BASE_URL)
      .post('/api/auth/reset-password')
      .send({ email: 'forgot@example.com', securityAnswers: [' alex ', 'MRS TAN', 'kk hospital'], password: 'brandnewpass1' });
    expect(reset.status).toBe(200);

    const oldLogin = await request(BASE_URL)
      .post('/api/auth/login')
      .send({ email: 'forgot@example.com', password: 'password123' });
    expect(oldLogin.status).toBe(401);

    const newLogin = await request(BASE_URL)
      .post('/api/auth/login')
      .send({ email: 'forgot@example.com', password: 'brandnewpass1' });
    expect(newLogin.status).toBe(200);
  });

  it('does not change the password with only the email', async () => {
    await getToken('forgot-noanswers@example.com');

    const res = await request(BASE_URL)
      .post('/api/auth/reset-password')
      .send({ email: 'forgot-noanswers@example.com', password: 'brandnewpass1' });
    expect(res.status).toBe(400);

    const login = await request(BASE_URL)
      .post('/api/auth/login')
      .send({ email: 'forgot-noanswers@example.com', password: 'password123' });
    expect(login.status).toBe(200);
  });

  it('does not change the password when one answer is wrong', async () => {
    await getToken('forgot-wrong@example.com');

    const res = await request(BASE_URL)
      .post('/api/auth/reset-password')
      .send({ email: 'forgot-wrong@example.com', securityAnswers: ['Alex', 'Mrs Tan', 'Wrong Hospital'], password: 'brandnewpass1' });
    expect(res.status).toBe(401);

    const login = await request(BASE_URL)
      .post('/api/auth/login')
      .send({ email: 'forgot-wrong@example.com', password: 'password123' });
    expect(login.status).toBe(200);
  });

  it('gives the same answer when no account has that email', async () => {
    const res = await request(BASE_URL)
      .post('/api/auth/reset-password')
      .send({ email: 'nobody@example.com', securityAnswers: ANSWERS, password: 'brandnewpass1' });

    expect(res.status).toBe(401);
  });

  it('rejects something that is not an email', async () => {
    const res = await request(BASE_URL)
      .post('/api/auth/reset-password')
      .send({ email: 'not-an-email', securityAnswers: ANSWERS, password: 'brandnewpass1' });

    expect(res.status).toBe(400);
  });

  it('applies the same password rules as register', async () => {
    await getToken('forgot-weak@example.com');

    const tooShort = await request(BASE_URL)
      .post('/api/auth/reset-password')
      .send({ email: 'forgot-weak@example.com', securityAnswers: ANSWERS, password: 'short' });
    expect(tooShort.status).toBe(400);

    const tooCommon = await request(BASE_URL)
      .post('/api/auth/reset-password')
      .send({ email: 'forgot-weak@example.com', securityAnswers: ANSWERS, password: 'password' });
    expect(tooCommon.status).toBe(400);
  });
});

describe('/api/auth/security-questions', () => {
  it('will not create an account without all 3 answers', async () => {
    const none = await request(BASE_URL)
      .post('/api/auth/register')
      .send({ email: 'no-answers@example.com', password: 'password123' });
    expect(none.status).toBe(400);

    const oneEmpty = await request(BASE_URL)
      .post('/api/auth/register')
      .send({ email: 'no-answers@example.com', password: 'password123', securityAnswers: ['Alex', ' ', 'KK Hospital'] });
    expect(oneEmpty.status).toBe(400);
  });

  it('says whether the answers are saved, without sending them back', async () => {
    const token = await getToken('questions-read@example.com');
    const res = await request(BASE_URL)
      .get('/api/auth/security-questions')
      .set('Authorization', 'Bearer ' + token);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ hasAnswers: true });
  });

  it('changes the answers from the Profile page, and the new ones reset the password', async () => {
    const token = await getToken('questions-change@example.com');
    const save = await request(BASE_URL)
      .put('/api/auth/security-questions')
      .set('Authorization', 'Bearer ' + token)
      .send({ securityAnswers: ['Ben', 'Mr Lim', 'SGH'] });
    expect(save.status).toBe(200);

    const oldAnswers = await request(BASE_URL)
      .post('/api/auth/reset-password')
      .send({ email: 'questions-change@example.com', securityAnswers: ANSWERS, password: 'brandnewpass1' });
    expect(oldAnswers.status).toBe(401);

    const newAnswers = await request(BASE_URL)
      .post('/api/auth/reset-password')
      .send({ email: 'questions-change@example.com', securityAnswers: ['Ben', 'Mr Lim', 'SGH'], password: 'brandnewpass1' });
    expect(newAnswers.status).toBe(200);
  });

  it('needs a login token', async () => {
    const res = await request(BASE_URL)
      .put('/api/auth/security-questions')
      .send({ securityAnswers: ANSWERS });

    expect(res.status).toBe(401);
  });
});
