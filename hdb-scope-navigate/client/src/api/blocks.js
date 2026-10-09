import api from "./client.js";

/** OWNER: Project Lead (the API contract) */
export async function fetchBlock(id) {
  const { data } = await api.get(`/blocks/${id}`);
  return data;
}

export async function geocode(q) {
  const { data } = await api.get("/geocode", { params: { q } });
  return data;
}
