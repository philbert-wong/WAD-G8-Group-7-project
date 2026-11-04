// The /api/shortlist routes: which address runs which function in controllers/shortlist-controller.js
const express = require('express');

const shortlistController = require('../controllers/shortlist-controller');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router(); // sub application

// Every shortlist address needs a logged-in user
router.use(requireAuth);

router.get('/', shortlistController.listShortlist);
router.post('/', shortlistController.addToShortlist);
router.patch('/:id', shortlistController.updateNote);
router.delete('/:id', shortlistController.removeFromShortlist);

// EXPORT
module.exports = router;
