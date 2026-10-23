<script setup>
// =====================================================================================
// GUIDE PET (DESIGN PREVIEW): Mochi the cat / Biscuit the dog walks new users through the Search page.
//
// ⚠️ ALMOST ALL OF THIS FILE IS [AI-ASSISTED], ported from Jihao's mockup (hdb_cosy_professional.html).
// Beyond our course:
//   - onMounted / onUnmounted (run code when the component appears / disappears)
//   - document.addEventListener('mousemove') + getBoundingClientRect (head follows the mouse)
//   - document.querySelector + classList + scrollIntoView (highlight parts of the page)
//   - setTimeout loops (blinking)
//   - CSS: 3D transforms (perspective, translateZ, rotateX/Y), keyframe animations, radial gradients,
//     clip-path, pseudo-elements (::before / ::after)
// [COURSE] parts: ref, v-if, v-for, :class, @click, props, the tour text and steps.
// To remove the pet completely: delete this file and its 2 lines in App.vue.
// =====================================================================================
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  mode: String, // 'cat' or 'dog' (App.vue does not show the pet at all for 'none')
})

// [COURSE] The pet's name depends on the animal
let petName = 'Mochi'
if (props.mode === 'dog') {
  petName = 'Biscuit'
}

// [COURSE] The tour: a title, some text, and which part of the page to highlight (a CSS selector)
const steps = [
  {
    title: 'Welcome home-hunter!',
    text: "Hi, I'm " + petName + "! I'll show you how to find a resale flat that fits. It takes a minute.",
    target: '',
  },
  {
    title: 'Search a town or street',
    text: 'Type a town like Punggol, a street, or a block number. Suggestions pop up as you type.',
    target: '.search-box',
  },
  {
    title: 'Set your filters',
    text: 'Pick a flat size, slide your max budget and the minimum lease you are happy with.',
    target: '#filters-panel',
  },
  {
    title: 'Tell us your priorities',
    text: 'Tick what matters most: schools, MRT, hawker food or parks. Every match score follows these.',
    target: '#priorities-panel',
  },
  {
    title: 'Your match score',
    text: 'This bar shows how well a block fits your priorities. Sort by "Best match" to see the top ones first.',
    target: '.bcard .match',
  },
  {
    title: 'Real price range',
    text: 'What flats in this block really sold for in the last 12 months, with the number of sales and the median.',
    target: '.bcard .pricebox',
  },
  {
    title: 'Save to your shortlist',
    text: 'Love it? Save it. Your shortlist keeps your favourites and notes together.',
    target: '.bcard .act-btn',
  },
]

const step = ref(0)
const tourOpen = ref(false)
const shown = ref(false) // false = still below the screen (slides up when true)
const blinking = ref(false)

// [AI-ASSISTED] Head and pupil positions, changed by the mouse
const headStyle = ref('')
const pupilStyle = ref('')

// [AI-ASSISTED] Remove the highlight from whatever part of the page has it
function clearHighlight() {
  const old = document.querySelectorAll('.tour-hl')
  for (const element of old) {
    element.classList.remove('tour-hl')
  }
}

// [AI-ASSISTED] Highlight the current step's part of the page and scroll to it
function showStep() {
  clearHighlight()
  const target = steps[step.value].target
  if (target === '') {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    return
  }
  const element = document.querySelector(target)
  if (element !== null) {
    element.classList.add('tour-hl')
    element.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
}

// [COURSE] Tour buttons
function openTour() {
  step.value = 0
  tourOpen.value = true
  showStep()
}
function closeTour() {
  tourOpen.value = false
  clearHighlight()
}
function nextStep() {
  if (step.value < steps.length - 1) {
    step.value = step.value + 1
    showStep()
  } else {
    closeTour()
  }
}
function backStep() {
  if (step.value > 0) {
    step.value = step.value - 1
    showStep()
  }
}
// Clicking the pet opens or closes the tour
function clickPet() {
  if (tourOpen.value) {
    closeTour()
  } else {
    openTour()
  }
}

// [AI-ASSISTED] The head turns towards the mouse (at most 15 degrees), the pupils follow
const petBox = ref(null)
function followMouse(event) {
  if (petBox.value === null) {
    return
  }
  const box = petBox.value.getBoundingClientRect()
  const centreX = box.left + box.width / 2
  const centreY = box.top + 60
  const turnY = Math.max(-15, Math.min(15, (event.clientX - centreX) / 22))
  const turnX = Math.max(-15, Math.min(15, -(event.clientY - centreY) / 22))
  headStyle.value =
    'transform: translateZ(14px) rotateY(' + turnY + 'deg) rotateX(' + turnX + 'deg) rotateZ(' + turnY * -0.25 + 'deg)'
  pupilStyle.value = 'transform: translate(' + turnY / 3 + 'px,' + -turnX / 3 + 'px)'
}

// [AI-ASSISTED] Blink every 3 to 4 seconds
let blinkTimer = null
function blinkLater() {
  blinkTimer = setTimeout(function () {
    blinking.value = true
    setTimeout(function () {
      blinking.value = false
      blinkLater()
    }, 140)
  }, 3000 + Math.random() * 1000)
}

// [AI-ASSISTED] When the pet appears: slide up, start the tour, follow the mouse, start blinking
onMounted(function () {
  setTimeout(function () {
    shown.value = true
  }, 50)
  setTimeout(openTour, 800)
  document.addEventListener('mousemove', followMouse)
  blinkLater()
})

// [AI-ASSISTED] When the pet goes away: stop listening and tidy up
onUnmounted(function () {
  document.removeEventListener('mousemove', followMouse)
  clearTimeout(blinkTimer)
  clearHighlight()
})
</script>

<template>
  <div ref="petBox" class="guide" :class="{ show: shown }" aria-label="Guide pet">
    <div class="pet" :class="[mode, { blink: blinking }]" @click="clickPet">
      <div class="ground"></div>
      <div class="pet-idle">
        <div class="p-tail"></div>
        <div class="p-body">
          <div class="p-belly"></div>
          <div class="p-paw l"></div>
          <div class="p-paw r"></div>
        </div>
        <div class="collar"></div>
        <div class="p-head" :style="headStyle">
          <div class="ear l"><div class="o"></div><div class="in"></div></div>
          <div class="ear r"><div class="o"></div><div class="in"></div></div>
          <div class="skull"></div>
          <div class="eyes">
            <div class="pupils" :style="pupilStyle"><div class="eye"></div><div class="eye"></div></div>
          </div>
          <div class="cheek l"></div>
          <div class="cheek r"></div>
          <div class="whisk l"><i></i><i></i><i></i></div>
          <div class="whisk r"><i></i><i></i><i></i></div>
          <div class="muzzle">
            <div class="nose"></div>
            <div class="mouth"></div>
            <div class="tongue"></div>
          </div>
        </div>
      </div>
      <div class="pet-name">{{ petName }}</div>
    </div>
  </div>

  <!-- Speech bubble with the tour -->
  <div class="bubble" :class="{ show: tourOpen }">
    <div class="who">{{ petName }} · your guide</div>
    <h5>{{ steps[step].title }}</h5>
    <p>{{ steps[step].text }}</p>
    <div class="d-flex align-items-center justify-content-between">
      <div class="dots">
        <i v-for="(s, index) in steps" :key="index" :class="{ on: index === step }"></i>
      </div>
      <div class="bnav d-flex gap-1">
        <button class="b-skip" @click="closeTour">Skip</button>
        <button class="b-back" :disabled="step === 0" @click="backStep">Back</button>
        <button class="b-next" @click="nextStep">
          <span v-if="step === steps.length - 1">Finish 🎉</span>
          <span v-else>Next</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ======================= [AI-ASSISTED] 3D PET (whole block) =======================
   Ported from the mockup. Uses perspective + transform-style: preserve-3d so each part
   sits on its own depth (translateZ), keyframe animations for breathing / tail / ears / tongue,
   and radial gradients for the fur shading. None of this is in our course. */
.guide {
  position: fixed;
  left: 26px;
  bottom: 18px;
  z-index: 80;
  width: 190px;
  height: 220px;
  perspective: 700px;
  transform: translateY(140%);
  transition: transform 0.7s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.guide.show {
  transform: translateY(0);
}
.guide.show .pet {
  animation: popin 0.9s cubic-bezier(0.34, 1.56, 0.64, 1);
}
@keyframes popin {
  0% { transform: translateY(80px) scale(0.6); }
  60% { transform: translateY(-14px) scale(1.06); }
  100% { transform: none; }
}
.pet { position: absolute; inset: 0; transform-style: preserve-3d; cursor: pointer; }
.pet-idle { position: absolute; inset: 0; transform-style: preserve-3d; animation: breathe 3.2s ease-in-out infinite; }
@keyframes breathe { 50% { transform: translateY(-4px); } }
.ground { position: absolute; left: 30px; right: 30px; bottom: 4px; height: 22px; border-radius: 50%; background: radial-gradient(closest-side, rgba(60, 35, 20, 0.35), rgba(60, 35, 20, 0)); transform: rotateX(70deg); }
.p-body { position: absolute; left: 47px; bottom: 16px; width: 96px; height: 92px; border-radius: 48% 48% 42% 42% / 58% 58% 42% 42%; transform: translateZ(-12px); }
.p-belly { position: absolute; left: 24px; right: 24px; bottom: 8px; height: 52px; border-radius: 50%; transform: translateZ(1px); }
.p-paw { position: absolute; bottom: -4px; width: 30px; height: 20px; border-radius: 50%; transform: translateZ(18px); }
.p-paw.l { left: 10px; }
.p-paw.r { right: 10px; }
.p-tail { position: absolute; bottom: 34px; left: 128px; width: 20px; height: 74px; border-radius: 12px; transform-origin: 50% 100%; transform: translateZ(-26px) rotate(28deg); animation: wag 0.9s ease-in-out infinite; }
@keyframes wag { 0%, 100% { transform: translateZ(-26px) rotate(18deg); } 50% { transform: translateZ(-26px) rotate(42deg); } }
.p-head { position: absolute; left: 36px; top: 12px; width: 118px; height: 104px; transform-style: preserve-3d; transition: transform 0.18s ease-out; transform: translateZ(14px); }
.skull { position: absolute; inset: 0; border-radius: 50% 50% 46% 46% / 55% 55% 45% 45%; }
.ear { position: absolute; top: -16px; width: 38px; height: 46px; transform-style: preserve-3d; }
.ear .o, .ear .in { position: absolute; inset: 0; clip-path: polygon(50% 0, 100% 100%, 0 100%); border-radius: 6px; }
.ear .in { inset: 10px 9px 0; }
.ear.l { left: 8px; transform: translateZ(-8px) rotate(-14deg); }
.ear.r { right: 8px; transform: translateZ(-8px) rotate(14deg); }
.eyes { position: absolute; top: 40px; left: 0; right: 0; display: flex; justify-content: center; transform: translateZ(22px); }
.pupils { transition: transform 0.15s ease-out; display: flex; gap: 28px; }
.eye { width: 17px; height: 21px; border-radius: 50%; background: radial-gradient(circle at 50% 55%, #2b1a10 60%, #140a04); position: relative; transition: transform 0.08s; }
.eye::before { content: ''; position: absolute; width: 6px; height: 6px; border-radius: 50%; background: #fff; top: 4px; left: 4px; }
.eye::after { content: ''; position: absolute; width: 3px; height: 3px; border-radius: 50%; background: #fff; bottom: 4px; right: 4px; opacity: 0.8; }
.blink .eye { transform: scaleY(0.1); }
.muzzle { position: absolute; left: 50%; top: 58px; width: 54px; height: 36px; margin-left: -27px; border-radius: 50%; transform: translateZ(30px); }
.nose { position: absolute; left: 50%; top: 4px; width: 16px; height: 11px; margin-left: -8px; border-radius: 50% 50% 60% 60% / 40% 40% 70% 70%; }
.mouth { position: absolute; left: 50%; top: 15px; width: 22px; height: 10px; margin-left: -11px; border: 2px solid rgba(60, 30, 20, 0.7); border-top: 0; border-radius: 0 0 12px 12px; }
.cheek { position: absolute; top: 62px; width: 18px; height: 10px; border-radius: 50%; background: rgba(240, 120, 110, 0.45); filter: blur(2px); transform: translateZ(18px); }
.cheek.l { left: 14px; }
.cheek.r { right: 14px; }
.collar { position: absolute; left: 46px; bottom: 96px; width: 98px; height: 14px; border-radius: 10px; transform: translateZ(6px); box-shadow: inset 0 -3px 0 rgba(0, 0, 0, 0.18), 0 3px 6px rgba(0, 0, 0, 0.15); }
.collar::after { content: ''; position: absolute; left: 50%; top: 9px; width: 16px; height: 16px; margin-left: -8px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #fff1b0, #e2b33c 55%, #a97a12); }
.whisk { position: absolute; top: 66px; width: 44px; height: 14px; transform: translateZ(31px); }
.whisk i { display: block; height: 1.5px; background: rgba(80, 40, 20, 0.6); margin: 3px 0; border-radius: 2px; }
.whisk.l { left: -14px; }
.whisk.r { right: -14px; }
.tongue { position: absolute; left: 50%; top: 27px; width: 14px; height: 16px; margin-left: -7px; border-radius: 0 0 8px 8px; background: linear-gradient(180deg, #f58a9a, #e4566e); transform-origin: top; animation: pant 0.6s ease-in-out infinite; }
@keyframes pant { 50% { transform: scaleY(1.2); } }

/* [AI-ASSISTED] CAT "Mochi": orange tabby */
.cat .skull { background: radial-gradient(circle at 34% 28%, #ffd9a8 0, #f5a55a 32%, #de7a2e 70%, #b45a1c 100%); box-shadow: inset -10px -14px 22px rgba(120, 50, 10, 0.35), inset 8px 10px 16px rgba(255, 235, 200, 0.35), 0 10px 18px rgba(90, 40, 10, 0.25); }
.cat .ear .o { background: linear-gradient(160deg, #f6a85b, #c2621f); }
.cat .ear .in { background: linear-gradient(180deg, #f8b9ae, #e98a86); }
.cat .muzzle { background: radial-gradient(circle at 50% 35%, #fff8ee, #f4e1c7); }
.cat .nose { background: radial-gradient(circle at 40% 30%, #ffb3b3, #e7697a); }
.cat .p-body { background: radial-gradient(circle at 35% 25%, #ffc98e, #e8873c 50%, #b95e1f); }
.cat .p-belly { background: radial-gradient(circle at 50% 30%, #fff8ee, #f2dcc0); }
.cat .p-paw { background: radial-gradient(circle at 40% 30%, #fff8ee, #ebd3b5); }
.cat .p-tail { background: repeating-linear-gradient(180deg, #e8873c 0 12px, #b95e1f 12px 18px); }
.cat .collar { background: linear-gradient(180deg, #d4715a, var(--terra)); }
.cat .tongue { display: none; }

/* [AI-ASSISTED] DOG "Biscuit": golden lab with floppy ears */
.dog .skull { background: radial-gradient(circle at 34% 28%, #fff0cc 0, #f0ce8c 34%, #d9a95c 72%, #b5843c 100%); box-shadow: inset -10px -14px 22px rgba(120, 80, 20, 0.35), 0 10px 18px rgba(90, 60, 10, 0.25); }
.dog .ear { top: 14px; width: 34px; height: 62px; }
.dog .ear .o { clip-path: none; border-radius: 45% 45% 50% 50% / 30% 30% 70% 70%; background: linear-gradient(180deg, #c99545, #9e6d2a); }
.dog .ear .in { display: none; }
.dog .ear.l { left: -14px; transform: translateZ(4px) rotate(14deg); transform-origin: 70% 10%; animation: flopL 3s ease-in-out infinite; }
.dog .ear.r { right: -14px; transform: translateZ(4px) rotate(-14deg); transform-origin: 30% 10%; animation: flopR 3s ease-in-out infinite; }
@keyframes flopL { 50% { transform: translateZ(4px) rotate(22deg); } }
@keyframes flopR { 50% { transform: translateZ(4px) rotate(-22deg); } }
.dog .muzzle { width: 62px; height: 42px; margin-left: -31px; top: 54px; background: radial-gradient(circle at 50% 30%, #fffbf0, #f3e2bf); }
.dog .nose { width: 24px; height: 16px; margin-left: -12px; top: 3px; background: radial-gradient(circle at 35% 30%, #6a5a52, #1d1512 60%); }
.dog .mouth { top: 20px; }
.dog .p-body { background: radial-gradient(circle at 35% 25%, #fbe2ae, #e0b46a 50%, #b5843c); }
.dog .p-belly { background: radial-gradient(circle at 50% 30%, #fffbf0, #f3e2bf); }
.dog .p-paw { background: radial-gradient(circle at 40% 30%, #fff4da, #e8cd98); }
.dog .p-tail { width: 18px; height: 62px; background: linear-gradient(90deg, #e0b46a, #b5843c); animation-duration: 0.45s; }
.dog .collar { background: linear-gradient(180deg, #86a886, var(--sage)); }
.dog .whisk, .dog .cheek { display: none; }

.pet-name { position: absolute; left: 50%; bottom: -2px; transform: translateX(-50%) translateZ(40px); background: var(--char); color: #fff; font-size: 11px; font-weight: 600; border-radius: 999px; padding: 2px 10px; white-space: nowrap; }

/* ======================= Speech bubble ======================= */
/* [COURSE] White rounded box, fixed next to the pet */
.bubble { position: fixed; left: 200px; bottom: 130px; z-index: 81; width: 320px; background: #fff; border: 1px solid var(--line); border-radius: 18px; padding: 16px 18px 14px; }
/* [AI-ASSISTED] Fades and springs in (opacity + transform transition), the little pointer (::before) */
.bubble { box-shadow: 0 22px 50px -18px rgba(60, 35, 20, 0.45); opacity: 0; transform: translateY(10px) scale(0.96); transform-origin: 0 100%; pointer-events: none; transition: 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
.bubble.show { opacity: 1; transform: none; pointer-events: auto; }
.bubble::before { content: ''; position: absolute; left: -9px; bottom: 26px; width: 18px; height: 18px; background: #fff; border-left: 1px solid var(--line); border-bottom: 1px solid var(--line); transform: rotate(45deg); }
/* [COURSE] Text and buttons inside the bubble */
.who { font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--terra); font-weight: 700; }
.bubble h5 { font-family: 'DM Serif Display', serif; font-size: 21px; margin: 4px 0 6px; }
.bubble p { font-size: 14px; color: #5c5449; margin: 0 0 12px; line-height: 1.5; }
.dots { display: flex; gap: 5px; }
.dots i { width: 7px; height: 7px; border-radius: 50%; background: var(--beige); }
.dots i.on { background: var(--terra); width: 18px; border-radius: 5px; }
.bnav button { border: 0; border-radius: 9px; font-size: 13px; font-weight: 600; padding: 6px 12px; }
.b-skip { background: none; color: var(--muted); }
.b-back { background: var(--beige); color: var(--char); }
.b-next { background: var(--terra); color: #fff; }
.b-back:disabled { opacity: 0.4; }

/* [COURSE] Phones: the bubble goes full width above the pet */
@media (max-width: 560px) {
  .bubble { left: 12px; right: 12px; width: auto; bottom: 240px; }
  .bubble::before { display: none; }
}
</style>
