<script setup>
// The profile settings page (the account icon in the NavBar): change the town, parents' postal code and
// starting filters any time. It is the same form as the sign-up popup. Saving also updates the filters
// shared by Search and the Map, so they use the new answers straight away.
import { ref, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import ProfileForm from '../components/ProfileForm.vue'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()

// true after a successful save, to show the green message
const saved = ref(false)

// Your Priorities, as saved on the account (null until they have been asked for: the form waits for them)
const priorities = ref(null)
onMounted(async function () {
  priorities.value = await auth.loadPriorities()
})

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
          <ProfileForm
            v-if="priorities !== null"
            :profile="auth.profile"
            :priorities="priorities"
            :saving="auth.profileSaving"
            :error="auth.profileError"
            button-text="Save changes"
            @save="onSave"
          />
          <p v-else class="text-muted mb-0">Loading...</p>

          <div v-if="saved" class="alert alert-success py-2 mt-3 mb-0">
            Saved. Search and the Map now start with these answers and priorities.
            <RouterLink to="/map">Open the map →</RouterLink>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
