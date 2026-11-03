// The /api/auth routes: which address runs which function in controllers/auth-controller.js
const express = require('express');

const authController = require('../controllers/auth-controller');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router(); // sub application

router.post('/register', authController.register);
router.post('/login', authController.login);
// requireAuth runs first: only a logged-in user gets to their preferences
router.get('/preferences', requireAuth, authController.getPreferences);
router.put('/preferences', requireAuth, authController.savePreferences);
// The profile (town, parents' postal code, starting filters) is a separate field from the preferences above
router.get('/profile', requireAuth, authController.getProfile);
router.put('/profile', requireAuth, authController.saveProfile);

// EXPORT
module.exports = router;
