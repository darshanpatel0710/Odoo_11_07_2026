const express = require('express');
const bodyParser = require('body-parser');
const maintenanceRoutes = require('./routes/maintenanceRoutes');
const vehiclesRoutes = require('./routes/vehiclesRoutes');

const app = express();
app.use(bodyParser.json());
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/vehicles', vehiclesRoutes);

async function runTests() {
    const server = app.listen(5019, async () => {
        console.log('===========================================================');
        console.log('🧪 RUNNING MODULE 3.6: MAINTENANCE & SHOP QUEUE TESTS');
        console.log('===========================================================');

        let passed = 0;
        let failed = 0;

        try {
            // Test 1: GET all maintenance records & check KPIs
            const r1 = await fetch('http://localhost:5019/api/maintenance');
            const d1 = await r1.json();
            if (d1.success && d1.count >= 3 && d1.kpis.totalLogs >= 3) {
                console.log('✅ TEST 1 PASSED: GET /api/maintenance returns work orders + shop KPIs.');
                passed++;
            } else {
                console.error('❌ TEST 1 FAILED:', d1);
                failed++;
            }

            // Test 2: Create Maintenance record on Vehicle #1 (status: In Progress)
            const r2 = await fetch('http://localhost:5019/api/maintenance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    vehicle_id: 1,
                    service_type: 'Brake Disc Overhaul',
                    description: 'Replacing worn front brake discs.',
                    cost: 1100,
                    status: 'In Progress'
                })
            });
            const d2 = await r2.json();
            if (r2.status === 201 && d2.log.status === 'In Progress') {
                console.log('✅ TEST 2 PASSED: Created active work order on Vehicle #1.');
                passed++;
            } else {
                console.error('❌ TEST 2 FAILED:', d2);
                failed++;
            }

            // Test 3: Automatic Asset Interlock - Verify Vehicle #1 status is now "In Shop"
            const rV = await fetch('http://localhost:5019/api/vehicles/1');
            const dV = await rV.json();
            if (dV.vehicle && dV.vehicle.status === 'In Shop') {
                console.log('✅ TEST 3 PASSED: Automatic Interlock -> Vehicle #1 status switched to "In Shop".');
                passed++;
            } else {
                console.error('❌ TEST 3 FAILED: Vehicle status did not switch to In Shop:', dV);
                failed++;
            }

            // Test 4: Verify Vehicle #1 is EXCLUDED from Available Vehicles Pool (/api/vehicles?status=Available)
            const rPool = await fetch('http://localhost:5019/api/vehicles?status=Available');
            const dPool = await rPool.json();
            const poolContains1 = (dPool.vehicles || []).some(v => Number(v.vehicle_id) === 1);
            if (!poolContains1) {
                console.log('✅ TEST 4 PASSED: Vehicle #1 is removed from Driver/Dispatcher selection pool while In Shop.');
                passed++;
            } else {
                console.error('❌ TEST 4 FAILED: Vehicle #1 should not appear in Available pool while In Shop.');
                failed++;
            }

            // Test 5: Complete repair & release vehicle
            const logId = d2.log.maintenance_id;
            const r5 = await fetch(`http://localhost:5019/api/maintenance/${logId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'Completed' })
            });
            const d5 = await r5.json();
            if (d5.success && d5.log.status === 'Completed') {
                console.log('✅ TEST 5 PASSED: Work order completed successfully.');
                passed++;
            } else {
                console.error('❌ TEST 5 FAILED:', d5);
                failed++;
            }

            // Test 6: Verify Vehicle #1 automatically restored to Available status
            const rV2 = await fetch('http://localhost:5019/api/vehicles/1');
            const dV2 = await rV2.json();
            if (dV2.vehicle && dV2.vehicle.status === 'Available') {
                console.log('✅ TEST 6 PASSED: Completed repair automatically released Vehicle #1 back to Available status.');
                passed++;
            } else {
                console.error('❌ TEST 6 FAILED:', dV2);
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
