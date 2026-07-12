const db = require('../config/db');
const { getAllVehiclesInternal, getVehicleByIdInternal } = require('./vehiclesController');
const { getMaintenanceLogsInternal } = require('./maintenanceController');

// MySQL-backed Fuel & Expense Controller

/**
 * Compute KPIs for Fuel & Expense logs
 */
function computeFuelKPIs(list) {
    let totalFuelCost = 0;
    let totalOtherExpense = 0;
    let totalLiters = 0;

    list.forEach(item => {
        if (item.expense_type === 'Fuel') {
            totalFuelCost += Number(item.cost || 0);
            totalLiters += Number(item.liters || 0);
        } else {
            totalOtherExpense += Number(item.cost || 0);
        }
    });

    return {
        totalLogs: list.length,
        totalFuelCost: Math.round(totalFuelCost * 100) / 100,
        totalOtherExpense: Math.round(totalOtherExpense * 100) / 100,
        totalLiters: Math.round(totalLiters * 10) / 10
    };
}

/**
 * GET /api/fuel
 * Returns all fuel/expense logs + KPIs
 */
async function getAllFuelLogs(req, res) {
    try {
        const { search, type } = req.query;

        let sql = "SELECT fuel_id, vehicle_id, vehicle_reg, expense_type, liters, cost, DATE_FORMAT(date, '%Y-%m-%d') as date, notes, created_at FROM fuel_logs WHERE 1=1";
        let params = [];

        if (search) {
            sql += ' AND (vehicle_reg LIKE ? OR notes LIKE ? OR expense_type LIKE ?)';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
        if (type && type !== 'All') {
            sql += ' AND expense_type = ?';
            params.push(type);
        }

        sql += ' ORDER BY fuel_id DESC';
        const rows = await db.query(sql, params);
        const kpis = computeFuelKPIs(rows);
        return res.json({ success: true, count: rows.length, kpis, logs: rows, source: 'MySQL' });
    } catch (err) {
        console.error('[getAllFuelLogs DB error]', err.message);
        return res.status(500).json({ success: false, message: 'Server error retrieving fuel logs.' });
    }
}

/**
 * GET /api/fuel/operational-costs
 * Automatically merges Fuel + Expense + Maintenance per vehicle to calculate Total Operational Cost dynamically from MySQL
 */
async function getOperationalCosts(req, res) {
    try {
        const vehicles = await db.query('SELECT * FROM vehicles ORDER BY vehicle_id ASC');
        const fuelLogs = await db.query('SELECT * FROM fuel_logs');
        const maintenanceLogs = await db.query('SELECT * FROM maintenance_logs');

        let fleetTotalOperationalCost = 0;
        let fleetTotalFuelCost = 0;
        let fleetTotalMaintenanceCost = 0;
        let fleetTotalLiters = 0;

        const vehicleCosts = vehicles.map(v => {
            const vId = Number(v.vehicle_id);

            // 1. Sum Fuel & General Expenses for this vehicle
            const vFuelLogs = fuelLogs.filter(f => Number(f.vehicle_id) === vId);
            let fuelCost = 0;
            let otherExpenseCost = 0;
            let liters = 0;

            vFuelLogs.forEach(f => {
                if (f.expense_type === 'Fuel') {
                    fuelCost += Number(f.cost || 0);
                    liters += Number(f.liters || 0);
                } else {
                    otherExpenseCost += Number(f.cost || 0);
                }
            });

            // 2. Sum Maintenance Costs for this vehicle
            const vMaintLogs = maintenanceLogs.filter(m => Number(m.vehicle_id) === vId);
            let maintenanceCost = 0;
            vMaintLogs.forEach(m => {
                maintenanceCost += Number(m.cost || 0);
            });

            // 3. Compute Total Operational Cost (Fuel + Maintenance + Other Expenses)
            const totalOperationalCost = fuelCost + otherExpenseCost + maintenanceCost;
            const odometer = Number(v.odometer || 0);
            const costPerKm = odometer > 0 ? Number((totalOperationalCost / odometer).toFixed(2)) : 0;

            fleetTotalOperationalCost += totalOperationalCost;
            fleetTotalFuelCost += (fuelCost + otherExpenseCost);
            fleetTotalMaintenanceCost += maintenanceCost;
            fleetTotalLiters += liters;

            return {
                vehicle_id: vId,
                registration_number: v.registration_number,
                model_name: v.model_name,
                vehicle_type: v.vehicle_type,
                odometer: odometer,
                fuelCost: Math.round(fuelCost * 100) / 100,
                otherExpenseCost: Math.round(otherExpenseCost * 100) / 100,
                maintenanceCost: Math.round(maintenanceCost * 100) / 100,
                totalOperationalCost: Math.round(totalOperationalCost * 100) / 100,
                costPerKm,
                totalLiters: Math.round(liters * 10) / 10,
                logCount: vFuelLogs.length + vMaintLogs.length
            };
        });

        return res.json({
            success: true,
            kpis: {
                fleetTotalOperationalCost: Math.round(fleetTotalOperationalCost),
                fleetTotalFuelCost: Math.round(fleetTotalFuelCost),
                fleetTotalMaintenanceCost: Math.round(fleetTotalMaintenanceCost),
                fleetTotalLiters: Math.round(fleetTotalLiters)
            },
            vehicleCosts
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Error computing operational costs.' });
    }
}

/**
 * POST /api/fuel
 * Create a fuel or expense record
 */
async function createFuelLog(req, res) {
    const {
        vehicle_id,
        expense_type = 'Fuel',
        liters = 0,
        cost,
        date = new Date().toISOString().split('T')[0],
        notes = ''
    } = req.body;

    if (!vehicle_id || !cost) {
        return res.status(400).json({ success: false, message: 'Vehicle and Cost amount are required.' });
    }

    const costNum = Number(cost);
    if (isNaN(costNum) || costNum < 0) {
        return res.status(400).json({ success: false, message: 'Cost must be a non-negative numeric value ($).' });
    }

    const litersNum = expense_type === 'Fuel' ? Number(liters || 0) : 0;
    if (expense_type === 'Fuel' && (isNaN(litersNum) || litersNum <= 0)) {
        return res.status(400).json({ success: false, message: 'Fuel quantity (Liters) must be greater than 0.' });
    }

    const vehicle = await getVehicleByIdInternal(vehicle_id);
    if (!vehicle) {
        return res.status(404).json({ success: false, message: `Vehicle ID #${vehicle_id} not found.` });
    }

    const vehicleReg = vehicle.registration_number;

    try {
        const insertSql = `
            INSERT INTO fuel_logs (vehicle_id, vehicle_reg, expense_type, liters, cost, date, log_date, notes, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `;
        const result = await db.query(insertSql, [
            Number(vehicle_id),
            vehicleReg,
            expense_type,
            litersNum,
            costNum,
            date,
            date,
            notes ? notes.trim() : ''
        ]);

        const newLog = {
            fuel_id: result.insertId,
            vehicle_id: Number(vehicle_id),
            vehicle_reg: vehicleReg,
            expense_type,
            liters: litersNum,
            cost: costNum,
            date,
            notes: notes.trim(),
            created_at: new Date().toISOString()
        };

        return res.status(201).json({ success: true, message: 'Expense log recorded successfully.', log: newLog });
    } catch (dbErr) {
        console.error('[createFuelLog DB error]', dbErr.message);
        return res.status(500).json({ success: false, message: 'Database error recording expense log.' });
    }
}

/**
 * DELETE /api/fuel/:id
 */
async function deleteFuelLog(req, res) {
    const id = Number(req.params.id);

    try {
        const result = await db.query('DELETE FROM fuel_logs WHERE fuel_id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: `Fuel log #${id} not found.` });
        }
        return res.json({ success: true, message: `Fuel log #${id} deleted successfully.` });
    } catch (dbErr) {
        return res.status(500).json({ success: false, message: 'Database error deleting expense log.' });
    }
}

async function getFuelLogsInternal() {
    try {
        const rows = await db.query('SELECT * FROM fuel_logs ORDER BY fuel_id ASC');
        return rows;
    } catch (e) {
        return [];
    }
}

module.exports = {
    getAllFuelLogs,
    getOperationalCosts,
    createFuelLog,
    deleteFuelLog,
    getFuelLogsInternal
};
