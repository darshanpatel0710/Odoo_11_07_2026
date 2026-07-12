const express = require('express');
const router = express.Router();
const tripsController = require('../controllers/tripsController');

router.get('/', tripsController.getAllTrips);
router.get('/:id', tripsController.getTripById);
router.post('/', tripsController.createTrip);
router.put('/:id/status', tripsController.updateTripStatus);
router.delete('/:id', tripsController.deleteTrip);

module.exports = router;
