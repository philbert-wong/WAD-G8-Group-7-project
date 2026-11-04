<script setup>
// The profile settings page (the account icon in the NavBar): change the town, parents' postal code and
// starting filters any time. It is the same form as the sign-up popup. Saving also updates the filters
// shared by Search and the Map, so they use the new answers straight away.
import { ref, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import axios from 'axios'
import ProfileForm from '../components/ProfileForm.vue'
import { useAuthStore } from '../stores/auth'
import { SECURITY_QUESTIONS, allAnswered } from '../utils/securityQuestions.js'
import { BASE_URL } from '../config.js'

const auth = useAuthStore()

// true after a successful save, to show the green message
const saved = ref(false)

// Your Priorities, as saved on the account (null until they have been asked for: the form waits for them)
const priorities = ref(null)
onMounted(async () => {
  priorities.value = await auth.loadPriorities()
})

// Security questions: add or change the 3 answers (the saved answers are never sent back)
const hasAnswers = ref(null)
const securityAnswers = ref(['', '', ''])
const securityMessage = ref('')
const securityError = ref('')

async function loadSecurityStatus() {
  try {
    const response = await axios.get(`${BASE_URL}/api/auth/security-questions`)
    hasAnswers.value = response.data.hasAnswers
  } catch (error) {
    securityError.value = 'Could not check your security questions. Please refresh the page.'
  }
}
onMounted(loadSecurityStatus)

async function saveSecurityAnswers() {
  securityMessage.value = ''
  securityError.value = ''
  if (!allAnswered(securityAnswers.value)) {
    securityError.value = 'Please answer all 3 security questions'
    return
  }
  try {
    await axios.put(`${BASE_URL}/api/auth/security-questions`, { securityAnswers: securityAnswers.value })
    hasAnswers.value = true
    securityAnswers.value = ['', '', '']
    securityMessage.value = 'Saved. You can now use these answers on the Forgot password page.'
  } catch (error) {
    if (error.response && error.response.data && error.response.data.message) {
      securityError.value = error.response.data.message
    } else {
      securityError.value = error.message
    }
  }
}

// "Save" in the form
async function onSave(answers) {
  saved.value = false
  await auth.saveProfile(answers)
  if (auth.profileError === '') {
    saved.value = true
  }
}
</script>

<template>
  <section class="row justify-content-center">
    <!-- Page heading -->
    <div class="col-12 text-center mb-4">
      <span class="eyebrow">Your account</span>
      <h1 class="page-title serif">Profile <em>settings</em></h1>
      <p class="page-sub">Logged in as {{ auth.user.email }}</p>
    </div>

    <div class="col-12 col-md-8 col-lg-5">
      <div class="card shadow-sm">
        <div class="card-body">
          <ProfileForm v-if="priorities !== null" :profile="auth.profile" :priorities="priorities"
            :saving="auth.profileSaving" :error="auth.profileError" button-text="Save changes" @save="onSave" />
          <p v-else class="text-muted mb-0">Loading...</p>

          <div v-if="saved" class="alert alert-success py-2 mt-3 mb-0">
            Saved. Search and the Map now start with these answers and priorities.
            <RouterLink to="/map">Open the map →</RouterLink>
          </div>
        </div>
      </div>

      <!-- Security questions: needed to reset a forgotten password -->
      <div class="card shadow-sm mt-4">
        <div class="card-body">
          <h2 class="h5 serif">Security questions</h2>
          <p v-if="hasAnswers === false" class="alert alert-warning py-2 small">
            Your account has no security questions yet, so a forgotten password cannot be reset. Answer them below.
          </p>
          <p v-else-if="hasAnswers === true" class="small text-muted">
            Your answers are saved. To change them, type new answers and press Save.
          </p>
          <form @submit.prevent="saveSecurityAnswers">
            <div v-for="(question, index) in SECURITY_QUESTIONS" :key="question" class="mb-2">
              <label :for="'profile-q' + (index + 1)" class="form-label small mb-1">{{ question }}</label>
              <input :id="'profile-q' + (index + 1)" v-model="securityAnswers[index]" type="text" class="form-control"
                autocomplete="off" />
            </div>
            <button type="submit" class="btn btn-primary mt-2">Save security answers</button>
          </form>
          <div v-if="securityMessage" class="alert alert-success py-2 mt-3 mb-0" role="status">{{ securityMessage }}</div>
          <div v-if="securityError" class="alert alert-danger py-2 mt-3 mb-0" role="alert">{{ securityError }}</div>
        </div>
      </div>
    </div>
  </section>
</template>
