# FleetMaster Pro — ACID-Compliant Fleet Management Database & Web Application

This repository contains an enterprise-grade **ACID-Compliant Relational Database System (RDBMS)** and responsive **Web Application** for Fleet Management.

---

## 1. ACID Compliance & DBMS Rules Implementation

Every operation in FleetMaster Pro adheres strictly to the ACID properties:

| Property | Implementation in FleetMaster Pro |
| :--- | :--- |
| **Atomicity (A)** | Multi-table operations are wrapped in transactions (`BEGIN TRANSACTION ... COMMIT / ROLLBACK`). For example, dispatching a trip validates capacity, driver status, license expiry, and updates `trips`, `vehicles`, and `drivers` atomically. If any condition fails, the transaction rolls back completely. |
| **Consistency (C)** | Enforced via strict `PRIMARY KEY`, `FOREIGN KEY` (`ON DELETE RESTRICT`), `UNIQUE` constraints (`registration_number`, `license_number`), and domain `CHECK` constraints (`status IN (...)`, non-negative capacities/costs). |
| **Isolation (I)** | State-changing operations lock row states to prevent concurrent double-booking of a vehicle or driver. |
| **Durability (D)** | All state transitions and transactions are durably persisted to disk (`PRAGMA foreign_keys = ON`). |

---

## 2. Database Structure (`database/`)

- `database/schema.sql` — Third Normal Form (3NF) Schema covering all 8 entities (`roles`, `users`, `vehicles`, `drivers`, `trips`, `maintenance_logs`, `fuel_logs`, `expenses`).
- `database/triggers_and_procedures.sql` — Automated DBMS Triggers that enforce:
  - Automatic status change to `On Trip` when a trip is dispatched.
  - Automatic status change back to `Available` upon trip completion or cancellation.
  - Automatic status change to `In Shop` when an active maintenance log is added.
  - Rejection of trips exceeding `max_load_capacity` or assigning `Expired`/`Suspended` drivers.
- `database/views.sql` — Real-time Analytical Views:
  - `vw_dashboard_kpis`: Fleet-wide real-time KPIs.
  - `vw_vehicle_analytics`: Per-vehicle Operational Cost (`Fuel + Maintenance`), Fuel Efficiency (`Distance / Fuel`), and Vehicle ROI:
    $$\text{Vehicle ROI} = \frac{\text{Revenue} - (\text{Maintenance} + \text{Fuel})}{\text{Acquisition Cost}}$$
- `database/seed_workflow.sql` — Seeds RBAC roles and executes the exact **9-Step Example Workflow** (`VAN-05` 500kg capacity, Driver `Alex`, 450kg trip, trip completion, maintenance log, operational cost & ROI updates).

---

## 3. Web Application (`app/`)

### How to Run Locally

```powershell
cd app
npm run dev
```

Open your browser at [http://localhost:3000](http://localhost:3000) to view:
- **Authentication & RBAC Role Switcher**: Fleet Manager, Driver, Safety Officer, and Financial Analyst.
- **Interactive Dashboard**: Real-time KPIs and filterable master vehicle registry.
- **CRUD & Lifecycle Management**: Vehicles, Drivers, Trips (with ACID dispatch validations), Maintenance Logs, Fuel & Expenses.
- **CSV Export**: One-click download of financial and ROI analytics (`fleet_analytics_roi.csv`).
