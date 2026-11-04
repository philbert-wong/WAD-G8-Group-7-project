<script setup>
// The Login page: one form that can log in OR create an account (switch with the tabs).
// The auth store (stores/auth.js) talks to the server and remembers the login.
// On success we go back to the page that sent us here (?redirect=...), or to the Search page.
import { ref, computed, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { SECURITY_QUESTIONS, allAnswered } from '../utils/securityQuestions.js'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()

// The router lets us change page from code (like clicking a link); route tells us the current URL
const router = useRouter()
const route = useRoute()

// Opened as /createaccount (the "create a free account" links on Search come here): open "Create account" and say why
const fromPresets = computed(function () {
  return route.path === '/createaccount'
})

// Sent here by a page that needs an account: the grey "Log in to ..." reason box shows under the heading
const hasReason = computed(function () {
  return ['/compare', '/shortlist', '/profile'].includes(route.query.redirect)
})

// 'login' or 'register': which tab is open
const mode = ref(fromPresets.value ? 'register' : 'login')

// Already on this page (e.g. /login) when a link sends us to /createaccount: Vue keeps the same page,
// so switch to the "Create account" tab here
watch(fromPresets, function (yes) {
  if (yes) {
    switchMode('register')
  }
})

// What is typed in the form (v-model keeps these in sync with the boxes)
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
// Only when creating an account: the answers to the 3 security questions (same order as SECURITY_QUESTIONS)
const securityAnswers = ref(['', '', ''])

// Sent here by the Reset password page after the password was changed (/login?reset=1): say so above the form
const justReset = computed(function () {
  return route.query.reset === '1'
})

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
    if (!allAnswered(securityAnswers.value)) {
      return 'Please answer all 3 security questions'
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
    await auth.register(email.value, password.value, securityAnswers.value)
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
    <!-- Page heading -->
    <div class="col-12 text-center mb-4">
      <h1 class="page-title serif">Welcome <em>home</em></h1>
      <!-- Sent here from a page that needs an account: say which, so the user knows why they are here -->
      <p v-if="route.query.redirect === '/compare'" class="login-reason">Log in to compare your shortlisted flats.</p>
      <p v-else-if="route.query.redirect === '/shortlist'" class="login-reason">Log in to open your shortlist.</p>
      <p v-else-if="route.query.redirect === '/profile'" class="login-reason">Log in to see your profile.</p>
      <!-- On a phone, with the reason box above, this line would only repeat it and push the form down: hidden there -->
      <p class="page-sub" :class="{ 'd-none d-md-block': hasReason }">Log in to keep a shortlist and save your priorities. After logging in, you go straight back.</p>
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
            <!-- From a "create a free account" link: a small reminder of why to make an account -->
            <p v-if="fromPresets" class="small text-muted mb-2">
              Create an account to keep your presets and shortlist on any device.
            </p>

            <!-- After choosing a new password -->
            <div v-if="justReset && mode === 'login'" class="alert alert-success py-2">
              Your password was updated. Log in with the new one.
            </div>

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
                <!-- Only when logging in: for someone who cannot remember the password -->
                <div v-else class="form-text">
                  <RouterLink to="/forgot-password">Forgot password?</RouterLink>
                </div>
              </div>

              <!-- Only when creating an account -->
              <div v-if="mode === 'register'" class="mb-3">
                <label for="login-confirm" class="form-label">Confirm your password</label>
                <input
                  id="login-confirm"
                  v-model="confirmPassword"
                  type="password"
                  class="form-control"
                  autocomplete="new-password"
                />
              </div>

              <!-- Only when creating an account: the 3 security questions, needed for "Forgot password?" -->
              <fieldset v-if="mode === 'register'" class="mb-3">
                <legend class="form-label fs-6 mb-1">Security questions</legend>
                <div class="form-text mt-0 mb-2">
                  These help you reset your password if you forget it. Capital letters do not matter.
                </div>
                <div v-for="(question, index) in SECURITY_QUESTIONS" :key="question" class="mb-2">
                  <label :for="'login-q' + (index + 1)" class="form-label small mb-1">{{ question }}</label>
                  <input :id="'login-q' + (index + 1)" v-model="securityAnswers[index]" type="text" class="form-control"
                    autocomplete="off" />
                </div>
              </fieldset>

              <div v-if="errorMessage" class="alert alert-danger py-2" role="alert">{{ errorMessage }}</div>
              <div v-else-if="auth.error" class="alert alert-danger py-2" role="alert">{{ auth.error }}</div>

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

<style scoped>
/* "Log in to compare your shortlisted flats." */
.login-reason {
  display: inline-block;
  background: var(--beige);
  border-radius: 12px;
  padding: 10px 16px;
  font-size: 16px;
  font-weight: 600;
  margin: 4px 0 8px;
}
</style>
