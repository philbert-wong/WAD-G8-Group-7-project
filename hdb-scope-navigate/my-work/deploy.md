# Deploying to Render

Express serves both the API and the built Vue app, so there is **one** service to deploy.
(`server/app.js` serves `client/dist` and falls back to `index.html` for every non-`/api` path.)

## Before you start
- [ ] Code is on GitHub
- [ ] `npm run build` works locally and creates `client/dist/`
- [ ] `npm start` works locally and `http://localhost:3001` (your `PORT`) shows the full app

## Steps (Render)
1. New → **Web Service** → connect the GitHub repo.
2. **Runtime:** Node. **Build command:** `npm install && npm run build`. **Start command:** `npm start`.
3. **Environment variables** (same names as `.env.example`):
   `MONGODB_URI`, `JWT_SECRET`, `ONEMAP_EMAIL`, `ONEMAP_PASSWORD`, optionally `LTA_ACCOUNT_KEY`.
   Do **not** set `PORT` — Render provides it, and `app.js` already reads `process.env.PORT`.
4. **Health check path:** `/api/health`.
5. In MongoDB Atlas → **Network Access**, allow Render to connect. The free tier has no fixed
   IP, so for a student project use `0.0.0.0/0` — and remember that this is open to the internet,
   protected only by your database password. Use a strong one.

## After the first deploy
- [ ] `https://<your-app>.onrender.com/api/health` returns `{"ok":true}`
- [ ] `/explore` loads the map and blocks appear
- [ ] Register, sign in, shortlist a block, reload — it is still there
- [ ] Search a postal code (this proves the OneMap credentials are set)
- [ ] Load the real data into the same database (run the seed scripts locally with the production `MONGODB_URI`)
- [ ] Phone check

## Things that go wrong
| Symptom | Likely cause |
|---|---|
| Blank page, API works | `npm run build` didn't run, so `client/dist` is missing |
| "Could not start: ... ENOTFOUND" in the logs | Wrong `MONGODB_URI` |
| "bad auth" | Wrong database password, or it contains `@ : /` and needs URL-encoding |
| Times out connecting | Atlas Network Access doesn't allow Render |
| First visit takes ~30 s | Free tier was asleep. Open the site before the demo, or ping `/api/health` on a timer |
| Search says "OneMap login failed" | `ONEMAP_EMAIL` / `ONEMAP_PASSWORD` not set on the host |
