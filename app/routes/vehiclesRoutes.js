const express = require('express');
const router = express.Router();
const vehiclesController = require('../controllers/vehiclesController');

router.get('/', vehiclesController.getAllVehicles);
router.get('/:id', vehiclesController.getVehicleById);
router.post('/', vehiclesController.createVehicle);
router.put('/:id', vehiclesController.updateVehicle);
router.delete('/:id', vehiclesController.deleteVehicle);

module.exports = router;
