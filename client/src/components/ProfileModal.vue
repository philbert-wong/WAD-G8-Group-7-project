<script setup>
// The presets popup: App.vue shows it to a logged-out visitor on a first visit (no presets saved on this device, not skipped before).
// (Logged in it never shows: the presets entered before signing up are copied to the account.)
// It starts with the presets saved last time (localStorage); the answers become the starting filters on Search and the Map.
// "Show me flats" keeps them on this device and opens Search with them applied (an account made later keeps them too).
// "Skip for now" closes it without using what is typed above, keeps the saved presets, and opens Search.
// A guest can open it again any time with the "Presets" button in the top bar (NavBar.vue): then it says
// "Your presets", saves with "Save presets", closes with "Cancel", and stays on the page they are on.
import { useRouter } from 'vue-router'
import ProfileForm from './ProfileForm.vue'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const router = useRouter()

// Opened from the "Presets" button (true), or the first-visit welcome (false).
// Read once: App.vue makes a new popup each time it opens.
const reopened = auth.presetsOpen

// "Show me flats" / "Save presets": save the presets on this device and use them as the filters.
// The first time, open Search; from the button, stay on this page (Search and the Map both watch
// auth.presetsVersion and reload with them). Creating an account later copies them to the account.
async function onSave(answers) {
  await auth.saveProfile(answers)
  if (!reopened) {
    router.push('/')
  }
}

// "Skip for now": close the popup (the form's answers are not used) and go to Search.
// "Cancel" (opened from the button): just close it, on the same page.
function onSkip() {
  auth.skipPresets()
  if (!reopened) {
    router.push('/')
  }
}
</script>

<template>
  <!-- The dark layer over the page, with the white box in the middle -->
  <div class="overlay">
    <div class="box cosy-card cosy-shadow" role="dialog" aria-modal="true" aria-labelledby="profile-title">
      <span class="eyebrow">{{ reopened ? 'Your presets' : 'Welcome' }}</span>
      <h2 id="profile-title" class="serif">What are you <em>looking for?</em></h2>
      <p class="small text-muted">
        These set your starting filters and what matters to you (Your Priorities) on Search and the Map,
        and are saved on this device for next time.
      </p>

      <ProfileForm
        :profile="auth.profile"
        :saving="auth.profileSaving"
        :error="auth.profileError"
        :button-text="reopened ? 'Save presets' : 'Show me flats'"
        @save="onSave"
      />

      <button type="button" class="skip" :disabled="auth.profileSaving" @click="onSkip">
        {{ reopened ? 'Cancel' : 'Skip for now' }}
      </button>
      <!-- First visit: say where to find this again, so skipping is not a dead end -->
      <p v-if="!reopened" class="small text-muted text-center mt-1 mb-0">
        You can change these any time with the <strong>Presets</strong> button at the top.
      </p>
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
