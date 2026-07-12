/**
 * TransitOps / FleetMaster Pro — Frontend Controller
 */

const API_BASE = '/api/auth';
const DASHBOARD_API = '/api/dashboard';

let fleetStatusChartInstance = null;
let financialsChartInstance = null;

document.addEventListener('DOMContentLoaded', async () => {
    loadRegistrationRoles();
    const token = localStorage.getItem('fleetmaster_jwt');
    if (token) {
        await verifySession(token);
    }
});

async function loadRegistrationRoles() {
    try {
        const res = await fetch('/api/auth/roles');
        const data = await res.json();
        if (data.success && data.roles) {
            const selectEl = document.getElementById('regRole');
            if (selectEl) {
                selectEl.innerHTML = data.roles.map(r => `<option value="${r.role_id}">${r.role_name}</option>`).join('');
            }
        }
    } catch (e) { }
}

let currentActiveRole = 'Fleet Manager';

const ROLE_PERSONAS = {
    'Fleet Manager': {
        full_name: 'Sarah Jenkins',
        role_name: 'Fleet Manager',
        avatar: 'SJ'
    },
    'Driver': {
        full_name: 'Alex Rivera',
        role_name: 'Driver',
        avatar: 'AR'
    },
    'Safety Officer': {
        full_name: 'Marcus Vance',
        role_name: 'Safety Officer',
        avatar: 'MV'
    },
    'Financial Analyst': {
        full_name: 'Elena Rostova',
        role_name: 'Financial Analyst',
        avatar: 'ER'
    }
};

/**
 * Check if a section is allowed for the active user role
 */
function isSectionAllowedForRole(sectionId, roleName) {
    if (roleName === 'Fleet Manager') return true;
    if (sectionId === 'dashboard' || sectionId === 'rbac') return true;

    if (roleName === 'Driver') {
        return ['trips', 'fleet'].includes(sectionId);
    }
    if (roleName === 'Safety Officer') {
        return ['drivers', 'trips'].includes(sectionId);
    }
    if (roleName === 'Financial Analyst') {
        return ['fuel', 'analytics', 'fleet'].includes(sectionId);
    }
    return false;
}

/**
 * Switch Left Sidebar Navigation Section with RBAC Security Check
 */
function switchSection(sectionId) {
    if (!isSectionAllowedForRole(sectionId, currentActiveRole)) {
        showRbacDeniedModal(sectionId, currentActiveRole);
        return;
    }

    const sections = ['dashboard', 'fleet', 'drivers', 'trips', 'maintenance', 'fuel', 'analytics', 'rbac', 'settings'];

    // Update menu button active class
    const menuButtons = document.querySelectorAll('.menu-item');
    menuButtons.forEach((btn, index) => {
        if (sections[index] === sectionId) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Hide all views & display target view
    sections.forEach(s => {
        const el = document.getElementById('view' + s.charAt(0).toUpperCase() + s.slice(1));
        if (el) {
            el.style.display = (s === sectionId) ? 'block' : 'none';
        }
    });

    if (sectionId === 'dashboard') {
        loadDashboardData();
    } else if (sectionId === 'fleet') {
        loadVehicles();
    } else if (sectionId === 'drivers') {
        loadDrivers();
    } else if (sectionId === 'trips') {
        loadTrips();
    } else if (sectionId === 'maintenance') {
        loadMaintenance();
    } else if (sectionId === 'fuel') {
        loadFuel();
        loadOperationalCosts();
    } else if (sectionId === 'analytics') {
        loadAnalytics();
    } else if (sectionId === 'settings') {
        loadMasterRegistries();
    }
}

/**
 * Switch Active User Role instantly (1-Click Executive Role Selector)
 */
function switchActiveRole(roleName) {
    currentActiveRole = roleName;
    const persona = ROLE_PERSONAS[roleName] || ROLE_PERSONAS['Fleet Manager'];

    // Update Header Identity
    const nameEl = document.getElementById('topUserName');
    const roleEl = document.getElementById('topUserRole');
    const avatarEl = document.getElementById('topUserAvatar');

    if (nameEl) nameEl.textContent = persona.full_name;
    if (roleEl) roleEl.textContent = persona.role_name;
    if (avatarEl) avatarEl.textContent = persona.avatar;

    // Update Top Header Pills
    const pillMap = {
        'Fleet Manager': 'pillRoleManager',
        'Driver': 'pillRoleDriver',
        'Safety Officer': 'pillRoleSafety',
        'Financial Analyst': 'pillRoleFinance'
    };

    Object.keys(pillMap).forEach(r => {
        const btn = document.getElementById(pillMap[r]);
        if (btn) btn.classList.toggle('active', r === roleName);
    });

    // Enforce UI restrictions for the selected role
    applyRBACUI(roleName);
}

/**
 * Apply dynamic visual RBAC enforcement across Sidebar & Action Buttons
 */
function applyRBACUI(roleName) {
    const sections = ['dashboard', 'fleet', 'drivers', 'trips', 'maintenance', 'fuel', 'analytics', 'rbac', 'settings'];
    const menuButtons = document.querySelectorAll('.menu-item');

    let isCurrentSectionAllowed = false;
    let activeSectionId = 'dashboard';

    menuButtons.forEach((btn, index) => {
        const sId = sections[index];
        const isAllowed = isSectionAllowedForRole(sId, roleName);

        // Completely show or hide menu item based on role authorization
        btn.style.display = isAllowed ? 'flex' : 'none';

        if (btn.classList.contains('active')) {
            activeSectionId = sId;
            isCurrentSectionAllowed = isAllowed;
        }
    });

    // If user is currently looking at a section that is now hidden for their role, redirect to Dashboard
    if (!isCurrentSectionAllowed && activeSectionId !== 'dashboard') {
        switchSection('dashboard');
    }

    // Action button enforcement
    const canManageFleet = (roleName === 'Fleet Manager');
    const canManageDrivers = (roleName === 'Fleet Manager' || roleName === 'Safety Officer');
    const canCreateTrips = (roleName === 'Fleet Manager' || roleName === 'Driver');
    const canManageMaintenance = (roleName === 'Fleet Manager');
    const canManageFinancials = (roleName === 'Fleet Manager' || roleName === 'Financial Analyst');

    // Toggle + Add buttons across screens
    const addVehicleBtns = document.querySelectorAll('.btn-crud-add');
    addVehicleBtns.forEach(btn => {
        const txt = btn.textContent || '';
        if (txt.includes('Vehicle') && !txt.includes('Type')) {
            btn.style.display = canManageFleet ? 'flex' : 'none';
        } else if (txt.includes('Driver')) {
            btn.style.display = canManageDrivers ? 'flex' : 'none';
        } else if (txt.includes('Trip')) {
            btn.style.display = canCreateTrips ? 'flex' : 'none';
        } else if (txt.includes('Maintenance')) {
            btn.style.display = canManageMaintenance ? 'flex' : 'none';
        } else if (txt.includes('Fuel') || txt.includes('Expense')) {
            btn.style.display = canManageFinancials ? 'flex' : 'none';
        }
    });
}

/**
 * Show RBAC Access Denied Modal explaining why current role cannot access section
 */
function showRbacDeniedModal(sectionId, roleName) {
    const modal = document.getElementById('rbacDeniedModal');
    const bodyEl = document.getElementById('rbacDeniedBody');
    if (!modal || !bodyEl) return;

    const sectionNames = {
        'fleet': '3.3 Vehicle Registry',
        'drivers': '3.4 Driver Management',
        'trips': '3.5 Trip Management',
        'maintenance': '3.6 Shop Maintenance',
        'fuel': '3.7 Fuel & Expense Management',
        'analytics': '3.8 Executive Analytics & ROI',
        'settings': 'Master System Settings'
    };

    const sName = sectionNames[sectionId] || sectionId;

    let explanation = `Your active role (<strong>${roleName}</strong>) does not have permission to access <strong>${sName}</strong>.<br><br>`;

    if (roleName === 'Driver') {
        explanation += `As a <strong>Driver</strong>, your scope is focused on creating & monitoring Trips and viewing available Vehicles.`;
    } else if (roleName === 'Safety Officer') {
        explanation += `As a <strong>Safety Officer</strong>, your scope is focused on Driver compliance, safety scores, and license auditing.`;
    } else if (roleName === 'Financial Analyst') {
        explanation += `As a <strong>Financial Analyst</strong>, your scope is focused on Fuel logs, Operational Expenditure, and Analytics & ROI reports.`;
    }

    bodyEl.innerHTML = explanation;
    modal.style.display = 'flex';
}

function closeRbacDeniedModal() {
    const modal = document.getElementById('rbacDeniedModal');
    if (modal) modal.style.display = 'none';
}

/**
 * Switch between Login and Register tabs
 */
function switchTab(mode) {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const tabLoginBtn = document.getElementById('tabLoginBtn');
    const tabRegisterBtn = document.getElementById('tabRegisterBtn');

    hideAlerts();

    if (mode === 'login') {
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
        tabLoginBtn.classList.add('active');
        tabRegisterBtn.classList.remove('active');
    } else {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
        tabLoginBtn.classList.remove('active');
        tabRegisterBtn.classList.add('active');
    }
}

function hideAlerts() {
    const errorEl = document.getElementById('authAlertError');
    const successEl = document.getElementById('authAlertSuccess');
    if (errorEl) errorEl.style.display = 'none';
    if (successEl) successEl.style.display = 'none';
}

function showErrorAlert(message) {
    hideAlerts();
    const el = document.getElementById('authAlertError');
    if (el) {
        el.textContent = '❌ ' + message;
        el.style.display = 'flex';
    }
}

function showSuccessAlert(message) {
    hideAlerts();
    const el = document.getElementById('authAlertSuccess');
    if (el) {
        el.textContent = '✅ ' + message;
        el.style.display = 'flex';
    }
}

/**
 * Handle Login Form Submission
 */
async function handleLogin(event) {
    event.preventDefault();
    hideAlerts();

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const submitBtn = document.getElementById('loginSubmitBtn');

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>Verifying credentials...</span>';

    try {
        const res = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
            showErrorAlert(data.message || 'Login failed');
            return;
        }

        localStorage.setItem('fleetmaster_jwt', data.token);
        renderDashboard(data.user);
        loadDashboardData();
    } catch (err) {
        showErrorAlert('Unable to connect to authentication server.');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Authenticate & Open Dashboard</span><span>→</span>';
    }
}

/**
 * Handle Registration Form Submission
 */
async function handleRegister(event) {
    event.preventDefault();
    hideAlerts();

    const full_name = document.getElementById('regFullName').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const role_id = document.getElementById('regRole').value;
    const submitBtn = document.getElementById('regSubmitBtn');

    submitBtn.disabled = true;

    try {
        const res = await fetch(`${API_BASE}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ full_name, email, password, role_id })
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
            showErrorAlert(data.message || 'Registration failed');
            return;
        }

        localStorage.setItem('fleetmaster_jwt', data.token);
        renderDashboard(data.user);
        loadDashboardData();
    } catch (err) {
        showErrorAlert('Unable to register user.');
    } finally {
        submitBtn.disabled = false;
    }
}

/**
 * Verify Existing Session
 */
async function verifySession(token) {
    try {
        const res = await fetch(`${API_BASE}/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) {
            localStorage.removeItem('fleetmaster_jwt');
            return;
        }

        const data = await res.json();
        if (data.success && data.user) {
            renderDashboard(data.user);
            loadDashboardData();
        }
    } catch (err) {
        localStorage.removeItem('fleetmaster_jwt');
    }
}

/**
 * Render Authenticated Shell & Header User Details
 */
function renderDashboard(user) {
    document.getElementById('authScreen').style.display = 'none';
    document.getElementById('dashboardScreen').style.display = 'block';

    currentActiveRole = user.role_name || 'Fleet Manager';
    applyRBACUI(currentActiveRole);

    // Update Top Header user identity
    const nameEl = document.getElementById('topUserName');
    const roleEl = document.getElementById('topUserRole');
    const avatarEl = document.getElementById('topUserAvatar');

    if (nameEl) nameEl.textContent = user.full_name;
    if (roleEl) roleEl.textContent = user.role_name;

    if (avatarEl && user.full_name) {
        const parts = user.full_name.trim().split(' ');
        let initials = parts[0].charAt(0).toUpperCase();
        if (parts.length > 1) initials += parts[parts.length - 1].charAt(0).toUpperCase();
        avatarEl.textContent = initials;
    }

    updateModuleCardIndicator('modManager', 'statusManager', user.role_name === 'Fleet Manager');
    updateModuleCardIndicator('modDriver', 'statusDriver', user.role_name === 'Driver');
    updateModuleCardIndicator('modSafety', 'statusSafety', user.role_name === 'Safety Officer');
    updateModuleCardIndicator('modFinance', 'statusFinance', user.role_name === 'Financial Analyst');
}

function updateModuleCardIndicator(cardId, statusId, isAuthorized) {
    const cardEl = document.getElementById(cardId);
    const statusEl = document.getElementById(statusId);
    if (!cardEl || !statusEl) return;

    if (isAuthorized) {
        statusEl.className = 'module-status status-auth';
        statusEl.textContent = '✓ AUTHORIZED';
    } else {
        statusEl.className = 'module-status status-lock';
        statusEl.textContent = '🔒 RESTRICTED';
    }
}

function handleLogout() {
    localStorage.removeItem('fleetmaster_jwt');
    document.getElementById('dashboardScreen').style.display = 'none';
    document.getElementById('authScreen').style.display = 'block';
    showSuccessAlert('You have logged out successfully.');
}

/**
 * Filter change handler
 */
async function onFilterChange() {
    await loadDashboardData();
}

/**
 * Fetch and Render Dashboard KPIs, Charts, and Recent Trips Table
 */
async function loadDashboardData() {
    const vehicleType = document.getElementById('filterType')?.value || 'All';
    const status = document.getElementById('filterStatus')?.value || 'All';
    const region = document.getElementById('filterRegion')?.value || 'All';

    const query = new URLSearchParams({
        vehicle_type: vehicleType,
        status: status,
        region: region
    }).toString();

    try {
        const kpiRes = await fetch(`${DASHBOARD_API}/kpis?${query}`);
        const kpiData = await kpiRes.json();
        if (kpiData.success) {
            renderKPICards(kpiData.kpis);
            renderStatusBars(kpiData.kpis);
        }

        const chartRes = await fetch(`${DASHBOARD_API}/charts?${query}`);
        const chartData = await chartRes.json();
        if (chartData.success) {
            renderCharts(chartData.charts);
        }
    } catch (err) {
        console.error('Failed to load dashboard data:', err);
    }
}

/**
 * Update 7 KPI Cards in Horizontal Row
 */
function renderKPICards(kpis) {
    setText('kpiActiveVehicles', kpis.activeVehicles || 53);
    setText('kpiAvailableVehicles', kpis.availableVehicles || 42);
    setText('kpiMaintenanceVehicles', (kpis.maintenanceVehicles < 10 ? '0' : '') + (kpis.maintenanceVehicles || 5));
    setText('kpiActiveTrips', kpis.activeTrips || 18);
    setText('kpiPendingTrips', (kpis.pendingTrips < 10 ? '0' : '') + (kpis.pendingTrips || 9));
    setText('kpiDriversOnDuty', kpis.driversOnDuty || 26);
    setText('kpiFleetUtilization', `${kpis.fleetUtilization || 81}%`);
}

function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}

/**
 * Update Vehicle Status Progress Bars
 */
function renderStatusBars(kpis) {
    const avail = kpis.availableVehicles || 42;
    const active = kpis.activeVehicles || 53;
    const maint = kpis.maintenanceVehicles || 5;
    const total = (kpis.totalVehicles > 0) ? kpis.totalVehicles : (avail + active + maint + 2);

    setText('statAvailableVal', avail);
    setText('statOnTripVal', active);
    setText('statInShopVal', maint);

    setBarWidth('barAvailable', (avail / total) * 100);
    setBarWidth('barOnTrip', (active / total) * 100);
    setBarWidth('barInShop', (maint / total) * 100);
}

function setBarWidth(id, pct) {
    const el = document.getElementById(id);
    if (el) el.style.width = `${Math.min(Math.max(pct, 5), 100)}%`;
}

let fleetTypeChartInstance = null;

function renderCharts(charts) {
    const statusCanvas = document.getElementById('dashboardStatusChart');
    const typeCanvas = document.getElementById('dashboardTypeChart');

    if (statusCanvas && charts.fleetStatus) {
        if (fleetStatusChartInstance) fleetStatusChartInstance.destroy();
        const ctx = statusCanvas.getContext('2d');
        fleetStatusChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: charts.fleetStatus.labels,
                datasets: [{
                    data: charts.fleetStatus.data,
                    backgroundColor: ['#10b981', '#38bdf8', '#f59e0b', '#f43f5e'],
                    borderColor: '#0f172a',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: '#e2e8f0', font: { family: 'Inter', weight: '600' } }
                    }
                }
            }
        });
    }

    if (typeCanvas && charts.vehicleTypes) {
        if (fleetTypeChartInstance) fleetTypeChartInstance.destroy();
        const ctx = typeCanvas.getContext('2d');
        fleetTypeChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: charts.vehicleTypes.labels,
                datasets: [{
                    label: 'Active Vehicles per Type',
                    data: charts.vehicleTypes.data,
                    backgroundColor: ['#6366f1', '#38bdf8', '#10b981', '#f59e0b', '#ec4899'],
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                    y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });
    }
}

/**
 * RBAC Protected Endpoint Test Modal
 */
async function testProtectedEndpoint(endpoint, moduleTitle) {
    const token = localStorage.getItem('fleetmaster_jwt');
    if (!token) {
        alert('Please log in first!');
        return;
    }

    try {
        const res = await fetch(endpoint, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await res.json();

        if (res.ok && data.success) {
            openModal(
                `✅ RBAC Access Authorized`,
                `Backend verified your JWT and Role. ${data.message}`,
                data
            );
        } else {
            openModal(
                `❌ RBAC Access Denied (403 Forbidden)`,
                data.message || 'Your role does not have permission to access this module.',
                data
            );
        }
    } catch (err) {
        openModal(`❌ Network Error`, `Could not reach endpoint: ${endpoint}`, { error: err.message });
    }
}

function openModal(title, body, rawObj) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').textContent = body;
    document.getElementById('modalRawJson').textContent = JSON.stringify(rawObj, null, 2);
    document.getElementById('apiResponseModal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('apiResponseModal').style.display = 'none';
}

/**
 * =========================================================================
 * MODULE 3.3 VEHICLE REGISTRY & COMPLETE MASTER REGISTRIES CRUD ENGINE
 * =========================================================================
 */

let vehiclesListState = [];
let driversListState = [];
let typesListState = [];
let regionsListState = [];
let expensesListState = [];

let crudModalConfig = { entity: '', action: 'create', id: null };

/* --- 1. VEHICLES REGISTRY CRUD --- */
async function loadVehicles() {
    try {
        const search = document.getElementById('vehicleSearchInput')?.value || '';
        const type = document.getElementById('vehicleTypeFilter')?.value || 'All';
        const status = document.getElementById('vehicleStatusFilter')?.value || 'All';

        const query = new URLSearchParams({ search, type, status }).toString();
        const res = await fetch(`/api/vehicles?${query}`);
        const data = await res.json();
        if (data.success) {
            vehiclesListState = data.vehicles;
            renderVehiclesTable(vehiclesListState);
        }
    } catch (err) {
        console.error('Error loading vehicles:', err);
    }
}

function filterVehicles() {
    loadVehicles();
}

function renderVehiclesTable(list) {
    const tbody = document.getElementById('vehiclesTableBody');
    if (!tbody) return;

    if (!list || list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 2rem;">No vehicles found matching criteria.</td></tr>';
        return;
    }

    tbody.innerHTML = list.map(v => {
        const statusPill = v.status === 'Available' ? 'pill-completed' :
            v.status === 'On Trip' ? 'pill-ontrip' :
                v.status === 'In Shop' ? 'pill-dispatched' : 'pill-draft';
        return `
            <tr>
                <td style="font-weight: 700; color: #fff;">${v.registration_number}</td>
                <td>${v.model_name}</td>
                <td><span style="background: rgba(255,255,255,0.08); padding: 3px 8px; border-radius: 4px; font-size: 0.82rem;">${v.vehicle_type}</span></td>
                <td>${Number(v.max_load_capacity).toLocaleString()} kg</td>
                <td>${Number(v.odometer || 0).toLocaleString()} km</td>
                <td>$${Number(v.acquisition_cost || 0).toLocaleString()}</td>
                <td><span class="status-pill ${statusPill}">${v.status}</span></td>
                <td>
                    <div class="crud-actions">
                        <button type="button" class="btn-action btn-view" title="View Details" onclick="viewVehicleDetails(${v.vehicle_id})">👁️</button>
                        <button type="button" class="btn-action btn-edit" title="Edit Vehicle" onclick="openVehicleModal(${v.vehicle_id})">✏️</button>
                        <button type="button" class="btn-action btn-delete" title="Delete Vehicle" onclick="deleteVehicleItem(${v.vehicle_id}, '${v.registration_number}')">🗑️</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function openVehicleModal(id = null) {
    crudModalConfig = { entity: 'vehicle', action: id ? 'edit' : 'create', id };
    document.getElementById('crudModalTitle').textContent = id ? '✏️ Edit Vehicle Record' : '+ Register New Vehicle';
    document.getElementById('crudModalError').style.display = 'none';

    const item = id ? vehiclesListState.find(x => Number(x.vehicle_id) === Number(id)) : null;

    document.getElementById('crudFormFields').innerHTML = `
        <div class="form-group">
            <label>Registration Number *</label>
            <input type="text" id="frmRegNo" class="form-control" value="${item ? item.registration_number : ''}" placeholder="e.g. GJ01AB4521" required>
        </div>
        <div class="form-group">
            <label>Vehicle Name / Model *</label>
            <input type="text" id="frmModelName" class="form-control" value="${item ? item.model_name : ''}" placeholder="e.g. Ford Transit Custom" required>
        </div>
        <div class="form-group">
            <label>Vehicle Type *</label>
            <select id="frmVehicleType" class="form-control">
                ${['Truck', 'Van', 'Car', 'Trailer', 'Bus'].map(t => `<option value="${t}" ${item && item.vehicle_type === t ? 'selected' : ''}>${t}</option>`).join('')}
            </select>
        </div>
        <div class="form-group">
            <label>Max Load Capacity (KG) *</label>
            <input type="number" id="frmMaxCapacity" class="form-control" value="${item ? item.max_load_capacity : '1000'}" min="1" step="any" required>
        </div>
        <div class="form-group">
            <label>Odometer Reading (KM)</label>
            <input type="number" id="frmOdometer" class="form-control" value="${item ? item.odometer : '0'}" min="0" step="any">
        </div>
        <div class="form-group">
            <label>Acquisition Cost ($) *</label>
            <input type="number" id="frmAcqCost" class="form-control" value="${item ? item.acquisition_cost : '25000'}" min="0" step="any" required>
        </div>
        ${item ? `
        <div class="form-group full-span">
            <label>Operational Status *</label>
            <select id="frmStatus" class="form-control">
                ${['Available', 'On Trip', 'In Shop', 'Retired'].map(s => `<option value="${s}" ${item.status === s ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
        </div>
        ` : `
        <input type="hidden" id="frmStatus" value="Available">
        <div class="form-group full-span">
            <div style="padding: 0.85rem 1.1rem; background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.35); border-radius: var(--radius-md); color: #10b981; font-size: 0.9rem; display: flex; align-items: center; gap: 0.65rem;">
                <span style="font-size: 1.1rem;">🟢</span>
                <div>
                    <strong>Status Automatically Assigned: Available</strong>
                    <div style="font-size: 0.8rem; color: #94a3b8; margin-top: 2px;">Status updates automatically to "On Trip" upon dispatch or "In Shop" during maintenance.</div>
                </div>
            </div>
        </div>
        `}
    `;

    document.getElementById('crudModal').style.display = 'flex';
}

function viewVehicleDetails(id) {
    const item = vehiclesListState.find(x => Number(x.vehicle_id) === Number(id));
    if (!item) return;

    document.getElementById('viewDetailTitle').textContent = `🚛 Vehicle Inspection: ${item.registration_number}`;
    document.getElementById('viewDetailBody').innerHTML = `
        <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #94a3b8;">Registration Number:</td><td style="font-weight: 700; color: #fff;">${item.registration_number}</td></tr>
            <tr><td style="padding: 8px 0; color: #94a3b8;">Model / Name:</td><td style="font-weight: 700;">${item.model_name}</td></tr>
            <tr><td style="padding: 8px 0; color: #94a3b8;">Vehicle Type:</td><td>${item.vehicle_type}</td></tr>
            <tr><td style="padding: 8px 0; color: #94a3b8;">Maximum Capacity:</td><td>${Number(item.max_load_capacity).toLocaleString()} kg</td></tr>
            <tr><td style="padding: 8px 0; color: #94a3b8;">Odometer Reading:</td><td>${Number(item.odometer || 0).toLocaleString()} km</td></tr>
            <tr><td style="padding: 8px 0; color: #94a3b8;">Acquisition Cost:</td><td>$${Number(item.acquisition_cost || 0).toLocaleString()}</td></tr>
            <tr><td style="padding: 8px 0; color: #94a3b8;">Status:</td><td><b>${item.status}</b></td></tr>
        </table>
    `;
    document.getElementById('viewDetailModal').style.display = 'flex';
}

async function deleteVehicleItem(id, reg) {
    if (!confirm(`Are you sure you want to delete vehicle '${reg}'?`)) return;
    try {
        const res = await fetch(`/api/vehicles/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
            loadVehicles();
            loadDashboardData();
        } else {
            alert(data.message || 'Delete failed.');
        }
    } catch (err) {
        alert('Network error deleting vehicle.');
    }
}

/* --- 2. DRIVERS REGISTRY CRUD (MODULE 3.4) --- */
async function loadDrivers() {
    try {
        const search = document.getElementById('driverSearchInput')?.value || '';
        const category = document.getElementById('driverCategoryFilter')?.value || 'All';
        const status = document.getElementById('driverStatusFilter')?.value || 'All';
        const query = new URLSearchParams({ search, category, status }).toString();

        const res = await fetch(`/api/drivers?${query}`);
        const data = await res.json();
        if (data.success) {
            driversListState = data.drivers;
            if (data.kpis) {
                const kt = document.getElementById('drKpiTotal');
                const ka = document.getElementById('drKpiAvailable');
                const ko = document.getElementById('drKpiOnTrip');
                const ks = document.getElementById('drKpiAvgScore');
                if (kt) kt.textContent = data.kpis.totalDrivers;
                if (ka) ka.textContent = data.kpis.availableDrivers;
                if (ko) ko.textContent = data.kpis.onTripDrivers;
                if (ks) ks.textContent = data.kpis.avgSafetyScore + '%';
            }
            renderDriversGrid(driversListState);
            renderDriversTable(driversListState);
        }
    } catch (err) {
        console.error('Error loading drivers:', err);
    }
}

let activeDriverViewMode = 'grid';

function switchDriverViewMode(mode) {
    activeDriverViewMode = mode;
    const btnGrid = document.getElementById('btnDriverGridToggle');
    const btnTable = document.getElementById('btnDriverTableToggle');
    const cardsCont = document.getElementById('driverCardsContainer');
    const tableCont = document.getElementById('driverTableContainer');

    if (btnGrid) btnGrid.classList.toggle('active', mode === 'grid');
    if (btnTable) btnTable.classList.toggle('active', mode === 'table');
    if (cardsCont) cardsCont.style.display = mode === 'grid' ? 'grid' : 'none';
    if (tableCont) tableCont.style.display = mode === 'table' ? 'block' : 'none';
}

function filterDrivers() {
    loadDrivers();
}

function renderDriversGrid(list) {
    const container = document.getElementById('driverCardsContainer');
    if (!container) return;

    if (!list || list.length === 0) {
        container.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 3rem; background: var(--bg-card); border-radius: var(--radius-lg); border: 1px solid var(--border-color);">No drivers match your current filter criteria.</div>';
        return;
    }

    container.innerHTML = list.map(d => {
        const statusPill = d.status === 'Available' ? 'pill-completed' :
            d.status === 'On Trip' ? 'pill-ontrip' :
                d.status === 'Suspended' ? 'pill-draft' : 'pill-dispatched';

        const scoreVal = Number(d.safety_score || 100);
        const scoreColor = scoreVal >= 95 ? '#10b981' : scoreVal >= 90 ? '#38bdf8' : '#f59e0b';
        const initials = d.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

        return `
            <div class="driver-badge-card">
                <div class="driver-card-header">
                    <div style="display: flex; align-items: center; gap: 0.9rem;">
                        <div class="driver-avatar-badge">${initials}</div>
                        <div>
                            <div style="font-size: 1.1rem; font-weight: 800; color: #fff;">${d.full_name}</div>
                            <span class="status-pill ${statusPill}" style="margin-top: 4px; display: inline-block;">${d.status}</span>
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 1.25rem; font-weight: 900; color: ${scoreColor};">${scoreVal.toFixed(1)}%</div>
                        <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase;">Safety Score</div>
                    </div>
                </div>

                <div class="driver-card-meta">
                    <div class="driver-meta-item">
                        <span class="driver-meta-label">License No.</span>
                        <span class="driver-meta-value" style="font-family: monospace;">${d.license_number}</span>
                    </div>
                    <div class="driver-meta-item">
                        <span class="driver-meta-label">Category</span>
                        <span class="driver-meta-value">${d.license_category}</span>
                    </div>
                    <div class="driver-meta-item">
                        <span class="driver-meta-label">Expiry Date</span>
                        <span class="driver-meta-value">${d.license_expiry}</span>
                    </div>
                    <div class="driver-meta-item">
                        <span class="driver-meta-label">Contact No.</span>
                        <span class="driver-meta-value">${d.contact_number || '-'}</span>
                    </div>
                </div>

                <div style="display: flex; gap: 0.5rem; justify-content: flex-end; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 1rem;">
                    <button type="button" class="btn" style="background: rgba(6, 182, 212, 0.15); color: #06b6d4; border: 1px solid rgba(6,182,212,0.3); padding: 0.45rem 0.85rem; font-size: 0.82rem;" onclick="viewDriverDetails(${d.driver_id})">👁️ Inspect</button>
                    <button type="button" class="btn" style="background: rgba(99, 102, 241, 0.15); color: #818cf8; border: 1px solid rgba(99,102,241,0.3); padding: 0.45rem 0.85rem; font-size: 0.82rem;" onclick="openDriverModal(${d.driver_id})">✏️ Edit</button>
                    <button type="button" class="btn" style="background: rgba(244, 63, 94, 0.15); color: #f43f5e; border: 1px solid rgba(244,63,94,0.3); padding: 0.45rem 0.85rem; font-size: 0.82rem;" onclick="deleteDriverItem(${d.driver_id}, '${d.full_name}')">🗑️</button>
                </div>
            </div>
        `;
    }).join('');
}

function renderDriversTable(list) {
    const tbody = document.getElementById('driversTableBody');
    if (!tbody) return;

    if (!list || list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 2rem;">No drivers found matching criteria.</td></tr>';
        return;
    }

    tbody.innerHTML = list.map(d => {
        const statusPill = d.status === 'Available' ? 'pill-completed' :
            d.status === 'On Trip' ? 'pill-ontrip' :
                d.status === 'Suspended' ? 'pill-draft' : 'pill-dispatched';

        const scoreVal = Number(d.safety_score || 100);
        const scoreColor = scoreVal >= 95 ? '#10b981' : scoreVal >= 90 ? '#38bdf8' : '#f59e0b';

        return `
            <tr>
                <td style="font-weight: 700; color: #fff;">${d.full_name}</td>
                <td style="font-family: monospace;">${d.license_number}</td>
                <td><span style="background: rgba(255,255,255,0.06); padding: 3px 8px; border-radius: 4px; font-size: 0.82rem;">${d.license_category}</span></td>
                <td>${d.contact_number || '-'}</td>
                <td>${d.license_expiry}</td>
                <td><span style="color: ${scoreColor}; font-weight: 700; background: rgba(255,255,255,0.04); padding: 3px 8px; border-radius: 6px;">${scoreVal.toFixed(1)}%</span></td>
                <td><span class="status-pill ${statusPill}">${d.status}</span></td>
                <td>
                    <div class="crud-actions">
                        <button type="button" class="btn-action btn-view" title="View Details" onclick="viewDriverDetails(${d.driver_id})">👁️</button>
                        <button type="button" class="btn-action btn-edit" title="Edit Driver" onclick="openDriverModal(${d.driver_id})">✏️</button>
                        <button type="button" class="btn-action btn-delete" title="Delete Driver" onclick="deleteDriverItem(${d.driver_id}, '${d.full_name}')">🗑️</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function openDriverModal(id = null) {
    crudModalConfig = { entity: 'driver', action: id ? 'edit' : 'create', id };
    document.getElementById('crudModalTitle').textContent = id ? '✏️ Edit Driver Profile' : '+ Register New Driver';
    document.getElementById('crudModalError').style.display = 'none';

    const item = id ? driversListState.find(x => Number(x.driver_id) === Number(id)) : null;

    document.getElementById('crudFormFields').innerHTML = `
        <div class="form-group">
            <label>Full Name *</label>
            <input type="text" id="frmDrName" class="form-control" value="${item ? item.full_name : ''}" placeholder="Driver Full Name" required>
        </div>
        <div class="form-group">
            <label>License Number *</label>
            <input type="text" id="frmDrLicense" class="form-control" value="${item ? item.license_number : ''}" placeholder="e.g. DL-04-2020-11882" required>
        </div>
        <div class="form-group">
            <label>License Category *</label>
            <select id="frmDrCategory" class="form-control">
                ${['Heavy Commercial (HMV)', 'Light Commercial (LMV)', 'Passenger Bus (PSV)'].map(c => `<option value="${c}" ${item && item.license_category === c ? 'selected' : ''}>${c}</option>`).join('')}
            </select>
        </div>
        <div class="form-group">
            <label>License Expiry Date *</label>
            <input type="date" id="frmDrExpiry" class="form-control" value="${item ? item.license_expiry : '2028-12-31'}" required>
        </div>
        <div class="form-group">
            <label>Contact Number *</label>
            <input type="text" id="frmDrPhone" class="form-control" value="${item ? item.contact_number : ''}" placeholder="+91 98000 00000" required>
        </div>
        <div class="form-group">
            <label>Safety Rating (0-100) *</label>
            <input type="number" id="frmDrScore" class="form-control" value="${item ? item.safety_score : '100'}" min="0" max="100" step="0.1" required>
        </div>
        ${item ? `
        <div class="form-group full-span">
            <label>Duty Status *</label>
            <select id="frmDrStatus" class="form-control">
                ${['Available', 'On Trip', 'Off Duty', 'Suspended'].map(s => `<option value="${s}" ${item.status === s ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
        </div>
        ` : `
        <input type="hidden" id="frmDrStatus" value="Available">
        <div class="form-group full-span">
            <div style="padding: 0.85rem 1.1rem; background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.35); border-radius: var(--radius-md); color: #10b981; font-size: 0.9rem; display: flex; align-items: center; gap: 0.65rem;">
                <span style="font-size: 1.1rem;">🟢</span>
                <div>
                    <strong>Status Automatically Assigned: Available</strong>
                    <div style="font-size: 0.8rem; color: #94a3b8; margin-top: 2px;">Status updates automatically to "On Trip" when assigned to a freight dispatch.</div>
                </div>
            </div>
        </div>
        `}
    `;

    document.getElementById('crudModal').style.display = 'flex';
}

function viewDriverDetails(id) {
    const item = driversListState.find(x => Number(x.driver_id) === Number(id));
    if (!item) return;

    document.getElementById('viewDetailTitle').textContent = `👨‍✈️ Driver Profile: ${item.full_name}`;
    document.getElementById('viewDetailBody').innerHTML = `
        <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #94a3b8;">Driver Full Name:</td><td style="font-weight: 700; color: #fff;">${item.full_name}</td></tr>
            <tr><td style="padding: 8px 0; color: #94a3b8;">License Number:</td><td style="font-family: monospace;">${item.license_number}</td></tr>
            <tr><td style="padding: 8px 0; color: #94a3b8;">License Category:</td><td>${item.license_category}</td></tr>
            <tr><td style="padding: 8px 0; color: #94a3b8;">Expiry Date:</td><td>${item.license_expiry}</td></tr>
            <tr><td style="padding: 8px 0; color: #94a3b8;">Contact Number:</td><td>${item.contact_number}</td></tr>
            <tr><td style="padding: 8px 0; color: #94a3b8;">Safety Score:</td><td style="color: #10b981; font-weight: 700;">${item.safety_score}%</td></tr>
            <tr><td style="padding: 8px 0; color: #94a3b8;">Current Status:</td><td><b>${item.status}</b></td></tr>
        </table>
    `;
    document.getElementById('viewDetailModal').style.display = 'flex';
}

async function deleteDriverItem(id, name) {
    if (!confirm(`Are you sure you want to remove driver '${name}'?`)) return;
    try {
        const res = await fetch(`/api/drivers/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
            loadDrivers();
            loadDashboardData();
        } else {
            alert(data.message || 'Delete failed.');
        }
    } catch (err) {
        alert('Network error deleting driver.');
    }
}

/* --- 3. MASTER REGISTRIES CRUD --- */
function switchRegistryTab(tab) {
    document.getElementById('subtabTypesBtn').classList.toggle('active', tab === 'types');
    document.getElementById('subtabRegionsBtn').classList.toggle('active', tab === 'regions');
    document.getElementById('subtabExpenseBtn').classList.toggle('active', tab === 'expenses');

    document.getElementById('registryTypesView').style.display = tab === 'types' ? 'block' : 'none';
    document.getElementById('registryRegionsView').style.display = tab === 'regions' ? 'block' : 'none';
    document.getElementById('registryExpensesView').style.display = tab === 'expenses' ? 'block' : 'none';
}

async function loadMasterRegistries() {
    try {
        const [typesRes, regRes, expRes] = await Promise.all([
            fetch('/api/types').then(r => r.json()),
            fetch('/api/regions').then(r => r.json()),
            fetch('/api/expense-types').then(r => r.json())
        ]);

        if (typesRes.success) {
            typesListState = typesRes.items;
            renderTypesTable(typesListState);
        }
        if (regRes.success) {
            regionsListState = regRes.items;
            renderRegionsTable(regionsListState);
        }
        if (expRes.success) {
            expensesListState = expRes.items;
            renderExpensesTable(expensesListState);
        }
    } catch (err) {
        console.error('Error loading master registries:', err);
    }
}

function filterVehicleTypes() {
    const q = document.getElementById('typeSearchInput')?.value.toLowerCase() || '';
    renderTypesTable(typesListState.filter(t => t.type_name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)));
}

function filterRegions() {
    const q = document.getElementById('regionSearchInput')?.value.toLowerCase() || '';
    renderRegionsTable(regionsListState.filter(r => r.region_name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q)));
}

function filterExpenseTypes() {
    const q = document.getElementById('expenseSearchInput')?.value.toLowerCase() || '';
    renderExpensesTable(expensesListState.filter(e => e.category_name.toLowerCase().includes(q)));
}

function renderTypesTable(list) {
    const tbody = document.getElementById('typesTableBody');
    if (!tbody) return;
    tbody.innerHTML = list.map(t => `
        <tr>
            <td style="font-weight: 700; color: #fff;">${t.type_name}</td>
            <td>${Number(t.default_capacity).toLocaleString()} kg</td>
            <td style="color: var(--text-muted);">${t.description}</td>
            <td>
                <div class="crud-actions">
                    <button type="button" class="btn-action btn-edit" title="Edit" onclick="openMasterModal('type', ${t.type_id})">✏️</button>
                    <button type="button" class="btn-action btn-delete" title="Delete" onclick="deleteMasterItem('type', ${t.type_id}, '${t.type_name}')">🗑️</button>
                </div>
            </td>
        </tr>
    `).join('');
}

function renderRegionsTable(list) {
    const tbody = document.getElementById('regionsTableBody');
    if (!tbody) return;
    tbody.innerHTML = list.map(r => `
        <tr>
            <td style="font-weight: 700; color: #fff;">${r.region_name}</td>
            <td style="font-family: monospace;">${r.code}</td>
            <td style="color: var(--text-muted);">${r.headquarters}</td>
            <td>
                <div class="crud-actions">
                    <button type="button" class="btn-action btn-edit" title="Edit" onclick="openMasterModal('region', ${r.region_id})">✏️</button>
                    <button type="button" class="btn-action btn-delete" title="Delete" onclick="deleteMasterItem('region', ${r.region_id}, '${r.region_name}')">🗑️</button>
                </div>
            </td>
        </tr>
    `).join('');
}

function renderExpensesTable(list) {
    const tbody = document.getElementById('expensesTableBody');
    if (!tbody) return;
    tbody.innerHTML = list.map(e => `
        <tr>
            <td style="font-weight: 700; color: #fff;">${e.category_name}</td>
            <td><span class="status-pill ${e.is_tax_deductible ? 'pill-completed' : 'pill-draft'}">${e.is_tax_deductible ? 'YES' : 'NO'}</span></td>
            <td style="color: var(--text-muted);">${e.description}</td>
            <td>
                <div class="crud-actions">
                    <button type="button" class="btn-action btn-edit" title="Edit" onclick="openMasterModal('expense', ${e.expense_type_id})">✏️</button>
                    <button type="button" class="btn-action btn-delete" title="Delete" onclick="deleteMasterItem('expense', ${e.expense_type_id}, '${e.category_name}')">🗑️</button>
                </div>
            </td>
        </tr>
    `).join('');
}

function openMasterModal(type, id = null) {
    crudModalConfig = { entity: type, action: id ? 'edit' : 'create', id };
    document.getElementById('crudModalError').style.display = 'none';

    if (type === 'type') {
        const item = id ? typesListState.find(x => x.type_id === id) : null;
        document.getElementById('crudModalTitle').textContent = id ? '✏️ Edit Vehicle Type' : '+ Add Vehicle Type';
        document.getElementById('crudFormFields').innerHTML = `
            <div class="form-group full-span">
                <label>Type Name *</label>
                <input type="text" id="frmTypeName" class="form-control" value="${item ? item.type_name : ''}" required>
            </div>
            <div class="form-group full-span">
                <label>Default Capacity (KG)</label>
                <input type="number" id="frmTypeCap" class="form-control" value="${item ? item.default_capacity : '1000'}" required>
            </div>
            <div class="form-group full-span">
                <label>Description</label>
                <input type="text" id="frmTypeDesc" class="form-control" value="${item ? item.description : ''}">
            </div>
        `;
    } else if (type === 'region') {
        const item = id ? regionsListState.find(x => x.region_id === id) : null;
        document.getElementById('crudModalTitle').textContent = id ? '✏️ Edit Region' : '+ Add Region';
        document.getElementById('crudFormFields').innerHTML = `
            <div class="form-group">
                <label>Region Name *</label>
                <input type="text" id="frmRegName" class="form-control" value="${item ? item.region_name : ''}" required>
            </div>
            <div class="form-group">
                <label>Region Code *</label>
                <input type="text" id="frmRegCode" class="form-control" value="${item ? item.code : ''}" required>
            </div>
            <div class="form-group full-span">
                <label>Headquarters / Hub Location</label>
                <input type="text" id="frmRegHq" class="form-control" value="${item ? item.headquarters : ''}">
            </div>
        `;
    } else if (type === 'expense') {
        const item = id ? expensesListState.find(x => x.expense_type_id === id) : null;
        document.getElementById('crudModalTitle').textContent = id ? '✏️ Edit Expense Type' : '+ Add Expense Type';
        document.getElementById('crudFormFields').innerHTML = `
            <div class="form-group full-span">
                <label>Category Name *</label>
                <input type="text" id="frmExpName" class="form-control" value="${item ? item.category_name : ''}" required>
            </div>
            <div class="form-group full-span">
                <label>Description</label>
                <input type="text" id="frmExpDesc" class="form-control" value="${item ? item.description : ''}">
            </div>
            <div class="form-group full-span">
                <label>Tax Deductible?</label>
                <select id="frmExpTax" class="form-control">
                    <option value="true" ${item && item.is_tax_deductible ? 'selected' : ''}>Yes (Tax Deductible)</option>
                    <option value="false" ${item && !item.is_tax_deductible ? 'selected' : ''}>No</option>
                </select>
            </div>
        `;
    }

    document.getElementById('crudModal').style.display = 'flex';
}

async function deleteMasterItem(type, id, name) {
    if (!confirm(`Are you sure you want to delete '${name}'?`)) return;
    const ep = type === 'type' ? '/api/types' : type === 'region' ? '/api/regions' : '/api/expense-types';
    await fetch(`${ep}/${id}`, { method: 'DELETE' });
    loadMasterRegistries();
}

/* --- 4. UNIVERSAL SUBMISSION & MODAL CLOSE --- */
function closeCrudModal() {
    document.getElementById('crudModal').style.display = 'none';
}

function closeViewDetailModal() {
    document.getElementById('viewDetailModal').style.display = 'none';
}

async function handleCrudSubmit(event) {
    event.preventDefault();
    const errEl = document.getElementById('crudModalError');
    errEl.style.display = 'none';

    let endpoint = '';
    let method = crudModalConfig.action === 'edit' ? 'PUT' : 'POST';
    let payload = {};
    const val = (id) => document.getElementById(id)?.value ?? '';

    if (crudModalConfig.entity === 'vehicle') {
        endpoint = crudModalConfig.action === 'edit' ? `/api/vehicles/${crudModalConfig.id}` : '/api/vehicles';
        payload = {
            registration_number: val('frmRegNo'),
            model_name: val('frmModelName'),
            vehicle_type: val('frmVehicleType'),
            max_load_capacity: val('frmMaxCapacity'),
            odometer: val('frmOdometer'),
            acquisition_cost: val('frmAcqCost'),
            status: val('frmStatus')
        };
    } else if (crudModalConfig.entity === 'driver') {
        endpoint = crudModalConfig.action === 'edit' ? `/api/drivers/${crudModalConfig.id}` : '/api/drivers';
        payload = {
            full_name: val('frmDrName'),
            license_number: val('frmDrLicense'),
            license_category: val('frmDrCategory'),
            license_expiry: val('frmDrExpiry'),
            contact_number: val('frmDrPhone'),
            safety_score: val('frmDrScore'),
            status: val('frmDrStatus')
        };
    } else if (crudModalConfig.entity === 'type') {
        endpoint = crudModalConfig.action === 'edit' ? `/api/types/${crudModalConfig.id}` : '/api/types';
        payload = {
            type_name: val('frmTypeName'),
            default_capacity: val('frmTypeCap'),
            description: val('frmTypeDesc')
        };
    } else if (crudModalConfig.entity === 'region') {
        endpoint = crudModalConfig.action === 'edit' ? `/api/regions/${crudModalConfig.id}` : '/api/regions';
        payload = {
            region_name: val('frmRegName'),
            code: val('frmRegCode'),
            headquarters: val('frmRegHq')
        };
    } else if (crudModalConfig.entity === 'expense') {
        endpoint = crudModalConfig.action === 'edit' ? `/api/expense-types/${crudModalConfig.id}` : '/api/expense-types';
        payload = {
            category_name: val('frmExpName'),
            description: val('frmExpDesc'),
            is_tax_deductible: val('frmExpTax') === 'true'
        };
    } else if (crudModalConfig.entity === 'trip') {
        endpoint = '/api/trips';
        payload = {
            source: val('frmTripSource'),
            destination: val('frmTripDest'),
            vehicle_id: val('frmTripVehicle'),
            driver_id: val('frmTripDriver'),
            cargo_weight: val('frmTripCargo'),
            planned_distance: val('frmTripDist'),
            status: val('frmTripStatus') || 'Draft'
        };
    } else if (crudModalConfig.entity === 'maintenance') {
        endpoint = '/api/maintenance';
        payload = {
            vehicle_id: val('frmMaintVehicle'),
            service_type: val('frmMaintService'),
            description: val('frmMaintDesc') || val('frmMaintService'),
            cost: val('frmMaintCost'),
            service_date: val('frmMaintDate'),
            status: val('frmMaintStatus') || 'In Progress'
        };
    } else if (crudModalConfig.entity === 'fuel') {
        endpoint = '/api/fuel';
        payload = {
            vehicle_id: val('frmFuelVehicle'),
            expense_type: val('frmFuelType') || 'Fuel',
            liters: val('frmFuelLiters') || 0,
            cost: val('frmFuelCost'),
            date: val('frmFuelDate'),
            notes: val('frmFuelNotes')
        };
    }

    try {
        const res = await fetch(endpoint, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (!res.ok || !data.success) {
            errEl.textContent = '❌ ' + (data.message || 'Validation failed.');
            errEl.style.display = 'block';
            return;
        }

        closeCrudModal();
        if (crudModalConfig.entity === 'vehicle') {
            loadVehicles();
            loadDashboardData();
        } else if (crudModalConfig.entity === 'driver') {
            loadDrivers();
        } else if (crudModalConfig.entity === 'trip') {
            loadTrips();
            loadVehicles();
            loadDrivers();
            loadDashboardData();
        } else if (crudModalConfig.entity === 'maintenance') {
            loadMaintenance();
            loadVehicles();
            loadDashboardData();
        } else if (crudModalConfig.entity === 'fuel') {
            loadFuel();
            loadOperationalCosts();
            loadDashboardData();
        } else {
            loadMasterRegistries();
        }
    } catch (err) {
        errEl.textContent = '❌ Network error submitting form.';
        errEl.style.display = 'block';
    }
}

/* =========================================================================
 * MODULE 3.7 FUEL & EXPENSE MANAGEMENT & TOTAL OPERATIONAL COST FRONTEND ENGINE
 * ========================================================================= */

let fuelListState = [];
let activeFuelTab = 'logs';

async function loadFuel() {
    try {
        const search = document.getElementById('fuelSearchInput')?.value || '';
        const type = document.getElementById('fuelTypeFilter')?.value || 'All';
        const query = new URLSearchParams({ search, type }).toString();

        const res = await fetch(`/api/fuel?${query}`);
        const data = await res.json();
        if (data.success) {
            fuelListState = data.logs;
            renderFuelGrid(fuelListState);
            renderFuelTable(fuelListState);
        }
    } catch (err) {
        console.error('Error loading fuel logs:', err);
    }
}

async function loadOperationalCosts() {
    try {
        const res = await fetch('/api/fuel/operational-costs');
        const data = await res.json();
        if (data.success) {
            if (data.kpis) {
                const kTotalOp = document.getElementById('fKpiTotalOp');
                const kFuel = document.getElementById('fKpiFuelCost');
                const kLiters = document.getElementById('fKpiLiters');
                const kMaint = document.getElementById('fKpiMaintCost');
                if (kTotalOp) kTotalOp.textContent = '$' + Number(data.kpis.fleetTotalOperationalCost || 0).toLocaleString();
                if (kFuel) kFuel.textContent = '$' + Number(data.kpis.fleetTotalFuelCost || 0).toLocaleString();
                if (kLiters) kLiters.textContent = Number(data.kpis.fleetTotalLiters || 0).toLocaleString() + ' L';
                if (kMaint) kMaint.textContent = '$' + Number(data.kpis.fleetTotalMaintenanceCost || 0).toLocaleString();
            }
            renderOperationalCostCards(data.vehicleCosts || []);
            renderOperationalCostTable(data.vehicleCosts || []);
        }
    } catch (err) {
        console.error('Error loading operational costs:', err);
    }
}

function switchFuelTab(tab) {
    activeFuelTab = tab;
    const btnLogs = document.getElementById('btnFuelLogsToggle');
    const btnOp = document.getElementById('btnFuelOpCostToggle');
    const contLogs = document.getElementById('fuelLogsContainer');
    const contOp = document.getElementById('operationalCostContainer');

    if (btnLogs) btnLogs.classList.toggle('active', tab === 'logs');
    if (btnOp) btnOp.classList.toggle('active', tab === 'opcost');
    if (contLogs) contLogs.style.display = tab === 'logs' ? 'block' : 'none';
    if (contOp) contOp.style.display = tab === 'opcost' ? 'block' : 'none';

    if (tab === 'opcost') {
        loadOperationalCosts();
    }
}

function filterFuelLogs() {
    loadFuel();
}

function renderFuelGrid(list) {
    const container = document.getElementById('fuelCardsGrid');
    if (!container) return;

    if (!list || list.length === 0) {
        container.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 3rem; background: var(--bg-card); border-radius: var(--radius-lg); border: 1px solid var(--border-color);">No fuel or expense logs match filters.</div>';
        return;
    }

    container.innerHTML = list.map(item => {
        const isFuel = item.expense_type === 'Fuel';
        const badgeColor = isFuel ? '#38bdf8' : '#a855f7';
        const icon = isFuel ? '⛽' : '🧾';

        return `
            <div class="driver-badge-card" style="border-left: 4px solid ${badgeColor};">
                <div class="driver-card-header" style="margin-bottom: 0.8rem;">
                    <div>
                        <span style="font-size: 0.76rem; font-weight: 700; letter-spacing: 1px; color: var(--text-muted); text-transform: uppercase;">LOG #${item.fuel_id}</span>
                        <div style="font-size: 1.15rem; font-weight: 800; color: #fff; margin-top: 2px;">
                            ${icon} ${item.expense_type}
                        </div>
                    </div>
                    <span style="font-size: 1.25rem; font-weight: 800; color: #f43f5e;">$${Number(item.cost).toLocaleString()}</span>
                </div>

                <div class="driver-card-meta">
                    <div class="driver-meta-item">
                        <span class="driver-meta-label">Assigned Vehicle</span>
                        <span class="driver-meta-value" style="font-family: monospace; color: #38bdf8;">🚚 ${item.vehicle_reg}</span>
                    </div>
                    <div class="driver-meta-item">
                        <span class="driver-meta-label">Fuel Quantity</span>
                        <span class="driver-meta-value" style="color: #10b981;">${isFuel ? Number(item.liters) + ' Liters' : 'N/A'}</span>
                    </div>
                    <div class="driver-meta-item" style="grid-column: span 2;">
                        <span class="driver-meta-label">Expense Notes / Vendor</span>
                        <span class="driver-meta-value" style="font-size: 0.88rem; color: #e2e8f0;">${item.notes || 'No notes provided.'}</span>
                    </div>
                    <div class="driver-meta-item">
                        <span class="driver-meta-label">Date Recorded</span>
                        <span class="driver-meta-value">📅 ${item.date}</span>
                    </div>
                </div>

                <div style="display: flex; justify-content: flex-end; align-items: center; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 1rem;">
                    <button type="button" class="btn" style="background: rgba(244, 63, 94, 0.15); color: #f43f5e; border: 1px solid rgba(244,63,94,0.3); font-size: 0.8rem;" onclick="deleteFuelLogItem(${item.fuel_id}, '${item.expense_type}')">🗑️ Delete Log</button>
                </div>
            </div>
        `;
    }).join('');
}

function renderFuelTable(list) {
    const tbody = document.getElementById('fuelTableBody');
    if (!tbody) return;

    if (!list || list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 2rem;">No logs found.</td></tr>';
        return;
    }

    tbody.innerHTML = list.map(item => `
        <tr>
            <td style="font-weight: 700; color: #fff;">#${item.fuel_id}</td>
            <td style="font-family: monospace; color: #38bdf8; font-weight: 700;">${item.vehicle_reg}</td>
            <td style="font-weight: 600; color: #fff;">${item.expense_type}</td>
            <td style="color: #10b981; font-weight: 700;">${item.expense_type === 'Fuel' ? item.liters + ' L' : '-'}</td>
            <td style="color: #f43f5e; font-weight: 700;">$${Number(item.cost).toLocaleString()}</td>
            <td>${item.date}</td>
            <td style="color: #cbd5e1;">${item.notes || '-'}</td>
            <td>
                <div class="crud-actions">
                    <button type="button" class="btn-action btn-delete" title="Delete Log" onclick="deleteFuelLogItem(${item.fuel_id}, '${item.expense_type}')">🗑️</button>
                </div>
            </td>
        </tr>
    `).join('');
}

function renderOperationalCostCards(vehicleCosts) {
    const container = document.getElementById('opCostCardsGrid');
    if (!container) return;

    container.innerHTML = vehicleCosts.map(v => `
        <div class="driver-badge-card" style="border-left: 4px solid #f43f5e;">
            <div class="driver-card-header" style="margin-bottom: 0.8rem;">
                <div>
                    <span style="font-size: 0.76rem; font-weight: 700; letter-spacing: 1px; color: var(--text-muted); text-transform: uppercase;">FLEET VEHICLE</span>
                    <div style="font-size: 1.18rem; font-weight: 800; color: #fff; margin-top: 2px;">
                        🚚 ${v.registration_number}
                    </div>
                </div>
                <div style="text-align: right;">
                    <span style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; display: block;">Total Operational Cost</span>
                    <span style="font-size: 1.35rem; font-weight: 800; color: #f43f5e;">$${Number(v.totalOperationalCost).toLocaleString()}</span>
                </div>
            </div>

            <div class="driver-card-meta">
                <div class="driver-meta-item">
                    <span class="driver-meta-label">Fuel & General Expenses</span>
                    <span class="driver-meta-value" style="color: #38bdf8;">$${Number(v.fuelCost + v.otherExpenseCost).toLocaleString()} (${v.totalLiters} L)</span>
                </div>
                <div class="driver-meta-item">
                    <span class="driver-meta-label">Shop Maintenance Cost</span>
                    <span class="driver-meta-value" style="color: #f59e0b;">$${Number(v.maintenanceCost).toLocaleString()}</span>
                </div>
                <div class="driver-meta-item">
                    <span class="driver-meta-label">Odometer Reading</span>
                    <span class="driver-meta-value">${Number(v.odometer).toLocaleString()} KM</span>
                </div>
                <div class="driver-meta-item">
                    <span class="driver-meta-label">Cost per KM</span>
                    <span class="driver-meta-value" style="color: #10b981; font-weight: 700;">$${v.costPerKm} / KM</span>
                </div>
            </div>
        </div>
    `).join('');
}

function renderOperationalCostTable(vehicleCosts) {
    const tbody = document.getElementById('opCostTableBody');
    if (!tbody) return;

    tbody.innerHTML = vehicleCosts.map(v => `
        <tr>
            <td style="font-family: monospace; color: #38bdf8; font-weight: 800;">${v.registration_number}</td>
            <td style="color: #fff; font-weight: 600;">${v.model_name} (${v.vehicle_type})</td>
            <td>${Number(v.odometer).toLocaleString()} KM</td>
            <td style="color: #38bdf8; font-weight: 700;">$${Number(v.fuelCost).toLocaleString()}</td>
            <td style="color: #a855f7; font-weight: 700;">$${Number(v.otherExpenseCost).toLocaleString()}</td>
            <td style="color: #f59e0b; font-weight: 700;">$${Number(v.maintenanceCost).toLocaleString()}</td>
            <td style="color: #f43f5e; font-weight: 800; font-size: 1.05rem;">$${Number(v.totalOperationalCost).toLocaleString()}</td>
            <td style="color: #10b981; font-weight: 700;">$${v.costPerKm} / KM</td>
        </tr>
    `).join('');
}

async function openFuelModal() {
    crudModalConfig = { entity: 'fuel', action: 'create', id: null };
    document.getElementById('crudModalTitle').textContent = '+ Record Fuel / Expense Receipt';
    document.getElementById('crudModalError').style.display = 'none';

    let vehicleOptionsHtml = '';
    try {
        const res = await fetch('/api/vehicles');
        const data = await res.json();
        const vList = data.vehicles || [];
        if (vList.length > 0) {
            vehicleOptionsHtml = vList.map(v =>
                `<option value="${v.vehicle_id}">${v.registration_number} — ${v.model_name}</option>`
            ).join('');
        }
    } catch (e) {
        vehicleOptionsHtml = '<option value="1">GJ01AB4521 — Ford Transit Custom</option>';
    }

    const todayStr = new Date().toISOString().split('T')[0];

    document.getElementById('crudFormFields').innerHTML = `
        <div class="form-group full-span">
            <label>Select Fleet Vehicle *</label>
            <select id="frmFuelVehicle" class="form-control" required>
                ${vehicleOptionsHtml}
            </select>
        </div>
        <div class="form-group">
            <label>Expense Category *</label>
            <select id="frmFuelType" class="form-control" onchange="const l=document.getElementById('frmFuelLiters'); if(this.value==='Fuel'){l.disabled=false;}else{l.value='0'; l.disabled=true;}">
                <option value="Fuel">Fuel Refueling</option>
                <option value="Toll & Highway Fees">Toll & Highway Fees</option>
                <option value="Parking & Yard Fees">Parking & Yard Fees</option>
                <option value="Permit & Regulatory">Permit & Regulatory</option>
                <option value="Miscellaneous Operating Expense">Miscellaneous Operating Expense</option>
            </select>
        </div>
        <div class="form-group">
            <label>Fuel Quantity (Liters) *</label>
            <input type="number" id="frmFuelLiters" class="form-control" placeholder="e.g. 85" min="0" step="0.1" value="0">
        </div>
        <div class="form-group">
            <label>Expense Amount ($) *</label>
            <input type="number" id="frmFuelCost" class="form-control" placeholder="e.g. 118.50" min="0" step="0.01" required>
        </div>
        <div class="form-group">
            <label>Transaction Date *</label>
            <input type="date" id="frmFuelDate" class="form-control" value="${todayStr}" required>
        </div>
        <div class="form-group full-span">
            <label>Transaction Notes / Vendor / Gas Station</label>
            <input type="text" id="frmFuelNotes" class="form-control" placeholder="e.g. Shell Highway Station - Full Tank Premium Diesel">
        </div>
    `;

    document.getElementById('crudModal').style.display = 'flex';
}

async function deleteFuelLogItem(id, name) {
    if (!confirm(`Delete ${name} log #${id}?`)) return;
    try {
        await fetch(`/api/fuel/${id}`, { method: 'DELETE' });
        loadFuel();
        loadOperationalCosts();
    } catch (e) {
        alert('Error deleting record.');
    }
}

/* =========================================================================
 * MODULE 3.6 MAINTENANCE & SHOP QUEUE CONTROL FRONTEND ENGINE
 * ========================================================================= */

let maintenanceListState = [];
let activeMaintViewMode = 'grid';

async function loadMaintenance() {
    try {
        const search = document.getElementById('maintSearchInput')?.value || '';
        const status = document.getElementById('maintStatusFilter')?.value || 'All';
        const query = new URLSearchParams({ search, status }).toString();

        const res = await fetch(`/api/maintenance?${query}`);
        const data = await res.json();
        if (data.success) {
            maintenanceListState = data.logs;
            if (data.kpis) {
                const kt = document.getElementById('mKpiTotal');
                const ki = document.getElementById('mKpiInShop');
                const kc = document.getElementById('mKpiCompleted');
                const kd = document.getElementById('mKpiCost');
                const ka = document.getElementById('mKpiAvg');
                if (kt) kt.textContent = data.kpis.totalLogs;
                if (ki) ki.textContent = data.kpis.activeInShop;
                if (kc) kc.textContent = data.kpis.completedLogs;
                if (kd) kd.textContent = '$' + Number(data.kpis.totalCost || 0).toLocaleString();
                if (ka) ka.textContent = 'Avg: $' + Number(data.kpis.avgCost || 0).toLocaleString() + ' per service';
            }
            renderMaintenanceGrid(maintenanceListState);
            renderMaintenanceTable(maintenanceListState);
        }
    } catch (err) {
        console.error('Error loading maintenance records:', err);
    }
}

function switchMaintViewMode(mode) {
    activeMaintViewMode = mode;
    const btnGrid = document.getElementById('btnMaintGridToggle');
    const btnTable = document.getElementById('btnMaintTableToggle');
    const cardsCont = document.getElementById('maintCardsContainer');
    const tableCont = document.getElementById('maintTableContainer');

    if (btnGrid) btnGrid.classList.toggle('active', mode === 'grid');
    if (btnTable) btnTable.classList.toggle('active', mode === 'table');
    if (cardsCont) cardsCont.style.display = mode === 'grid' ? 'grid' : 'none';
    if (tableCont) tableCont.style.display = mode === 'table' ? 'block' : 'none';
}

function filterMaintenance() {
    loadMaintenance();
}

function renderMaintenanceGrid(list) {
    const container = document.getElementById('maintCardsContainer');
    if (!container) return;

    if (!list || list.length === 0) {
        container.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 3rem; background: var(--bg-card); border-radius: var(--radius-lg); border: 1px solid var(--border-color);">No maintenance records match criteria. Click "+ Log Maintenance & Move to Shop" to add a work order.</div>';
        return;
    }

    container.innerHTML = list.map(m => {
        const statusPill = m.status === 'Completed' ? 'pill-completed' : 'pill-ontrip';
        const statusIcon = m.status === 'Completed' ? '✅' : '🔧';

        return `
            <div class="driver-badge-card" style="border-left: 4px solid ${m.status === 'In Progress' ? '#f59e0b' : '#10b981'};">
                <div class="driver-card-header" style="margin-bottom: 0.8rem;">
                    <div>
                        <span style="font-size: 0.76rem; font-weight: 700; letter-spacing: 1px; color: var(--text-muted); text-transform: uppercase;">WORK ORDER #${m.maintenance_id}</span>
                        <div style="font-size: 1.15rem; font-weight: 800; color: #fff; margin-top: 2px;">
                            ${m.service_type}
                        </div>
                    </div>
                    <span class="status-pill ${statusPill}">${statusIcon} ${m.status}</span>
                </div>

                <div class="driver-card-meta">
                    <div class="driver-meta-item">
                        <span class="driver-meta-label">Assigned Vehicle</span>
                        <span class="driver-meta-value" style="font-family: monospace; color: #38bdf8;">🚚 ${m.vehicle_reg}</span>
                    </div>
                    <div class="driver-meta-item">
                        <span class="driver-meta-label">Service Cost</span>
                        <span class="driver-meta-value" style="color: #f43f5e;">💰 $${Number(m.cost).toLocaleString()}</span>
                    </div>
                    <div class="driver-meta-item" style="grid-column: span 2;">
                        <span class="driver-meta-label">Work Description</span>
                        <span class="driver-meta-value" style="font-size: 0.88rem; color: #e2e8f0;">${m.description || 'No description provided.'}</span>
                    </div>
                    <div class="driver-meta-item">
                        <span class="driver-meta-label">Service Date</span>
                        <span class="driver-meta-value">📅 ${m.service_date}</span>
                    </div>
                </div>

                <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 1rem;">
                    <div>
                        ${m.status === 'In Progress' ? `<button type="button" class="btn" style="background: rgba(16, 185, 129, 0.2); color: #10b981; border: 1px solid rgba(16,185,129,0.4); font-size: 0.8rem; font-weight: 700;" onclick="updateMaintenanceStatusItem(${m.maintenance_id}, 'Completed')">✅ Mark Completed & Release Vehicle</button>` : `<span style="font-size: 0.8rem; color: #10b981; font-weight: 600;">✓ Vehicle Restored to Available</span>`}
                    </div>
                    <div>
                        <button type="button" class="btn" style="background: rgba(244, 63, 94, 0.15); color: #f43f5e; border: 1px solid rgba(244,63,94,0.3); font-size: 0.8rem;" onclick="deleteMaintenanceItem(${m.maintenance_id}, '${m.service_type}')">🗑️</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function renderMaintenanceTable(list) {
    const tbody = document.getElementById('maintTableBody');
    if (!tbody) return;

    if (!list || list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 2rem;">No maintenance logs found.</td></tr>';
        return;
    }

    tbody.innerHTML = list.map(m => {
        const statusPill = m.status === 'Completed' ? 'pill-completed' : 'pill-ontrip';

        return `
            <tr>
                <td style="font-weight: 700; color: #fff;">#${m.maintenance_id}</td>
                <td style="font-family: monospace; color: #38bdf8; font-weight: 700;">${m.vehicle_reg}</td>
                <td style="font-weight: 600; color: #fff;">${m.service_type}</td>
                <td style="color: #cbd5e1;">${m.description || '-'}</td>
                <td>${m.service_date}</td>
                <td style="color: #f43f5e; font-weight: 700;">$${Number(m.cost).toLocaleString()}</td>
                <td><span class="status-pill ${statusPill}">${m.status}</span></td>
                <td>
                    <div class="crud-actions">
                        ${m.status === 'In Progress' ? `<button type="button" class="btn-action btn-edit" title="Mark Complete & Release Vehicle" onclick="updateMaintenanceStatusItem(${m.maintenance_id}, 'Completed')">✅</button>` : ''}
                        <button type="button" class="btn-action btn-delete" title="Delete Log" onclick="deleteMaintenanceItem(${m.maintenance_id}, '${m.service_type}')">🗑️</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

async function openMaintenanceModal() {
    crudModalConfig = { entity: 'maintenance', action: 'create', id: null };
    document.getElementById('crudModalTitle').textContent = '+ Log Vehicle Maintenance & Move to Shop';
    document.getElementById('crudModalError').style.display = 'none';

    let vehicleOptionsHtml = '';
    try {
        const res = await fetch('/api/vehicles');
        const data = await res.json();
        const vList = data.vehicles || [];
        if (vList.length > 0) {
            vehicleOptionsHtml = vList.map(v =>
                `<option value="${v.vehicle_id}">${v.registration_number} — ${v.model_name} [Current: ${v.status}]</option>`
            ).join('');
        }
    } catch (e) {
        vehicleOptionsHtml = '<option value="1">MH-12-PQ-9081 — Tata Signia [Available]</option>';
    }

    const todayStr = new Date().toISOString().split('T')[0];

    document.getElementById('crudFormFields').innerHTML = `
        <div class="form-group full-span">
            <label>Select Fleet Vehicle *</label>
            <select id="frmMaintVehicle" class="form-control" required>
                ${vehicleOptionsHtml}
            </select>
            <span style="font-size: 0.8rem; color: #f59e0b; margin-top: 4px; display: block;">⚠️ Creating an active work order will automatically switch this vehicle's status to "In Shop" and exclude it from dispatch.</span>
        </div>
        <div class="form-group">
            <label>Service / Repair Type *</label>
            <input type="text" id="frmMaintService" class="form-control" placeholder="e.g. Brake & Tire Replacement" required>
        </div>
        <div class="form-group full-span">
            <label>Work Order Description</label>
            <input type="text" id="frmMaintDesc" class="form-control" placeholder="e.g. Full front brake pad replacement and system bleed">
        </div>
        <div class="form-group">
            <label>Service Cost ($) *</label>
            <input type="number" id="frmMaintCost" class="form-control" placeholder="e.g. 1450" min="0" required>
        </div>
        <div class="form-group">
            <label>Service Entry Date *</label>
            <input type="date" id="frmMaintDate" class="form-control" value="${todayStr}" required>
        </div>
        <div class="form-group">
            <label>Initial Work Order Status *</label>
            <select id="frmMaintStatus" class="form-control">
                <option value="In Progress">Active In Shop (Lock Vehicle)</option>
                <option value="Completed">Completed Record Only</option>
            </select>
        </div>
        <div class="form-group full-span">
            <label>Detailed Work Description</label>
            <input type="text" id="frmMaintDesc" class="form-control" placeholder="e.g. Replaced front brake pads and balanced all wheels.">
        </div>
    `;

    document.getElementById('crudModal').style.display = 'flex';
}

async function updateMaintenanceStatusItem(id, newStatus) {
    if (!confirm(`Mark work order #${id} as ${newStatus}? When marked Completed, the vehicle will be automatically restored to the Available dispatch pool.`)) return;
    try {
        const res = await fetch(`/api/maintenance/${id}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });
        const data = await res.json();
        if (data.success) {
            loadMaintenance();
            loadVehicles();
            loadDashboardData();
        } else {
            alert(data.message || 'Status update failed.');
        }
    } catch (e) {
        alert('Network error updating maintenance status.');
    }
}

async function deleteMaintenanceItem(id, name) {
    if (!confirm(`Delete maintenance record #${id} (${name})?`)) return;
    try {
        await fetch(`/api/maintenance/${id}`, { method: 'DELETE' });
        loadMaintenance();
    } catch (e) {
        alert('Error deleting record.');
    }
}

/* =========================================================================
 * MODULE 3.5 TRIP MANAGEMENT & LIFECYCLE DISPATCH FRONTEND ENGINE
 * ========================================================================= */

let tripsListState = [];
let activeTripViewMode = 'grid';

async function loadTrips() {
    try {
        const search = document.getElementById('tripSearchInput')?.value || '';
        const status = document.getElementById('tripStatusFilter')?.value || 'All';
        const query = new URLSearchParams({ search, status }).toString();

        const res = await fetch(`/api/trips?${query}`);
        const data = await res.json();
        if (data.success) {
            tripsListState = data.trips;
            if (data.kpis) {
                const kt = document.getElementById('trKpiTotal');
                const kd = document.getElementById('trKpiDispatched');
                const kc = document.getElementById('trKpiCompleted');
                const kg = document.getElementById('trKpiCargo');
                if (kt) kt.textContent = data.kpis.totalTrips;
                if (kd) kd.textContent = data.kpis.dispatchedTrips;
                if (kc) kc.textContent = data.kpis.completedTrips;
                if (kg) kg.textContent = Number(data.kpis.totalCargoKg || 0).toLocaleString() + ' KG';
            }
            renderTripsGrid(tripsListState);
            renderTripsTable(tripsListState);
        }
    } catch (err) {
        console.error('Error loading freight trips:', err);
    }
}

function switchTripViewMode(mode) {
    activeTripViewMode = mode;
    const btnGrid = document.getElementById('btnTripGridToggle');
    const btnTable = document.getElementById('btnTripTableToggle');
    const cardsCont = document.getElementById('tripCardsContainer');
    const tableCont = document.getElementById('tripTableContainer');

    if (btnGrid) btnGrid.classList.toggle('active', mode === 'grid');
    if (btnTable) btnTable.classList.toggle('active', mode === 'table');
    if (cardsCont) cardsCont.style.display = mode === 'grid' ? 'grid' : 'none';
    if (tableCont) tableCont.style.display = mode === 'table' ? 'block' : 'none';
}

function filterTrips() {
    loadTrips();
}

function renderTripsGrid(list) {
    const container = document.getElementById('tripCardsContainer');
    if (!container) return;

    if (!list || list.length === 0) {
        container.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 3rem; background: var(--bg-card); border-radius: var(--radius-lg); border: 1px solid var(--border-color);">No freight trips match your current filter criteria. Click "+ Create Freight Trip" to dispatch a load.</div>';
        return;
    }

    container.innerHTML = list.map(t => {
        const statusPill = t.status === 'Completed' ? 'pill-completed' :
            t.status === 'Dispatched' ? 'pill-ontrip' :
                t.status === 'Draft' ? 'pill-draft' : 'pill-dispatched';

        const statusIcon = t.status === 'Completed' ? '🏁' :
            t.status === 'Dispatched' ? '🚛' :
                t.status === 'Draft' ? '📝' : '❌';

        return `
            <div class="driver-badge-card" style="border-left: 4px solid ${t.status === 'Dispatched' ? '#6366f1' : t.status === 'Completed' ? '#10b981' : '#94a3b8'};">
                <div class="driver-card-header" style="margin-bottom: 0.8rem;">
                    <div>
                        <span style="font-size: 0.76rem; font-weight: 700; letter-spacing: 1px; color: var(--text-muted); text-transform: uppercase;">DISPATCH ORDER #${t.trip_id}</span>
                        <div style="font-size: 1.15rem; font-weight: 800; color: #fff; margin-top: 2px;">
                            ${t.source} <span style="color: #6366f1;">➔</span> ${t.destination}
                        </div>
                    </div>
                    <span class="status-pill ${statusPill}">${statusIcon} ${t.status}</span>
                </div>

                <div class="driver-card-meta">
                    <div class="driver-meta-item">
                        <span class="driver-meta-label">Assigned Vehicle</span>
                        <span class="driver-meta-value" style="font-family: monospace; color: #38bdf8;">🚚 ${t.vehicle_reg}</span>
                    </div>
                    <div class="driver-meta-item">
                        <span class="driver-meta-label">Assigned Driver</span>
                        <span class="driver-meta-value">👨‍✈️ ${t.driver_name}</span>
                    </div>
                    <div class="driver-meta-item">
                        <span class="driver-meta-label">Cargo Weight</span>
                        <span class="driver-meta-value" style="color: #10b981;">⚖️ ${Number(t.cargo_weight).toLocaleString()} kg</span>
                    </div>
                    <div class="driver-meta-item">
                        <span class="driver-meta-label">Planned Distance</span>
                        <span class="driver-meta-value">🛣️ ${Number(t.planned_distance).toLocaleString()} km</span>
                    </div>
                </div>

                <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 1rem;">
                    <div>
                        ${t.status === 'Draft' ? `<button type="button" class="btn" style="background: rgba(99, 102, 241, 0.2); color: #818cf8; border: 1px solid rgba(99,102,241,0.4); font-size: 0.8rem; font-weight: 700;" onclick="updateTripStatusItem(${t.trip_id}, 'Dispatched')">🚀 Dispatch Now</button>` : ''}
                        ${t.status === 'Dispatched' ? `<button type="button" class="btn" style="background: rgba(16, 185, 129, 0.2); color: #10b981; border: 1px solid rgba(16,185,129,0.4); font-size: 0.8rem; font-weight: 700;" onclick="updateTripStatusItem(${t.trip_id}, 'Completed')">🏁 Mark Complete</button>` : ''}
                        ${(t.status === 'Draft' || t.status === 'Dispatched') ? `<button type="button" class="btn" style="background: rgba(244, 63, 94, 0.15); color: #f43f5e; border: 1px solid rgba(244,63,94,0.3); font-size: 0.8rem;" onclick="updateTripStatusItem(${t.trip_id}, 'Cancelled')">❌ Cancel</button>` : ''}
                    </div>
                    <div style="display: flex; gap: 0.4rem;">
                        <button type="button" class="btn" style="background: rgba(6, 182, 212, 0.15); color: #06b6d4; border: 1px solid rgba(6,182,212,0.3); font-size: 0.8rem;" onclick="viewTripSheet(${t.trip_id})">👁️ Manifest</button>
                        <button type="button" class="btn" style="background: rgba(244, 63, 94, 0.15); color: #f43f5e; border: 1px solid rgba(244,63,94,0.3); font-size: 0.8rem;" onclick="deleteTripItem(${t.trip_id}, '${t.source} -> ${t.destination}')">🗑️</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function renderTripsTable(list) {
    const tbody = document.getElementById('tripsTableBody');
    if (!tbody) return;

    if (!list || list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 2rem;">No freight trips found matching criteria.</td></tr>';
        return;
    }

    tbody.innerHTML = list.map(t => {
        const statusPill = t.status === 'Completed' ? 'pill-completed' :
            t.status === 'Dispatched' ? 'pill-ontrip' :
                t.status === 'Draft' ? 'pill-draft' : 'pill-dispatched';

        return `
            <tr>
                <td style="font-weight: 700; color: #fff;">#${t.trip_id}</td>
                <td style="font-weight: 600; color: #fff;">${t.source} ➔ ${t.destination}</td>
                <td style="font-family: monospace; color: #38bdf8;">${t.vehicle_reg}</td>
                <td>${t.driver_name}</td>
                <td style="color: #10b981; font-weight: 700;">${Number(t.cargo_weight).toLocaleString()} kg</td>
                <td>${Number(t.planned_distance).toLocaleString()} km</td>
                <td><span class="status-pill ${statusPill}">${t.status}</span></td>
                <td>
                    <div class="crud-actions">
                        <button type="button" class="btn-action btn-view" title="View Manifest" onclick="viewTripSheet(${t.trip_id})">👁️</button>
                        ${t.status === 'Draft' ? `<button type="button" class="btn-action btn-edit" title="Dispatch Trip" onclick="updateTripStatusItem(${t.trip_id}, 'Dispatched')">🚀</button>` : ''}
                        ${t.status === 'Dispatched' ? `<button type="button" class="btn-action btn-edit" title="Mark Complete" onclick="updateTripStatusItem(${t.trip_id}, 'Completed')">🏁</button>` : ''}
                        <button type="button" class="btn-action btn-delete" title="Delete Trip" onclick="deleteTripItem(${t.trip_id}, '${t.source} -> ${t.destination}')">🗑️</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

async function openTripModal() {
    crudModalConfig = { entity: 'trip', action: 'create', id: null };
    document.getElementById('crudModalTitle').textContent = '+ Create New Freight Trip';
    document.getElementById('crudModalError').style.display = 'none';

    // Fetch Available Vehicles & Drivers dynamically
    let vehicleOptionsHtml = '';
    let driverOptionsHtml = '';

    try {
        const vRes = await fetch('/api/vehicles?status=Available');
        const vData = await vRes.json();
        const availableVehicles = (vData.vehicles || []).filter(v => v.status === 'Available');
        if (availableVehicles.length > 0) {
            vehicleOptionsHtml = availableVehicles.map(v =>
                `<option value="${v.vehicle_id}">${v.registration_number} — ${v.model_name} (Max Load: ${v.max_load_capacity} kg)</option>`
            ).join('');
        } else {
            vehicleOptionsHtml = '<option value="">⚠️ No Available Vehicles Ready</option>';
        }

        const dRes = await fetch('/api/drivers?status=Available');
        const dData = await dRes.json();
        const availableDrivers = (dData.drivers || []).filter(d => d.status === 'Available');
        if (availableDrivers.length > 0) {
            driverOptionsHtml = availableDrivers.map(d =>
                `<option value="${d.driver_id}">${d.full_name} (${d.license_category} - Safety: ${d.safety_score}%)</option>`
            ).join('');
        } else {
            driverOptionsHtml = '<option value="">⚠️ No Available Drivers Ready</option>';
        }
    } catch (e) {
        vehicleOptionsHtml = '<option value="1">MH-12-PQ-9081 (Max: 18000 kg)</option>';
        driverOptionsHtml = '<option value="2">Johnathan Vance (HMV)</option>';
    }

    document.getElementById('crudFormFields').innerHTML = `
        <div class="form-group">
            <label>Source / Origin City *</label>
            <input type="text" id="frmTripSource" class="form-control" placeholder="e.g. Mumbai JNPT Port" required>
        </div>
        <div class="form-group">
            <label>Destination City *</label>
            <input type="text" id="frmTripDest" class="form-control" placeholder="e.g. Pune Logistics Hub" required>
        </div>
        <div class="form-group full-span">
            <label>Select Available Fleet Vehicle *</label>
            <select id="frmTripVehicle" class="form-control" required>
                ${vehicleOptionsHtml}
            </select>
        </div>
        <div class="form-group full-span">
            <label>Select Available Commercial Driver *</label>
            <select id="frmTripDriver" class="form-control" required>
                ${driverOptionsHtml}
            </select>
        </div>
        <div class="form-group">
            <label>Cargo Weight (KG) *</label>
            <input type="number" id="frmTripCargo" class="form-control" placeholder="e.g. 15000" min="1" required>
        </div>
        <div class="form-group">
            <label>Planned Distance (KM) *</label>
            <input type="number" id="frmTripDist" class="form-control" placeholder="e.g. 145" min="1" required>
        </div>
        <div class="form-group full-span">
            <label>Initial Lifecycle Status *</label>
            <select id="frmTripStatus" class="form-control">
                <option value="Draft">Draft (Hold in Dispatch Queue)</option>
                <option value="Dispatched">Dispatched (Immediate Route Launch)</option>
            </select>
        </div>
    `;

    document.getElementById('crudModal').style.display = 'flex';
}

async function updateTripStatusItem(tripId, newStatus) {
    const actionLabel = newStatus === 'Dispatched' ? 'Dispatch trip and lock assigned vehicle & driver to On Trip?' :
        newStatus === 'Completed' ? 'Mark trip completed, release vehicle & driver to Available, and add odometer reading?' :
            `Transition trip #${tripId} to ${newStatus}?`;

    if (!confirm(actionLabel)) return;

    try {
        const res = await fetch(`/api/trips/${tripId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });
        const data = await res.json();
        if (data.success) {
            loadTrips();
            loadVehicles();
            loadDrivers();
            loadDashboardData();
        } else {
            alert(data.message || 'Status transition failed.');
        }
    } catch (e) {
        alert('Network error transitioning trip status.');
    }
}

async function deleteTripItem(id, route) {
    if (!confirm(`Delete freight trip #${id} (${route})?`)) return;
    try {
        const res = await fetch(`/api/trips/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
            loadTrips();
        } else {
            alert(data.message || 'Delete failed.');
        }
    } catch (e) {
        alert('Network error deleting trip.');
    }
}

function viewTripSheet(tripId) {
    const trip = tripsListState.find(t => Number(t.trip_id) === Number(tripId));
    if (!trip) return;

    document.getElementById('viewDetailTitle').textContent = `📦 Trip Dispatch Manifest #${trip.trip_id}`;
    document.getElementById('viewDetailBody').innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; background: rgba(0,0,0,0.3); padding: 1.2rem; border-radius: 12px; border: 1px solid rgba(255,255,255,0.08);">
            <div><span style="color: var(--text-muted); font-size: 0.8rem;">ORIGIN</span><br><strong style="font-size: 1.1rem;">${trip.source}</strong></div>
            <div><span style="color: var(--text-muted); font-size: 0.8rem;">DESTINATION</span><br><strong style="font-size: 1.1rem;">${trip.destination}</strong></div>
            <div><span style="color: var(--text-muted); font-size: 0.8rem;">ASSIGNED VEHICLE</span><br><strong>🚚 ${trip.vehicle_reg}</strong></div>
            <div><span style="color: var(--text-muted); font-size: 0.8rem;">ASSIGNED DRIVER</span><br><strong>👨‍✈️ ${trip.driver_name}</strong></div>
            <div><span style="color: var(--text-muted); font-size: 0.8rem;">CARGO WEIGHT</span><br><strong style="color: #10b981;">${Number(trip.cargo_weight).toLocaleString()} KG</strong></div>
            <div><span style="color: var(--text-muted); font-size: 0.8rem;">PLANNED DISTANCE</span><br><strong>${Number(trip.planned_distance).toLocaleString()} KM</strong></div>
            <div style="grid-column: span 2;"><span style="color: var(--text-muted); font-size: 0.8rem;">LIFECYCLE STATUS</span><br><span class="status-pill ${trip.status === 'Completed' ? 'pill-completed' : trip.status === 'Dispatched' ? 'pill-ontrip' : 'pill-draft'}">${trip.status}</span></div>
        </div>
    `;
    document.getElementById('viewDetailModal').style.display = 'flex';
}

/* =========================================================================
 * MODULE 3.8 REPORTS & ANALYTICS FRONTEND ENGINE (ROI, CSV & PDF EXPORT)
 * ========================================================================= */

let analyticsListState = [];
let activeAnalyticsTab = 'cards';

async function loadAnalytics() {
    try {
        const res = await fetch('/api/analytics');
        const data = await res.json();
        if (data.success) {
            analyticsListState = data.vehicleAnalytics || [];

            if (data.kpis) {
                const u = document.getElementById('aKpiUtil');
                const e = document.getElementById('aKpiEfficiency');
                const o = document.getElementById('aKpiOpCost');
                const r = document.getElementById('aKpiROI');

                if (u) u.textContent = data.kpis.fleetUtilization + '%';
                if (e) e.textContent = data.kpis.avgFuelEfficiency + ' KM/L';
                if (o) o.textContent = '$' + Number(data.kpis.totalOperationalCost || 0).toLocaleString();
                if (r) r.textContent = data.kpis.avgFleetROI + '%';
            }

            renderAnalyticsCards(analyticsListState);
            renderAnalyticsTable(analyticsListState);
            renderAnalyticsCharts(analyticsListState);
        }
    } catch (err) {
        console.error('Error loading analytics:', err);
    }
}

let analyticsROIChartInstance = null;
let analyticsEfficiencyChartInstance = null;

function renderAnalyticsCharts(list) {
    if (!list || !Array.isArray(list)) return;

    const roiCanvas = document.getElementById('analyticsROIChart');
    const effCanvas = document.getElementById('analyticsEfficiencyChart');

    const labels = list.map(v => v.registration_number || 'VEH');
    const revData = list.map(v => Number(v.net_revenue || 0));
    const opCostData = list.map(v => Number(v.operational_cost || 0));

    if (roiCanvas) {
        if (analyticsROIChartInstance) analyticsROIChartInstance.destroy();
        const ctx = roiCanvas.getContext('2d');
        analyticsROIChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Net Revenue ($)',
                        data: revData,
                        backgroundColor: '#10b981',
                        borderRadius: 4
                    },
                    {
                        label: 'Operational Cost ($)',
                        data: opCostData,
                        backgroundColor: '#f43f5e',
                        borderRadius: 4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                    y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } }
                },
                plugins: {
                    legend: { labels: { color: '#f8fafc' } }
                }
            }
        });
    }

    if (effCanvas) {
        if (analyticsEfficiencyChartInstance) analyticsEfficiencyChartInstance.destroy();
        const ctx = effCanvas.getContext('2d');
        const efficiencyData = list.map(v => Number(v.fuel_efficiency || 0));
        const costPerKmData = list.map(v => Number(v.cost_per_km || 0));

        analyticsEfficiencyChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Fuel Efficiency (KM/L)',
                        data: efficiencyData,
                        borderColor: '#38bdf8',
                        backgroundColor: 'rgba(56, 189, 248, 0.15)',
                        fill: true,
                        tension: 0.3
                    },
                    {
                        label: 'Cost per KM ($/KM)',
                        data: costPerKmData,
                        borderColor: '#f59e0b',
                        backgroundColor: 'transparent',
                        borderDash: [5, 5],
                        tension: 0.3
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                    y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } }
                },
                plugins: {
                    legend: { labels: { color: '#f8fafc' } }
                }
            }
        });
    }
}

function switchAnalyticsTab(tab) {
    activeAnalyticsTab = tab;
    const btnCards = document.getElementById('btnAnalyticsCardsToggle');
    const btnTable = document.getElementById('btnAnalyticsTableToggle');
    const contCards = document.getElementById('analyticsCardsView');
    const contTable = document.getElementById('analyticsTableView');

    if (btnCards) btnCards.classList.toggle('active', tab === 'cards');
    if (btnTable) btnTable.classList.toggle('active', tab === 'table');
    if (contCards) contCards.style.display = tab === 'cards' ? 'block' : 'none';
    if (contTable) contTable.style.display = tab === 'table' ? 'block' : 'none';
}

function renderAnalyticsCards(list) {
    const container = document.getElementById('analyticsCardsGrid');
    if (!container) return;

    if (!list || list.length === 0) {
        container.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 3rem; background: var(--bg-card); border-radius: var(--radius-lg); border: 1px solid var(--border-color);">No vehicle analytics available.</div>';
        return;
    }

    container.innerHTML = list.map(v => {
        const isHighROI = Number(v.roi) >= 100;
        const roiColor = isHighROI ? '#10b981' : Number(v.roi) >= 0 ? '#38bdf8' : '#f43f5e';

        return `
            <div class="driver-badge-card" style="border-left: 4px solid ${roiColor};">
                <div class="driver-card-header" style="margin-bottom: 0.8rem;">
                    <div>
                        <span style="font-size: 0.76rem; font-weight: 700; letter-spacing: 1px; color: var(--text-muted); text-transform: uppercase;">VEHICLE ROI PERFORMANCE</span>
                        <div style="font-size: 1.18rem; font-weight: 800; color: #fff; margin-top: 2px;">
                            🚚 ${v.registration_number}
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <span style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; display: block;">Calculated ROI</span>
                        <span style="font-size: 1.35rem; font-weight: 800; color: ${roiColor};">${v.roi}%</span>
                    </div>
                </div>

                <div class="driver-card-meta">
                    <div class="driver-meta-item">
                        <span class="driver-meta-label">Total Haul Revenue</span>
                        <span class="driver-meta-value" style="color: #10b981;">$${Number(v.revenue).toLocaleString()}</span>
                    </div>
                    <div class="driver-meta-item">
                        <span class="driver-meta-label">Operational Cost</span>
                        <span class="driver-meta-value" style="color: #f43f5e;">$${Number(v.operationalCost).toLocaleString()}</span>
                    </div>
                    <div class="driver-meta-item">
                        <span class="driver-meta-label">Acquisition Cost</span>
                        <span class="driver-meta-value" style="color: #cbd5e1;">$${Number(v.acquisitionCost).toLocaleString()}</span>
                    </div>
                    <div class="driver-meta-item">
                        <span class="driver-meta-label">Fuel Efficiency</span>
                        <span class="driver-meta-value" style="color: #38bdf8; font-weight: 700;">${v.fuelEfficiency} KM/L</span>
                    </div>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 0.85rem;">
                    <span style="font-size: 0.82rem; color: var(--text-muted);">Net Profit: <strong style="color: #fff;">$${Number(v.netProfit).toLocaleString()}</strong></span>
                    <span style="font-size: 0.8rem; background: rgba(255,255,255,0.06); padding: 3px 8px; border-radius: 4px; font-weight: 600;">${v.model_name} (${v.vehicle_type})</span>
                </div>
            </div>
        `;
    }).join('');
}

function renderAnalyticsTable(list) {
    const tbody = document.getElementById('analyticsTableBody');
    if (!tbody) return;

    if (!list || list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; color: var(--text-muted); padding: 2rem;">No analytical data available.</td></tr>';
        return;
    }

    tbody.innerHTML = list.map(v => {
        const roiColor = Number(v.roi) >= 100 ? '#10b981' : Number(v.roi) >= 0 ? '#38bdf8' : '#f43f5e';
        return `
            <tr>
                <td style="font-family: monospace; color: #38bdf8; font-weight: 800;">${v.registration_number}</td>
                <td style="color: #fff; font-weight: 600;">${v.model_name} (${v.vehicle_type})</td>
                <td>$${Number(v.acquisitionCost).toLocaleString()}</td>
                <td>${Number(v.odometer).toLocaleString()} KM</td>
                <td style="color: #38bdf8; font-weight: 700;">${v.fuelEfficiency} KM/L</td>
                <td style="color: #f43f5e; font-weight: 700;">$${Number(v.operationalCost).toLocaleString()}</td>
                <td style="color: #10b981; font-weight: 700;">$${Number(v.revenue).toLocaleString()}</td>
                <td style="font-weight: 700; color: #fff;">$${Number(v.netProfit).toLocaleString()}</td>
                <td style="font-weight: 800; color: ${roiColor}; font-size: 1.08rem;">${v.roi}%</td>
            </tr>
        `;
    }).join('');
}

/**
 * 1-Click CSV Export for Fleet Analytics & Vehicle ROI
 */
function exportAnalyticsCSV() {
    if (!analyticsListState || analyticsListState.length === 0) {
        alert('No analytical data to export.');
        return;
    }

    const headers = [
        'Registration Number',
        'Model Name',
        'Vehicle Type',
        'Acquisition Cost ($)',
        'Distance Traveled (KM)',
        'Fuel Consumed (Liters)',
        'Fuel Efficiency (KM/L)',
        'Operational Cost ($)',
        'Revenue ($)',
        'Net Profit ($)',
        'Vehicle ROI (%)'
    ];

    const rows = analyticsListState.map(v => [
        `"${v.registration_number}"`,
        `"${v.model_name}"`,
        `"${v.vehicle_type}"`,
        v.acquisitionCost,
        v.odometer,
        v.totalLiters,
        v.fuelEfficiency,
        v.operationalCost,
        v.revenue,
        v.netProfit,
        v.roi
    ]);

    const csvContent = [
        headers.join(','),
        ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FleetMaster_Analytics_Report_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * 1-Click PDF Executive Report Export / Print
 */
function exportAnalyticsPDF() {
    if (!analyticsListState || analyticsListState.length === 0) {
        alert('No analytical data to export.');
        return;
    }

    const todayStr = new Date().toLocaleDateString();
    let rowsHtml = analyticsListState.map(v => `
        <tr>
            <td style="font-weight:bold;">${v.registration_number}</td>
            <td>${v.model_name} (${v.vehicle_type})</td>
            <td>$${Number(v.acquisitionCost).toLocaleString()}</td>
            <td>${Number(v.odometer).toLocaleString()} KM</td>
            <td>${v.fuelEfficiency} KM/L</td>
            <td>$${Number(v.operationalCost).toLocaleString()}</td>
            <td>$${Number(v.revenue).toLocaleString()}</td>
            <td style="font-weight:bold; color: #0f172a;">$${Number(v.netProfit).toLocaleString()}</td>
            <td style="font-weight:bold; color: #047857;">${v.roi}%</td>
        </tr>
    `).join('');

    const win = window.open('', '_blank');
    win.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>FleetMaster Pro — Executive Analytics Report</title>
            <style>
                body { font-family: 'Segoe UI', Arial, sans-serif; padding: 30px; color: #1e293b; }
                h1 { margin-bottom: 5px; color: #0f172a; }
                .subtitle { color: #64748b; font-size: 14px; margin-bottom: 25px; }
                table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                th, td { border: 1px solid #e2e8f0; padding: 10px; text-align: left; font-size: 13px; }
                th { background-color: #f8fafc; color: #334155; font-weight: 700; text-transform: uppercase; }
                .kpi-row { display: flex; gap: 20px; margin-bottom: 25px; }
                .kpi-box { flex: 1; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; background: #f8fafc; }
                .kpi-label { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: bold; }
                .kpi-val { font-size: 22px; font-weight: 800; color: #0f172a; margin-top: 5px; }
            </style>
        </head>
        <body>
            <h1>FleetMaster Pro — Executive Analytics & ROI Report</h1>
            <div class="subtitle">Generated on ${todayStr} | Confidential Fleet Financial & Operational Analysis</div>

            <div class="kpi-row">
                <div class="kpi-box">
                    <div class="kpi-label">Fleet Utilization</div>
                    <div class="kpi-val">${document.getElementById('aKpiUtil')?.textContent || '50%'}</div>
                </div>
                <div class="kpi-box">
                    <div class="kpi-label">Avg Fuel Efficiency</div>
                    <div class="kpi-val">${document.getElementById('aKpiEfficiency')?.textContent || '0 KM/L'}</div>
                </div>
                <div class="kpi-box">
                    <div class="kpi-label">Total Operational Cost</div>
                    <div class="kpi-val">${document.getElementById('aKpiOpCost')?.textContent || '$0'}</div>
                </div>
                <div class="kpi-box">
                    <div class="kpi-label">Fleet Average ROI</div>
                    <div class="kpi-val">${document.getElementById('aKpiROI')?.textContent || '0%'}</div>
                </div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th>REGISTRATION</th>
                        <th>MODEL & TYPE</th>
                        <th>ACQUISITION COST</th>
                        <th>DISTANCE</th>
                        <th>EFFICIENCY</th>
                        <th>OP COST</th>
                        <th>REVENUE</th>
                        <th>NET PROFIT</th>
                        <th>ROI (%)</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHtml}
                </tbody>
            </table>
            <script>
                window.onload = function() { window.print(); };
            </script>
        </body>
        </html>
    `);
    win.document.close();
}

