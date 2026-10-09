<script setup>
import { onMounted, onBeforeUnmount, ref, watch } from "vue";
import L from "leaflet";
import "leaflet.markercluster";
import { fetchAmenities } from "../api/amenities.js";
import { useMapStore } from "../stores/map.js";
import { useFilterStore } from "../stores/filters.js";
import { useListingsStore } from "../stores/listings.js";
import { useShortlistStore } from "../stores/shortlist.js";
import { AMENITY_TYPES } from "../lib/constants.js";
import { priceColour, scoreColour } from "../lib/colour.js";
import { money } from "../lib/format.js";

/**
 * OWNER: Maps & Location — walkthrough steps 04 and 07
 *
 * Leaflet is not reactive, so we keep the map and every layer in plain variables
 * (not refs) and drive them from watchers. Putting a Leaflet map inside ref()
 * makes Vue try to make every internal object reactive and it gets very slow.
 *
 * This component only DRAWS. Fetching lives in the listings store.
 */
const mapStore = useMapStore();
const filters = useFilterStore();
const listings = useListingsStore();
const shortlist = useShortlistStore();

const el = ref(null);
let map = null;
let cluster = null;
let pinLayer = null;
let phgLayer = null;
let routeLayer = null;
const amenityGroups = {};
const markers = new Map();      // block id → { marker, block }
let amenityToken = 0;
const timers = {};

const debounce = (key, fn, ms) => { clearTimeout(timers[key]); timers[key] = setTimeout(fn, ms); };

// Leaflet's default marker icons break under Vite unless pointed at a CDN.
const pinIcon = L.icon({
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

/** How one block's marker looks right now: fill = price or score; ring = selected / grant / shortlisted. */
function styleFor(b) {
  const selected = mapStore.selectedBlockId === b.id;
  const phgOn = listings.phgIds != null;
  const inPhg = phgOn && listings.phgIds.has(b.id);
  const saved = shortlist.savedBlockIds.has(b.id);

  let fill = "#9aa5a0";
  if (filters.colourBy === "score" && listings.scores.size) {
    const s = listings.scores.get(b.id);
    fill = s == null ? "#c9cfcc" : scoreColour(s / 100);
  } else if (b.medianPsm != null) {
    const [lo, hi] = listings.psmRange;
    fill = priceColour((b.medianPsm - lo) / (hi - lo || 1));
  }

  return {
    radius: selected ? 11 : 8,
    fillColor: fill,
    fillOpacity: phgOn && !inPhg ? 0.3 : 0.92,
    color: selected ? "#111" : inPhg ? "#d4a017" : saved ? "#6f42c1" : "#fff",
    weight: selected ? 3 : inPhg || saved ? 3 : 1.5,
  };
}

function tooltipFor(b) {
  const s = listings.scores.get(b.id);
  return `<strong>Blk ${esc(b.block)} ${esc(b.streetName)}</strong><br>${money(b.medianPrice)}` +
    (b.nearestMrt ? `<br>${b.nearestMrt.walkMinutes} min to ${esc(b.nearestMrt.name)}` : "") +
    (s != null ? `<br>My match: <strong>${s}</strong>/100` : "");
}

/** Redraw every marker. Needed when the set of visible blocks changes. */
function rebuild() {
  if (!map) return;
  cluster.clearLayers();
  markers.clear();

  const layers = [];
  for (const b of listings.visible) {
    if (b.lat == null || b.lng == null) continue;
    const marker = L.circleMarker([b.lat, b.lng], styleFor(b)).bindTooltip(() => tooltipFor(b));
    marker.on("click", () => mapStore.select(b.id));   // hands off to the sidebar
    markers.set(b.id, { marker, block: b });
    layers.push(marker);
  }
  cluster.addLayers(layers);
}

/** Recolour in place — cheap, so sliders can drive it live. */
function restyle() {
  for (const { marker, block } of markers.values()) marker.setStyle(styleFor(block));
  markers.get(mapStore.selectedBlockId)?.marker.bringToFront();
}

function drawPin() {
  pinLayer?.remove();
  pinLayer = null;
  const pin = mapStore.pin;
  if (!map || !pin) return;

  const group = L.layerGroup();
  L.marker([pin.lat, pin.lng], { icon: pinIcon, keyboard: false })
    .bindTooltip(pin.label || "Dropped pin").addTo(group);
  if (filters.radius > 0) {
    L.circle([pin.lat, pin.lng], { radius: filters.radius, color: "#1f6f5c", weight: 1.5,
      dashArray: "6 6", fillOpacity: 0.04, interactive: false }).addTo(group);
  }
  pinLayer = group.addTo(map);
}

function drawPhg() {
  phgLayer?.remove();
  phgLayer = null;
  const origin = mapStore.phg;
  if (!map || !origin) return;

  const circle = L.circle([origin.lat, origin.lng], { radius: 4000, color: "#d4a017", weight: 2,
    dashArray: "8 6", fillColor: "#d4a017", fillOpacity: 0.07, interactive: false });
  const home = L.circleMarker([origin.lat, origin.lng], { radius: 7, color: "#fff", weight: 2,
    fillColor: "#d4a017", fillOpacity: 1 }).bindTooltip(`Parent's address: ${esc(origin.address)}`);
  phgLayer = L.layerGroup([circle, home]).addTo(map);
  map.fitBounds(circle.getBounds(), { padding: [20, 20] });
}

/** The walk from the selected block to its nearest MRT station. */
function drawRoute() {
  routeLayer?.remove();
  routeLayer = null;
  const r = mapStore.route;
  if (!map || !r) return;

  const line = r.path?.length
    ? L.polyline(r.path, { color: "#0d6efd", weight: 5, opacity: 0.85 })
    : L.polyline([r.from, r.to], { color: "#0d6efd", weight: 4, dashArray: "4 8", opacity: 0.8 });
  const station = L.circleMarker(r.to, { radius: 8, color: "#0d6efd", weight: 3, fillColor: "#fff", fillOpacity: 1 })
    .bindTooltip(`${esc(r.name)} MRT · ${r.minutes} min walk`, { permanent: true, direction: "top", offset: [0, -8] });
  routeLayer = L.layerGroup([line, station]).addTo(map);
  map.fitBounds(L.latLngBounds([r.from, r.to]).pad(0.6), { maxZoom: 17 });
}

async function refreshAmenities() {
  if (!map) return;
  const on = AMENITY_TYPES.filter((t) => mapStore.layers[t.id]);
  for (const t of AMENITY_TYPES) if (!mapStore.layers[t.id]) amenityGroups[t.id].clearLayers();
  if (on.length === 0) return;

  const b = map.getBounds();
  const mine = ++amenityToken;
  try {
    const { amenities } = await fetchAmenities(on.map((t) => t.id),
      { west: b.getWest(), south: b.getSouth(), east: b.getEast(), north: b.getNorth() });
    if (mine !== amenityToken) return;

    for (const t of on) amenityGroups[t.id].clearLayers();
    for (const a of amenities) {
      const colour = AMENITY_TYPES.find((t) => t.id === a.type).colour;
      L.circleMarker([a.lat, a.lng], { pane: "amenities", radius: 6, color: "#fff", weight: 1.5,
        fillColor: colour, fillOpacity: 1 }).bindTooltip(esc(a.name)).addTo(amenityGroups[a.type]);
    }
  } catch (err) {
    console.error("Could not load amenities:", err.message);
  }
}

onMounted(() => {
  map = L.map(el.value).setView(mapStore.centre, mapStore.zoom);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(map);

  // Amenities sit underneath the block markers.
  map.createPane("amenities").style.zIndex = 390;
  for (const t of AMENITY_TYPES) amenityGroups[t.id] = L.layerGroup().addTo(map);

  cluster = L.markerClusterGroup({ maxClusterRadius: 45, showCoverageOnHover: false });
  map.addLayer(cluster);

  map.on("zoomend", () => { mapStore.zoom = map.getZoom(); });
  map.on("moveend", () => debounce("amenities", refreshAmenities, 250));

  // "Drop pin" mode: the next click places the pin and searches around it.
  map.on("click", (e) => {
    if (!mapStore.dropMode) return;
    mapStore.dropMode = false;
    mapStore.setPin(e.latlng.lat, e.latlng.lng, "Dropped pin", map.getZoom());
    if (filters.radius === 0) filters.radius = 1000;
  });

  rebuild();
  drawPin();
  drawPhg();
  drawRoute();
  refreshAmenities();
});

onBeforeUnmount(() => {
  Object.values(timers).forEach(clearTimeout);
  mapStore.dropMode = false;
  map?.remove();
  map = null;
});

// A different set of blocks → redraw. Debounced because the score cut-off slider fires often.
watch(() => listings.visible, () => debounce("rebuild", rebuild, 60));

// Anything that only changes colour or outline → restyle in place.
watch(
  () => [filters.colourBy, listings.scores, listings.psmRange, mapStore.selectedBlockId,
    listings.phgIds, shortlist.savedBlockIds],
  () => debounce("restyle", restyle, 40)
);

// Search or pin moved the centre → recentre. (Blocks reload in Explore.vue.)
watch(() => mapStore.centre, ([lat, lng]) => map?.setView([lat, lng], mapStore.zoom));
watch(() => [mapStore.pin, filters.radius], drawPin);
watch(() => mapStore.phg, drawPhg);
watch(() => mapStore.route, drawRoute);
watch(() => ({ ...mapStore.layers }), refreshAmenities);

// Cursor hint while dropping a pin.
watch(() => mapStore.dropMode, (on) => el.value?.classList.toggle("is-dropping", on));
</script>

<template>
  <div ref="el" data-cy="map" class="h-100 w-100"></div>
</template>
