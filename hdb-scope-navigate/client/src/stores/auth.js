import { defineStore } from "pinia";
import * as authApi from "../api/auth.js";
import { useShortlistStore } from "./shortlist.js";

/** OWNER: Frontend — Shell & UI */
export const useAuthStore = defineStore("auth", {
  state: () => ({
    token: localStorage.getItem("token") || null,
    email: localStorage.getItem("email") || null,
  }),
  getters: { isSignedIn: (s) => Boolean(s.token) },
  actions: {
    async login(email, password) {
      const data = await authApi.login(email, password);
      this.setSession(data);
    },
    async register(email, password, displayName) {
      const data = await authApi.register(email, password, displayName);
      this.setSession(data);
    },
    setSession({ token, email }) {
      this.token = token; this.email = email;
      localStorage.setItem("token", token);
      localStorage.setItem("email", email);
    },
    logout() {
      this.token = null; this.email = null;
      localStorage.removeItem("token");
      localStorage.removeItem("email");
      useShortlistStore().clear();
    },
  },
});
