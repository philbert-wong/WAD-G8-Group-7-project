<script setup>
// The Help tour: a round "?" button in the bottom-right corner of every page. Pressing it lights up the parts of
// the current page one at a time, with a dark card explaining each one (the steps are in utils/tourSteps.js).
// It also starts by itself the first time you open each page (once per page), once the presets popup has been closed.
// Same idea as the old guide pet tour (guide-pet-backup/GuidePet.vue), without the pet.
//
// ⚠️ NOT IN OUR COURSE:
//   - document.querySelectorAll, getBoundingClientRect, getComputedStyle (find a part of the page and where it is)
//   - window.addEventListener for 'scroll', 'resize' and 'keydown' (keep the light on it when the page moves; Esc closes)
//   - scrollIntoView and focus({ preventScroll }) (scroll the part into view, put the keyboard on the Next button)
//   - CSS: the "spotlight" is a see-through box with a huge shadow around it, which darkens the rest of the page
//   - requestAnimationFrame (move the scroll, the light and the card together, one small step per screen refresh)
//   - Vue's <Teleport> (put the light and card straight into <body>, so their page positions are easy to work out)
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { TOUR_STEPS, FALLBACK_STEPS } from '../utils/tourSteps.js'
import { keepFocusInside } from '../utils/focusTrap.js'

const route = useRoute()
const auth = useAuthStore()

// Saved in the browser once a page's tour has been seen (finished or skipped), so it only starts by itself once per page.
// One key per page, e.g. 'tourSeen:/map'. (The Search page keeps its older key, so people who saw it are not asked again.)
function seenKey(page) {
  if (page === '/') {
    return 'searchTourSeen'
  }
  return 'tourSeen:' + page
}
// Space between the lit-up part and the edge of the light, and between the light and the card (pixels)
const PADDING = 6
const GAP = 14

const open = ref(false)
const steps = ref([]) // the steps of the page the tour was opened on
const stepIndex = ref(0)
let tourPage = '' // the page address the tour was opened on

// Where the light is ON THE PAGE (not the screen): { top, left, width, height } in pixels, or null = nothing to light up.
// Page positions mean the light and the card scroll with the page by themselves, like any other part of it.
const spot = ref(null)
// Where the card is: { top, left } in pixels, or null = not measured yet (the card stays invisible until then).
// On the page when something is lit up; on the screen (cardOnScreen) when nothing is, so it stays in the middle.
const cardPlace = ref(null)
const cardOnScreen = ref(false)
const card = ref(null) // the card element, to measure its size
const nextButton = ref(null)

// The page element that is lit up (a normal variable: the template does not show it)
let currentTarget = null

// Until this time (ms), the tour itself is scrolling to a new step: scroll events are ignored, so the glide is not cut short
let stepMovingUntil = 0

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
// getBoundingClientRect gives screen positions; adding how far the page is scrolled (scrollX / scrollY) turns them
// into page positions, which stay the same however the page scrolls.
// Runs on every step (gliding), and again when the window changes size (no gliding).
function measure() {
  if (!open.value) {
    return
  }

  if (currentTarget === null) {
    spot.value = null
  } else {
    const box = currentTarget.getBoundingClientRect()
    spot.value = {
      top: box.top + window.scrollY - PADDING,
      left: box.left + window.scrollX - PADDING,
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

  // The light's place on the screen right now (the card is chosen to fit the screen)
  let view = null
  if (spot.value !== null) {
    view = {
      top: spot.value.top - window.scrollY,
      left: spot.value.left - window.scrollX,
      width: spot.value.width,
      height: spot.value.height,
    }
  }

  if (view !== null) {
    const below = view.top + view.height + GAP
    const above = view.top - GAP - cardHeight
    const leftSide = view.left - GAP - cardWidth
    const rightSide = view.left + view.width + GAP

    if (below + cardHeight <= screenHeight - 12 || above >= 12) {
      // 1 and 2: under or above, lined up with the light's left edge
      left = view.left
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
      top = Math.max(12, view.top)
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

  if (view === null) {
    // Nothing lit up: stay in the middle of the screen
    cardOnScreen.value = true
    cardPlace.value = { top: top, left: left }
  } else {
    // Next to the light: a page position, so it scrolls with the light
    cardOnScreen.value = false
    cardPlace.value = { top: top + window.scrollY, left: left + window.scrollX }
  }
}

// ---------- The steps ----------

// Shows this step: the light glides in a straight line from the last part to this one, while the page scrolls
// smoothly to it at the same time (both move together, so the light never wanders).
async function showStep() {
  // A step may give a smaller thing to light up on phones (targetSmall): a part that is taller than the screen
  // cannot be lit up as a whole, and the card would have no room next to it (see tourSteps.js)
  let selector = step.value.target
  if (step.value.targetSmall !== undefined && window.innerWidth < 768) {
    selector = step.value.targetSmall
  }
  currentTarget = findTarget(selector)

  // Wait for Vue to put the new text in the card, so its height is right before it is placed
  await nextTick()

  // Where everything is now
  const fromSpot = spot.value
  const fromCard = cardPlace.value
  const fromCardOnScreen = cardOnScreen.value
  const startX = window.scrollX
  const startY = window.scrollY

  // Where the page will end up: jump there, place the light and card for that view, and jump straight back.
  // The browser only draws the screen after this code finishes, so the jumps are never seen.
  let endX = startX
  let endY = startY
  if (currentTarget !== null) {
    currentTarget.scrollIntoView({ behavior: 'instant', block: 'center' })
    endX = window.scrollX
    endY = window.scrollY
  }
  measure()
  const toSpot = spot.value
  const toCard = cardPlace.value
  window.scrollTo({ left: startX, top: startY, behavior: 'instant' })

  // The card can only glide if it stays the same kind of position (on the page, or on the screen)
  let cardFrom = fromCard
  if (fromCardOnScreen !== cardOnScreen.value) {
    cardFrom = null
  }
  glide(fromSpot, toSpot, cardFrom, toCard, startX, startY, endX, endY)

  if (nextButton.value !== null) {
    nextButton.value.focus({ preventScroll: true })
  }
}

// ---------- One smooth move ----------

const GLIDE_MS = 450
let glideFrame = null // the requestAnimationFrame waiting to run, so a newer step can cancel an older glide

// A number partway between a and b (t = 0 gives a, t = 1 gives b)
function between(a, b, t) {
  return a + (b - a) * t
}

// A box ({ top, left, width?, height? }) partway between box a and box b. No start box: the end box straight away.
function boxBetween(a, b, t) {
  if (a === null || b === null) {
    return b
  }
  const box = { top: between(a.top, b.top, t), left: between(a.left, b.left, t) }
  if (b.width !== undefined) {
    box.width = between(a.width, b.width, t)
    box.height = between(a.height, b.height, t)
  }
  return box
}

// Moves the page scroll, the light and the card together, on ONE timer: every frame each one has gone the same
// part of the way. So on the screen the light travels in a straight line and never drifts off first.
// requestAnimationFrame runs a function just before the next screen refresh (about 60 times a second).
function glide(fromSpot, toSpot, fromCard, toCard, startX, startY, endX, endY) {
  cancelAnimationFrame(glideFrame)
  // Users who turned on "Reduce motion": jump straight there
  let duration = GLIDE_MS
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    duration = 0
  }
  const started = performance.now()
  stepMovingUntil = Date.now() + duration + 200

  function frame(now) {
    let t = 1
    if (duration > 0) {
      t = Math.min(1, (now - started) / duration)
    }
    // Ease in and out: starts and stops gently, but every part uses the same t, so the path stays straight
    const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2

    window.scrollTo({ left: between(startX, endX, eased), top: between(startY, endY, eased), behavior: 'instant' })
    spot.value = boxBetween(fromSpot, toSpot, eased)
    cardPlace.value = boxBetween(fromCard, toCard, eased)

    if (t < 1) {
      glideFrame = requestAnimationFrame(frame)
    }
  }
  // Show the start positions first (measure() already put the end ones in), then go
  spot.value = boxBetween(fromSpot, toSpot, 0)
  cardPlace.value = boxBetween(fromCard, toCard, 0)
  glideFrame = requestAnimationFrame(frame)
}

// The "?" button (or the first visit to a page): the tour of the page you are on
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
// true when the tour was opened with the "?" button
let openedByButton = false
const helpButton = ref(null)

function startTourFromButton() {
  openedByButton = true
  startTour()
}

function closeTour() {
  open.value = false
  if (openedByButton) {
    openedByButton = false
    // Put the focus back on "?" once it is shown again
    nextTick(function () {
      if (helpButton.value !== null) {
        helpButton.value.focus()
      }
    })
  }
  cancelAnimationFrame(glideFrame)
  spot.value = null
  currentTarget = null
  // This page's tour has been seen, so it does not start by itself again
  localStorage.setItem(seenKey(tourPage), 'yes')
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

// ---------- Starting by itself on a first visit ----------

let autoStartTimer = null

// First visit to a page that has a tour, and the presets popup is closed: start that page's tour straight away.
// It waits a moment first, so the page and its cards (or map dots) have loaded.
function autoStartIfNew() {
  clearTimeout(autoStartTimer)
  const page = route.path
  if (TOUR_STEPS[page] === undefined || auth.needsProfile || open.value) {
    return
  }
  // Arriving from the calculator's "Apply Budget to Search": the user is in the middle of a task, so no tour
  if (route.query.maxPrice !== undefined) {
    return
  }
  if (localStorage.getItem(seenKey(page)) === 'yes') {
    return
  }
  // Phones held sideways: the screen is too short for the tour card (the "?" button still starts the tour)
  if (window.innerWidth <= 991.98 && window.innerHeight <= 500) {
    return
  }
  autoStartTimer = setTimeout(function () {
    // Check again: the user may have moved to another page in the meantime
    if (route.path === page && !auth.needsProfile && !open.value) {
      startTour()
    }
  }, 1200)
}

// A tour belongs to one page, so it closes when you go to another page.
// Arriving on a page, or closing the presets popup, may start that page's first-visit tour.
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

// The window changed size: put the light and card in their new places at once (no gliding)
function onResize() {
  measure()
}

// Something scrolled. The whole page scrolling needs nothing: the light and card are on the page and move with it.
// A box inside the page scrolling (e.g. the filter sidebar) moves the part inside it, so measure again at once.
function onScroll(event) {
  if (event.target === document || Date.now() < stepMovingUntil) {
    return
  }
  measure()
}

// Esc closes the tour; Tab / Shift+Tab stay inside the tour card (not on the page dimmed behind it)
function onKeyDown(event) {
  if (open.value && event.key === 'Escape') {
    closeTour()
  }
  if (open.value) {
    keepFocusInside(card.value, event)
  }
}

onMounted(function () {
  // true = also hear scrolling inside boxes (e.g. the filter sidebar), not just the page
  window.addEventListener('scroll', onScroll, true)
  window.addEventListener('resize', onResize)
  window.addEventListener('keydown', onKeyDown)
  autoStartIfNew()
})

onUnmounted(function () {
  window.removeEventListener('scroll', onScroll, true)
  window.removeEventListener('resize', onResize)
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
    ref="helpButton"
    @click="startTourFromButton"
  >
    ?
  </button>

  <template v-if="open">
    <!-- Covers the page so it cannot be clicked during the tour (and darkens it when nothing is lit up) -->
    <div class="tour-blocker" :class="{ dim: spot === null }"></div>

    <!-- The light and the card go straight into <body> (Teleport), so their page positions count from the top of the page -->
    <Teleport to="body">
    <!-- The light: a see-through box around the part of the page; its huge shadow darkens everything else -->
    <div v-if="spot !== null" class="tour-spot" :style="spotStyle"></div>

    <!-- The card: step number and dots, the title and text, Next / Done, Back and Skip -->
    <div ref="card" class="tour-card" :class="{ 'on-screen': cardOnScreen }" :style="cardStyle" role="dialog" aria-modal="true" aria-labelledby="tour-title">
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
    </Teleport>
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
/* Phones and tablets: lift the "?" above the page tab bar at the bottom (NavBar.vue) */
@media (max-width: 991.98px) {
  .help-btn {
    bottom: calc(76px + env(safe-area-inset-bottom, 0px));
  }
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
   It glides from one part to the next (see glide() above). Clicks go through it to the blocker. */
.tour-spot {
  position: absolute; /* a page position: it scrolls with the page */
  z-index: 2101;
  border-radius: 12px;
  box-shadow:
    0 0 0 3px rgba(255, 255, 255, 0.9),
    0 0 0 9999px rgba(15, 23, 42, 0.6);
  pointer-events: none;
}

/* The dark card (like the screenshots): 340px wide, or the screen width minus a margin on phones */
.tour-card {
  position: absolute; /* next to the light, on the page */
  z-index: 2102;
  width: min(340px, calc(100vw - 24px));
  background: #0f172a;
  color: #fff;
  border-radius: 16px;
  padding: 18px 20px 14px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.35);
}
/* Nothing lit up: the card stays in the middle of the screen */
.tour-card.on-screen {
  position: fixed;
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

</style>
