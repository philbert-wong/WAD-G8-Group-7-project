<script setup>
// The Login page: one form that can log in OR create an account (switch with the tabs).
// The auth store (stores/auth.js) talks to the server and remembers the login.
// On success we go back to the page that sent us here (?redirect=...), or to the Search page.
import { ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()

// The router lets us change page from code (like clicking a link); route tells us the current URL
const router = useRouter()
const route = useRoute()

// 'login' or 'register': which tab is open
const mode = ref('login')

// What is typed in the form (v-model keeps these in sync with the boxes)
const email = ref('')
const password = ref('')
const confirmPassword = ref('')

// Problems found by checkForm() below. Problems from the server are in auth.error.
const errorMessage = ref('')

// Clicking a tab: switch form and clear any old error
function switchMode(newMode) {
  mode.value = newMode
  errorMessage.value = ''
  auth.error = ''
}

// Checks the form before we send it. Returns an error message, or '' when it is fine.
// (The server checks too; this just gives a quicker answer.)
function checkForm() {
  if (email.value.trim() === '' || password.value === '') {
    return 'Please enter your email and password'
  }
  if (mode.value === 'register') {
    if (password.value.length < 8) {
      return 'Password must be at least 8 characters'
    }
    if (password.value !== confirmPassword.value) {
      return 'The two passwords do not match'
    }
  }
  return ''
}

// "Log in" / "Create account" button
async function submit() {
  errorMessage.value = checkForm()
  auth.error = ''
  if (errorMessage.value !== '') {
    return
  }

  if (mode.value === 'register') {
    await auth.register(email.value, password.value)
  } else {
    await auth.login(email.value, password.value)
  }

  // Logged in: go back to the page the route guard sent us from (e.g. /shortlist), or to Search
  if (auth.isLoggedIn) {
    if (route.query.redirect) {
      router.push(route.query.redirect)
    } else {
      router.push('/')
    }
  }
}
</script>

<template>
  <section class="row justify-content-center">
    <!-- FINAL DRAFT: cosy page heading -->
    <div class="col-12 text-center mb-4">
      <span class="eyebrow">Your account</span>
      <h1 class="page-title serif">Welcome <em>home</em></h1>
      <p class="page-sub">Log in to keep a shortlist and save your priorities.</p>
    </div>
    <div class="col-12 col-md-8 col-lg-5">
      <div class="card shadow-sm">
        <div class="card-body">
          <!-- Already logged in: nothing to do here -->
          <div v-if="auth.isLoggedIn" class="text-center">
            <p class="mb-2">You are logged in as <strong>{{ auth.user.email }}</strong>.</p>
            <RouterLink to="/" class="btn btn-primary">Go to Search</RouterLink>
          </div>

          <div v-else>
            <!-- Tabs: Log in / Create account -->
            <ul class="nav nav-tabs mb-3">
              <li class="nav-item">
                <button class="nav-link" :class="{ active: mode === 'login' }" @click="switchMode('login')">
                  Log in
                </button>
              </li>
              <li class="nav-item">
                <button class="nav-link" :class="{ active: mode === 'register' }" @click="switchMode('register')">
                  Create account
                </button>
              </li>
            </ul>

            <form @submit.prevent="submit">
              <div class="mb-3">
                <label for="login-email" class="form-label">Email</label>
                <input id="login-email" v-model="email" type="email" class="form-control" autocomplete="email" />
              </div>

              <div class="mb-3">
                <label for="login-password" class="form-label">Password</label>
                <input
                  id="login-password"
                  v-model="password"
                  type="password"
                  class="form-control"
                  autocomplete="current-password"
                />
                <div v-if="mode === 'register'" class="form-text">At least 8 characters.</div>
              </div>

              <!-- Only when creating an account -->
              <div v-if="mode === 'register'" class="mb-3">
                <label for="login-confirm" class="form-label">Type the password again</label>
                <input
                  id="login-confirm"
                  v-model="confirmPassword"
                  type="password"
                  class="form-control"
                  autocomplete="new-password"
                />
              </div>

              <div v-if="errorMessage" class="alert alert-danger py-2">{{ errorMessage }}</div>
              <div v-else-if="auth.error" class="alert alert-danger py-2">{{ auth.error }}</div>

              <button type="submit" class="btn btn-primary w-100" :disabled="auth.loading">
                <span v-if="auth.loading">Please wait...</span>
                <span v-else-if="mode === 'login'">Log in</span>
                <span v-else>Create account</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
