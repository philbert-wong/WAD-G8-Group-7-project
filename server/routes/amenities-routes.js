// The /api/amenities routes: which address runs which function in controllers/amenities-controller.js
const express = require('express');

const amenitiesController = require('../controllers/amenities-controller');

const router = express.Router(); // sub application

router.get('/', amenitiesController.listAmenities);

// EXPORT
module.exports = router;
