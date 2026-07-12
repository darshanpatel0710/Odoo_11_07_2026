const db = require('../config/db');

/**
 * GET /api/analytics
 * Returns comprehensive Fleet Analytics: Fuel Efficiency, Fleet Utilization, Operational Cost, and Vehicle ROI dynamically from MySQL
 */
async function getFleetAnalytics(req, res) {
    try {
        const vehicles = await db.query('SELECT * FROM vehicles ORDER BY vehicle_id ASC');
        const trips = await db.query('SELECT * FROM trips');
        const maintenanceLogs = await db.query('SELECT * FROM maintenance_logs');
        const fuelLogs = await db.query('SELECT * FROM fuel_logs');

        const totalVehicles = vehicles.length;
        const activeVehiclesCount = vehicles.filter(v => v.status === 'On Trip' || v.status === 'Available').length;
        const onTripCount = vehicles.filter(v => v.status === 'On Trip').length;
        const fleetUtilization = totalVehicles > 0 ? Math.round((onTripCount / totalVehicles) * 100) : 0;

        let totalFleetOpCost = 0;
        let totalFleetRevenue = 0;
        let totalFleetDistance = 0;
        let totalFleetLiters = 0;
        let totalROISum = 0;

        const vehicleAnalytics = vehicles.map(v => {
            const vId = Number(v.vehicle_id);
            const acquisitionCost = Number(v.acquisition_cost) > 0 ? Number(v.acquisition_cost) : 38000;
            const odometer = Number(v.odometer || 0);

            // 1. Calculate Fuel & General Expenses
            const vFuelLogs = fuelLogs.filter(f => Number(f.vehicle_id) === vId);
            let fuelCost = 0;
            let otherExpenseCost = 0;
            let totalLiters = 0;

            vFuelLogs.forEach(f => {
                if (f.expense_type === 'Fuel') {
                    fuelCost += Number(f.cost || 0);
                    totalLiters += Number(f.liters || 0);
                } else {
                    otherExpenseCost += Number(f.cost || 0);
                }
            });

            // 2. Calculate Maintenance Cost
            const vMaintLogs = maintenanceLogs.filter(m => Number(m.vehicle_id) === vId);
            let maintenanceCost = 0;
            vMaintLogs.forEach(m => {
                maintenanceCost += Number(m.cost || 0);
            });

            const operationalCost = Math.round((fuelCost + otherExpenseCost + maintenanceCost) * 100) / 100;

            // 3. Calculate Fuel Efficiency (Distance / Fuel Consumed)
            const fuelEfficiency = totalLiters > 0 ? Number((odometer / totalLiters).toFixed(2)) : 0;

            // 4. Calculate Revenue from freight hauling
            const vTrips = trips.filter(t => Number(t.vehicle_id) === vId && (t.status === 'Completed' || t.status === 'Dispatched'));
            let tripRevenue = 0;
            vTrips.forEach(t => {
                tripRevenue += Number(t.planned_distance || 0) * 4.50; // $4.50 per haul KM
            });

            // Ensure baseline revenue contribution from historic odometer earnings
            const historicRevenue = Math.round(odometer * 1.65);
            const totalRevenue = Math.round((tripRevenue + historicRevenue) * 100) / 100;

            // 5. Calculate Vehicle ROI [%] = [Revenue - (Maintenance + Fuel)] / Acquisition Cost * 100
            const netProfit = Math.round((totalRevenue - operationalCost) * 100) / 100;
            const roiPercent = Number((((totalRevenue - operationalCost) / acquisitionCost) * 100).toFixed(2));

            totalFleetOpCost += operationalCost;
            totalFleetRevenue += totalRevenue;
            totalFleetDistance += odometer;
            totalFleetLiters += totalLiters;
            totalROISum += roiPercent;

            return {
                vehicle_id: vId,
                registration_number: v.registration_number,
                model_name: v.model_name,
                vehicle_type: v.vehicle_type,
                status: v.status,
                acquisitionCost,
                odometer,
                totalLiters: Math.round(totalLiters * 10) / 10,
                fuelEfficiency,
                operationalCost,
                revenue: totalRevenue,
                netProfit,
                roi: roiPercent
            };
        });

        const avgFuelEfficiency = totalFleetLiters > 0 ? Number((totalFleetDistance / totalFleetLiters).toFixed(2)) : 0;
        const avgFleetROI = totalVehicles > 0 ? Number((totalROISum / totalVehicles).toFixed(2)) : 0;

        return res.json({
            success: true,
            kpis: {
                fleetUtilization,
                avgFuelEfficiency,
                totalOperationalCost: Math.round(totalFleetOpCost),
                totalFleetRevenue: Math.round(totalFleetRevenue),
                avgFleetROI
            },
            vehicleAnalytics
        });
    } catch (err) {
        console.error('Error computing analytics:', err);
        return res.status(500).json({ success: false, message: 'Server error computing fleet analytics.' });
    }
}

module.exports = {
    getFleetAnalytics
};
