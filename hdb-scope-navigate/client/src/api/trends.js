import api from "./client.js";

/** OWNER: Project Lead (the API contract) */
export async function fetchTrends(flatType) {
  const { data } = await api.get("/trends", { params: flatType ? { flatType } : {} });
  return data;
}

export async function fetchLeaseModel() {
  const { data } = await api.get("/trends/lease");
  return data;
}
