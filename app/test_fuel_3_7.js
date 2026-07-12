const express = require('express');
const bodyParser = require('body-parser');
const fuelRoutes = require('./routes/fuelRoutes');
const maintenanceRoutes = require('./routes/maintenanceRoutes');
const vehiclesRoutes = require('./routes/vehiclesRoutes');

const app = express();
app.use(bodyParser.json());
app.use('/api/fuel', fuelRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/vehicles', vehiclesRoutes);

async function runTests() {
    const server = app.listen(5021, async () => {
        console.log('===========================================================');
        console.log('🧪 RUNNING MODULE 3.7: FUEL & TOTAL OPERATIONAL COST TESTS');
        console.log('===========================================================');

        let passed = 0;
        let failed = 0;

        try {
            // Test 1: GET all fuel logs & check KPIs
            const r1 = await fetch('http://localhost:5021/api/fuel');
            const d1 = await r1.json();
            if (d1.success && d1.count >= 3 && d1.kpis.totalLiters >= 295) {
                console.log('✅ TEST 1 PASSED: GET /api/fuel returns transaction logs + volume/cost KPIs.');
                passed++;
            } else {
                console.error('❌ TEST 1 FAILED:', d1);
                failed++;
            }

            // Test 2: Record a new fuel log for Vehicle #1 (100 Liters, $150)
            const r2 = await fetch('http://localhost:5021/api/fuel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    vehicle_id: 1,
                    expense_type: 'Fuel',
                    liters: 100,
                    cost: 150,
                    notes: 'Test Automated Diesel Refuel'
                })
            });
            const d2 = await r2.json();
            if (r2.status === 201 && d2.log.liters === 100 && d2.log.cost === 150) {
                console.log('✅ TEST 2 PASSED: Successfully recorded new fuel transaction on Vehicle #1.');
                passed++;
            } else {
                console.error('❌ TEST 2 FAILED:', d2);
                failed++;
            }

            // Test 3: Automatically compute merged Total Operational Cost per vehicle
            const r3 = await fetch('http://localhost:5021/api/fuel/operational-costs');
            const d3 = await r3.json();
            const v1Cost = (d3.vehicleCosts || []).find(v => Number(v.vehicle_id) === 1);
            if (v1Cost) {
                const expectedTotal = Number((v1Cost.fuelCost + v1Cost.otherExpenseCost + v1Cost.maintenanceCost).toFixed(2));
                if (Math.abs(v1Cost.totalOperationalCost - expectedTotal) < 0.01) {
                    console.log(`✅ TEST 3 PASSED: Total Operational Cost ($${v1Cost.totalOperationalCost}) accurately equals Fuel ($${v1Cost.fuelCost}) + Other ($${v1Cost.otherExpenseCost}) + Maintenance ($${v1Cost.maintenanceCost}) for Vehicle #1.`);
                    passed++;
                } else {
                    console.error('❌ TEST 3 FAILED: Operational cost mismatch:', v1Cost, 'Expected:', expectedTotal);
                    failed++;
                }
            } else {
                console.error('❌ TEST 3 FAILED: Vehicle #1 not found in operational costs.');
                failed++;
            }

            // Test 4: Verify fleet-wide operational financial summary KPIs
            if (d3.success && d3.kpis.fleetTotalOperationalCost > 0 && d3.kpis.fleetTotalFuelCost > 0) {
                console.log(`✅ TEST 4 PASSED: Fleet-wide Operational Cost KPIs verified ($${d3.kpis.fleetTotalOperationalCost} Total Fleet Op Cost).`);
                passed++;
            } else {
                console.error('❌ TEST 4 FAILED:', d3.kpis);
                failed++;
            }

        } catch (e) {
            console.error('Test exception:', e);
            failed++;
        }

        console.log('===========================================================');
        console.log(`Summary: ${passed} Passed, ${failed} Failed`);
        console.log('===========================================================');

        server.close();
        process.exit(failed === 0 ? 0 : 1);
    });
}

runTests();
