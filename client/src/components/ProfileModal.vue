<script setup>
// The presets popup: App.vue shows it to a logged-out visitor on a first visit (no presets saved on this device, not skipped before).
// (Logged in it never shows: the presets entered before signing up are copied to the account.)
// It starts with the presets saved last time (localStorage); the answers become the starting filters on Search and the Map.
// "Show me flats" keeps them on this device and opens Search with them applied (an account made later keeps them too).
// "Skip for now" closes it without using what is typed above, keeps the saved presets, and opens Search.
// A guest can open it again any time with the "Presets" button in the top bar (NavBar.vue): then it says
// "Your presets", saves with "Save presets", closes with "Cancel", and stays on the page they are on.
import { ref, onMounted, onUnmounted } from 'vue'
import { keepFocusInside } from '../utils/focusTrap.js'
import ProfileForm from './ProfileForm.vue'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()

// Opened from the "Presets" button (true), or the first-visit welcome (false)..
// Read once: App.vue makes a new popup each time it opens.
const reopened = auth.presetsOpen

// Keyboard: focus moves into the popup, Tab stays inside, Esc closes it
const box = ref(null)
let openedFrom = null

function onKeyDown(event) {
  if (event.key === 'Escape') {
    onSkip()
    return
  }
  keepFocusInside(box.value, event)
}

onMounted(function () {
  openedFrom = document.activeElement
  box.value.focus()
  document.addEventListener('keydown', onKeyDown)
})
onUnmounted(function () {
  document.removeEventListener('keydown', onKeyDown)
  if (openedFrom !== null && document.body.contains(openedFrom)) {
    openedFrom.focus()
  }
})

// "Show me flats" / "Save presets": save the presets on this device and use them as the filters.
// The first time, open Search; from the button, stay on this page (Search and the Map both watch
// auth.presetsVersion and reload with them). Creating an account later copies them to the account.
async function onSave(answers) {
  await auth.saveProfile(answers)
  // Stay on the page the visitor opened
}

// "Skip for now": close the popup (the form's answers are not used) and stay on this page.
// "Cancel" (opened from the button): just close it, on the same page.
function onSkip() {
  auth.skipPresets()
  // Stay on the page the visitor opened
}
</script>

<template>
  <!-- The dark layer over the page, with the white box in the middle -->
  <!-- Esc closes it, the same as "Skip for now" / "Cancel" (see onKeyDown above) -->
  <div class="overlay">
    <div ref="box" tabindex="-1" class="box cosy-card cosy-shadow" role="dialog" aria-modal="true" aria-labelledby="profile-title">
      <!-- Skip / Cancel at the top, always in view, so nobody has to fill in the form to see the flats -->
      <div class="d-flex justify-content-between align-items-center mb-2">
        <span class="eyebrow">{{ reopened ? 'Your preferences' : 'Welcome' }}</span>
        <button type="button" class="skip" :disabled="auth.profileSaving" @click="onSkip">
          {{ reopened ? 'Cancel' : 'Skip for now' }}
        </button>
      </div>
      <h2 id="profile-title" class="serif">What are you <em>looking for?</em></h2>
      <p class="intro">
        Three quick answers to start. You can change them any time.
      </p>

      <ProfileForm
        :profile="auth.profile"
        :saving="auth.profileSaving"
        :error="auth.profileError"
        :button-text="reopened ? 'Save preferences' : 'Show me flats'"
        :more-open="false"
        @save="onSave"
      />

      <!-- First visit: say where to find this again, so skipping is not a dead end -->
      <p v-if="!reopened" class="small text-muted text-center mt-3 mb-0">
        Change these any time with the <strong>Preferences</strong> button (the sliders icon) at the top.
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

/* "Skip for now": a clear button in the top-right corner, big enough to tap */
.skip {
  min-height: 44px;
  padding: 0 16px;
  background: #fff;
  border: 1.5px solid var(--line);
  border-radius: 999px;
  color: var(--char);
  font-size: 15px;
  font-weight: 700;
}
.intro {
  font-size: 15px;
  color: var(--muted);
}
.skip:hover {
  color: var(--terra);
}
</style>
