<script setup>
// "Back to top" button: appears above the "?" button once you scroll down
import { ref, onMounted, onUnmounted } from 'vue'

// Shown only after scrolling down more than this many pixels (about one phone screen)
const SHOW_AFTER = 600
const show = ref(false)

// Runs every time the page scrolls
function onScroll() {
  if (window.scrollY > SHOW_AFTER) {
    show.value = true
  } else {
    show.value = false
  }
}

// The button: scroll smoothly back to the top
function backToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

onMounted(function () {
  window.addEventListener('scroll', onScroll)
})

onUnmounted(function () {
  window.removeEventListener('scroll', onScroll)
})
</script>

<template>
  <button v-if="show" type="button" class="to-top" aria-label="Back to top" title="Back to top" @click="backToTop">
    <span aria-hidden="true">↑</span>
  </button>
</template>

<style scoped>
.to-top {
  position: fixed;
  right: 20px;
  bottom: 84px;
  z-index: 1030;
  width: 52px;
  height: 52px;
  padding: 0;
  border: 1.5px solid var(--terra);
  border-radius: 50%;
  background: #fff;
  color: var(--terra);
  font-size: 24px;
  font-weight: 700;
  box-shadow: 0 6px 16px rgba(30, 30, 60, 0.2);
}
.to-top:hover {
  background: var(--terra);
  color: #fff;
}

/* Phones and tablets: the "?" button sits above the page tab bar there (GuideTour.vue), so lift this one too */
@media (max-width: 991.98px) {
  .to-top {
    bottom: calc(140px + env(safe-area-inset-bottom, 0px));
  }
}
</style>
