// The address of our Express server, in ONE place for every file that calls it.
//
// On your own computer VITE_API_URL is not set, so it is the local server (http://localhost:8000).
// When the app is deployed, put the real server address in client/.env.production, e.g.
//   VITE_API_URL=https://our-server.example.com
// and Vite uses it when building the site (pnpm build). Only settings starting with VITE_ reach the browser.
let apiUrl = 'http://localhost:8000'
if (import.meta.env.VITE_API_URL) {
  apiUrl = import.meta.env.VITE_API_URL
}

export const BASE_URL = apiUrl
