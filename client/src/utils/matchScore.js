// "WHAT MATTERS TO YOU?" MATCH SCORE (0 to 100)
//
// Each block stores how far (in metres) its nearest school, MRT, hawker centre and park are.
// The user says how much each one matters (weight 0 to 5).
// The score is a weighted average of one sub-score per category.
// It runs in the browser, so the cards update straight away without asking the server.

// How far away still counts. At this distance (or further) the sub-score is 0.
const SCHOOL_MAX_DISTANCE = 1000 // metres, in a straight line
// The MRT distance is a real WALKING distance (prep/addWalks.js), which is longer than a straight line
// (about 1.3 times), so its limit is 1300 m: about the same as 1000 m in a straight line, a 16-minute walk
const MRT_MAX_DISTANCE = 1300
const HAWKER_MAX_DISTANCE = 800
const PARK_MAX_DISTANCE = 800

export const MAX_DISTANCES = {
  school: SCHOOL_MAX_DISTANCE,
  mrt: MRT_MAX_DISTANCE,
  hawker: HAWKER_MAX_DISTANCE,
  park: PARK_MAX_DISTANCE,
}

// The categories, in the order the panel shows them.
// "key" must match the amenity category stored on each block (block.distances.school, ...).
// To add Healthcare later: add a line here, a max distance above, and the clinic data.
export const CATEGORIES = [
  { key: 'school', label: 'Education (primary schools)' },
  { key: 'mrt', label: 'Transport (MRT/LRT stations)' },
  { key: 'hawker', label: 'Food (hawker centres)' },
  { key: 'park', label: 'Greenery (parks)' },
]

// The 5 importance levels a user can pick
export const IMPORTANCE_LEVELS = [
  { value: 1, label: 'Low' },
  { value: 2, label: 'Moderate' },
  { value: 3, label: 'Important' },
  { value: 4, label: 'Very' },
  { value: 5, label: 'Extremely' },
]

// Starting panel: every category ticked and set to Important (3).
// Gives { school: { ticked: true, level: 3 }, mrt: { ... }, ... }
export function makeDefaultPreferences() {
  const preferences = {}
  for (let i = 0; i < CATEGORIES.length; i++) {
    const key = CATEGORIES[i].key
    preferences[key] = { ticked: true, level: 3 }
  }
  return preferences
}

// Turns the panel into plain weights: an unticked category has weight 0.
// Gives { school: 3, mrt: 0, ... }
export function getWeights(preferences) {
  const weights = {}
  for (let i = 0; i < CATEGORIES.length; i++) {
    const key = CATEGORIES[i].key
    if (preferences[key].ticked) {
      weights[key] = preferences[key].level
    } else {
      weights[key] = 0
    }
  }
  return weights
}

// Sub-score for one category: 100 when the amenity is right next door, 0 at maxDistance or further.
// Written as (max - distance) / max rather than 1 - distance / max: it is the same maths,
// but avoids tiny rounding errors (1 - 0.9 is 0.09999999999999998 in JavaScript).
export function subScore(distance, maxDistance) {
  const score = (100 * (maxDistance - distance)) / maxDistance
  if (score < 0) {
    return 0
  }
  return score
}

// distances    = { school: 900, mrt: 400, hawker: 300, park: 600 }  (metres, from the block)
// weights      = { school: 5, mrt: 3, hawker: 2, park: 1 }          (0 to 5, from getWeights)
// maxDistances = { school: 1000, mrt: 1000, ... }                   (usually MAX_DISTANCES)
// Returns a whole number from 0 to 100, or null when there is no score.
export function matchScore(distances, weights, maxDistances) {
  // A block seeded before this feature has no distances, so we cannot score it
  if (distances === undefined || distances === null) {
    return null
  }

  let weightedSum = 0 // sum of weight * subScore
  let totalWeight = 0 // sum of weights

  for (let i = 0; i < CATEGORIES.length; i++) {
    const key = CATEGORIES[i].key
    const weight = weights[key]

    // Step 1: skip categories the user does not care about (unticked = weight 0)
    if (weight > 0) {
      const distance = distances[key]

      // Step 2: a missing distance means we cannot score this block fairly
      if (distance === undefined || distance === null) {
        return null
      }

      // Step 3: add this category's sub-score, multiplied by how much it matters
      weightedSum = weightedSum + weight * subScore(distance, maxDistances[key])
      totalWeight = totalWeight + weight
    }
  }

  // Step 4: every weight was 0, so there is nothing to score
  if (totalWeight === 0) {
    return null
  }

  // Step 5: weighted average, rounded to a whole number
  return Math.round(weightedSum / totalWeight)
}

// Colours of the match bar, from a low score to a high one
export const SCORE_STOPS = [
  { at: 0,   color: '#e07b39' },   // orange
  { at: 25,  color: '#f0c13f' },   // yellow
  { at: 50,  color: '#4fa66a' },   // green
  { at: 75,  color: '#2f6fa8' },   // blue
  { at: 100, color: '#1c3a6b' },   // navy
]

// The colour for one score, mixed between the two stops around it
export function scoreColor(score) {
  let i = 0
  while (i < SCORE_STOPS.length - 2 && score > SCORE_STOPS[i + 1].at) {
    i++
  }
  const a = SCORE_STOPS[i]
  const b = SCORE_STOPS[i + 1]
  const t = ((score - a.at) / (b.at - a.at)) * 100   // how far from a to b, in %
  return `color-mix(in oklab, ${b.color} ${t}%, ${a.color})`
}

// One word for a score, so users do not have to guess what the number means.
// The bands match the colours of the match bar (orange, yellow, green, blue).
export function scoreWord(score) {
  if (score === null) {
    return ''
  }
  if (score >= 75) {
    return 'Excellent'
  }
  if (score >= 50) {
    return 'Good'
  }
  if (score >= 25) {
    return 'Fair'
  }
  return 'Weak'
}

// How the score was made: one row per ticked category, for the "i" button.
// Uses the same subScore as matchScore, so the rows explain the real number.
// share = this category's part of the score (its weight / all the weights), so the shares add up to 1
// and the score is each row's score x its share, added up.
// weighted = score x share: these add up to the match score.
// Gives [{ label: 'Transport (MRT/LRT stations)', key: 'mrt', distance: 741, maxDistance: 1300, score: 43, level: 'Important', share: 0.25, weighted: 10.75 }, ...]
export function scoreBreakdown(distances, weights, maxDistances) {
  const rows = []
  if (distances === undefined || distances === null) {
    return rows
  }

  // Add up the weights first, to work out each category's share
  let totalWeight = 0
  for (let i = 0; i < CATEGORIES.length; i++) {
    totalWeight = totalWeight + weights[CATEGORIES[i].key]
  }

  for (let i = 0; i < CATEGORIES.length; i++) {
    const key = CATEGORIES[i].key
    const weight = weights[key]
    if (weight > 0) {
      // The importance word for this weight, e.g. 3 -> 'Important'
      let level = ''
      for (let j = 0; j < IMPORTANCE_LEVELS.length; j++) {
        if (IMPORTANCE_LEVELS[j].value === weight) {
          level = IMPORTANCE_LEVELS[j].label
        }
      }
      rows.push({
        label: CATEGORIES[i].label,
        key: key,
        distance: distances[key],
        maxDistance: maxDistances[key],
        score: Math.round(subScore(distances[key], maxDistances[key])),
        level: level,
        share: weight / totalWeight,
        weighted: (subScore(distances[key], maxDistances[key]) * weight) / totalWeight, // score x share, not rounded
      })
    }
  }
  return rows
}
