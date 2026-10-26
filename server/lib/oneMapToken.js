// Gets (and remembers) a OneMap token. It lasts about 3 days, so we ask again a bit early.
// STARTER CODE (AI-generated boilerplate): finish the TODO yourself.
import { oneMapEmail, oneMapPassword } from '../config.js';

let token = null;
let expiresAt = 0; // a time in milliseconds, like Date.now()

export async function getOneMapToken() {
  if (token !== null && Date.now() < expiresAt) {
    return token;
  }

  const response = await fetch('https://www.onemap.gov.sg/api/auth/post/getToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: oneMapEmail, password: oneMapPassword }),
  });
  if (!response.ok) {
    throw new Error('OneMap login failed (' + response.status + ')');
  }

  const data = await response.json();
  token = data.access_token;
  
  // Convert expiry_timestamp from seconds to milliseconds, then subtract 1 hour (3,600,000 ms)
  const safetyMarginMs = 60 * 60 * 1000; // 1 hour
  expiresAt = (data.expiry_timestamp * 1000) - safetyMarginMs;

  return token;
}
