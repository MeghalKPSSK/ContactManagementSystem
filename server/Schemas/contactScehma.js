const initDB = require('../db');

const ensureContactsTable = async () => {
    const pool = await initDB(); // Assuming initDB returns a MySQL2 connection pool

    try {
        // Check if table exists
        const [rows] = await pool.query(`
            SELECT COUNT(*) as count 
            FROM information_schema.tables 
            WHERE table_schema = DATABASE() 
            AND table_name = 'contacts'
        `);

        const tableExists = rows[0].count > 0;

        if (!tableExists) {
            // Create table using SQL
            await pool.query(`
                CREATE TABLE contacts (
                    pk_id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT NOT NULL,
                    firstName VARCHAR(50) NOT NULL,
                    lastName VARCHAR(50),
                    email VARCHAR(100),
                    phone VARCHAR(20),
                    mobile VARCHAR(20),
                    alt_phone VARCHAR(20),
                    address_line TEXT,
                    city VARCHAR(50),
                    state VARCHAR(50),
                    postal_code VARCHAR(20),
                    country VARCHAR(50),
                    company VARCHAR(100),
                    is_favorite BOOLEAN DEFAULT FALSE,
                    job_title VARCHAR(100),
                    notes TEXT,
                    status ENUM('Active', 'Inactive') DEFAULT 'Active',
                    is_deleted BOOLEAN DEFAULT FALSE,
                    createdOn DATETIME DEFAULT CURRENT_TIMESTAMP,
                    modifiedOn DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES app_user(pk_id) ON DELETE CASCADE,
                    INDEX idx_user_id (user_id),
                    INDEX idx_firstName (firstName),
                    INDEX idx_lastName (lastName),
                    INDEX idx_email (email),
                    INDEX idx_mobile (mobile),
                    INDEX idx_favorite (is_favorite),
                    INDEX idx_name_combined (firstName, lastName)
                )
            `);
            console.log('contacts table created successfully.');
            return 1;
        } else {
            console.log('contacts table already exists.');
            return 0;
        }
    } catch (error) {
        console.error('Error ensuring contacts table:', error);
        throw error;
    }
};

module.exports = ensureContactsTable;
