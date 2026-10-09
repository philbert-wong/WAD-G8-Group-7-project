import api from "./client.js";

/** OWNER: Project Lead (the API contract) */
export async function login(email, password) {
  const { data } = await api.post("/auth/login", { email, password });
  return data;
}

export async function register(email, password, displayName) {
  const { data } = await api.post("/auth/register", { email, password, displayName });
  return data;
}
