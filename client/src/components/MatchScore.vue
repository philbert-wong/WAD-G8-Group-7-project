<script setup>
// The priority score (matchScore in the code): "Priority score 57/100 · Good", a coloured bar, and an "i" button that shows how the score was made.
// Used on every flat card (Search, Shortlist) and in the Compare table, so the score looks the same everywhere.
import { ref, onBeforeUnmount } from 'vue'
import { MAX_DISTANCES, SCORE_STOPS, scoreBreakdown, scoreColor, scoreWord } from '../utils/matchScore.js'

const props = defineProps({
  score: { type: Number, default: null }, // 0 to 100, or null for "–"
  distances: { type: Object, default: null }, // the block's distances: { school: 157, mrt: 741, ... }
  weights: { type: Object, default: null }, // Your Priorities as weights: { school: 3, mrt: 0, ... }
})

// Is the "how was this made" box open?
const open = ref(false)

const scoreEl = ref(null) // the bar area (template ref), so the box can sit right under it
const boxEl = ref(null) // the box itself, to tell a click inside it from a click outside
const boxStyle = ref({}) // where the box goes on the page: { top, left, width }
const arrowLeft = ref('0px') // where the little arrow on top of the box points (at the "i" button)

const BOX_WIDTH = 400
const SCREEN_GAP = 12 // keep the box at least this far from the screen edges

// "i" button: open the box under the bar, or close it if it is open
function toggleBox(event) {
  if (open.value) {
    closeBox()
    return
  }

  // Where the bar and the "i" button are on the page. getBoundingClientRect is relative to the
  // screen, so add the scroll amount: the box is then fixed to the page and scrolls with it.
  const bar = scoreEl.value.getBoundingClientRect()
  const button = event.currentTarget.getBoundingClientRect()
  const width = Math.min(BOX_WIDTH, window.innerWidth - 2 * SCREEN_GAP)

  // Line the box's right edge up with the bar's right edge, but keep it inside the screen
  let left = bar.right - width
  left = Math.max(SCREEN_GAP, Math.min(left, window.innerWidth - width - SCREEN_GAP))

  boxStyle.value = {
    top: bar.bottom + window.scrollY + 10 + 'px',
    left: left + window.scrollX + 'px',
    width: width + 'px',
  }
  arrowLeft.value = button.left + button.width / 2 - left - 7 + 'px'
  open.value = true

  // Close it on a click anywhere else, on Esc, or when the window size changes.
  // setTimeout: wait until this click has finished, or it would close the box straight away.
  setTimeout(function () {
    document.addEventListener('click', onPageClick)
  }, 0)
  document.addEventListener('keydown', onKey)
  window.addEventListener('resize', closeBox)
}

function closeBox() {
  open.value = false
  document.removeEventListener('click', onPageClick)
  document.removeEventListener('keydown', onKey)
  window.removeEventListener('resize', closeBox)
}

// A click outside the box closes it (clicks inside it do nothing)
function onPageClick(event) {
  if (boxEl.value !== null && !boxEl.value.contains(event.target)) {
    closeBox()
  }
}

function onKey(event) {
  if (event.key === 'Escape') {
    closeBox()
  }
}

// The card can disappear while the box is open (new search, next page): remove the listeners too
onBeforeUnmount(closeBox)

// The match bar: filled to the score, showing the ramp from orange up to the score's colour
function barStyle(score) {
  if (score === null || score <= 0) {
    return { width: '0%' }
  }
  const parts = SCORE_STOPS
    .filter(function (stop) {
      return stop.at < score
    })
    .map(function (stop) {
      return `${stop.color} ${(stop.at / score) * 100}%`
    })
  parts.push(`${scoreColor(score)} 100%`)
  return {
    width: score + '%',
    background: `linear-gradient(90deg, ${parts.join(', ')})`,
  }
}

// One row per ticked priority (see scoreBreakdown in utils/matchScore.js)
function breakdownRows() {
  if (props.weights === null) {
    return []
  }
  return scoreBreakdown(props.distances, props.weights, MAX_DISTANCES)
}

// Heading of the pop-up box: "Priority score 32/100 · Fair", or "Priority score –" when there is no score
function titleText() {
  if (props.score === null) {
    return 'Priority score –'
  }
  return 'Priority score ' + props.score + '/100 · ' + scoreWord(props.score)
}

// "Transport (MRT stations)" -> "Transport", so the rows fit
function shortLabel(label) {
  return label.split(' (')[0]
}

// "741 m walk" for the MRT (a real walking route), "157 m" for the others (straight line)
function distanceText(row) {
  if (row.key === 'mrt') {
    return row.distance + ' m walk'
  }
  return row.distance + ' m'
}
</script>

<template>
  <div ref="scoreEl" class="match-score">
    <div class="row1">
      <span>Priority score</span>
      <span>
        <b v-if="score === null">–</b>
        <b v-else>{{ score }}/100 · {{ scoreWord(score) }}</b>
        <button v-if="weights !== null" type="button" class="info-btn" :aria-expanded="open"
          aria-label="How is the priority score made?" @click="toggleBox">
          i
        </button>
      </span>
    </div>
    <div class="bar"><i :style="barStyle(score)"></i></div>

    <!-- How the score was made: a box that pops up right under the bar and scrolls with the page.
         It floats over the card, so the card itself never moves.
         Teleport puts it at the end of <body>, so no card or table can cut it off. -->
    <Teleport to="body">
      <div v-if="open" ref="boxEl" class="how" :style="boxStyle" role="dialog"
        aria-label="How the priority score is made">
        <span class="how-arrow" :style="{ left: arrowLeft }"></span>
        <div class="d-flex justify-content-between align-items-start gap-2 mb-2">
          <h5 class="serif mb-0">{{ titleText() }}</h5>
          <button type="button" class="btn-close" aria-label="Close" @click="closeBox"></button>
        </div>
        <p v-if="score === null" class="mb-0">
          No score: tick at least one category in Your Priorities.
        </p>
        <template v-else>
          <p class="mb-2">
            How close this flat is to what you ticked in <b>Your Priorities</b>.
            Each one scores 100 right next door, down to 0 when it is too far to count.
          </p>
          <table class="how-table">
            <thead>
              <tr>
                <th>Priority</th>
                <th class="num">Raw score</th>
                <th class="num">Weight</th>
                <th class="num">Weighted score</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in breakdownRows()" :key="row.key">
                <td>
                  {{ shortLabel(row.label) }}
                  <div class="sub">{{ distanceText(row) }}</div>
                </td>
                <td class="num">{{ row.score }}</td>
                <td class="num">
                  × {{ row.share.toFixed(2) }}
                  <div class="sub">{{ row.level }}</div>
                </td>
                <td class="num">{{ row.weighted.toFixed(1) }}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <th colspan="3">Total (priority score)</th>
                <th class="num">{{ score }}/100</th>
              </tr>
            </tfoot>
          </table>
          <p class="mt-2 mb-0">
            Weighted score = raw score × weight. A more important priority gets a bigger weight, and the
            weights add up to 1. Change them in Your Priorities on the Search page.
          </p>
        </template>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
/* Match score label and the bar behind it */
/* Fixed width, so the bar is the same size on every card, whatever the word is */
.match-score {
  width: 250px;
  max-width: 100%;
}

.row1 {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--muted);
  font-weight: 600;
}

.row1 b {
  color: var(--terra);
}

/* Small round "i" button */
.info-btn {
  width: 18px;
  height: 18px;
  margin-left: 6px;
  padding: 0;
  border: 1px solid var(--muted);
  border-radius: 50%;
  background: #fff;
  color: var(--muted);
  font-size: 11px;
  font-style: italic;
  font-weight: 700;
  line-height: 16px;
  cursor: pointer;
}

.info-btn:hover {
  border-color: var(--terra);
  color: var(--terra);
}

.bar {
  height: 7px;
  background: var(--beige);
  border-radius: 9px;
  overflow: hidden;
  margin-top: 6px;
}

/* Gradient fill that slides to its width (transition) */
.bar i {
  display: block;
  height: 100%;
  border-radius: 9px;
  background: linear-gradient(90deg, #d98a63, var(--terra));
  transition: width 1.4s cubic-bezier(0.2, 0.8, 0.2, 1);
}

/* The pop-up box: placed on the page (top/left from toggleBox), so it scrolls with the page */
.how {
  position: absolute;
  z-index: 2000;
  padding: 16px 18px;
  border: 1px solid var(--beige);
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  font-size: 13px;
}

/* Little arrow on top of the box, pointing up at the "i" button */
.how-arrow {
  position: absolute;
  top: -8px;
  width: 14px;
  height: 14px;
  background: #fff;
  border-left: 1px solid var(--beige);
  border-top: 1px solid var(--beige);
  transform: rotate(45deg);
}

/* The breakdown table */
.how-table {
  width: 100%;
  border-collapse: collapse;
}

.how-table th,
.how-table td {
  padding: 5px 4px;
  border-top: 1px solid var(--beige);
  vertical-align: top;
}

.how-table thead th {
  border-top: none;
  font-size: 11px;
  font-weight: 600;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

/* Numbers line up on the right */
.how-table .num {
  text-align: right;
  white-space: nowrap;
}

/* Small grey line under a name or weight: the distance, or the importance word */
.how-table .sub {
  font-size: 11px;
  color: var(--muted);
}

/* The total row stands out */
.how-table tfoot th {
  border-top: 2px solid var(--muted);
  font-size: 14px;
}
</style>
