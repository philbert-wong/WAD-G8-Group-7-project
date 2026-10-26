// Who is logged in, shared by every page (NavBar, LoginView, SearchView, ShortlistView).
//
// After login the server gives us a token. We:
//   1. keep it in localStorage, so a page refresh does not log you out
//   2. tell axios to send it with EVERY request ("Authorization: Bearer <token>"),
//      so the shortlist and preferences calls work without changing each one
//   3. put the user ({ id, email }) in currentUser, so the NavBar can show the email
import { ref } from 'vue'
import axios from 'axios'

// null = logged out. Because it is a ref, every component that shows it updates by itself.
export const currentUser = ref(null)

// Tells axios to add the token to every request from now on
function sendTokenWithEveryRequest(token) {
  axios.defaults.headers.common['Authorization'] = 'Bearer ' + token
}

// Called by LoginView after a successful login or register.
// token = '...', user = { id, email }
export function saveLogin(token, user) {
  localStorage.setItem('token', token)
  localStorage.setItem('user', JSON.stringify(user))
  sendTokenWithEveryRequest(token)
  currentUser.value = user
}

// "Logout" button: forget the token everywhere
export function logout() {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  delete axios.defaults.headers.common['Authorization']
  currentUser.value = null
}

// Is anyone logged in?
export function isLoggedIn() {
  return currentUser.value !== null
}

// When the website opens, put back the login saved in localStorage (if there is one)
function loadSavedLogin() {
  const token = localStorage.getItem('token')
  const savedUser = localStorage.getItem('user')
  if (token !== null && savedUser !== null) {
    sendTokenWithEveryRequest(token)
    currentUser.value = JSON.parse(savedUser)
  }
}

// This runs once, the first time any component imports this file (before any page loads)
loadSavedLogin()
