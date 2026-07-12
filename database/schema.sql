DROP DATABASE IF EXISTS fleetmaster_pro;
CREATE DATABASE fleetmaster_pro;
USE fleetmaster_pro;

SET FOREIGN_KEY_CHECKS = 0;

-- ======================================================
-- ROLES
-- ======================================================

CREATE TABLE roles ( 
    role_id INT AUTO_INCREMENT PRIMARY KEY,
    role_name ENUM(
        'Fleet Manager',
        'Driver',
        'Safety Officer',
        'Financial Analyst'
    ) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ======================================================
-- USERS
-- ======================================================

CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    role_id INT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_users_role
        FOREIGN KEY(role_id)
        REFERENCES roles(role_id)
        ON DELETE RESTRICT
);

-- ======================================================
-- VEHICLES
-- ======================================================

CREATE TABLE vehicles (

    vehicle_id INT AUTO_INCREMENT PRIMARY KEY,

    registration_number VARCHAR(30) NOT NULL UNIQUE,

    model_name VARCHAR(100) NOT NULL,

    vehicle_type ENUM(
        'Truck',
        'Van',
        'Car',
        'Trailer',
        'Bus'
    ) NOT NULL,

    max_load_capacity DECIMAL(10,2) NOT NULL,

    odometer DECIMAL(12,2) DEFAULT 0,

    acquisition_cost DECIMAL(12,2) NOT NULL,

    status ENUM(
        'Available',
        'On Trip',
        'In Shop',
        'Retired'
    ) DEFAULT 'Available',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CHECK(max_load_capacity > 0),
    CHECK(odometer >= 0),
    CHECK(acquisition_cost >= 0)
);

-- ======================================================
-- DRIVERS
-- ======================================================

CREATE TABLE drivers (

    driver_id INT AUTO_INCREMENT PRIMARY KEY,

    full_name VARCHAR(150) NOT NULL,

    license_number VARCHAR(50) NOT NULL UNIQUE,

    license_category VARCHAR(30) NOT NULL,

    license_expiry DATE NOT NULL,

    contact_number VARCHAR(20) NOT NULL,

    safety_score DECIMAL(5,2) DEFAULT 100,

    status ENUM(
        'Available',
        'On Trip',
        'Off Duty',
        'Suspended'
    ) DEFAULT 'Available',

    user_id INT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_driver_user
        FOREIGN KEY(user_id)
        REFERENCES users(user_id)
        ON DELETE SET NULL,

    CHECK(safety_score BETWEEN 0 AND 100)
);

-- ======================================================
-- TRIPS
-- ======================================================

CREATE TABLE trips (

    trip_id INT AUTO_INCREMENT PRIMARY KEY,

    source_location VARCHAR(200) NOT NULL,

    destination VARCHAR(200) NOT NULL,

    vehicle_id INT NOT NULL,

    driver_id INT NOT NULL,

    cargo_weight DECIMAL(10,2) DEFAULT 0,

    planned_distance DECIMAL(10,2) NOT NULL,

    actual_distance DECIMAL(10,2),

    revenue DECIMAL(12,2) DEFAULT 0,

    status ENUM(
        'Draft',
        'Dispatched',
        'Completed',
        'Cancelled'
    ) DEFAULT 'Draft',

    dispatched_at DATETIME NULL,

    completed_at DATETIME NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_trip_vehicle
        FOREIGN KEY(vehicle_id)
        REFERENCES vehicles(vehicle_id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_trip_driver
        FOREIGN KEY(driver_id)
        REFERENCES drivers(driver_id)
        ON DELETE RESTRICT,

    CHECK(cargo_weight >=0),
    CHECK(planned_distance >0),
    CHECK(actual_distance IS NULL OR actual_distance>=0),
    CHECK(revenue>=0)
);

-- ======================================================
-- MAINTENANCE
-- ======================================================

CREATE TABLE maintenance_logs (

    maintenance_id INT AUTO_INCREMENT PRIMARY KEY,

    vehicle_id INT NOT NULL,

    description TEXT NOT NULL,

    cost DECIMAL(12,2) DEFAULT 0,

    start_date DATE NOT NULL,

    end_date DATE,

    status ENUM(
        'Active',
        'Closed'
    ) DEFAULT 'Active',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_maintenance_vehicle
        FOREIGN KEY(vehicle_id)
        REFERENCES vehicles(vehicle_id)
        ON DELETE RESTRICT,

    CHECK(cost>=0)
);

-- ======================================================
-- FUEL LOGS
-- ======================================================

CREATE TABLE fuel_logs (

    fuel_id INT AUTO_INCREMENT PRIMARY KEY,

    vehicle_id INT NOT NULL,

    trip_id INT NULL,

    liters DECIMAL(10,2) NOT NULL,

    cost DECIMAL(10,2) NOT NULL,

    log_date DATE NOT NULL,

    odometer_reading DECIMAL(12,2) NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_fuel_vehicle
        FOREIGN KEY(vehicle_id)
        REFERENCES vehicles(vehicle_id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_fuel_trip
        FOREIGN KEY(trip_id)
        REFERENCES trips(trip_id)
        ON DELETE SET NULL,

    CHECK(liters>0),
    CHECK(cost>=0),
    CHECK(odometer_reading>=0)
);

-- ======================================================
-- EXPENSES
-- ======================================================

CREATE TABLE expenses (

    expense_id INT AUTO_INCREMENT PRIMARY KEY,

    vehicle_id INT NOT NULL,

    trip_id INT NULL,

    expense_type ENUM(
        'Toll',
        'Parking',
        'Fine',
        'Maintenance',
        'Insurance',
        'Other'
    ) NOT NULL,

    amount DECIMAL(12,2) NOT NULL,

    expense_date DATE NOT NULL,

    description TEXT NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_expense_vehicle
        FOREIGN KEY(vehicle_id)
        REFERENCES vehicles(vehicle_id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_expense_trip
        FOREIGN KEY(trip_id)
        REFERENCES trips(trip_id)
        ON DELETE SET NULL,

    CHECK(amount>=0)
);

-- ======================================================
-- INDEXES
-- ======================================================

CREATE INDEX idx_vehicle_status_type
ON vehicles(status, vehicle_type);

CREATE INDEX idx_driver_status
ON drivers(status);

CREATE INDEX idx_trip_status
ON trips(status);

CREATE INDEX idx_trip_vehicle_driver
ON trips(vehicle_id, driver_id);

CREATE INDEX idx_maintenance_vehicle_status
ON maintenance_logs(vehicle_id, status);

CREATE INDEX idx_fuel_vehicle
ON fuel_logs(vehicle_id);

CREATE INDEX idx_expense_vehicle
ON expenses(vehicle_id);

SET FOREIGN_KEY_CHECKS = 1;
