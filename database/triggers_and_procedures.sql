USE fleetmaster_pro;

DELIMITER $$

-- ===========================================================
-- Drop Existing Triggers 
-- ===========================================================

DROP TRIGGER IF EXISTS trg_validate_trip_before_insert$$
DROP TRIGGER IF EXISTS trg_trip_dispatched$$
DROP TRIGGER IF EXISTS trg_trip_completed$$
DROP TRIGGER IF EXISTS trg_trip_cancelled$$
DROP TRIGGER IF EXISTS trg_maintenance_created$$
DROP TRIGGER IF EXISTS trg_maintenance_closed$$

-- ===========================================================
-- Trigger 1
-- Validate Trip Before Insert
-- ===========================================================

CREATE TRIGGER trg_validate_trip_before_insert
BEFORE INSERT ON trips
FOR EACH ROW
BEGIN

    DECLARE v_vehicle_status VARCHAR(20);
    DECLARE v_driver_status VARCHAR(20);
    DECLARE v_capacity DECIMAL(10,2);
    DECLARE v_license DATE;

    -- Vehicle must exist
    IF (SELECT COUNT(*) FROM vehicles WHERE vehicle_id = NEW.vehicle_id)=0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT='Vehicle does not exist.';
    END IF;

    -- Driver must exist
    IF (SELECT COUNT(*) FROM drivers WHERE driver_id = NEW.driver_id)=0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT='Driver does not exist.';
    END IF;

    SELECT status,max_load_capacity
    INTO v_vehicle_status,v_capacity
    FROM vehicles
    WHERE vehicle_id=NEW.vehicle_id;

    IF v_vehicle_status<>'Available' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT='Vehicle is not Available.';
    END IF;

    IF NEW.cargo_weight>v_capacity THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT='Cargo exceeds vehicle capacity.';
    END IF;

    SELECT status,license_expiry
    INTO v_driver_status,v_license
    FROM drivers
    WHERE driver_id=NEW.driver_id;

    IF v_driver_status<>'Available' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT='Driver is not Available.';
    END IF;

    IF v_license<CURDATE() THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT='Driver license has expired.';
    END IF;

END$$

-- ===========================================================
-- Trigger 2
-- Trip Dispatched
-- ===========================================================

CREATE TRIGGER trg_trip_dispatched
AFTER UPDATE ON trips
FOR EACH ROW
BEGIN

    IF NEW.status='Dispatched'
    AND OLD.status<>'Dispatched' THEN

        UPDATE vehicles
        SET status='On Trip'
        WHERE vehicle_id=NEW.vehicle_id
        AND status='Available';

        UPDATE drivers
        SET status='On Trip'
        WHERE driver_id=NEW.driver_id
        AND status='Available';

        UPDATE trips
        SET dispatched_at=NOW()
        WHERE trip_id=NEW.trip_id;

    END IF;

END$$

-- ===========================================================
-- Trigger 3
-- Trip Completed
-- ===========================================================

CREATE TRIGGER trg_trip_completed
AFTER UPDATE ON trips
FOR EACH ROW
BEGIN

    IF NEW.status='Completed'
    AND OLD.status<>'Completed' THEN

        UPDATE vehicles
        SET
            status='Available',
            odometer=odometer+IFNULL(NEW.actual_distance,NEW.planned_distance)
        WHERE vehicle_id=NEW.vehicle_id
        AND status<>'Retired';

        UPDATE drivers
        SET status='Available'
        WHERE driver_id=NEW.driver_id
        AND status<>'Suspended';

        UPDATE trips
        SET completed_at=NOW()
        WHERE trip_id=NEW.trip_id;

    END IF;

END$$

-- ===========================================================
-- Trigger 4
-- Trip Cancelled
-- ===========================================================

CREATE TRIGGER trg_trip_cancelled
AFTER UPDATE ON trips
FOR EACH ROW
BEGIN

    IF NEW.status='Cancelled'
    AND OLD.status='Dispatched' THEN

        UPDATE vehicles
        SET status='Available'
        WHERE vehicle_id=NEW.vehicle_id
        AND status<>'Retired';

        UPDATE drivers
        SET status='Available'
        WHERE driver_id=NEW.driver_id
        AND status<>'Suspended';

    END IF;

END$$

-- ===========================================================
-- Trigger 5
-- Maintenance Started
-- ===========================================================

CREATE TRIGGER trg_maintenance_created
AFTER INSERT ON maintenance_logs
FOR EACH ROW
BEGIN

    IF NEW.status='Active' THEN

        UPDATE vehicles
        SET status='In Shop'
        WHERE vehicle_id=NEW.vehicle_id
        AND status<>'Retired';

    END IF;

END$$

-- ===========================================================
-- Trigger 6
-- Maintenance Closed
-- ===========================================================

CREATE TRIGGER trg_maintenance_closed
AFTER UPDATE ON maintenance_logs
FOR EACH ROW
BEGIN

    IF NEW.status='Closed'
    AND OLD.status='Active' THEN

        UPDATE vehicles
        SET status='Available'
        WHERE vehicle_id=NEW.vehicle_id
        AND status<>'Retired';

    END IF;

END$$

DELIMITER ;
