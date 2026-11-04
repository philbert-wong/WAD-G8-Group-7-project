<script setup>
// "Forgot password?" page (the link under the password box on the Login page).
// No email is sent: they type their email and create a new password right here.
// On success we go to the Login page, which says the password was updated.
import { ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const router = useRouter()

const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const errorMessage = ref('') // problems found by this page; problems from the server are in auth.error

// Checks the form before we send it. Returns an error message, or '' when it is fine.
// (The server checks too; this just gives a quicker answer.)
function checkForm() {
  if (email.value.trim() === '' || password.value === '') {
    return 'Please enter your email and a new password'
  }
  if (password.value.length < 8) {
    return 'Password must be at least 8 characters'
  }
  if (password.value !== confirmPassword.value) {
    return 'The two passwords do not match'
  }
  return ''
}

// "Create new password" button
async function submit() {
  errorMessage.value = checkForm()
  auth.error = ''
  if (errorMessage.value !== '') {
    return
  }

  const worked = await auth.resetPassword(email.value, password.value)
  if (worked) {
    router.push({ path: '/login', query: { reset: '1' } })
  }
}
</script>

<template>
  <section class="row justify-content-center">
    <!-- Page heading -->
    <div class="col-12 text-center mb-4">
      <h1 class="page-title serif">Forgot your <em>password?</em></h1>
      <p class="page-sub">Enter your email and create a new password.</p>
    </div>

    <div class="col-12 col-md-8 col-lg-5">
      <div class="card shadow-sm">
        <div class="card-body">
          <form @submit.prevent="submit">
            <div class="mb-3">
              <label for="forgot-email" class="form-label">Email</label>
              <input id="forgot-email" v-model="email" type="email" class="form-control" autocomplete="email" />
            </div>

            <div class="mb-3">
              <label for="forgot-password" class="form-label">New password</label>
              <input
                id="forgot-password"
                v-model="password"
                type="password"
                class="form-control"
                autocomplete="new-password"
              />
              <div class="form-text">At least 8 characters.</div>
            </div>

            <div class="mb-3">
              <label for="forgot-confirm" class="form-label">Confirm your new password</label>
              <input
                id="forgot-confirm"
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
              <span v-else>Create new password</span>
            </button>

            <div class="text-center mt-3">
              <RouterLink to="/login" class="small">Back to log in</RouterLink>
            </div>
          </form>
        </div>
      </div>
    </div>
  </section>
</template>
