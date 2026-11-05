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

// Which sections are open (both start closed, so both titles are in view)
const preferencesOpen = ref(false)
const securityOpen = ref(false)

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
    // No answers yet: open the section, so the user sees it needs answering
    if (hasAnswers.value === false) {
      securityOpen.value = true
    }
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
      <!-- Preferences: click the title to open or close -->
      <div class="card shadow-sm prefs-card">
        <button type="button" class="section-toggle" :aria-expanded="preferencesOpen"
          @click="preferencesOpen = !preferencesOpen">
          <span>
            <span class="h5 serif d-block mb-0">Preferences</span>
            <span class="small text-muted">Town, flat type, budget and your priorities</span>
          </span>
          <span v-if="preferencesOpen" class="state">Hide ▴</span>
          <span v-else class="state">Show ▾</span>
        </button>
        <div v-show="preferencesOpen" class="card-body pt-0">
          <ProfileForm v-if="priorities !== null" :profile="auth.profile" :priorities="priorities"
            :saving="auth.profileSaving" :error="auth.profileError" button-text="Save changes" @save="onSave" />
          <p v-else class="text-muted mb-0">Loading...</p>

          <div v-if="saved" class="alert alert-success py-2 mt-3 mb-0">
            Saved. Search and the Map now start with these answers and priorities.
            <RouterLink to="/map">Open the map →</RouterLink>
          </div>
        </div>
      </div>

      <!-- Security questions: needed to reset a forgotten password. Click the title to open or close -->
      <div class="card shadow-sm mt-3 security-card">
        <button type="button" class="section-toggle" :aria-expanded="securityOpen" @click="securityOpen = !securityOpen">
          <span>
            <span class="h5 serif d-block mb-0">Security questions</span>
            <span class="small text-muted">Used to reset a forgotten password</span>
          </span>
          <span v-if="securityOpen" class="state">Hide ▴</span>
          <span v-else class="state">Show ▾</span>
        </button>
        <div v-show="securityOpen" class="card-body pt-0">
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

<style scoped>
/* The title row of each section: the whole row is one big button */
.section-toggle {
  width: 100%;
  min-height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 20px;
  border: 0;
  background: none;
  text-align: left;
}
.state {
  color: var(--terra);
  font-weight: 600;
  white-space: nowrap;
}
</style>
