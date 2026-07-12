const express = require('express');
const router = express.Router();
const fuelController = require('../controllers/fuelController');

router.get('/', fuelController.getAllFuelLogs);
router.get('/operational-costs', fuelController.getOperationalCosts);
router.post('/', fuelController.createFuelLog);
router.delete('/:id', fuelController.deleteFuelLog);

module.exports = router;
