const express = require('express');
const bodyParser = require('body-parser');
const driversRoutes = require('./routes/driversRoutes');

const app = express();
app.use(bodyParser.json());
app.use('/api/drivers', driversRoutes);

async function runTests() {
    const server = app.listen(5015, async () => {
        try {
            console.log('--- TEST 1: Retrieve Drivers & Verify Roster KPIs ---');
            let res = await fetch('http://localhost:5015/api/drivers');
            let data = await res.json();
            console.log('GET /api/drivers status:', res.status, 'Count:', data.count);
            console.log('Driver Roster KPIs:', data.kpis);
            if (!data.kpis || typeof data.kpis.totalDrivers !== 'number') {
                throw new Error('Driver KPIs missing or invalid.');
            }

            console.log('--- TEST 2: Register New Driver Profile ---');
            res = await fetch('http://localhost:5015/api/drivers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    full_name: 'David Miller',
                    license_number: 'DL-99-2023-77411',
                    license_category: 'Light Commercial (LMV)',
                    license_expiry: '2029-05-30',
                    contact_number: '+91 98111 22233',
                    safety_score: 97.5,
                    status: 'Available'
                })
            });
            data = await res.json();
            console.log('POST /api/drivers status:', res.status, 'Message:', data.message);
            if (res.status !== 201 || !data.success) {
                throw new Error('Failed to register driver.');
            }

            console.log('--- TEST 3: Reject Duplicate License Number ---');
            res = await fetch('http://localhost:5015/api/drivers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    full_name: 'Imposter Driver',
                    license_number: 'DL-99-2023-77411',
                    license_category: 'Heavy Commercial (HMV)',
                    status: 'Available'
                })
            });
            data = await res.json();
            console.log('Duplicate POST status:', res.status, 'Message:', data.message);
            if (res.status !== 400) {
                throw new Error('Duplicate license number was not rejected.');
            }

            console.log('--- TEST 4: Filter by License Category ---');
            res = await fetch('http://localhost:5015/api/drivers?category=Light Commercial (LMV)');
            data = await res.json();
            console.log('Filtered by LMV count:', data.count);
            data.drivers.forEach(d => {
                if (d.license_category !== 'Light Commercial (LMV)') {
                    throw new Error(`Filter mismatch: found ${d.license_category}`);
                }
            });

            console.log('✅ ALL MODULE 3.4 DRIVER MANAGEMENT TESTS PASSED SUCCESSFULLY!');
            server.close();
            process.exit(0);
        } catch (err) {
            console.error('❌ TEST FAILED:', err.message);
            server.close();
            process.exit(1);
        }
    });
}

runTests();
