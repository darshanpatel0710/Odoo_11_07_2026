/**
 * Master Registry Controller
 * Handles CRUD & Backend Validation for:
 * 1. Vehicle Types
 * 2. Regions
 * 3. Expense Types
 */

// 1. VEHICLE TYPES
let vehicleTypesList = [
    { type_id: 1, type_name: 'Truck', description: 'Heavy commercial freight carrier (10T - 30T)', default_capacity: 18000 },
    { type_id: 2, type_name: 'Van', description: 'Medium last-mile delivery cargo van', default_capacity: 1500 },
    { type_id: 3, type_name: 'Car', description: 'Executive sedan & courier transport vehicle', default_capacity: 500 },
    { type_id: 4, type_name: 'Trailer', description: 'Flatbed articulated freight trailer', default_capacity: 28000 },
    { type_id: 5, type_name: 'Bus', description: 'Staff & personnel passenger coach', default_capacity: 2200 }
];
let nextTypeId = 6;

// 2. REGIONS
let regionsList = [
    { region_id: 1, region_name: 'North Region', code: 'NR-DL', headquarters: 'New Delhi Hub' },
    { region_id: 2, region_name: 'South Region', code: 'SR-TN', headquarters: 'Chennai Depot' },
    { region_id: 3, region_name: 'West Region', code: 'WR-GJ', headquarters: 'Ahmedabad Central Hub' },
    { region_id: 4, region_name: 'East Region', code: 'ER-WB', headquarters: 'Kolkata Transit Center' }
];
let nextRegionId = 5;

// 3. EXPENSE TYPES
let expenseTypesList = [
    { expense_type_id: 1, category_name: 'Fuel Expense', description: 'Diesel, petrol & highway refueling', is_tax_deductible: true },
    { expense_type_id: 2, category_name: 'Highway Tolls & Permits', description: 'FASTag electronic tolls and inter-state permit fees', is_tax_deductible: true },
    { expense_type_id: 3, category_name: 'Routine Maintenance', description: 'Oil change, tire rotation & brake service', is_tax_deductible: true },
    { expense_type_id: 4, category_name: 'Emergency Repair', description: 'On-road breakdown assistance & towing', is_tax_deductible: true },
    { expense_type_id: 5, category_name: 'Vehicle Insurance & Tax', description: 'Annual commercial insurance policy renewal', is_tax_deductible: true }
];
let nextExpenseTypeId = 6;

/**
 * ==========================================
 * VEHICLE TYPES CRUD
 * ==========================================
 */
function getVehicleTypes(req, res) {
    const { search } = req.query;
    let list = [...vehicleTypesList];
    if (search) {
        const q = search.toLowerCase();
        list = list.filter(t => t.type_name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q));
    }
    res.json({ success: true, count: list.length, items: list });
}

function createVehicleType(req, res) {
    const { type_name, description = '', default_capacity = 1000 } = req.body;
    if (!type_name || !type_name.trim()) {
        return res.status(400).json({ success: false, message: 'Vehicle Type Name is required.' });
    }
    const cleanName = type_name.trim();
    if (vehicleTypesList.some(t => t.type_name.toLowerCase() === cleanName.toLowerCase())) {
        return res.status(400).json({ success: false, message: `Vehicle Type '${cleanName}' already exists.` });
    }

    const newItem = {
        type_id: nextTypeId++,
        type_name: cleanName,
        description: description.trim(),
        default_capacity: Number(default_capacity) || 1000
    };
    vehicleTypesList.push(newItem);
    return res.status(201).json({ success: true, message: 'Vehicle Type created successfully.', item: newItem });
}

function updateVehicleType(req, res) {
    const id = Number(req.params.id);
    const idx = vehicleTypesList.findIndex(t => t.type_id === id);
    if (idx === -1) return res.status(404).json({ success: false, message: 'Vehicle Type not found.' });

    const { type_name, description, default_capacity } = req.body;
    if (type_name && !type_name.trim()) {
        return res.status(400).json({ success: false, message: 'Type Name cannot be empty.' });
    }

    vehicleTypesList[idx] = {
        ...vehicleTypesList[idx],
        type_name: type_name ? type_name.trim() : vehicleTypesList[idx].type_name,
        description: description !== undefined ? description.trim() : vehicleTypesList[idx].description,
        default_capacity: default_capacity !== undefined ? Number(default_capacity) : vehicleTypesList[idx].default_capacity
    };
    return res.json({ success: true, message: 'Vehicle Type updated.', item: vehicleTypesList[idx] });
}

function deleteVehicleType(req, res) {
    const id = Number(req.params.id);
    const idx = vehicleTypesList.findIndex(t => t.type_id === id);
    if (idx === -1) return res.status(404).json({ success: false, message: 'Vehicle Type not found.' });
    const deleted = vehicleTypesList.splice(idx, 1)[0];
    return res.json({ success: true, message: `Vehicle Type '${deleted.type_name}' deleted.` });
}

/**
 * ==========================================
 * REGIONS CRUD
 * ==========================================
 */
function getRegions(req, res) {
    const { search } = req.query;
    let list = [...regionsList];
    if (search) {
        const q = search.toLowerCase();
        list = list.filter(r => r.region_name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q));
    }
    res.json({ success: true, count: list.length, items: list });
}

function createRegion(req, res) {
    const { region_name, code, headquarters = '' } = req.body;
    if (!region_name || !region_name.trim()) {
        return res.status(400).json({ success: false, message: 'Region Name is required.' });
    }
    if (!code || !code.trim()) {
        return res.status(400).json({ success: false, message: 'Region Code is required.' });
    }

    const newItem = {
        region_id: nextRegionId++,
        region_name: region_name.trim(),
        code: code.trim().toUpperCase(),
        headquarters: headquarters.trim()
    };
    regionsList.push(newItem);
    return res.status(201).json({ success: true, message: 'Region created successfully.', item: newItem });
}

function updateRegion(req, res) {
    const id = Number(req.params.id);
    const idx = regionsList.findIndex(r => r.region_id === id);
    if (idx === -1) return res.status(404).json({ success: false, message: 'Region not found.' });

    const { region_name, code, headquarters } = req.body;
    regionsList[idx] = {
        ...regionsList[idx],
        region_name: region_name ? region_name.trim() : regionsList[idx].region_name,
        code: code ? code.trim().toUpperCase() : regionsList[idx].code,
        headquarters: headquarters !== undefined ? headquarters.trim() : regionsList[idx].headquarters
    };
    return res.json({ success: true, message: 'Region updated.', item: regionsList[idx] });
}

function deleteRegion(req, res) {
    const id = Number(req.params.id);
    const idx = regionsList.findIndex(r => r.region_id === id);
    if (idx === -1) return res.status(404).json({ success: false, message: 'Region not found.' });
    const deleted = regionsList.splice(idx, 1)[0];
    return res.json({ success: true, message: `Region '${deleted.region_name}' deleted.` });
}

/**
 * ==========================================
 * EXPENSE TYPES CRUD
 * ==========================================
 */
function getExpenseTypes(req, res) {
    const { search } = req.query;
    let list = [...expenseTypesList];
    if (search) {
        const q = search.toLowerCase();
        list = list.filter(e => e.category_name.toLowerCase().includes(q));
    }
    res.json({ success: true, count: list.length, items: list });
}

function createExpenseType(req, res) {
    const { category_name, description = '', is_tax_deductible = true } = req.body;
    if (!category_name || !category_name.trim()) {
        return res.status(400).json({ success: false, message: 'Expense Category Name is required.' });
    }

    const newItem = {
        expense_type_id: nextExpenseTypeId++,
        category_name: category_name.trim(),
        description: description.trim(),
        is_tax_deductible: Boolean(is_tax_deductible)
    };
    expenseTypesList.push(newItem);
    return res.status(201).json({ success: true, message: 'Expense Type created successfully.', item: newItem });
}

function updateExpenseType(req, res) {
    const id = Number(req.params.id);
    const idx = expenseTypesList.findIndex(e => e.expense_type_id === id);
    if (idx === -1) return res.status(404).json({ success: false, message: 'Expense Type not found.' });

    const { category_name, description, is_tax_deductible } = req.body;
    expenseTypesList[idx] = {
        ...expenseTypesList[idx],
        category_name: category_name ? category_name.trim() : expenseTypesList[idx].category_name,
        description: description !== undefined ? description.trim() : expenseTypesList[idx].description,
        is_tax_deductible: is_tax_deductible !== undefined ? Boolean(is_tax_deductible) : expenseTypesList[idx].is_tax_deductible
    };
    return res.json({ success: true, message: 'Expense Type updated.', item: expenseTypesList[idx] });
}

function deleteExpenseType(req, res) {
    const id = Number(req.params.id);
    const idx = expenseTypesList.findIndex(e => e.expense_type_id === id);
    if (idx === -1) return res.status(404).json({ success: false, message: 'Expense Type not found.' });
    const deleted = expenseTypesList.splice(idx, 1)[0];
    return res.json({ success: true, message: `Expense Type '${deleted.category_name}' deleted.` });
}

module.exports = {
    getVehicleTypes,
    createVehicleType,
    updateVehicleType,
    deleteVehicleType,

    getRegions,
    createRegion,
    updateRegion,
    deleteRegion,

    getExpenseTypes,
    createExpenseType,
    updateExpenseType,
    deleteExpenseType
};
