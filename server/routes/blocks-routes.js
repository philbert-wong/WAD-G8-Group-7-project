// The /api/blocks routes: which address runs which function in controllers/blocks-controller.js
const express = require('express');

const blocksController = require('../controllers/blocks-controller');

const router = express.Router(); // sub application

router.get('/', blocksController.searchBlocks);
router.get('/area', blocksController.listTowns);
router.get('/nearby', blocksController.nearbyBlocks);
router.get('/place', blocksController.findPlace);
router.get('/:id/amenities', blocksController.blockAmenities);
router.get('/:id/sales', blocksController.blockSales);
router.get('/:id/live-sales', blocksController.liveSales);
router.get('/:id/walk-to-mrt', blocksController.walkToMrt);
router.get('/:id', blocksController.oneBlock);

// EXPORT
module.exports = router;
