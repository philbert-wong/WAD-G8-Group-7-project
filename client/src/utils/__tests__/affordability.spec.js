/* affordability.spec.js
   Unit tests for the pure functions in affordability.js (the loan maths and the household rules).
   A unit test checks one function on its own, with different kinds of input:
   positive, zero, large (and "nothing" for the household).
   Numbers are rounded with Math.round, so the tests compare whole numbers with toBe.
*/
import { describe, it, expect } from 'vitest'
import {
  monthlyRepayment,
  loanForRepayment,
  estimateMonthlyCost,
  householdTotals,
  householdType,
} from '../affordability.js'

describe('TestSuite1: monthlyRepayment', () => {
  // Verify that a normal loan gives the repayment in the comment of the function (about 1815)
  it('Test1: works out the repayment of a normal loan', () => {
    expect(Math.round(monthlyRepayment(400000, 2.6, 25))).toBe(1815)
  })

  // Verify the 0% special case: the loan split evenly over the months
  it('Test2: splits a 0% loan evenly over the months', () => {
    expect(monthlyRepayment(120000, 0, 10)).toBe(1000)
  })

  // Verify zero: no loan means nothing to repay
  it('Test3: gives 0 when there is no loan', () => {
    expect(monthlyRepayment(0, 2.6, 25)).toBe(0)
  })

  // Verify a large number
  it('Test4: works out the repayment of a very large loan', () => {
    expect(Math.round(monthlyRepayment(1000000000, 2.6, 25))).toBe(4536695)
  })
})

describe('TestSuite2: loanForRepayment', () => {
  // Verify the example in the comment of the function (about 379000)
  it('Test1: works out the loan a repayment can pay off', () => {
    expect(Math.round(loanForRepayment(1800, 3, 25))).toBe(379578)
  })

  it('Test2: multiplies a 0% repayment by the months', () => {
    expect(loanForRepayment(1000, 0, 10)).toBe(120000)
  })

  // It is the opposite of monthlyRepayment, so going there and back gives the loan we started with
  it('Test3: undoes monthlyRepayment', () => {
    const payment = monthlyRepayment(400000, 2.6, 25)
    expect(Math.round(loanForRepayment(payment, 2.6, 25))).toBe(400000)
  })
})

describe('TestSuite3: estimateMonthlyCost', () => {
  it('Test1: estimates the repayment for a flat price', () => {
    // 75% loan of $500,000 = $375,000, at 2.6% over 25 years (the HDB loan limit)
    expect(Math.round(estimateMonthlyCost(500000))).toBe(1701)
  })

  it('Test2: gives 0 for a price of 0', () => {
    expect(estimateMonthlyCost(0)).toBe(0)
  })
})

describe('TestSuite4: householdTotals', () => {
  it('Test1: adds up two owners and counts first- and second-timers', () => {
    const owners = [
      { status: 'first', income: 4000, cpf: 50000, cash: 20000 },
      { status: 'second', income: 3000, cpf: 30000, cash: 10000 },
    ]
    expect(householdTotals(owners)).toEqual({
      buyers: 2,
      income: 7000,
      cpf: 80000,
      cash: 30000,
      firstTimers: 1,
      secondTimers: 1,
    })
  })

  // Verify "nothing": no owners gives all zeros
  it('Test2: gives all zeros when there are no owners', () => {
    expect(householdTotals([])).toEqual({
      buyers: 0,
      income: 0,
      cpf: 0,
      cash: 0,
      firstTimers: 0,
      secondTimers: 0,
    })
  })
})

describe('TestSuite5: householdType', () => {
  // A small helper for the tests: the totals only need the three counts
  function counts(firstTimers, secondTimers) {
    return { buyers: firstTimers + secondTimers, firstTimers: firstTimers, secondTimers: secondTimers }
  }

  it('Test1: one first-timer buying alone is "single"', () => {
    expect(householdType('single', counts(1, 0))).toBe('single')
  })

  it('Test2: a couple of first-timers is "family"', () => {
    expect(householdType('couple', counts(2, 0))).toBe('family')
  })

  it('Test3: a couple with one first-timer and one second-timer is "mixed"', () => {
    expect(householdType('couple', counts(1, 1))).toBe('mixed')
  })

  it('Test4: joint singles who are all first-timers is "joint"', () => {
    expect(householdType('joint', counts(2, 0))).toBe('joint')
  })

  it('Test5: everyone a second-timer is "second"', () => {
    expect(householdType('couple', counts(0, 2))).toBe('second')
  })

  // The cases we have no rules for
  it('Test6: three buyers with a second-timer is "other"', () => {
    expect(householdType('couple', counts(2, 1))).toBe('other')
  })

  it('Test7: joint singles with a second-timer is "other"', () => {
    expect(householdType('joint', counts(1, 1))).toBe('other')
  })
})
