/* scoreWord.spec.js
   Unit tests for scoreWord() in matchScore.js: one word for a priority score, so users do not have to guess
   what the number means. The bands are Weak (below 25), Fair (25), Good (50) and Excellent (75).
   (The other functions in matchScore.js are tested in server/tests/score.test.js.)
   The tests try each band and the numbers on either side of every boundary.
*/
import { describe, it, expect } from 'vitest'
import { scoreWord } from '../matchScore.js'

describe('TestSuite1: scoreWord', () => {
  it('Test1: says Excellent from 75 up', () => {
    expect(scoreWord(75)).toBe('Excellent')
    expect(scoreWord(100)).toBe('Excellent')
  })

  it('Test2: says Good from 50 to 74', () => {
    expect(scoreWord(74)).toBe('Good')
    expect(scoreWord(50)).toBe('Good')
  })

  it('Test3: says Fair from 25 to 49', () => {
    expect(scoreWord(49)).toBe('Fair')
    expect(scoreWord(25)).toBe('Fair')
  })

  // Verify zero and the number just below the Fair band
  it('Test4: says Weak below 25, including 0', () => {
    expect(scoreWord(24)).toBe('Weak')
    expect(scoreWord(0)).toBe('Weak')
  })

  // Verify "no score": a flat with nothing ticked in Your Priorities has a score of null
  it('Test5: says nothing when there is no score', () => {
    expect(scoreWord(null)).toBe('')
  })
})
