<script setup>
// The "Selected block" card: the block whose dot was clicked, with its flat types and its nearest amenities.
// Each flat type has a Save button (the shortlist). A visitor without an account is asked to log in instead.
// MapView owns the data and the map; this card shows it and sends the button clicks up (props down, emit up).
import { ref, watch } from 'vue'
import { RouterLink } from 'vue-router'

const props = defineProps({
  place: Object, // { label, lat, lng, cards: [...] }: one card per flat type
  loggedIn: Boolean, // saving a flat needs an account
  savedIds: { type: Array, default: () => [] }, // the ids of the flats (a block + flat type) that are in the shortlist
  saveError: { type: String, default: '' }, // a problem from the shortlist, e.g. "Network Error" ('' = none)
  matchText: { type: String, default: '' }, // e.g. "62/100 · Good" when the dots are coloured by Your Priorities, '' otherwise
  nearestAmenities: { type: Array, default: null }, // [{ category, name, distance }] or null (not loaded yet)
  amenityTypes: Array, // [{ key, label, one, colour }], for the names in the nearest list
})
const emit = defineEmits(['close', 'show-nearest', 'hide-nearest', 'toggle-save'])

// true after a visitor without an account pressed Save: the card then says to log in
const needsLogin = ref(false)

// Another block was selected: forget the message
watch(
  function () {
    return props.place.label
  },
  function () {
    needsLogin.value = false
  },
)

// Is this flat type in the shortlist? (decides "+ Save" or "✓ Saved")
function isSaved(card) {
  return props.savedIds.includes(card.id)
}

// "+ Save" / "✓ Saved": the page saves the flat, or takes it out of the shortlist if it is already in
function onSave(card) {
  if (!props.loggedIn) {
    needsLogin.value = true
    return
  }
  emit('toggle-save', card)
}

// The text after each amenity in the nearest list. For the MRT: the block's nearest station by WALKING and its
// walking distance (the same walk as the "min walk" above and the match score). The others: straight-line metres.
function amenityText(amenity) {
  if (amenity.category === 'mrt') {
    return props.place.cards[0].mrtName + ' · ' + props.place.cards[0].distances.mrt + ' m walk'
  }
  return amenity.name + ' · ' + amenity.distance + ' m'
}

// The single name of an amenity category, e.g. 'hawker' -> 'Hawker centre'
function amenityName(category) {
  for (const type of props.amenityTypes) {
    if (type.key === category) {
      return type.one
    }
  }
  return category
}
</script>

<template>
  <div class="cosy-card cosy-shadow mb-3">
    <div class="d-flex justify-content-between align-items-start gap-2">
      <h5 class="serif mb-1">{{ place.label }}</h5>
      <button type="button" class="btn-close" aria-label="Close" @click="emit('close')"></button>
    </div>
    <p class="small text-muted mb-3">
      {{ place.cards[0].town }} · {{ place.cards[0].mrtWalkMinutes }} min walk to {{ place.cards[0].mrtName }}
      <span v-if="matchText !== ''"><br />Priority score: <strong>{{ matchText }}</strong></span>
    </p>

    <!-- One row per flat type at this block that fits the filters -->
    <table class="table table-sm small mb-0">
      <thead>
        <tr>
          <th>Flat type</th>
          <th class="text-end">Median</th>
          <th class="text-end">Sales</th>
          <th class="text-end">Lease left</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="card in place.cards" :key="card.id">
          <td>
            {{ card.flatType }}
            <br />
            <!-- aria-label names the flat type, because a block can have several of these buttons -->
            <button
              type="button"
              class="save-btn"
              :class="{ saved: isSaved(card) }"
              :aria-label="isSaved(card) ? 'Saved ' + card.flatType + ' (press to remove)' : 'Save ' + card.flatType + ' to shortlist'"
              @click="onSave(card)"
            >
              {{ isSaved(card) ? '✓ Saved' : '+ Save' }}
            </button>
          </td>
          <td class="text-end">{{ '$' + card.price.toLocaleString('en-SG') }}</td>
          <td class="text-end">{{ card.salesCount }}</td>
          <td class="text-end">{{ card.remainingLease }} yrs</td>
        </tr>
      </tbody>
    </table>

    <p v-if="needsLogin" class="small mt-2 mb-0" role="status">
      <RouterLink to="/login"><strong>Log in</strong></RouterLink> or
      <RouterLink to="/createaccount"><strong>create a free account</strong></RouterLink>
      to save {{ place.label }}.
    </p>
    <p v-if="saveError !== ''" class="small text-danger mt-2 mb-0">{{ saveError }}</p>

    <!-- Nearest amenities: a button first, then the list once loaded -->
    <button
      v-if="nearestAmenities === null"
      type="button"
      class="btn btn-sm btn-outline-dark mt-3"
      @click="emit('show-nearest')"
    >
      Show nearest amenities
    </button>
    <div v-else class="mt-3">
      <h6 class="mb-2">Nearest amenities</h6>
      <ul class="list-unstyled small mb-2">
        <li v-for="amenity in nearestAmenities" :key="amenity.category" class="mb-1">
          <strong>{{ amenityName(amenity.category) }}:</strong> {{ amenityText(amenity) }}
        </li>
      </ul>
      <p class="small text-muted mb-2">
        Tick a type under "Show amenities" to see its nearest one highlighted (bigger square) on the map.
      </p>
      <button type="button" class="btn btn-sm btn-outline-dark" @click="emit('hide-nearest')">
        Hide nearest amenities
      </button>
    </div>
  </div>
</template>

<style scoped>
/* The small Save button under each flat type: an outline, filled in once the flat is in the shortlist */
.save-btn {
  margin-top: 4px;
  min-height: 34px;
  padding: 0 14px;
  border: 1.5px solid var(--terra);
  border-radius: 999px;
  background: #fff;
  color: var(--terra);
  font-size: 14px;
  font-weight: 700;
  white-space: nowrap;
}
.save-btn:hover {
  background: var(--beige);
}
.save-btn.saved {
  background: var(--terra);
  color: #fff;
}
/* Phones and tablets: a bigger button to tap */
@media (max-width: 991.98px) {
  .save-btn {
    min-height: 42px;
    padding: 0 16px;
    font-size: 15px;
  }
}
</style>
