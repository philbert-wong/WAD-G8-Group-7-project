<script setup>
// The Help tour: a round "?" button in the bottom-right corner of every page. Pressing it lights up the parts of
// the current page one at a time, with a dark card explaining each one (the steps are in utils/tourSteps.js).
// On the Search page it also starts by itself on a first visit, once the presets popup has been closed.
// Same idea as the old guide pet tour (guide-pet-backup/GuidePet.vue), without the pet.
//
// ⚠️ NOT IN OUR COURSE:
//   - document.querySelectorAll, getBoundingClientRect, getComputedStyle (find a part of the page and where it is)
//   - window.addEventListener for 'scroll', 'resize' and 'keydown' (keep the light on it when the page moves; Esc closes)
//   - scrollIntoView and focus({ preventScroll }) (scroll the part into view, put the keyboard on the Next button)
//   - CSS: the "spotlight" is a see-through box with a huge shadow around it, which darkens the rest of the page
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { TOUR_STEPS, FALLBACK_STEPS } from '../utils/tourSteps.js'

const route = useRoute()
const auth = useAuthStore()

// Saved in the browser once the Search tour has been seen (finished or skipped), so it only starts by itself once
const SEEN_KEY = 'searchTourSeen'
// Space between the lit-up part and the edge of the light, and between the light and the card (pixels)
const PADDING = 6
const GAP = 14

const open = ref(false)
const steps = ref([]) // the steps of the page the tour was opened on
const stepIndex = ref(0)
let tourPage = '' // the page address the tour was opened on

// Where the light is on the screen: { top, left, width, height } in pixels, or null = nothing to light up
const spot = ref(null)
// Where the card is: { top, left } in pixels, or null = not measured yet (the card stays invisible until then)
const cardPlace = ref(null)
const card = ref(null) // the card element, to measure its size
const nextButton = ref(null)

// The page element that is lit up (a normal variable: the template does not show it)
let currentTarget = null

// The step on screen now
const step = computed(function () {
  return steps.value[stepIndex.value]
})

const isLastStep = computed(function () {
  return stepIndex.value === steps.value.length - 1
})

// The card's position as a style (hidden until it has been measured, so it does not jump)
const cardStyle = computed(function () {
  if (cardPlace.value === null) {
    return { visibility: 'hidden' }
  }
  return { top: cardPlace.value.top + 'px', left: cardPlace.value.left + 'px' }
})

// The light's position as a style
const spotStyle = computed(function () {
  return {
    top: spot.value.top + 'px',
    left: spot.value.left + 'px',
    width: spot.value.width + 'px',
    height: spot.value.height + 'px',
  }
})

// ---------- Finding the part of the page ----------

// The first element that matches the selector AND can be seen on this screen (not display: none, not hidden),
// or null when there is none (e.g. no cards on an empty shortlist). That is how one step can point at the
// "☰ Filters" button on phones and at the filter sidebar on computers.
function findTarget(selector) {
  if (selector === '') {
    return null
  }

  let elements = []
  try {
    elements = document.querySelectorAll(selector)
  } catch (error) {
    // A selector this browser does not understand: show the step without a light
    return null
  }

  for (const element of elements) {
    const box = element.getBoundingClientRect()
    const hidden = window.getComputedStyle(element).visibility === 'hidden'
    if (box.width > 0 && box.height > 0 && !hidden) {
      return element
    }
  }
  return null
}

// ---------- Placing the light and the card ----------

// Puts the light around the lit-up part and the card next to it.
// Runs on every step, and again whenever the page scrolls or the window changes size.
function measure() {
  if (!open.value) {
    return
  }

  if (currentTarget === null) {
    spot.value = null
  } else {
    const box = currentTarget.getBoundingClientRect()
    spot.value = {
      top: box.top - PADDING,
      left: box.left - PADDING,
      width: box.width + PADDING * 2,
      height: box.height + PADDING * 2,
    }
  }

  placeCard()
}

// Where the card goes, in this order of preference:
//   1. under the light, 2. above it, 3. beside it (left, then right) for tall parts like the filter sidebar,
//   4. pinned to the bottom of the screen (phones, where there is no room beside it).
// Nothing lit up: the middle of the screen. The card never goes past the edges of the screen.
function placeCard() {
  if (card.value === null) {
    return
  }
  const screenWidth = window.innerWidth
  const screenHeight = window.innerHeight
  const cardWidth = card.value.offsetWidth
  const cardHeight = card.value.offsetHeight

  // Nothing lit up: the middle of the screen
  let left = (screenWidth - cardWidth) / 2
  let top = (screenHeight - cardHeight) / 2

  if (spot.value !== null) {
    const below = spot.value.top + spot.value.height + GAP
    const above = spot.value.top - GAP - cardHeight
    const leftSide = spot.value.left - GAP - cardWidth
    const rightSide = spot.value.left + spot.value.width + GAP

    if (below + cardHeight <= screenHeight - 12 || above >= 12) {
      // 1 and 2: under or above, lined up with the light's left edge
      left = spot.value.left
      if (below + cardHeight <= screenHeight - 12) {
        top = below
      } else {
        top = above
      }
    } else if (leftSide >= 12 || rightSide + cardWidth <= screenWidth - 12) {
      // 3: beside it, level with the top of the light (or the top of the screen if the light starts above it)
      if (leftSide >= 12) {
        left = leftSide
      } else {
        left = rightSide
      }
      top = Math.max(12, spot.value.top)
    } else {
      // 4: the bottom of the screen
      top = screenHeight - cardHeight - 12
    }

    // Keep the card on the screen
    if (left + cardWidth > screenWidth - 12) {
      left = screenWidth - cardWidth - 12
    }
    if (left < 12) {
      left = 12
    }
    if (top + cardHeight > screenHeight - 12) {
      top = screenHeight - cardHeight - 12
    }
  }

  cardPlace.value = { top: top, left: left }
}

// ---------- The steps ----------

// Finds this step's part of the page, scrolls it into view, then places the light and the card
async function showStep() {
  currentTarget = findTarget(step.value.target)
  if (currentTarget !== null) {
    currentTarget.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  // Wait for Vue to put the new text in the card, so its height is right before it is placed
  await nextTick()
  measure()
  if (nextButton.value !== null) {
    nextButton.value.focus({ preventScroll: true })
  }
}

// The "?" button (or the first visit to Search): the tour of the page you are on
function startTour() {
  tourPage = route.path
  if (TOUR_STEPS[tourPage] !== undefined) {
    steps.value = TOUR_STEPS[tourPage]
  } else {
    steps.value = FALLBACK_STEPS
  }
  stepIndex.value = 0
  cardPlace.value = null
  open.value = true
  showStep()
}

// "Skip tour", "Done", Esc, or going to another page
function closeTour() {
  open.value = false
  spot.value = null
  currentTarget = null
  // The Search tour has been seen, so it does not start by itself again
  if (tourPage === '/') {
    localStorage.setItem(SEEN_KEY, 'yes')
  }
}

function nextStep() {
  if (isLastStep.value) {
    closeTour()
  } else {
    stepIndex.value = stepIndex.value + 1
    showStep()
  }
}

function backStep() {
  if (stepIndex.value > 0) {
    stepIndex.value = stepIndex.value - 1
    showStep()
  }
}

// ---------- Starting by itself on Search ----------

let autoStartTimer = null

// First visit to Search, and the presets popup is closed: start the tour.
// It waits a moment first, so the page and its result cards have loaded.
function autoStartIfNew() {
  clearTimeout(autoStartTimer)
  if (route.path !== '/' || auth.needsProfile || open.value) {
    return
  }
  if (localStorage.getItem(SEEN_KEY) === 'yes') {
    return
  }
  autoStartTimer = setTimeout(function () {
    // Check again: the user may have moved to another page in the meantime
    if (route.path === '/' && !auth.needsProfile && !open.value) {
      startTour()
    }
  }, 1200)
}

// A tour belongs to one page, so it closes when you go to another page.
// Arriving on Search, or closing the presets popup there, may start the first-visit tour.
watch(
  function () {
    return route.path
  },
  function () {
    if (open.value) {
      closeTour()
    }
    autoStartIfNew()
  },
)
watch(
  function () {
    return auth.needsProfile
  },
  autoStartIfNew,
)

// ---------- Keeping the light in place ----------

// Esc closes the tour
function onKeyDown(event) {
  if (open.value && event.key === 'Escape') {
    closeTour()
  }
}

onMounted(function () {
  // true = also hear scrolling inside boxes (e.g. the filter sidebar), not just the page
  window.addEventListener('scroll', measure, true)
  window.addEventListener('resize', measure)
  window.addEventListener('keydown', onKeyDown)
  autoStartIfNew()
})

onUnmounted(function () {
  window.removeEventListener('scroll', measure, true)
  window.removeEventListener('resize', measure)
  window.removeEventListener('keydown', onKeyDown)
  clearTimeout(autoStartTimer)
})
</script>

<template>
  <!-- The round Help button, bottom-right on every page -->
  <button
    v-if="!open"
    type="button"
    class="help-btn"
    aria-label="Help: a quick tour of this page"
    title="Help"
    @click="startTour"
  >
    ?
  </button>

  <template v-if="open">
    <!-- Covers the page so it cannot be clicked during the tour (and darkens it when nothing is lit up) -->
    <div class="tour-blocker" :class="{ dim: spot === null }"></div>

    <!-- The light: a see-through box around the part of the page; its huge shadow darkens everything else -->
    <div v-if="spot !== null" class="tour-spot" :style="spotStyle"></div>

    <!-- The card: step number and dots, the title and text, Next / Done, Back and Skip -->
    <div ref="card" class="tour-card" :style="cardStyle" role="dialog" aria-modal="true" aria-labelledby="tour-title">
      <div class="d-flex justify-content-between align-items-center">
        <span class="tour-count">Step {{ stepIndex + 1 }} of {{ steps.length }}</span>
        <span class="tour-dots">
          <i v-for="(s, index) in steps" :key="index" :class="{ on: index === stepIndex }"></i>
        </span>
      </div>

      <h5 id="tour-title">{{ step.title }}</h5>
      <p>{{ step.text }}</p>

      <button ref="nextButton" type="button" class="tour-next" @click="nextStep">
        <span v-if="isLastStep">Done</span>
        <span v-else>Next →</span>
      </button>

      <div v-if="steps.length > 1" class="d-flex justify-content-between mt-2">
        <button v-if="stepIndex > 0" type="button" class="tour-link" @click="backStep">← Back</button>
        <span v-else></span>
        <button v-if="!isLastStep" type="button" class="tour-link" @click="closeTour">Skip tour</button>
      </div>
    </div>
  </template>
</template>

<style scoped>
/* The round "?" button, fixed to the bottom-right corner.
   z-index: above the Leaflet map (up to 1000), below the phone filter drawer (1040+) and the presets popup (2000) */
.help-btn {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 1030;
  width: 52px;
  height: 52px;
  border: 0;
  border-radius: 50%;
  background: var(--terra);
  color: #fff;
  font-size: 24px;
  font-weight: 700;
  box-shadow: 0 8px 20px rgba(30, 30, 60, 0.3);
}
.help-btn:hover {
  background: var(--terra-d);
}

/* Over the whole page, under the light and the card (above the presets popup's 2000, which is closed by now) */
.tour-blocker {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 2100;
}
.tour-blocker.dim {
  background: rgba(15, 23, 42, 0.6);
}

/* The light: a thin white ring, and a shadow 9999px wide that darkens the rest of the screen.
   It glides from one part to the next (transition). Clicks go through it to the blocker. */
.tour-spot {
  position: fixed;
  z-index: 2101;
  border-radius: 12px;
  box-shadow:
    0 0 0 3px rgba(255, 255, 255, 0.9),
    0 0 0 9999px rgba(15, 23, 42, 0.6);
  pointer-events: none;
  transition: top 0.25s ease, left 0.25s ease, width 0.25s ease, height 0.25s ease;
}

/* The dark card (like the screenshots): 340px wide, or the screen width minus a margin on phones */
.tour-card {
  position: fixed;
  z-index: 2102;
  width: min(340px, calc(100vw - 24px));
  background: #0f172a;
  color: #fff;
  border-radius: 16px;
  padding: 18px 20px 14px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.35);
  transition: top 0.25s ease, left 0.25s ease;
}

/* "STEP 2 OF 5" */
.tour-count {
  font-size: 12px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #94a3b8;
}

/* One dot per step; the current one is white */
.tour-dots {
  display: flex;
  gap: 6px;
}
.tour-dots i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #475569;
}
.tour-dots i.on {
  background: #fff;
}

.tour-card h5 {
  font-size: 19px;
  font-weight: 700;
  margin: 10px 0 8px;
}
.tour-card p {
  font-size: 14.5px;
  line-height: 1.55;
  color: #cbd5e1;
  margin: 0 0 16px;
}

/* Next / Done: full width */
.tour-next {
  width: 100%;
  border: 0;
  border-radius: 10px;
  padding: 10px;
  background: #334155;
  color: #fff;
  font-weight: 600;
}
.tour-next:hover {
  background: #475569;
}

/* Back and Skip: small grey text buttons */
.tour-link {
  border: 0;
  background: none;
  color: #94a3b8;
  font-size: 13px;
  padding: 2px 0;
}
.tour-link:hover {
  color: #fff;
}

/* Users who turned on "Reduce motion" get no gliding */
@media (prefers-reduced-motion: reduce) {
  .tour-spot,
  .tour-card {
    transition: none;
  }
}
</style>
