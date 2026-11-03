<script setup>
// The presets popup: App.vue shows it to a logged-out visitor on a first visit (no presets saved on this device, not skipped before).
// (Logged in it never shows: the presets entered before signing up are copied to the account.)
// It starts with the presets saved last time (localStorage); the answers become the starting filters on Search and the Map.
// "Show me flats" keeps them on this device and opens Search with them applied (an account made later keeps them too).
// "Skip for now" closes it for this visit without using what is typed above, keeps the saved presets, and opens Search.
import { useRouter } from 'vue-router'
import ProfileForm from './ProfileForm.vue'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const router = useRouter()

// "Show me flats": save the presets on this device and use them as the filters, then open Search, which reloads
// its cards with them (SearchView watches auth.presetsVersion). Creating an account later copies them to the account.
// (Once saved, App.vue stops showing this popup.)
async function onSave(answers) {
  await auth.saveProfile(answers)
  router.push('/')
}

// "Skip for now": close the popup for this visit (the form's answers are not used), and go to Search
function onSkip() {
  auth.skipPresets()
  router.push('/')
}
</script>

<template>
  <!-- The dark layer over the page, with the white box in the middle -->
  <div class="overlay">
    <div class="box cosy-card cosy-shadow" role="dialog" aria-modal="true" aria-labelledby="profile-title">
      <span class="eyebrow">Welcome</span>
      <h2 id="profile-title" class="serif">What are you <em>looking for?</em></h2>
      <p class="small text-muted">
        These set your starting filters on Search and the Map, and are saved on this device for next time.
      </p>

      <ProfileForm
        :profile="auth.profile"
        :saving="auth.profileSaving"
        :error="auth.profileError"
        button-text="Show me flats"
        @save="onSave"
      />

      <button type="button" class="skip" :disabled="auth.profileSaving" @click="onSkip">Skip for now</button>
    </div>
  </div>
</template>

<style scoped>
/* Covers the whole window (position: fixed). z-index is above the Leaflet map (its panes go up to 1000). */
.overlay {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  background: rgba(30, 30, 40, 0.55);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

/* The white box: never wider than 520px, and it scrolls inside if the window is short */
.box {
  width: 100%;
  max-width: 520px;
  max-height: 90vh;
  overflow-y: auto;
  padding: 28px;
}
.box h2 {
  font-size: 28px;
  margin-bottom: 6px;
}

/* "Skip for now": a plain text link under the form */
.skip {
  display: block;
  margin: 14px auto 0;
  background: none;
  border: none;
  color: var(--muted);
  font-size: 14px;
  text-decoration: underline;
}
.skip:hover {
  color: var(--terra);
}
</style>
