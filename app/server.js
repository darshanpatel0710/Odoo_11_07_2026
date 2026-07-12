const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const db = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const vehiclesRoutes = require('./routes/vehiclesRoutes');
const driversRoutes = require('./routes/driversRoutes');
const { typesRouter, regionsRouter, expenseTypesRouter } = require('./routes/masterRegistryRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend UI
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/vehicles', vehiclesRoutes);
app.use('/api/drivers', driversRoutes);
app.use('/api/trips', require('./routes/tripsRoutes'));
app.use('/api/maintenance', require('./routes/maintenanceRoutes'));
app.use('/api/fuel', require('./routes/fuelRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));
app.use('/api/types', typesRouter);
app.use('/api/regions', regionsRouter);
app.use('/api/expense-types', expenseTypesRouter);

// Health check endpoint
app.get('/api/health', async (req, res) => {
    const isDbConnected = await db.testConnection();
    res.json({
        status: 'UP',
        timestamp: new Date().toISOString(),
        database: isDbConnected ? 'CONNECTED' : 'FALLBACK_MODE'
    });
});

// Fallback to single page application
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
app.listen(PORT, async () => {
    console.log('=====================================================');
    console.log(`🚀 FleetMaster Pro Authentication Server running on port ${PORT}`);
    console.log(`🌐 UI Dashboard available at: http://localhost:${PORT}`);
    console.log('=====================================================');
    await db.testConnection();
});
