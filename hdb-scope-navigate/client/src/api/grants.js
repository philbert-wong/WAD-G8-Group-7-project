import api from "./client.js";

/** OWNER: Project Lead (the API contract) */
export async function fetchGrantRules() {
  const { data } = await api.get("/grants");
  return data;
}
