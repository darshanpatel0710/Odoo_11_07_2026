const express = require('express');
const ctrl = require('../controllers/masterRegistryController');

const typesRouter = express.Router();
typesRouter.get('/', ctrl.getVehicleTypes);
typesRouter.post('/', ctrl.createVehicleType);
typesRouter.put('/:id', ctrl.updateVehicleType);
typesRouter.delete('/:id', ctrl.deleteVehicleType);

const regionsRouter = express.Router();
regionsRouter.get('/', ctrl.getRegions);
regionsRouter.post('/', ctrl.createRegion);
regionsRouter.put('/:id', ctrl.updateRegion);
regionsRouter.delete('/:id', ctrl.deleteRegion);

const expenseTypesRouter = express.Router();
expenseTypesRouter.get('/', ctrl.getExpenseTypes);
expenseTypesRouter.post('/', ctrl.createExpenseType);
expenseTypesRouter.put('/:id', ctrl.updateExpenseType);
expenseTypesRouter.delete('/:id', ctrl.deleteExpenseType);

module.exports = {
    typesRouter,
    regionsRouter,
    expenseTypesRouter
};
