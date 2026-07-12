const db = require('../config/db');
const { getVehicleByIdInternal, updateVehicleStatusInternal } = require('./vehiclesController');
const { getDriverByIdInternal, updateDriverStatusInternal } = require('./driversController');

const ALLOWED_TRIP_STATUSES = ['Draft', 'Dispatched', 'Completed', 'Cancelled'];

/**
 * Compute Trip Executive KPIs
 */
function computeTripKPIs(list) {
    const totalTrips = list.length;
    const dispatchedTrips = list.filter(t => t.status === 'Dispatched').length;
    const completedTrips = list.filter(t => t.status === 'Completed').length;
    
    let totalCargoKg = 0;
    list.forEach(t => {
        totalCargoKg += Number(t.cargo_weight || 0);
    });

    return {
        totalTrips,
        dispatchedTrips,
        completedTrips,
        totalCargoKg
    };
}

/**
 * GET /api/trips
 */
async function getAllTrips(req, res) {
    try {
        const { search, status } = req.query;

        let sql = 'SELECT t.*, COALESCE(t.source, t.source_location) AS source, v.registration_number AS vehicle_reg, d.full_name AS driver_name FROM trips t LEFT JOIN vehicles v ON t.vehicle_id = v.vehicle_id LEFT JOIN drivers d ON t.driver_id = d.driver_id WHERE 1=1';
        let params = [];

        if (search) {
            sql += ' AND (t.source LIKE ? OR t.destination LIKE ? OR v.registration_number LIKE ? OR d.full_name LIKE ?)';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
        }
        if (status && status !== 'All') {
            sql += ' AND t.status = ?';
            params.push(status);
        }

        sql += ' ORDER BY t.trip_id DESC';

        const rows = await db.query(sql, params);
        const kpis = computeTripKPIs(rows);
        return res.json({ success: true, count: rows.length, kpis, trips: rows, source: 'MySQL' });
    } catch (err) {
        console.error('[getAllTrips DB error]', err.message);
        return res.status(500).json({ success: false, message: 'Server error retrieving trips.' });
    }
}

/**
 * GET /api/trips/:id
 */
async function getTripById(req, res) {
    const id = Number(req.params.id);
    try {
        const rows = await db.query('SELECT t.*, COALESCE(t.source, t.source_location) AS source, v.registration_number AS vehicle_reg, d.full_name AS driver_name FROM trips t LEFT JOIN vehicles v ON t.vehicle_id = v.vehicle_id LEFT JOIN drivers d ON t.driver_id = d.driver_id WHERE t.trip_id = ?', [id]);
        if (rows.length > 0) {
            return res.json({ success: true, trip: rows[0] });
        }
        return res.status(404).json({ success: false, message: `Trip #${id} not found.` });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Database error retrieving trip.' });
    }
}

/**
 * POST /api/trips
 */
async function createTrip(req, res) {
    const source = req.body.source || req.body.source_location;
    const {
        destination,
        vehicle_id,
        driver_id,
        cargo_weight,
        planned_distance,
        status = 'Draft'
    } = req.body;

    if (!source || !source.trim() || !destination || !destination.trim()) {
        return res.status(400).json({ success: false, message: 'Source and Destination are required.' });
    }
    if (!vehicle_id || !driver_id) {
        return res.status(400).json({ success: false, message: 'Available Vehicle and Driver must be selected.' });
    }

    const weightNum = Number(cargo_weight);
    const distNum = Number(planned_distance);
    if (isNaN(weightNum) || weightNum <= 0) {
        return res.status(400).json({ success: false, message: 'Cargo Weight must be a positive number (kg).' });
    }
    if (isNaN(distNum) || distNum <= 0) {
        return res.status(400).json({ success: false, message: 'Planned Distance must be a positive number (km).' });
    }
    if (!ALLOWED_TRIP_STATUSES.includes(status)) {
        return res.status(400).json({ success: false, message: `Invalid trip status '${status}'.` });
    }

    // Asset & Load Capacity Verification
    const vehicle = await getVehicleByIdInternal(vehicle_id);
    if (!vehicle) {
        return res.status(404).json({ success: false, message: `Vehicle ID #${vehicle_id} not found.` });
    }
    if (weightNum > Number(vehicle.max_load_capacity)) {
        return res.status(400).json({
            success: false,
            message: `Safety Violation: Cargo weight (${weightNum} kg) exceeds vehicle maximum load capacity (${vehicle.max_load_capacity} kg).`
        });
    }

    const driver = await getDriverByIdInternal(driver_id);
    if (!driver) {
        return res.status(404).json({ success: false, message: `Driver ID #${driver_id} not found.` });
    }

    const vehicleReg = vehicle.registration_number;
    const driverName = driver.full_name;

    try {
        const insertSql = `
            INSERT INTO trips (source, source_location, destination, vehicle_id, driver_id, cargo_weight, planned_distance, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `;
        const result = await db.query(insertSql, [
            source.trim(),
            source.trim(),
            destination.trim(),
            Number(vehicle_id),
            Number(driver_id),
            weightNum,
            distNum,
            status
        ]);

        const newTrip = {
            trip_id: result.insertId,
            source: source.trim(),
            destination: destination.trim(),
            vehicle_id: Number(vehicle_id),
            vehicle_reg: vehicleReg,
            driver_id: Number(driver_id),
            driver_name: driverName,
            cargo_weight: weightNum,
            planned_distance: distNum,
            status,
            created_at: new Date().toISOString()
        };

        if (status === 'Dispatched') {
            await updateVehicleStatusInternal(vehicle_id, 'On Trip');
            await updateDriverStatusInternal(driver_id, 'On Trip');
        }

        return res.status(201).json({ success: true, message: 'Freight trip created successfully.', trip: newTrip });
    } catch (dbErr) {
        console.error('[createTrip DB error]', dbErr.message);
        return res.status(500).json({ success: false, message: 'Database error creating trip.' });
    }
}

/**
 * PUT /api/trips/:id/status
 * Handles Lifecycle State Transitions: Draft -> Dispatched -> Completed -> Cancelled
 */
async function updateTripStatus(req, res) {
    const id = Number(req.params.id);
    const { status } = req.body;

    if (!ALLOWED_TRIP_STATUSES.includes(status)) {
        return res.status(400).json({ success: false, message: `Invalid lifecycle status '${status}'.` });
    }

    try {
        const rows = await db.query('SELECT * FROM trips WHERE trip_id = ?', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: `Trip #${id} not found.` });
        }
        const trip = rows[0];
        const oldStatus = trip.status;

        await db.query('UPDATE trips SET status = ? WHERE trip_id = ?', [status, id]);
        trip.status = status;

        // Asset Lifecycle Synchronization
        if (status === 'Dispatched') {
            await updateVehicleStatusInternal(trip.vehicle_id, 'On Trip');
            await updateDriverStatusInternal(trip.driver_id, 'On Trip');
        } else if (status === 'Completed' && oldStatus !== 'Completed') {
            await updateVehicleStatusInternal(trip.vehicle_id, 'Available', trip.planned_distance);
            await updateDriverStatusInternal(trip.driver_id, 'Available');
        } else if (status === 'Cancelled') {
            await updateVehicleStatusInternal(trip.vehicle_id, 'Available');
            await updateDriverStatusInternal(trip.driver_id, 'Available');
        }

        return res.json({
            success: true,
            message: `Trip #${id} transitioned from ${oldStatus} to ${status}.`,
            trip
        });
    } catch (err) {
        console.error('updateTripStatus DB error:', err.message);
        return res.status(500).json({ success: false, message: 'Database error updating trip status: ' + err.message });
    }
}

/**
 * DELETE /api/trips/:id
 */
async function deleteTrip(req, res) {
    const id = Number(req.params.id);

    try {
        const result = await db.query('DELETE FROM trips WHERE trip_id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: `Trip #${id} not found.` });
        }
        return res.json({ success: true, message: `Trip #${id} deleted successfully.` });
    } catch (dbErr) {
        return res.status(500).json({ success: false, message: 'Database error deleting trip.' });
    }
}

async function getTripsListInternal() {
    try {
        const rows = await db.query('SELECT * FROM trips ORDER BY trip_id ASC');
        return rows;
    } catch (e) {
        return [];
    }
}

module.exports = {
    getAllTrips,
    getTripById,
    createTrip,
    updateTripStatus,
    deleteTrip,
    getTripsListInternal
};
