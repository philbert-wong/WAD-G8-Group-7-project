import api from "./client.js";

/** OWNER: Project Lead (the API contract) */
export async function fetchShortlist() {
  const { data } = await api.get("/shortlist");
  return data;
}

export async function addToShortlist(blockId, note = "") {
  const { data } = await api.post("/shortlist", { blockId, note });
  return data;
}

export async function updateShortlistNote(id, note) {
  const { data } = await api.patch(`/shortlist/${id}`, { note });
  return data;
}

export async function removeFromShortlist(id) {
  await api.delete(`/shortlist/${id}`);
}
