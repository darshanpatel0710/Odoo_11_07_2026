const express = require('express');
const router = express.Router();
const maintenanceController = require('../controllers/maintenanceController');

router.get('/', maintenanceController.getAllMaintenance);
router.get('/:id', maintenanceController.getMaintenanceById);
router.post('/', maintenanceController.createMaintenance);
router.put('/:id/status', maintenanceController.updateMaintenanceStatus);
router.delete('/:id', maintenanceController.deleteMaintenance);

module.exports = router;
