// Pinia store (Week 11): who is logged in, shared by every page (NavBar, LoginView, SearchView, ShortlistView,
// and the route guard in router/index.js). Same idea as the MiniShop example's stores/auth.js.
//
// After login the server gives us a token. We:
//   1. keep it in localStorage, so a page refresh does not log you out (Week 11 Exercise 3)
//   2. tell axios to send it with EVERY request ("Authorization: Bearer <token>"),
//      so the shortlist and preferences calls work without changing each one
//   3. keep the user ({ id, email }) in the store, so the NavBar can show the email
import { ref, computed } from 'vue'
import axios from 'axios'
import { defineStore } from 'pinia'

// Our Express server's address (class style: the full URL, like wk5/wk6 code-along App.vue)
const BASE_URL = 'http://localhost:8000'

// Tells axios to add the token to every request from now on
function sendTokenWithEveryRequest(token) {
  axios.defaults.headers.common['Authorization'] = 'Bearer ' + token
}

export const useAuthStore = defineStore('auth', function () {
  // ---------- state ----------
  const user = ref(null) // { id, email }, or null = logged out
  const token = ref(null)
  const loading = ref(false)
  const error = ref('')

  // ---------- getters ----------
  const isLoggedIn = computed(function () {
    return token.value !== null
  })

  // ---------- actions ----------

  // Remembers a login: in the store, in localStorage, and in every axios request
  function saveLogin(newToken, newUser) {
    token.value = newToken
    user.value = newUser
    localStorage.setItem('token', newToken)
    localStorage.setItem('user', JSON.stringify(newUser))
    sendTokenWithEveryRequest(newToken)
  }

  // Sends the email and password to /api/auth/login or /api/auth/register.
  // Both answer { token, user: { id, email } }. On a problem, error holds the message to show.
  async function sendLoginForm(path, email, password) {
    loading.value = true
    error.value = ''
    try {
      const response = await axios.post(`${BASE_URL}/api/auth/${path}`, { email: email, password: password })
      saveLogin(response.data.token, response.data.user)
    } catch (e) {
      // Show our server's message if it sent one, otherwise axios's own (e.g. "Network Error")
      if (e.response && e.response.data && e.response.data.message) {
        error.value = e.response.data.message
      } else {
        error.value = e.message
      }
    }
    loading.value = false
  }

  async function login(email, password) {
    await sendLoginForm('login', email, password)
  }

  async function register(email, password) {
    await sendLoginForm('register', email, password)
  }

  // "Logout" button: forget the token everywhere (Week 11 Exercise 3 Part B)
  function logout() {
    token.value = null
    user.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    delete axios.defaults.headers.common['Authorization']
  }

  // When the store is created (the first time a page uses it), put back the login saved in localStorage
  // (Week 11 Exercise 3 Part A), so a page refresh keeps you logged in
  const savedToken = localStorage.getItem('token')
  const savedUser = localStorage.getItem('user')
  if (savedToken !== null && savedUser !== null) {
    token.value = savedToken
    user.value = JSON.parse(savedUser)
    sendTokenWithEveryRequest(savedToken)
  }

  // You must return every state, getter and action, or pages cannot use them (slide 21)
  return { user, token, loading, error, isLoggedIn, login, register, logout }
})
