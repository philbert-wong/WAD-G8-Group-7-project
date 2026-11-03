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

// Our Express server's address, from one shared place (see config.js; it changes for deployment)
import { BASE_URL } from '../config.js'
import { useFiltersStore } from './filters'

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

  // The profile = the answers from the sign-up popup / profile page: { town, parentsPostal, flatType, maxPrice, minLease }.
  // null = never answered yet. { skipped: true } = pressed "Skip for now".
  const profile = ref(null)
  // true once the server has told us the profile (so the popup does not flash up before we know)
  const profileLoaded = ref(false)
  const profileSaving = ref(false)
  const profileError = ref('')

  // ---------- getters ----------
  const isLoggedIn = computed(function () {
    return token.value !== null
  })

  // Show the sign-up popup: logged in, and the server says the profile was never answered
  const needsProfile = computed(function () {
    return token.value !== null && profileLoaded.value && profile.value === null
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

  // Asks the server for the saved profile and uses it as the starting filters.
  // The route guard (router/index.js) calls this before the first page opens, so the filters are ready in time.
  async function loadProfile() {
    try {
      const response = await axios.get(`${BASE_URL}/api/auth/profile`)
      profile.value = response.data.profile
      profileLoaded.value = true
      useFiltersStore().applyProfile(profile.value)
    } catch (e) {
      // The site still works without it (normal filters, no popup). We try again on the next page change.
    }
  }

  // Saves the answers from the popup / profile page ({ skipped: true } for "Skip for now"), then uses them as the filters.
  // On a problem, profileError holds the message to show.
  async function saveProfile(answers) {
    profileSaving.value = true
    profileError.value = ''
    try {
      const response = await axios.put(`${BASE_URL}/api/auth/profile`, { profile: answers })
      profile.value = response.data.profile
      profileLoaded.value = true
      useFiltersStore().applyProfile(profile.value)
    } catch (e) {
      // Show our server's message if it sent one, otherwise axios's own (e.g. "Network Error")
      if (e.response && e.response.data && e.response.data.message) {
        profileError.value = e.response.data.message
      } else {
        profileError.value = e.message
      }
    }
    profileSaving.value = false
  }

  // The "Near parents (PHG)" switch on the map was flipped: remember it on the profile.
  // Unlike saveProfile this does NOT apply the profile's filters again, or flipping the switch
  // would undo the filters the user has just moved.
  async function savePhgToggle(on) {
    if (profile.value === null) {
      return // not logged in: the switch only lasts for this visit
    }
    // A copy of the saved profile with just the switch changed
    const updated = Object.assign({}, profile.value, { showPhg: on })
    try {
      const response = await axios.put(`${BASE_URL}/api/auth/profile`, { profile: updated })
      profile.value = response.data.profile
    } catch (e) {
      // Not saved, but the switch still works on the map for this visit
    }
  }

  // "Logout" button: forget the token everywhere (Week 11 Exercise 3 Part B)
  function logout() {
    token.value = null
    user.value = null
    // The next person to log in on this computer starts with their own profile and the normal filters
    profile.value = null
    profileLoaded.value = false
    useFiltersStore().clearFilters()
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
  return {
    user,
    token,
    loading,
    error,
    isLoggedIn,
    profile,
    profileLoaded,
    profileSaving,
    profileError,
    needsProfile,
    login,
    register,
    loadProfile,
    saveProfile,
    savePhgToggle,
    logout,
  }
})
