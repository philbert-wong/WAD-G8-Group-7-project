const express = require('express');
const AffordabilityProfile = require('../models/affordability-model');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

// GET: Load saved affordability details
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const profile = await AffordabilityProfile.findOne({userId: req.user.id});
    res.json(profile);
  } catch (error) {
    next(error);
  }
});

// The answers the calculator form can send (anything else is refused with 400)
const BUYER_TYPES = ['single', 'couple', 'joint'];
const STATUSES = ['first', 'second'];
const FLAT_TYPES = ['2 ROOM', '3 ROOM', '4 ROOM', '5 ROOM', 'EXECUTIVE'];
const PHG_OPTIONS = ['none', 'with', 'near'];
const MAX_LOAN_YEARS = 25; // the HDB loan limit (same as the calculator)

// A money box: empty ('' or null) is allowed (not typed yet), otherwise a number that is 0 or more
function isMoneyOrEmpty(value) {
  if (value === '' || value === null || value === undefined) {
    return true;
  }
  return typeof value === 'number' && value >= 0;
}

// Checks the saved answers. Returns an error message, or '' when everything is fine.
function checkDetails(body) {
  if (!BUYER_TYPES.includes(body.buyerType)) {
    return 'buyerType must be single, couple or joint';
  }
  if (!Number.isInteger(body.coOwnerCount) || body.coOwnerCount < 0 || body.coOwnerCount > 3) {
    return 'coOwnerCount must be a whole number from 0 to 3';
  }
  if (!Array.isArray(body.owners) || body.owners.length < 1 || body.owners.length > 4) {
    return 'owners must be a list of 1 to 4 owners';
  }
  for (const owner of body.owners) {
    if (!STATUSES.includes(owner.status)) {
      return 'Each owner status must be first or second';
    }
    if (!isMoneyOrEmpty(owner.income) || !isMoneyOrEmpty(owner.cpf) || !isMoneyOrEmpty(owner.cash)) {
      return 'Income, CPF and cash must be numbers that are 0 or more';
    }
  }
  if (!FLAT_TYPES.includes(body.flatType)) {
    return 'flatType is not a flat type we know';
  }
  if (typeof body.employed12Months !== 'boolean') {
    return 'employed12Months must be true or false';
  }
  if (!PHG_OPTIONS.includes(body.phgOption)) {
    return 'phgOption must be none, with or near';
  }
  const years = Number(body.loanYears);
  if (!Number.isInteger(years) || years < 1 || years > MAX_LOAN_YEARS) {
    return 'loanYears must be a whole number from 1 to ' + MAX_LOAN_YEARS;
  }
  return '';
}

// PUT: Save or update affordability details
router.put('/', requireAuth, async (req, res, next) => {
  // Refuse answers the calculator could never send, before saving anything
  const problem = checkDetails(req.body || {});
  if (problem !== '') {
    return res.status(400).json({ message: problem });
  }
  try {
    const { buyerType, coOwnerCount, owners, flatType, employed12Months, phgOption,loanYears } = req.body;

    let profile = await AffordabilityProfile.findOne({
      userId: req.user.id
    });

    if (profile) {
      // Existing user: update details
      Object.assign(profile, { buyerType, coOwnerCount, owners, flatType, employed12Months, phgOption, loanYears});
    } else {
      // New user: create profile
      profile = new AffordabilityProfile({ userId: req.user.id, buyerType, coOwnerCount, owners, flatType, employed12Months, phgOption,loanYears });
    }

    await profile.save();
    res.json(profile);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
