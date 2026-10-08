# WAD-G8-Group-7-project

HDB resale explorer (IS216 G8 Group 7). Progress-pitch skeleton covering:

- **Feature 1**: search by postal code or address (OneMap live search, called from the browser)
- **Feature 3**: filter by town, flat type, budget and remaining lease
- **Feature 12**: shortlist with create / read / update (notes) / delete
- **Features 6 & 7**: block page with a Highcharts Dashboards view of the price trend and lease decay regressions

## Layout

| Folder | What |
|---|---|
| `client/` | Vue 3 + Vite + Pinia + Bootstrap 5, Highcharts Dashboards |
| `server/` | Express + Mongoose API, data ingestion scripts |
| `ml-service/` | Python Flask + scikit-learn microservice that fits the multiple linear regressions |

`scikitjs-node` was not used: it depends on `@tensorflow/tfjs-node` 3.6.1, which has no build for Apple Silicon
(`Unsupported system: cpu-darwin-arm64`), so the Flask + scikit-learn alternative is used instead.

## Running it locally

Needs Node 20+ and Python 3.10+.

```bash
npm install                                   # installs server + client
cp server/.env.example server/.env            # put your MongoDB Atlas URI in MONGODB_URI

# No Atlas yet? Run a local MongoDB in its own terminal and leave MONGODB_URI as is:
npm run db:local

# Regression service (own terminal)
cd ml-service
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt     # Windows: .venv\Scripts\pip
.venv/bin/python app.py                       # http://127.0.0.1:5001

# Load data + fit models (once; re-run to refresh)
npm run seed        # downloads ~240k resale transactions from data.gov.sg, then fits the models

# Start the app
npm run dev         # API on http://localhost:3000, web app on http://localhost:5180
```

The Flask service only needs to be running during `npm run seed` / `npm run fit`; the fitted coefficients are stored
in MongoDB and served by Express.

Card images are OneMap static maps. Block coordinates are looked up from OneMap the first time a block appears in
results and cached in MongoDB. Without a OneMap token this is limited to about one lookup per second, so some cards
show a placeholder until a later search fills them in.

## Tests

```bash
npm test                                  # server: Vitest + Supertest (in-memory MongoDB)
cd ml-service && .venv/bin/python -m pytest
```
