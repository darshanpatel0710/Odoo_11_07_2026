const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'fleetmaster_pro_super_secret_jwt_key_2026';

/**
 * Middleware: Verify JWT Authentication Token
 * Ensures only authenticated users can access protected routes.
 */
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ')
        ? authHeader.slice(7)
        : req.headers['x-access-token'] || req.query.token;

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required. No authentication token provided.'
        });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // { user_id, email, full_name, role_id, role_name }
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired authentication token. Please log in again.'
        });
    }
}

/**
 * Middleware: Role-Based Access Control (RBAC)
 * Restricts route access to users with authorized role(s).
 * @param  {...string} allowedRoles - e.g. 'Fleet Manager', 'Safety Officer'
 */
function requireRole(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required before verifying permissions.'
            });
        }

        const userRole = req.user.role_name;

        // Check if user's role is in the allowedRoles list
        if (!allowedRoles.includes(userRole) && !allowedRoles.includes('*')) {
            return res.status(403).json({
                success: false,
                error: 'RBAC Access Denied',
                message: `Access denied. Your role '${userRole}' does not have permission to access this module. Required role(s): ${allowedRoles.join(', ')}`,
                requiredRoles: allowedRoles,
                currentRole: userRole
            });
        }

        next();
    };
}

module.exports = {
    authenticateToken,
    requireRole
};
