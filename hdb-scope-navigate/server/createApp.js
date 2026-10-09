/**
 * SKELETON — write this file.  OWNER: me (Back-end & integration)
 * ─────────────────────────────────────────────────────────────────────
 * WHY THIS FILE EXISTS
 *   Today server/app.js does THREE things at once: it builds the Express app,
 *   connects to MongoDB Atlas, and starts listening on a port. That makes it
 *   impossible to test — importing it in a test would connect to the real
 *   database and open a port.
 *
 *   The fix is to split it:
 *       createApp.js  → builds and RETURNS the Express app. Nothing else.
 *       app.js        → the entry point: createApp(), connectDb(), listen().
 *
 *   Then a test can do:   const app = createApp();   and use supertest on it,
 *   with no Atlas and no port.
 *
 * STEPS
 *   1. Import what app.js imports: express, cors, path, fileURLToPath, and every
 *      router from ./routes/*.js. (Copy the import lines from server/app.js.)
 *
 *   2. Export a function:   export function createApp() { ... }
 *
 *   3. Inside it, do exactly what server/app.js does between "const app = express()"
 *      and just before "const PORT":
 *        a. const app = express();
 *        b. app.use(cors());  app.use(express.json());
 *        c. mount every router under "/api"
 *        d. the /api/health route
 *        e. serve client/dist and the "everything that isn't /api → index.html" fallback
 *        f. the error handler at the very end (4 arguments: err, req, res, next)
 *      Order matters: the error handler must come last.
 *
 *   4. `return app;`  — do NOT call connectDb() or app.listen() in this file.
 *
 *   5. Then edit server/app.js so it shrinks to roughly:
 *        import { createApp } from "./createApp.js";
 *        const app = createApp();
 *        connectDb().then(() => app.listen(PORT, ...)).catch(...)
 *        export default app;
 *
 *   6. Check nothing broke:  npm run dev,  then  curl localhost:3000/api/health
 *
 * GOTCHA
 *   `__dirname` doesn't exist in ES modules. app.js builds it from import.meta.url
 *   — copy that line too, or the client/dist path will be wrong.
 */
export function createApp() {
  // TODO: steps 1–4. Delete the line below when done.
  throw new Error("Not written yet");
}
