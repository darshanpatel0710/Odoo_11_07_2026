const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');

// Public or Authenticated Dashboard Endpoints
router.get('/kpis', dashboardController.getKPIs);
router.get('/charts', dashboardController.getCharts);
router.get('/activities', dashboardController.getRecentActivities);

module.exports = router;
