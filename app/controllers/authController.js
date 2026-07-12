const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'fleetmaster_pro_super_secret_jwt_key_2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Pre-hashed password for "Password123!" using bcrypt (rounds = 10)
const DEFAULT_PASSWORD_HASH = bcrypt.hashSync('Password123!', 10);

// MySQL-backed Auth Controller

/**
 * Helper to generate JWT token
 */
function generateToken(user) {
    return jwt.sign(
        {
            user_id: user.user_id,
            email: user.email,
            full_name: user.full_name,
            role_id: user.role_id,
            role_name: user.role_name
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
}

/**
 * POST /api/auth/login
 * Real-time email and password authentication with RBAC role lookup.
 */
async function login(req, res) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required.'
            });
        }

        let user = null;
        let isMySQLConnected = true;

        try {
            const sql = `
                SELECT u.user_id, u.email, u.password_hash, u.full_name, u.role_id, u.is_active, r.role_name
                FROM users u
                JOIN roles r ON u.role_id = r.role_id
                WHERE LOWER(u.email) = LOWER(?) AND u.is_active = TRUE
                LIMIT 1
            `;
            const rows = await db.query(sql, [email.trim()]);
            if (rows && rows.length > 0) {
                user = rows[0];
            }
        } catch (dbError) {
            console.error('[Auth Login] MySQL Query Failed:', dbError.message);
            return res.status(500).json({
                success: false,
                message: 'Database authentication error: Unable to verify user against MySQL database. Ensure your MySQL server is running and configured.'
            });
        }

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password.'
            });
        }

        // Verify password
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password.'
            });
        }

        const token = generateToken(user);

        return res.status(200).json({
            success: true,
            message: `Welcome back, ${user.full_name}! Authenticated as ${user.role_name}.`,
            token,
            user: {
                user_id: user.user_id,
                email: user.email,
                full_name: user.full_name,
                role_id: user.role_id,
                role_name: user.role_name
            },
            storageMode: 'MySQL Database (fleetmaster_pro)'
        });
    } catch (error) {
        console.error('[Auth Error] Login failure:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error during authentication.'
        });
    }
}

/**
 * POST /api/auth/register
 * Register a new user with bcrypt password hashing and assigned RBAC role.
 */
async function register(req, res) {
    try {
        const { email, password, full_name, role_id } = req.body;

        if (!email || !password || !full_name || !role_id) {
            return res.status(400).json({
                success: false,
                message: 'All fields (email, password, full_name, role_id) are required.'
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        try {
            // Ensure email isn't already taken
            const existing = await db.query('SELECT user_id FROM users WHERE email = ?', [email.trim()]);
            if (existing.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: 'An account with this email already exists.'
                });
            }

            const result = await db.query(
                `INSERT INTO users (email, password_hash, full_name, role_id, is_active)
                 VALUES (?, ?, ?, ?, TRUE)`,
                [email.trim(), hashedPassword, full_name.trim(), role_id]
            );

            // Fetch created user with role name
            const rows = await db.query(
                `SELECT u.user_id, u.email, u.full_name, u.role_id, r.role_name
                 FROM users u JOIN roles r ON u.role_id = r.role_id
                 WHERE u.user_id = ?`,
                [result.insertId]
            );

            const newUser = rows[0];
            const token = generateToken(newUser);

            if (Number(newUser.role_id) === 2) {
                const { syncDriverUsers } = require('./driversController');
                syncDriverUsers().catch(() => {});
            }

            return res.status(201).json({
                success: true,
                message: 'Registration successful!',
                token,
                user: newUser
            });
        } catch (dbError) {
            console.error('[Register] MySQL Error:', dbError.message);
            return res.status(500).json({
                success: false,
                message: 'Database error during registration: Ensure MySQL server is running and accessible.'
            });
        }
    } catch (error) {
        console.error('[Register Error]', error);
        return res.status(500).json({
            success: false,
            message: 'Server error during registration.'
        });
    }
}

/**
 * GET /api/auth/me
 * Returns current authenticated user and RBAC permissions.
 */
async function getMe(req, res) {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Not authenticated.'
        });
    }

    return res.status(200).json({
        success: true,
        user: req.user,
        permissions: getPermissionsForRole(req.user.role_name)
    });
}

/**
 * GET /api/auth/roles
 * Returns available system roles for RBAC.
 */
async function getRoles(req, res) {
    try {
        const roles = await db.query('SELECT role_id, role_name, description FROM roles ORDER BY role_id ASC');
        return res.status(200).json({ success: true, roles });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Database error: Unable to retrieve roles from MySQL database.'
        });
    }
}

/**
 * POST /api/auth/seed
 * Seeds clean bcrypt hashes ("Password123!") for the default RBAC test accounts into MySQL database.
 */
async function seedUsers(req, res) {
    try {
        const hashedPassword = await bcrypt.hash('Password123!', 10);
        const testUsers = [
            { id: 1, email: 'manager@fleetmaster.pro', name: 'Sarah Jenkins', role: 1 },
            { id: 2, email: 'alex@fleetmaster.pro', name: 'Alex Rivera', role: 2 },
            { id: 3, email: 'safety@fleetmaster.pro', name: 'Marcus Vance', role: 3 },
            { id: 4, email: 'finance@fleetmaster.pro', name: 'Elena Rostova', role: 4 }
        ];

        for (const u of testUsers) {
            await db.query(
                `INSERT INTO users (user_id, email, password_hash, full_name, role_id, is_active)
                 VALUES (?, ?, ?, ?, ?, TRUE)
                 ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), full_name = VALUES(full_name)`,
                [u.id, u.email, hashedPassword, u.name, u.role]
            );
        }

        return res.status(200).json({
            success: true,
            message: 'Seeded default RBAC test accounts in MySQL with password: Password123!'
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to seed MySQL users: ' + error.message
        });
    }
}

/**
 * Returns role-specific permission capabilities
 */
function getPermissionsForRole(roleName) {
    const permissions = {
        'Fleet Manager': [
            'view_dashboard',
            'manage_vehicles',
            'manage_drivers',
            'dispatch_trips',
            'view_financials',
            'manage_users'
        ],
        'Driver': [
            'view_assigned_trips',
            'log_trip_distance',
            'report_vehicle_issue',
            'view_own_safety_score'
        ],
        'Safety Officer': [
            'view_safety_dashboard',
            'manage_safety_scores',
            'view_driver_licenses',
            'flag_high_risk_drivers'
        ],
        'Financial Analyst': [
            'view_revenue_reports',
            'view_maintenance_costs',
            'export_financial_analytics',
            'view_roi_metrics'
        ]
    };

    return permissions[roleName] || [];
}

module.exports = {
    login,
    register,
    getMe,
    getRoles,
    seedUsers,
    getPermissionsForRole
};
