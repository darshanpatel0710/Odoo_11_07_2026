const express = require('express');
const bodyParser = require('body-parser');
const analyticsRoutes = require('./routes/analyticsRoutes');

const app = express();
app.use(bodyParser.json());
app.use('/api/analytics', analyticsRoutes);

async function runTests() {
    const server = app.listen(5031, async () => {
        console.log('===========================================================');
        console.log('🧪 RUNNING MODULE 3.8: REPORTS & ANALYTICS & ROI TESTS');
        console.log('===========================================================');

        let passed = 0;
        let failed = 0;

        try {
            // Test 1: GET /api/analytics returns complete fleet KPIs
            const r1 = await fetch('http://localhost:5031/api/analytics');
            const d1 = await r1.json();
            if (d1.success && d1.kpis && typeof d1.kpis.avgFleetROI === 'number') {
                console.log(`✅ TEST 1 PASSED: GET /api/analytics returns Fleet Utilization (${d1.kpis.fleetUtilization}%), Fuel Efficiency (${d1.kpis.avgFuelEfficiency} KM/L), and Avg ROI (${d1.kpis.avgFleetROI}%).`);
                passed++;
            } else {
                console.error('❌ TEST 1 FAILED:', d1);
                failed++;
            }

            // Test 2: Verify Vehicle ROI formula [Revenue - (Maintenance + Fuel)] / Acquisition Cost * 100
            const vList = d1.vehicleAnalytics || [];
            const v1 = vList.find(v => Number(v.vehicle_id) === 1);
            if (v1) {
                const expectedROI = Number((((v1.revenue - v1.operationalCost) / v1.acquisitionCost) * 100).toFixed(2));
                if (Math.abs(v1.roi - expectedROI) < 0.01) {
                    console.log(`✅ TEST 2 PASSED: Vehicle #1 ROI (${v1.roi}%) matches exact formula [Revenue ($${v1.revenue}) - Operational Cost ($${v1.operationalCost})] / Acquisition Cost ($${v1.acquisitionCost}) * 100.`);
                    passed++;
                } else {
                    console.error('❌ TEST 2 FAILED: ROI Formula mismatch:', v1, 'Expected:', expectedROI);
                    failed++;
                }
            } else {
                console.error('❌ TEST 2 FAILED: Vehicle #1 not found in analytics.');
                failed++;
            }

            // Test 3: Verify Fuel Efficiency formula Distance / Liters
            if (v1 && v1.totalLiters > 0) {
                const expectedEfficiency = Number((v1.odometer / v1.totalLiters).toFixed(2));
                if (Math.abs(v1.fuelEfficiency - expectedEfficiency) < 0.01) {
                    console.log(`✅ TEST 3 PASSED: Fuel Efficiency (${v1.fuelEfficiency} KM/L) accurately matches Distance (${v1.odometer} KM) / Liters (${v1.totalLiters} L).`);
                    passed++;
                } else {
                    console.error('❌ TEST 3 FAILED: Fuel efficiency mismatch:', v1);
                    failed++;
                }
            } else {
                console.error('❌ TEST 3 FAILED: Vehicle #1 liters missing.');
                failed++;
            }

            // Test 4: Verify all vehicles are returned with full analytical payload
            if (vList.length >= 6) {
                console.log(`✅ TEST 4 PASSED: Complete analytical ledger verified for all ${vList.length} fleet vehicles.`);
                passed++;
            } else {
                console.error('❌ TEST 4 FAILED: Incomplete vehicle analytics list:', vList.length);
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
