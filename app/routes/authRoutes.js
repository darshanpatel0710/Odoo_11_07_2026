const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');

// Public endpoints
router.post('/login', authController.login);
router.post('/register', authController.register);
router.get('/roles', authController.getRoles);
router.post('/seed', authController.seedUsers);

// Protected endpoint (any authenticated user)
router.get('/me', authenticateToken, authController.getMe);

// Example RBAC Protected Endpoints demonstrating role-based route guards
router.get('/manager-only', authenticateToken, requireRole('Fleet Manager'), (req, res) => {
    res.json({
        success: true,
        message: 'Access Granted: Welcome to the Fleet Manager Restricted Control Panel.'
    });
});

router.get('/driver-only', authenticateToken, requireRole('Driver'), (req, res) => {
    res.json({
        success: true,
        message: 'Access Granted: Welcome to Driver Trip Log & Status Portal.'
    });
});

router.get('/safety-only', authenticateToken, requireRole('Safety Officer'), (req, res) => {
    res.json({
        success: true,
        message: 'Access Granted: Welcome to Safety Compliance & License Audit System.'
    });
});

router.get('/finance-only', authenticateToken, requireRole('Financial Analyst'), (req, res) => {
    res.json({
        success: true,
        message: 'Access Granted: Welcome to Financial Analytics & Expense ledger.'
    });
});

module.exports = router;
