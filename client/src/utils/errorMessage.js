// Turns an axios error into a message we can show the user.
// Our server sends useful messages like { "error": "Already in your shortlist" },
// so we show that when it is there. Otherwise we fall back to axios's own message
// (for example "Network Error" when the server is not running).
export function getErrorMessage(error) {
  if (error.response && error.response.data && error.response.data.error) {
    return error.response.data.error
  }
  return error.message
}
