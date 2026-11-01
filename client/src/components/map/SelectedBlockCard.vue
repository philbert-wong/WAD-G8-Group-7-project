<script setup>
// The "Selected block" card: the block whose dot was clicked, with its flat types and its nearest amenities.
// MapView owns the data and the map; this card shows it and sends the button clicks up (props down, emit up).
const props = defineProps({
  place: Object, // { label, lat, lng, cards: [...] }: one card per flat type
  matchText: { type: String, default: '' }, // e.g. "62 / 100" in Best match mode, '' otherwise
  nearestAmenities: { type: Array, default: null }, // [{ category, name, distance }] or null (not loaded yet)
  amenityTypes: Array, // [{ key, label, one, colour }], for the names in the nearest list
})
const emit = defineEmits(['close', 'show-nearest', 'hide-nearest'])

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
      <span v-if="matchText !== ''"><br />Match score: <strong>{{ matchText }}</strong></span>
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
          <td>{{ card.flatType }}</td>
          <td class="text-end">{{ '$' + card.price.toLocaleString('en-SG') }}</td>
          <td class="text-end">{{ card.salesCount }}</td>
          <td class="text-end">{{ card.remainingLease }} yrs</td>
        </tr>
      </tbody>
    </table>

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
          <strong>{{ amenityName(amenity.category) }}:</strong> {{ amenity.name }} · {{ amenity.distance }} m
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
