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

// PUT: Save or update affordability details
router.put('/', requireAuth, async (req, res, next) => {
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
