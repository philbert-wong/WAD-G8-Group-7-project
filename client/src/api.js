// All the fetch() calls to our Express API live here.
// The components only call these functions, so they never deal with URLs.

// Sends the request, turns the reply into an object, and throws an Error if the server said no.
async function request(url, options) {
  const response = await fetch(url, options)

  if (response.status === 204) return null // 204 = success, nothing to send back

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.error || 'Something went wrong')
  }
  return data
}

// Builds "q=punggol&maxPrice=600000" and leaves out anything empty
function toQueryString(values) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(values)) {
    if (value !== '' && value !== null && value !== undefined) {
      params.set(key, value)
    }
  }
  return params.toString()
}

const jsonHeaders = { 'Content-Type': 'application/json' }

export function searchBlocks(filters) {
  return request('/api/blocks?' + toQueryString(filters))
}

export function getAmenities(blockId) {
  return request(`/api/blocks/${blockId}/amenities`)
}

export function getSales(blockId) {
  return request(`/api/blocks/${blockId}/sales`)
}

// Shortlist: create, read, update, delete
export function getShortlist() {
  return request('/api/shortlist')
}

export function addToShortlist(blockId) {
  return request('/api/shortlist', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ blockId }),
  })
}

export function updateNote(itemId, note) {
  return request(`/api/shortlist/${itemId}`, {
    method: 'PATCH',
    headers: jsonHeaders,
    body: JSON.stringify({ note }),
  })
}

export function removeFromShortlist(itemId) {
  return request(`/api/shortlist/${itemId}`, { method: 'DELETE' })
}
