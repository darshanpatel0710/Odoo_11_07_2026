USE fleetmaster_pro;

-- =====================================================
-- ROLES 
-- =====================================================

INSERT IGNORE INTO roles(role_id, role_name, description)
VALUES
(1,'Fleet Manager','Oversees fleet assets, maintenance, and fleet operations.'),
(2,'Driver','Assigned to vehicles and trips.'),
(3,'Safety Officer','Monitors safety scores and license compliance.'),
(4,'Financial Analyst','Tracks expenses and profitability.');

-- =====================================================
-- USERS
-- =====================================================

INSERT IGNORE INTO users
(user_id,email,password_hash,full_name,role_id)
VALUES
(1,'manager@fleetmaster.pro','$2b$10$hashmanager','Sarah Jenkins',1),
(2,'alex@fleetmaster.pro','$2b$10$hashdriver','Alex Rivera',2),
(3,'safety@fleetmaster.pro','$2b$10$hashsafety','Marcus Vance',3),
(4,'finance@fleetmaster.pro','$2b$10$hashfinance','Elena Rostova',4),
(5,'raven.k@transitops.in','$2b$10$hashraven','Raven K.',1);

-- =====================================================
-- VEHICLES
-- =====================================================

INSERT IGNORE INTO vehicles
(vehicle_id,registration_number,model_name,vehicle_type,max_load_capacity,odometer,acquisition_cost,status)
VALUES
(1,'GJ01AB4521','Ford Transit','Van',500,74000,620000,'Available'),
(2,'GJ01AB9981','Tata Ultra','Truck',5000,182000,2450000,'On Trip'),
(3,'GJ01AB1120','Maruti Eeco','Car',1000,66000,410000,'In Shop'),
(4,'GJ01AB0081','Toyota Hiace','Van',750,241900,590000,'Retired');

-- =====================================================
-- DRIVERS
-- =====================================================

INSERT IGNORE INTO drivers
(driver_id,full_name,license_number,license_category,license_expiry,contact_number,safety_score,status,user_id)
VALUES
(1,'Alex Rivera','DL88213','LMV','2028-12-31','9876500001',96,'Available',2),
(2,'John Doe','DL44120','HMV','2025-03-15','9822000002',81,'Suspended',NULL),
(3,'Priya Sharma','DL77031','LMV','2029-08-20','9911000003',99,'On Trip',NULL),
(4,'Suresh Kumar','DL90045','HMV','2027-01-10','9744000004',88,'Available',NULL);

-- =====================================================
-- EXAMPLE VEHICLE
-- =====================================================

INSERT IGNORE INTO vehicles
(vehicle_id,registration_number,model_name,vehicle_type,max_load_capacity,odometer,acquisition_cost,status)
VALUES
(105,'VAN05','Ford Transit Connect','Van',500,1000,30000,'Available');

-- =====================================================
-- EXAMPLE DRIVER
-- =====================================================

INSERT IGNORE INTO drivers
(driver_id,full_name,license_number,license_category,license_expiry,contact_number,safety_score,status,user_id)
VALUES
(105,'Alex Rivera','DLALEX101','Commercial','2029-12-31','9999999999',99,'Available',2);

-- =====================================================
-- CREATE TRIP
-- =====================================================

INSERT IGNORE INTO trips
(trip_id,
source_location,
destination,
vehicle_id,
driver_id,
cargo_weight,
planned_distance,
revenue,
status)
VALUES
(
105,
'Warehouse A',
'Distribution Hub B',
105,
105,
450,
120,
850,
'Draft'
);

-- =====================================================
-- DISPATCH TRIP
-- =====================================================

UPDATE trips
SET status='Dispatched',
    dispatched_at=NOW()
WHERE trip_id=105;

-- =====================================================
-- FUEL LOG
-- =====================================================

INSERT IGNORE INTO fuel_logs
(fuel_id,
vehicle_id,
trip_id,
liters,
cost,
log_date,
odometer_reading)
VALUES
(
105,
105,
105,
12,
180,
CURDATE(),
1120
);

-- =====================================================
-- COMPLETE TRIP
-- =====================================================

UPDATE trips
SET
status='Completed',
actual_distance=120,
completed_at=NOW()
WHERE trip_id=105;

-- =====================================================
-- MAINTENANCE
-- =====================================================

INSERT IGNORE INTO maintenance_logs
(
maintenance_id,
vehicle_id,
description,
cost,
start_date,
status
)
VALUES
(
105,
105,
'Synthetic Oil Change',
120,
CURDATE(),
'Active'
);
