import api from "./client.js";

/** OWNER: Project Lead (the API contract) */
export async function fetchAmenities(types, { west, south, east, north }) {
  const { data } = await api.get("/amenities", {
    params: { types: types.join(","), west, south, east, north },
  });
  return data;
}
