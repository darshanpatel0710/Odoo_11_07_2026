const mysql = require('mysql2/promise');
require('dotenv').config();

/**
 * MySQL Database Connection Pool Configuration
 * Connected to `fleetmaster_pro` database for real-time authentication and RBAC.
 */
const poolConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Bhumi@171006',
    database: process.env.DB_NAME || 'fleetmaster_pro',
    port: Number(process.env.DB_PORT) || 3306,
    waitForConnections: true,
    connectionLimit: 15,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000
};

const pool = mysql.createPool(poolConfig);

/**
 * Test Database Connection on startup
 */
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log(`[MySQL] Successfully connected to MySQL database: '${poolConfig.database}' on ${poolConfig.host}:${poolConfig.port}`);
        connection.release();
        return true;
    } catch (error) {
        console.error('[MySQL Connection Error] Unable to connect to MySQL database:', error.message);
        console.warn('[MySQL Hint] Ensure your local MySQL server is running on port ' + poolConfig.port + ' and database "' + poolConfig.database + '" exists.');
        return false;
    }
}

/**
 * Helper query wrapper with error handling
 * @param {string} sql - SQL query string
 * @param {Array} params - Parameters for prepared statement
 */
async function query(sql, params = []) {
    const [rows, fields] = await pool.execute(sql, params);
    return rows;
}

module.exports = {
    pool,
    testConnection,
    query
};
