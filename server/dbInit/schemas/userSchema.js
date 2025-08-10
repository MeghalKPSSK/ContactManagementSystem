const initDB = require('../../db');

const ensureAppUserTable = async () => {
    const pool = await initDB(); // Assuming initDB returns a MySQL2 connection pool

    try {
        // Check if table exists
        const [rows] = await pool.query(`
            SELECT COUNT(*) as count 
            FROM information_schema.tables 
            WHERE table_schema = DATABASE() 
            AND table_name = 'app_user'
        `);

        const tableExists = rows[0].count > 0;

        if (!tableExists) {
            // Create table using SQL
            await pool.query(`
                CREATE TABLE app_user (
                    pk_id INT AUTO_INCREMENT PRIMARY KEY,
                    username VARCHAR(255) NOT NULL,
                    firstName VARCHAR(255) NOT NULL,
                    lastName VARCHAR(255),
                    phone VARCHAR(255) NOT NULL,
                    email VARCHAR(255) NOT NULL,
                    password VARCHAR(255) NOT NULL,
                    profileImage VARCHAR(500),
                    lastLogin DATETIME,
                    status ENUM('Active', 'Inactive') DEFAULT 'Active',
                    is_deleted BOOLEAN DEFAULT FALSE,
                    registeredOn DATETIME DEFAULT CURRENT_TIMESTAMP,
                    modifiedOn DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    role VARCHAR(50) DEFAULT 'User',
                    plan VARCHAR(20) DEFAULT 'free'
                )
            `);
            console.log('app_user table created successfully.');
            return 1;
        } else {
            console.log('app_user table already exists.');
            
            // Check if profileImage column exists and add it if it doesn't
            const [columns] = await pool.query(`
                SELECT COLUMN_NAME 
                FROM information_schema.COLUMNS 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = 'app_user' 
                AND COLUMN_NAME = 'profileImage'
            `);
            
            if (columns.length === 0) {
                await pool.query(`
                    ALTER TABLE app_user 
                    ADD COLUMN profileImage VARCHAR(500) AFTER password
                `);
                console.log('profileImage column added to app_user table.');
            }
            
            // Ensure 'plan' column exists with a safe default
            const [planCol] = await pool.query(`
                SELECT COLUMN_NAME 
                FROM information_schema.COLUMNS 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = 'app_user' 
                AND COLUMN_NAME = 'plan'
            `);
            if (planCol.length === 0) {
                await pool.query(`
                    ALTER TABLE app_user 
                    ADD COLUMN plan VARCHAR(20) DEFAULT 'free' AFTER role
                `);
                console.log("plan column added to app_user table with default 'free'.");
            }
            
            return 0;
        }
    } catch (error) {
        console.error('Error ensuring app_user table:', error);
        throw error;
    }
};

module.exports = ensureAppUserTable;
