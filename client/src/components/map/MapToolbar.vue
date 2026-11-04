<script setup>
import { RouterLink } from 'vue-router'
// The bar between the search bar and the map: what the dots show ("Show": all flats / my shortlist) and what their
// colours mean ("Colour dots by": priority score / cheapest price), as toggle buttons so they stand out.
// MapView owns the choices; this bar shows them and sends every change up (props down, emit up).
defineProps({
  showWhich: String, // 'all' or 'shortlist'
  colourBy: String, // 'match' or 'price'
  loggedIn: Boolean, // the shortlist option needs a login
  shortlistCount: Number, // how many flats are saved
  shownFlats: Number, // in shortlist mode: the saved flats on the map
  shownBlocks: Number, // dots on the map now (one block can hold several flat types)
})
const emit = defineEmits(['change-show-which', 'change-colour-by'])
</script>

<template>
  <div class="map-toolbar mb-2">
    <!-- Show: every block that fits the filters, or only the flats in your shortlist.
         Bootstrap's btn-check: real radio buttons that look like a row of joined buttons (btn-group) -->
    <div class="d-flex align-items-center gap-2">
      <span class="small fw-semibold">Show</span>
      <div class="btn-group btn-group-sm" role="group" aria-label="Show">
        <input
          id="show-all"
          :checked="showWhich === 'all'"
          type="radio"
          name="show-which"
          class="btn-check"
          @change="emit('change-show-which', 'all')"
        />
        <label for="show-all" class="btn btn-outline-dark">All flats</label>
        <input
          id="show-shortlist"
          :checked="showWhich === 'shortlist'"
          :disabled="!loggedIn"
          type="radio"
          name="show-which"
          class="btn-check"
          @change="emit('change-show-which', 'shortlist')"
        />
        <label
          for="show-shortlist"
          class="btn btn-outline-dark"
          :title="loggedIn ? '' : 'Log in first to keep a shortlist'"
        >
          <!-- Logged out: a lock in front, so it is clear it cannot be used yet -->
          <span v-if="!loggedIn" aria-hidden="true">🔒</span>
          My shortlist
          <span v-if="loggedIn">({{ shortlistCount }})</span>
        </label>
      </div>
    </div>

    <!-- Colour dots by: priority score or price, in the same order as Search's sort (priority score first, the default) -->
    <div class="d-flex align-items-center gap-2">
      <span class="small fw-semibold">Colour dots by</span>
      <div class="btn-group btn-group-sm" role="group" aria-label="Colour dots by">
        <input
          id="colour-match"
          :checked="colourBy === 'match'"
          type="radio"
          name="colour-by"
          class="btn-check"
          @change="emit('change-colour-by', 'match')"
        />
        <label for="colour-match" class="btn btn-outline-dark">Priority score</label>
        <input
          id="colour-price"
          :checked="colourBy === 'price'"
          type="radio"
          name="colour-by"
          class="btn-check"
          @change="emit('change-colour-by', 'price')"
        />
        <label for="colour-price" class="btn btn-outline-dark">Cheapest price</label>
      </div>
    </div>

    <!-- Under the bar: why "My shortlist" is greyed out, or what the shortlist view shows -->
    <div v-if="!loggedIn" class="note small text-muted">
      <RouterLink to="/login">Log in</RouterLink> to show only your shortlist.
    </div>
    <div v-else-if="showWhich === 'shortlist'" class="note small text-muted">
      <span v-if="shortlistCount === 0">Your shortlist is empty: save flats on the Search page.</span>
      <span v-else>
        Showing {{ shownFlats }} saved flat(s) in {{ shownBlocks }} block(s), even if they do not fit your filters.
        Flats in the same block share one dot: click it to see them all.
      </span>
    </div>
  </div>
</template>

<style scoped>
/* One row (wrapping onto two on narrow screens): the two button groups side by side, with the note under them */
.map-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  column-gap: 24px;
  row-gap: 8px;
}
.note {
  flex-basis: 100%; /* always on its own line under the buttons */
}
/* The chosen button: filled in the accent colour (Bootstrap's dark outline buttons otherwise) */
.btn-check:checked + .btn {
  background: var(--terra);
  border-color: var(--terra);
  color: #fff;
}
.btn-outline-dark {
  border-color: var(--line);
  color: var(--char);
  background: #fff;
}
.btn-outline-dark:hover {
  border-color: var(--terra);
  background: #fff;
  color: var(--terra);
}
/* My shortlist while logged out: clearly locked, not just faded (Bootstrap only fades it to 0.65).
   Grey text on light grey with a dashed border, a lock in front (above), a "not allowed" cursor,
   and the note under the bar links to Log in. */
.btn-check:disabled + .btn {
  opacity: 1;
  color: #8a8d99;
  background: #f1f2f5;
  border-style: dashed;
  cursor: not-allowed;
  pointer-events: auto; /* Bootstrap turns these off, which would also hide the not-allowed cursor */
}
</style>
