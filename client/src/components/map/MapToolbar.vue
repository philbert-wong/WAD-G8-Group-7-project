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
    <div class="toolbar-row d-flex align-items-center gap-2">
      <span class="small fw-semibold">Show</span>
      <!-- shortlist-wrap: the buttons and the locked button's popup (below) are inside it, so the popup stays open while
           the mouse moves from the button onto the "Log in" link in it. (The popup is outside the btn-group on purpose:
           Bootstrap rounds the corners of a group's buttons by their place among its children.) -->
      <div class="shortlist-wrap">
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
            :aria-describedby="loggedIn ? null : 'shortlist-tip'"
            type="radio"
            name="show-which"
            class="btn-check"
            @change="emit('change-show-which', 'shortlist')"
          />
          <!-- Logged out: tabindex="0" lets keyboard users reach it, so the popup opens for them too -->
          <label
            for="show-shortlist"
            class="btn btn-outline-dark"
            :tabindex="loggedIn ? null : 0"
          >
            <!-- Logged out: a lock in front, so it is clear it cannot be used yet -->
            <span v-if="!loggedIn" aria-hidden="true">🔒</span>
            My shortlist
            <span v-if="loggedIn">({{ shortlistCount }})</span>
          </label>
        </div>
        <!-- Logged out: shows when the mouse is over the buttons or the keyboard focus is in them (see .shortlist-tip below) -->
        <div v-if="!loggedIn" id="shortlist-tip" class="shortlist-tip" role="tooltip">
          <RouterLink to="/login"><strong>Log in</strong></RouterLink> to show only your shortlist.
        </div>
      </div>
    </div>

    <!-- Colour dots by: priority score or price, in the same order as Search's sort (priority score first, the default) -->
    <div class="toolbar-row d-flex align-items-center gap-2">
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

    <!-- Under the bar: what the shortlist view shows (logged out, the locked button explains itself in its popup) -->
    <div v-if="loggedIn && showWhich === 'shortlist'" class="note small text-muted">
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

/* Phones (600px and narrower): each label goes above its buttons, so the buttons of the two rows start at the same place
   (side by side they would each start where their own label ends, a ragged edge) and always fit, even at 320px.
   A grid with one column, and display: contents so each row's label and buttons are placed in it directly
   (!important beats Bootstrap's d-flex on the same element). Wider than 600px both rows fit on one line. */
@media (max-width: 600px) {
  .map-toolbar {
    display: grid;
    grid-template-columns: auto;
    justify-content: start;
    justify-items: start; /* each keeps its own width, so the popup of "My shortlist" opens only over its own buttons */
    row-gap: 6px;
  }
  .toolbar-row {
    display: contents !important;
  }
  /* a little more room between the first pair and the second */
  .toolbar-row + .toolbar-row > span {
    margin-top: 10px;
  }
  .note {
    grid-column: 1 / -1;
  }
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
   and a popup under it (below) that links to Log in. */
.btn-check:disabled + .btn {
  opacity: 1;
  color: #8a8d99;
  background: #f1f2f5;
  border-style: dashed;
  cursor: not-allowed;
  pointer-events: auto; /* Bootstrap turns these off, which would also hide the not-allowed cursor */
}

/* The popup of the locked button: hidden until the mouse is over the button group or the keyboard focus is in it.
   z-index: above the map's tiles and dots (Leaflet's panes go up to 1000), so it is never hidden under them.
   padding-top (not margin): no gap between the button and the popup, so it does not close on the way to the link. */
.shortlist-wrap {
  position: relative;
}
.shortlist-tip {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 1100;
  width: max-content;
  max-width: 240px;
  margin-top: 6px;
  padding: 8px 12px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #fff;
  color: var(--char);
  font-size: 0.85rem;
  box-shadow: 0 6px 18px rgba(45, 45, 45, 0.15);
  visibility: hidden;
  opacity: 0;
  transition: opacity 0.15s;
}
/* The invisible strip over the 6px gap, so the mouse can cross it from the button to the popup */
.shortlist-tip::before {
  content: '';
  position: absolute;
  top: -8px;
  left: 0;
  width: 100%;
  height: 8px;
}
/* A small arrow pointing up at the button */
.shortlist-tip::after {
  content: '';
  position: absolute;
  top: -5px;
  left: 24px;
  width: 8px;
  height: 8px;
  border-top: 1px solid var(--line);
  border-left: 1px solid var(--line);
  background: #fff;
  transform: rotate(45deg);
}
.shortlist-wrap:hover .shortlist-tip,
.shortlist-wrap:focus-within .shortlist-tip {
  visibility: visible;
  opacity: 1;
}
</style>
