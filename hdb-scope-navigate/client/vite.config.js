import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";

// In development the Vue app runs on :5173 and Express on PORT (default 3000).
// This proxy makes /api requests from the browser reach Express, so the
// frontend code never needs to know which port the API is on.
//
// The API's port comes from PORT in the project's root .env — the same value
// server/app.js listens on — so changing it in one place moves both. (Handy when
// another project is already using :3000.) Only PORT is read here.
export default defineConfig(({ mode }) => {
  const { PORT } = loadEnv(mode, "..", ["PORT"]);

  return {
    plugins: [vue()],
    server: {
      port: 5173,
      proxy: { "/api": `http://localhost:${PORT || 3000}` },
    },
  };
});
