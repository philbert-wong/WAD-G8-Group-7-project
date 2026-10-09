import api from "./client.js";

/** OWNER: Project Lead (the API contract) */
export async function fetchPreferences() {
  const { data } = await api.get("/me/preferences");
  return data;
}

export async function savePreferences(prefs) {
  const { data } = await api.put("/me/preferences", prefs);
  return data;
}
