const initDB = require('../db');

const ensureGroupsTable = async () => {
    const pool = await initDB();

    try {
        // First create tables if they don't exist
        await createTablesIfNotExist(pool);
        
        // Then validate and update schema if needed
        await validateAndUpdateSchema(pool);

    } catch (error) {
        console.error('Error ensuring groups tables:', error);
        throw error;
    }
}

const createTablesIfNotExist = async (pool) => {   
    // Create groups table
    await pool.query(`
        CREATE TABLE IF NOT EXISTS groups (
            pk_id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            name VARCHAR(50) NOT NULL,
            description TEXT,
            createdOn DATETIME DEFAULT CURRENT_TIMESTAMP,
            modifiedOn DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES app_user(pk_id) ON DELETE CASCADE,
            INDEX idx_user_id (user_id),
            INDEX idx_name (name)
        )
    `);

    // Create group_members table
    await pool.query(`
        CREATE TABLE IF NOT EXISTS group_members (
            pk_id INT AUTO_INCREMENT PRIMARY KEY,
            group_id INT NOT NULL,
            contact_id INT NOT NULL,
            createdOn DATETIME DEFAULT CURRENT_TIMESTAMP,
            modifiedOn DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (group_id) REFERENCES groups(pk_id) ON DELETE CASCADE,
            FOREIGN KEY (contact_id) REFERENCES contacts(pk_id) ON DELETE CASCADE,
            INDEX idx_group_id (group_id),
            INDEX idx_contact_id (contact_id)
        )
    `);
}

const validateAndUpdateSchema = async (pool) => {  
    const [groupsColumns] = await pool.query(`
        SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'groups'
    `);

    // Check if the groups table exists and has the correct columns
    const [rows] = await pool.query(`
        SELECT COUNT(*) AS count FROM information_schema.COLUMNS 
        WHERE TABLE_NAME = 'groups' AND TABLE_SCHEMA = DATABASE() AND COLUMN_NAME = 'description'
    `);

    if (rows[0].count === 0) {
        // If the column doesn't exist, add it
        await pool.query(`
            ALTER TABLE groups ADD COLUMN description TEXT
        `);
    }
    
    // Check if the group_members table exists and has the correct columns
    const [rows2] = await pool.query(`
        SELECT COUNT(*) AS count FROM information_schema.COLUMNS 
        WHERE TABLE_NAME = 'group_members' AND TABLE_SCHEMA = DATABASE() AND COLUMN_NAME = 'contact_id'
    `);

    if (rows2[0].count === 0) {
        // If the column doesn't exist, add it
        await pool.query(`
            ALTER TABLE group_members ADD COLUMN contact_id INT NOT NULL,
            ADD FOREIGN KEY (contact_id) REFERENCES contacts(pk_id) ON DELETE CASCADE,
            ADD INDEX idx_contact_id (contact_id)
        `);
    }

}