const db = require('../config/db');

const ALLOWED_TYPES = ['Truck', 'Van', 'Car', 'Trailer', 'Bus'];
const ALLOWED_STATUSES = ['Available', 'On Trip', 'In Shop', 'Retired'];

/**
 * Validate Vehicle Input Payload (Strict Backend Validation)
 */
function validateVehiclePayload(data, isUpdate = false, existingId = null) {
    const { registration_number, vehicle_type, max_load_capacity, odometer, acquisition_cost, status } = data;
    const model_name = data.model_name || data.model;

    if (!registration_number || typeof registration_number !== 'string' || !registration_number.trim()) {
        return 'Registration Number is required.';
    }

    if (!model_name || typeof model_name !== 'string' || !model_name.trim()) {
        return 'Vehicle Name/Model is required.';
    }

    if (!ALLOWED_TYPES.includes(vehicle_type)) {
        return `Vehicle Type must be one of: ${ALLOWED_TYPES.join(', ')}.`;
    }

    const capNum = Number(max_load_capacity);
    if (isNaN(capNum) || capNum <= 0) {
        return 'Maximum Load Capacity must be a positive number greater than 0.';
    }

    const odoNum = odometer !== undefined && odometer !== null && odometer !== '' ? Number(odometer) : 0;
    if (isNaN(odoNum) || odoNum < 0) {
        return 'Odometer must be a non-negative numeric value.';
    }

    const costNum = acquisition_cost !== undefined && acquisition_cost !== null && acquisition_cost !== '' ? Number(acquisition_cost) : 0;
    if (isNaN(costNum) || costNum < 0) {
        return 'Acquisition Cost must be a non-negative numeric value.';
    }

    if (status && !ALLOWED_STATUSES.includes(status)) {
        return `Status must be one of: ${ALLOWED_STATUSES.join(', ')}.`;
    }

    return null;
}

/**
 * GET /api/vehicles
 */
async function getAllVehicles(req, res) {
    try {
        const { search, type, status } = req.query;

        let sql = 'SELECT * FROM vehicles WHERE 1=1';
        let params = [];

        if (search) {
            sql += ' AND (registration_number LIKE ? OR model_name LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }
        if (type && type !== 'All') {
            sql += ' AND vehicle_type = ?';
            params.push(type);
        }
        if (status && status !== 'All') {
            sql += ' AND status = ?';
            params.push(status);
        }

        sql += ' ORDER BY vehicle_id DESC';

        const rows = await db.query(sql, params);
        return res.json({ success: true, count: rows.length, vehicles: rows, source: 'MySQL' });
    } catch (err) {
        console.error('[getAllVehicles DB error]', err.message);
        return res.status(500).json({ success: false, message: 'Server error retrieving vehicles.' });
    }
}

/**
 * GET /api/vehicles/:id
 */
async function getVehicleById(req, res) {
    const id = Number(req.params.id);
    try {
        const rows = await db.query('SELECT * FROM vehicles WHERE vehicle_id = ?', [id]);
        if (rows.length > 0) {
            return res.json({ success: true, vehicle: rows[0] });
        }
        return res.status(404).json({ success: false, message: `Vehicle ID #${id} not found.` });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Database error retrieving vehicle.' });
    }
}

/**
 * POST /api/vehicles
 */
async function createVehicle(req, res) {
    const errorMsg = validateVehiclePayload(req.body);
    if (errorMsg) {
        return res.status(400).json({ success: false, message: errorMsg });
    }

    const {
        registration_number,
        vehicle_type,
        max_load_capacity,
        odometer = 0,
        acquisition_cost,
        status = 'Available',
        region = 'West'
    } = req.body;
    const model_name = req.body.model_name || req.body.model;

    const cleanReg = registration_number.trim().toUpperCase();

    try {
        const insertSql = `
            INSERT INTO vehicles (registration_number, model_name, vehicle_type, max_load_capacity, odometer, acquisition_cost, status)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        const result = await db.query(insertSql, [
            cleanReg,
            model_name.trim(),
            vehicle_type,
            Number(max_load_capacity),
            Number(odometer),
            Number(acquisition_cost),
            status
        ]);

        const newObj = {
            vehicle_id: result.insertId,
            registration_number: cleanReg,
            model_name: model_name.trim(),
            vehicle_type,
            max_load_capacity: Number(max_load_capacity),
            odometer: Number(odometer),
            acquisition_cost: Number(acquisition_cost),
            status,
            region
        };

        return res.status(201).json({ success: true, message: 'Vehicle created successfully.', vehicle: newObj });
    } catch (dbErr) {
        console.error('[createVehicle DB error]', dbErr.message);
        return res.status(500).json({ success: false, message: 'Database error creating vehicle.' });
    }
}

/**
 * PUT /api/vehicles/:id
 */
async function updateVehicle(req, res) {
    const id = Number(req.params.id);
    const errorMsg = validateVehiclePayload(req.body, true, id);
    if (errorMsg) {
        return res.status(400).json({ success: false, message: errorMsg });
    }

    const {
        registration_number,
        vehicle_type,
        max_load_capacity,
        odometer,
        acquisition_cost,
        status,
        region = 'West'
    } = req.body;
    const model_name = req.body.model_name || req.body.model;

    const cleanReg = registration_number.trim().toUpperCase();

    try {
        const updateSql = `
            UPDATE vehicles
            SET registration_number = ?, model_name = ?, vehicle_type = ?, max_load_capacity = ?, odometer = ?, acquisition_cost = ?, status = ?
            WHERE vehicle_id = ?
        `;
        const result = await db.query(updateSql, [
            cleanReg,
            model_name.trim(),
            vehicle_type,
            Number(max_load_capacity),
            Number(odometer),
            Number(acquisition_cost),
            status,
            id
        ]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: `Vehicle ID #${id} not found.` });
        }

        const updatedObj = {
            vehicle_id: id,
            registration_number: cleanReg,
            model_name: model_name.trim(),
            vehicle_type,
            max_load_capacity: Number(max_load_capacity),
            odometer: Number(odometer),
            acquisition_cost: Number(acquisition_cost),
            status,
            region
        };

        return res.json({ success: true, message: 'Vehicle updated successfully.', vehicle: updatedObj });
    } catch (dbErr) {
        console.error('[updateVehicle DB error]', dbErr.message);
        return res.status(500).json({ success: false, message: 'Database error updating vehicle.' });
    }
}

/**
 * DELETE /api/vehicles/:id
 */
async function deleteVehicle(req, res) {
    const id = Number(req.params.id);

    try {
        const result = await db.query('DELETE FROM vehicles WHERE vehicle_id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: `Vehicle ID #${id} not found.` });
        }
        return res.json({ success: true, message: `Vehicle deleted successfully.` });
    } catch (dbErr) {
        return res.status(500).json({ success: false, message: 'Database error deleting vehicle.' });
    }
}

/**
 * Internal helper to get vehicle by ID (for trip engine)
 */
async function getVehicleByIdInternal(id) {
    try {
        const rows = await db.query('SELECT * FROM vehicles WHERE vehicle_id = ?', [id]);
        if (rows.length > 0) return rows[0];
    } catch (e) {}
    return null;
}

/**
 * Internal helper to update vehicle status and odometer (for trip dispatch/completion)
 */
async function updateVehicleStatusInternal(id, newStatus, addOdometer = 0) {
    try {
        await db.query('UPDATE vehicles SET status = ?, odometer = COALESCE(odometer, 0) + ? WHERE vehicle_id = ?', [newStatus, Number(addOdometer) || 0, id]);
    } catch (e) {
        console.error('updateVehicleStatusInternal DB error:', e.message);
    }
}

async function getAllVehiclesInternal() {
    try {
        const rows = await db.query('SELECT * FROM vehicles ORDER BY vehicle_id ASC');
        return rows;
    } catch (e) {
        return [];
    }
}

module.exports = {
    getAllVehicles,
    getVehicleById,
    createVehicle,
    updateVehicle,
    deleteVehicle,
    getVehicleByIdInternal,
    updateVehicleStatusInternal,
    getAllVehiclesInternal
};
