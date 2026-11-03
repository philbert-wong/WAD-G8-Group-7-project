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

  // The profile = the presets from the popup / profile page: { town, parentsPostal, flatType, maxPrice, minLease, showPhg }.
  // Kept in localStorage as 'presets' (and on the account when logged in). null = none saved yet.
  const profile = ref(null)
  // true once the server has told us the profile (so the popup does not flash up before we know)
  const profileLoaded = ref(false)
  // true once the presets popup has been answered or skipped during this visit
  const presetsAsked = ref(false)
  // true when "Skip for now" was pressed on this device before. It is saved in localStorage, so the popup
  // does not come back after a refresh (logging out forgets it, so the next person is asked)
  const presetsSkipped = ref(localStorage.getItem('presetsSkipped') === 'yes')
  // Goes up by 1 every time new presets are saved, so Search and the Map can watch it and reload with them
  const presetsVersion = ref(0)
  const profileSaving = ref(false)
  const profileError = ref('')

  // ---------- getters ----------
  const isLoggedIn = computed(function () {
    return token.value !== null
  })

  // Show the presets popup: only to a logged-out visitor who has no presets saved on this device and has not
  // skipped it before. A returning guest keeps their presets (localStorage) and changes them with the filters.
  // Logged in, it never shows: the presets were entered before signing up (and are copied to the account),
  // or come from the account; they can be changed on the profile page.
  const needsProfile = computed(function () {
    return token.value === null && !presetsAsked.value && profile.value === null && !presetsSkipped.value
  })

  // ---------- actions ----------

  // Remembers a login: in the store, in localStorage, and in every axios request
  function saveLogin(newToken, newUser) {
    token.value = newToken
    user.value = newUser
    localStorage.setItem('token', newToken)
    localStorage.setItem('user', JSON.stringify(newUser))
    sendTokenWithEveryRequest(newToken)
    // profileLoaded = false makes the route guard load this account's profile before the next page opens
    profileLoaded.value = false
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
    // A new account: show the Help tour again when the Search page opens (see GuideTour.vue),
    // even if it was already seen as a guest
    if (error.value === '') {
      localStorage.removeItem('searchTourSeen')
    }
  }

  // Asks the server for the saved profile and uses it as the starting filters.
  // The route guard (router/index.js) calls this before the first page opens, so the filters are ready in time.
  async function loadProfile() {
    try {
      const response = await axios.get(`${BASE_URL}/api/auth/profile`)
      profileLoaded.value = true
      // The presets saved on this device (localStorage) are the newest, so they win.
      // The account's copy is only used on a device that has none yet.
      if (profile.value === null) {
        profile.value = response.data.profile
        useFiltersStore().applyProfile(profile.value)
      } else if (response.data.profile === null) {
        // Just signed up (or an account that never had presets): copy the presets entered on this device to the account
        await axios.put(`${BASE_URL}/api/auth/profile`, { profile: profile.value })
      }
    } catch (e) {
      // The site still works without it (normal filters, no popup). We try again on the next page change.
    }
  }

  // Saves the answers from the popup / profile page, then uses them as the filters.
  // They go in localStorage (so they work without an account, and come back after a refresh),
  // and when logged in, on the account too (so they follow you to another computer).
  // On a problem, profileError holds the message to show.
  async function saveProfile(answers) {
    profileError.value = ''
    presetsAsked.value = true
    profile.value = answers
    localStorage.setItem('presets', JSON.stringify(answers))
    useFiltersStore().applyProfile(answers)
    presetsVersion.value = presetsVersion.value + 1
    if (token.value === null) {
      return
    }

    profileSaving.value = true
    try {
      const response = await axios.put(`${BASE_URL}/api/auth/profile`, { profile: answers })
      // The server's cleaned-up copy, kept on this device too
      profile.value = response.data.profile
      profileLoaded.value = true
      localStorage.setItem('presets', JSON.stringify(profile.value))
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

  // "Skip for now" in the popup: close it and keep the presets as they are. Remembered on this device,
  // so the popup does not come back after a refresh.
  function skipPresets() {
    presetsAsked.value = true
    presetsSkipped.value = true
    localStorage.setItem('presetsSkipped', 'yes')
  }

  // The "Near parents (PHG)" switch on the map was flipped: remember it on the profile.
  // Unlike saveProfile this does NOT apply the profile's filters again, or flipping the switch
  // would undo the filters the user has just moved.
  async function savePhgToggle(on) {
    if (profile.value === null) {
      return // no presets saved: the switch only lasts for this visit
    }
    // A copy of the saved profile with just the switch changed, kept on this device
    const updated = Object.assign({}, profile.value, { showPhg: on })
    profile.value = updated
    localStorage.setItem('presets', JSON.stringify(updated))
    if (token.value === null) {
      return
    }
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
    // ...and is asked the presets popup again straight away (not only after a refresh)
    presetsAsked.value = false
    presetsSkipped.value = false
    localStorage.removeItem('presetsSkipped')
    localStorage.removeItem('presets')
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

  // Put back the presets saved on this device (the popup answers), and use them as the starting filters
  const savedPresets = localStorage.getItem('presets')
  if (savedPresets !== null) {
    try {
      profile.value = JSON.parse(savedPresets)
      useFiltersStore().applyProfile(profile.value)
    } catch (e) {
      localStorage.removeItem('presets') // not valid JSON: forget it
    }
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
    presetsVersion,
    login,
    register,
    loadProfile,
    saveProfile,
    skipPresets,
    savePhgToggle,
    logout,
  }
})
