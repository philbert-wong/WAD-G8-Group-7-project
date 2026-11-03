<script setup>
// The root component: the navbar on every page, and the current page underneath it
// DESIGN PREVIEW (Cosy Professional): adds a preview bar (choose the guide pet), the pet, and a footer.
import { ref } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import NavBar from './components/NavBar.vue'
import GuidePet from './components/GuidePet.vue'

// FINAL DRAFT: the pet only appears on the Search page (its tour points at Search page parts)
const route = useRoute()

// Which guide pet to show: 'none', 'cat' (Mochi) or 'dog' (Biscuit)
const guideMode = ref('cat')

// A preview bar button was clicked
function chooseGuide(mode) {
  guideMode.value = mode
}
</script>

<template>
  <!-- Preview bar: only for showing the design to the team -->
  <div class="demo-bar">
    <div class="container d-flex flex-wrap align-items-center justify-content-between gap-2">
      <span class="lbl"></span>
      <div class="seg">
        <button :class="{ on: guideMode === 'none' }" @click="chooseGuide('none')">Without Guide</button>
        <button :class="{ on: guideMode === 'cat' }" @click="chooseGuide('cat')">🐱 Cat (Mochi)</button>
        <button :class="{ on: guideMode === 'dog' }" @click="chooseGuide('dog')">🐶 Dog (Biscuit)</button>
      </div>
    </div>
  </div>

  <NavBar />

  <main class="container py-5">
    <RouterView />
  </main>

  <footer class="cosy-footer">
    <div class="container d-flex justify-content-between flex-wrap gap-2">
      <span>Prices are real HDB resale sales from data.gov.sg (last 12 months).</span>
      <span>HDB Resale Finder</span>
    </div>
  </footer>

  <!-- :key makes Vue rebuild the pet when the choice changes, so the tour starts again -->
  <GuidePet v-if="guideMode !== 'none' && route.path === '/'" :key="guideMode" :mode="guideMode" />
</template>

<style scoped>
/* [COURSE] Dark preview bar at the very top */
.demo-bar {
  background: var(--char);
  color: #ede4d6;
  font-size: 13px;
  padding: 10px 0;
}
.lbl {
  letter-spacing: 0.14em;
  text-transform: uppercase;
  font-size: 11px;
  opacity: 0.7;
}
/* [COURSE] Segmented buttons (a row of pill buttons) */
.seg {
  display: inline-flex;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  padding: 4px;
  gap: 4px;
}
.seg button {
  border: 0;
  background: transparent;
  color: #ede4d6;
  border-radius: 999px;
  padding: 6px 14px;
  font-weight: 500;
  font-size: 13px;
}
.seg button.on {
  background: var(--terra);
  color: #fff;
}
/* [AI-ASSISTED] Glow on the chosen button */
.seg button.on {
  box-shadow: 0 4px 14px rgba(192, 97, 74, 0.45);
}
</style>
