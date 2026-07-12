const db = require('../config/db');
const { getVehicleByIdInternal, updateVehicleStatusInternal } = require('./vehiclesController');

const ALLOWED_MAINTENANCE_STATUSES = ['In Progress', 'Completed', 'Active', 'Closed'];

/**
 * Compute Shop & Maintenance Executive KPIs
 */
function computeMaintenanceKPIs(list) {
    const totalLogs = list.length;
    const activeInShop = list.filter(m => m.status === 'In Progress').length;
    const completedLogs = list.filter(m => m.status === 'Completed').length;

    let totalCost = 0;
    list.forEach(m => {
        totalCost += Number(m.cost || 0);
    });

    const avgCost = totalLogs > 0 ? Math.round(totalCost / totalLogs) : 0;

    return {
        totalLogs,
        activeInShop,
        completedLogs,
        totalCost,
        avgCost
    };
}

/**
 * GET /api/maintenance
 */
async function getAllMaintenance(req, res) {
    try {
        const { search, status } = req.query;

        let sql = `SELECT m.*, COALESCE(m.vehicle_reg, v.registration_number) AS vehicle_reg, COALESCE(m.service_date, DATE_FORMAT(m.start_date, '%Y-%m-%d')) AS service_date, COALESCE(m.service_type, 'General Maintenance') AS service_type FROM maintenance_logs m LEFT JOIN vehicles v ON m.vehicle_id = v.vehicle_id WHERE 1=1`;
        let params = [];

        if (search) {
            sql += ' AND (m.vehicle_reg LIKE ? OR v.registration_number LIKE ? OR m.service_type LIKE ? OR m.description LIKE ?)';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
        }
        if (status && status !== 'All') {
            sql += ' AND m.status = ?';
            params.push(status);
        }

        sql += ' ORDER BY m.maintenance_id DESC';

        const rows = await db.query(sql, params);
        const kpis = computeMaintenanceKPIs(rows);
        return res.json({ success: true, count: rows.length, kpis, logs: rows, source: 'MySQL' });
    } catch (err) {
        console.error('[getAllMaintenance DB error]', err.message);
        return res.status(500).json({ success: false, message: 'Server error retrieving maintenance logs.' });
    }
}

/**
 * GET /api/maintenance/:id
 */
async function getMaintenanceById(req, res) {
    const id = Number(req.params.id);
    try {
        const rows = await db.query(`SELECT m.*, COALESCE(m.vehicle_reg, v.registration_number) AS vehicle_reg, COALESCE(m.service_date, DATE_FORMAT(m.start_date, '%Y-%m-%d')) AS service_date, COALESCE(m.service_type, 'General Maintenance') AS service_type FROM maintenance_logs m LEFT JOIN vehicles v ON m.vehicle_id = v.vehicle_id WHERE m.maintenance_id = ?`, [id]);
        if (rows.length > 0) {
            return res.json({ success: true, log: rows[0] });
        }
        return res.status(404).json({ success: false, message: `Maintenance log #${id} not found.` });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Database error retrieving maintenance log.' });
    }
}

/**
 * POST /api/maintenance
 * Creates a maintenance record and automatically locks the vehicle to 'In Shop'
 */
async function createMaintenance(req, res) {
    const {
        vehicle_id,
        service_type,
        description = '',
        cost,
        service_date = new Date().toISOString().split('T')[0],
        status = 'In Progress'
    } = req.body;

    if (!vehicle_id || !service_type || !service_type.trim()) {
        return res.status(400).json({ success: false, message: 'Vehicle and Service Type are required.' });
    }

    const costNum = Number(cost);
    if (isNaN(costNum) || costNum < 0) {
        return res.status(400).json({ success: false, message: 'Cost must be a non-negative numeric value ($).' });
    }

    const vehicle = await getVehicleByIdInternal(vehicle_id);
    if (!vehicle) {
        return res.status(404).json({ success: false, message: `Vehicle ID #${vehicle_id} not found.` });
    }

    const vehicleReg = vehicle.registration_number;

    try {
        const activeDate = service_date || new Date().toISOString().split('T')[0];
        const dbStatus = (status === 'Completed' || status === 'Closed') ? 'Closed' : 'Active';
        const insertSql = `
            INSERT INTO maintenance_logs (vehicle_id, vehicle_reg, service_type, description, cost, start_date, service_date, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `;
        const result = await db.query(insertSql, [
            Number(vehicle_id),
            vehicleReg,
            service_type.trim(),
            description ? description.trim() : service_type.trim(),
            costNum,
            activeDate,
            activeDate,
            dbStatus
        ]);

        const newLog = {
            maintenance_id: result.insertId,
            vehicle_id: Number(vehicle_id),
            vehicle_reg: vehicleReg,
            service_type: service_type.trim(),
            description: description.trim(),
            cost: costNum,
            service_date,
            status,
            created_at: new Date().toISOString()
        };

        // Automatic Asset Interlock: Adding to Maintenance Log switches vehicle status to 'In Shop'
        if (status === 'In Progress') {
            await updateVehicleStatusInternal(vehicle_id, 'In Shop');
        }

        return res.status(201).json({ success: true, message: 'Maintenance record created successfully. Vehicle moved to Shop.', log: newLog });
    } catch (dbErr) {
        console.error('[createMaintenance DB error]', dbErr.message);
        return res.status(500).json({ success: false, message: 'Database error creating maintenance record.' });
    }
}

/**
 * PUT /api/maintenance/:id/status
 * Completes a repair order and releases the vehicle back to 'Available'
 */
async function updateMaintenanceStatus(req, res) {
    const id = Number(req.params.id);
    const { status } = req.body;

    if (!ALLOWED_MAINTENANCE_STATUSES.includes(status)) {
        return res.status(400).json({ success: false, message: `Invalid maintenance status '${status}'.` });
    }

    try {
        const rows = await db.query('SELECT * FROM maintenance_logs WHERE maintenance_id = ?', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: `Maintenance log #${id} not found.` });
        }
        const log = rows[0];
        const oldStatus = log.status;

        await db.query('UPDATE maintenance_logs SET status = ? WHERE maintenance_id = ?', [status, id]);
        log.status = status;

        if (status === 'Completed' && oldStatus !== 'Completed') {
            await updateVehicleStatusInternal(log.vehicle_id, 'Available');
        } else if (status === 'In Progress' && oldStatus !== 'In Progress') {
            await updateVehicleStatusInternal(log.vehicle_id, 'In Shop');
        }

        return res.json({
            success: true,
            message: `Maintenance work order #${id} marked as ${status}. ${status === 'Completed' ? 'Vehicle released to Available.' : 'Vehicle locked In Shop.'}`,
            log
        });
    } catch (err) {
        console.error('updateMaintenanceStatus DB error:', err.message);
        return res.status(500).json({ success: false, message: 'Database error updating maintenance status: ' + err.message });
    }
}

/**
 * DELETE /api/maintenance/:id
 */
async function deleteMaintenance(req, res) {
    const id = Number(req.params.id);

    try {
        const result = await db.query('DELETE FROM maintenance_logs WHERE maintenance_id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: `Maintenance log #${id} not found.` });
        }
        return res.json({ success: true, message: `Maintenance record #${id} deleted successfully.` });
    } catch (dbErr) {
        return res.status(500).json({ success: false, message: 'Database error deleting maintenance record.' });
    }
}

async function getMaintenanceLogsInternal() {
    try {
        const rows = await db.query('SELECT * FROM maintenance_logs ORDER BY maintenance_id ASC');
        return rows;
    } catch (e) {
        return [];
    }
}

module.exports = {
    getAllMaintenance,
    getMaintenanceById,
    createMaintenance,
    updateMaintenanceStatus,
    deleteMaintenance,
    getMaintenanceLogsInternal
};
