const db = require('../config/db');

const ALLOWED_DRIVER_STATUSES = ['Available', 'On Trip', 'Off Duty', 'Suspended'];

function validateDriverPayload(data, isUpdate = false, existingId = null) {
    const { full_name, license_number, license_category, license_expiry, contact_number, safety_score, status } = data;

    if (!full_name || typeof full_name !== 'string' || !full_name.trim()) {
        return 'Driver Full Name is required.';
    }

    if (!license_number || typeof license_number !== 'string' || !license_number.trim()) {
        return 'Commercial License Number is required.';
    }

    if (safety_score !== undefined && safety_score !== null && safety_score !== '') {
        const numScore = Number(safety_score);
        if (isNaN(numScore) || numScore < 0 || numScore > 100) {
            return 'Safety Score must be a numeric value between 0 and 100.';
        }
    }

    if (status && !ALLOWED_DRIVER_STATUSES.includes(status)) {
        return `Status must be one of: ${ALLOWED_DRIVER_STATUSES.join(', ')}.`;
    }

    return null;
}

/**
 * Compute Driver Roster KPIs
 */
function computeDriverKPIs(list) {
    const totalDrivers = list.length;
    const availableDrivers = list.filter(d => d.status === 'Available').length;
    const onTripDrivers = list.filter(d => d.status === 'On Trip').length;
    
    let sumScore = 0;
    list.forEach(d => {
        sumScore += Number(d.safety_score || 100);
    });
    const avgSafetyScore = totalDrivers > 0 ? (sumScore / totalDrivers).toFixed(1) : '100.0';

    return {
        totalDrivers,
        availableDrivers,
        onTripDrivers,
        avgSafetyScore
    };
}

/**
 * Automatically synchronize users with role_id = 2 (Driver) into the drivers table
 */
async function syncDriverUsers() {
    try {
        const driverUsers = await db.query(`
            SELECT u.user_id, u.full_name, u.email 
            FROM users u
            WHERE u.role_id = 2 
              AND u.user_id NOT IN (SELECT COALESCE(user_id, 0) FROM drivers)
        `);
        for (const u of driverUsers) {
            const licenseNum = `DL-USER-${u.user_id}-${Math.floor(1000 + Math.random() * 9000)}`;
            await db.query(`
                INSERT INTO drivers (full_name, license_number, license_category, license_expiry, contact_number, safety_score, status, user_id, created_at)
                VALUES (?, ?, 'Heavy Commercial (HMV)', '2028-12-31', '+91 98765 43210', 100.00, 'Available', ?, NOW())
            `, [u.full_name, licenseNum, u.user_id]);
            console.log(`[Driver Sync] Automatically created driver roster profile for user #${u.user_id} (${u.full_name}).`);
        }
    } catch (e) {
        console.error('[Driver Sync DB error]', e.message);
    }
}

/**
 * GET /api/drivers
 */
async function getAllDrivers(req, res) {
    try {
        await syncDriverUsers();
        const { search, status, category } = req.query;

        let sql = 'SELECT * FROM drivers WHERE 1=1';
        let params = [];

        if (search) {
            sql += ' AND (full_name LIKE ? OR license_number LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }
        if (status && status !== 'All') {
            sql += ' AND status = ?';
            params.push(status);
        }
        if (category && category !== 'All') {
            sql += ' AND license_category = ?';
            params.push(category);
        }

        sql += ' ORDER BY driver_id DESC';

        const rows = await db.query(sql, params);
        const kpis = computeDriverKPIs(rows);
        return res.json({ success: true, count: rows.length, kpis, drivers: rows, source: 'MySQL' });
    } catch (err) {
        console.error('[getAllDrivers DB error]', err.message);
        return res.status(500).json({ success: false, message: 'Server error retrieving drivers.' });
    }
}

/**
 * GET /api/drivers/:id
 */
async function getDriverById(req, res) {
    const id = Number(req.params.id);
    try {
        const rows = await db.query('SELECT * FROM drivers WHERE driver_id = ?', [id]);
        if (rows.length > 0) {
            return res.json({ success: true, driver: rows[0] });
        }
        return res.status(404).json({ success: false, message: `Driver ID #${id} not found.` });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Database error retrieving driver.' });
    }
}

/**
 * POST /api/drivers
 */
async function createDriver(req, res) {
    const errorMsg = validateDriverPayload(req.body);
    if (errorMsg) {
        return res.status(400).json({ success: false, message: errorMsg });
    }

    const {
        full_name,
        license_number,
        license_category = 'Heavy Commercial (HMV)',
        license_expiry = '2028-12-31',
        contact_number = '+91 98000 00000',
        safety_score = 100,
        status = 'Available',
        region = 'West'
    } = req.body;

    const cleanLic = license_number.trim().toUpperCase();

    try {
        const insertSql = `
            INSERT INTO drivers (full_name, license_number, license_category, license_expiry, contact_number, safety_score, status)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        const result = await db.query(insertSql, [
            full_name.trim(),
            cleanLic,
            license_category,
            license_expiry,
            contact_number.trim(),
            Number(safety_score),
            status
        ]);

        const newDriver = {
            driver_id: result.insertId,
            full_name: full_name.trim(),
            license_number: cleanLic,
            license_category,
            license_expiry,
            contact_number: contact_number.trim(),
            safety_score: Number(safety_score),
            status,
            region
        };
        return res.status(201).json({ success: true, message: 'Driver registered successfully.', driver: newDriver });
    } catch (dbErr) {
        console.error('[createDriver DB error]', dbErr.message);
        return res.status(500).json({ success: false, message: 'Database error creating driver.' });
    }
}

/**
 * PUT /api/drivers/:id
 */
async function updateDriver(req, res) {
    const id = Number(req.params.id);
    const errorMsg = validateDriverPayload(req.body, true, id);
    if (errorMsg) {
        return res.status(400).json({ success: false, message: errorMsg });
    }

    const {
        full_name,
        license_number,
        license_category,
        license_expiry,
        contact_number,
        safety_score,
        status,
        region = 'West'
    } = req.body;

    const cleanLic = license_number ? license_number.trim().toUpperCase() : '';

    try {
        const updateSql = `
            UPDATE drivers
            SET full_name = ?, license_number = ?, license_category = ?, license_expiry = ?, contact_number = ?, safety_score = ?, status = ?
            WHERE driver_id = ?
        `;
        const result = await db.query(updateSql, [
            full_name.trim(),
            cleanLic,
            license_category,
            license_expiry,
            contact_number.trim(),
            Number(safety_score),
            status,
            id
        ]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: `Driver ID #${id} not found.` });
        }

        const updatedDriver = {
            driver_id: id,
            full_name: full_name.trim(),
            license_number: cleanLic,
            license_category,
            license_expiry,
            contact_number: contact_number.trim(),
            safety_score: Number(safety_score),
            status,
            region
        };

        return res.json({ success: true, message: 'Driver profile updated successfully.', driver: updatedDriver });
    } catch (dbErr) {
        console.error('[updateDriver DB error]', dbErr.message);
        return res.status(500).json({ success: false, message: 'Database error updating driver.' });
    }
}

/**
 * DELETE /api/drivers/:id
 */
async function deleteDriver(req, res) {
    const id = Number(req.params.id);

    try {
        const result = await db.query('DELETE FROM drivers WHERE driver_id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: `Driver ID #${id} not found.` });
        }
        return res.json({ success: true, message: `Driver removed successfully.` });
    } catch (dbErr) {
        return res.status(500).json({ success: false, message: 'Database error deleting driver.' });
    }
}

/**
 * Internal helper to get driver by ID (for trip engine)
 */
async function getDriverByIdInternal(id) {
    try {
        const rows = await db.query('SELECT * FROM drivers WHERE driver_id = ?', [id]);
        if (rows.length > 0) return rows[0];
    } catch (e) {}
    return null;
}

/**
 * Internal helper to update driver status (for trip dispatch/completion)
 */
async function updateDriverStatusInternal(id, newStatus) {
    try {
        await db.query('UPDATE drivers SET status = ? WHERE driver_id = ?', [newStatus, id]);
    } catch (e) {}
}

module.exports = {
    getAllDrivers,
    getDriverById,
    createDriver,
    updateDriver,
    deleteDriver,
    getDriverByIdInternal,
    updateDriverStatusInternal,
    syncDriverUsers
};
