const express = require('express');
const bodyParser = require('body-parser');
const tripsRoutes = require('./routes/tripsRoutes');
const vehiclesRoutes = require('./routes/vehiclesRoutes');
const driversRoutes = require('./routes/driversRoutes');

const app = express();
app.use(bodyParser.json());
app.use('/api/trips', tripsRoutes);
app.use('/api/vehicles', vehiclesRoutes);
app.use('/api/drivers', driversRoutes);

async function runTests() {
    const server = app.listen(5017, async () => {
        console.log('===========================================================');
        console.log('🧪 RUNNING MODULE 3.5: TRIP & DISPATCH LIFECYCLE TESTS');
        console.log('===========================================================');

        let passed = 0;
        let failed = 0;

        try {
            // Test 1: GET all trips & check KPIs
            const r1 = await fetch('http://localhost:5017/api/trips');
            const d1 = await r1.json();
            if (d1.success && d1.count >= 3 && d1.kpis.totalTrips >= 3) {
                console.log('✅ TEST 1 PASSED: GET /api/trips returns initial trips + dispatch KPIs.');
                passed++;
            } else {
                console.error('❌ TEST 1 FAILED:', d1);
                failed++;
            }

            // Test 2: Reject creating trip where cargo_weight > vehicle max_load_capacity
            const r2 = await fetch('http://localhost:5017/api/trips', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    source: 'Mumbai Port',
                    destination: 'Delhi Depot',
                    vehicle_id: 1, // Max load capacity 18000 kg
                    driver_id: 1,
                    cargo_weight: 25000, // OVERLOAD!
                    planned_distance: 1400,
                    status: 'Draft'
                })
            });
            const d2 = await r2.json();
            if (r2.status === 400 && d2.message.includes('exceeds vehicle maximum load capacity')) {
                console.log('✅ TEST 2 PASSED: Server correctly rejects overloaded cargo weight (> vehicle max load capacity).');
                passed++;
            } else {
                console.error('❌ TEST 2 FAILED: Expected 400 rejection for overload, got:', d2);
                failed++;
            }

            // Test 3: Create valid trip in Dispatched status & verify Vehicle/Driver asset lock
            const r3 = await fetch('http://localhost:5017/api/trips', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    source: 'Jaipur Logistics Hub',
                    destination: 'Indore Warehouse',
                    vehicle_id: 2, // Heavy commercial truck (Max: 7500 kg)
                    driver_id: 1,
                    cargo_weight: 5000, // Valid (<= 7500)
                    planned_distance: 520,
                    status: 'Dispatched'
                })
            });
            const d3 = await r3.json();
            if (r3.status === 201 && d3.trip.status === 'Dispatched') {
                console.log('✅ TEST 3 PASSED: Created valid freight trip in Dispatched status.');
                passed++;
            } else {
                console.error('❌ TEST 3 FAILED:', d3);
                failed++;
            }

            // Check asset status lock
            const rV = await fetch('http://localhost:5017/api/vehicles/2');
            const dV = await rV.json();
            if (dV.vehicle && dV.vehicle.status === 'On Trip') {
                console.log('✅ TEST 4 PASSED: Assigned Vehicle #2 automatically transitioned to On Trip.');
                passed++;
            } else {
                console.error('❌ TEST 4 FAILED: Vehicle status not locked to On Trip:', dV);
                failed++;
            }

            // Test 5: Transition Dispatched Trip -> Completed & verify asset release
            const newTripId = d3.trip.trip_id;
            const r5 = await fetch(`http://localhost:5017/api/trips/${newTripId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'Completed' })
            });
            const d5 = await r5.json();
            if (d5.success && d5.trip.status === 'Completed') {
                console.log('✅ TEST 5 PASSED: Successfully transitioned trip lifecycle state to Completed.');
                passed++;
            } else {
                console.error('❌ TEST 5 FAILED:', d5);
                failed++;
            }

            // Verify Vehicle #2 released back to Available
            const rV2 = await fetch('http://localhost:5017/api/vehicles/2');
            const dV2 = await rV2.json();
            if (dV2.vehicle && dV2.vehicle.status === 'Available') {
                console.log('✅ TEST 6 PASSED: Completed trip automatically released Vehicle #2 back to Available status.');
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
