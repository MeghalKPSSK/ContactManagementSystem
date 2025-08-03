const initDB = require('../../db');

const ensureNotesTable = async () => {
    console.log('📝 Notes Schema: Starting notes table initialization...');
    const pool = await initDB();

    try {
        console.log('📝 Notes Schema: Creating tables if they don\'t exist...');
        // First create tables if they don't exist
        await createTablesIfNotExist(pool);
        
        console.log('📝 Notes Schema: Validating and updating schema...');
        // Then validate and update schema if needed
        await validateAndUpdateSchema(pool);

        console.log('✅ Notes Schema: Notes table initialization completed successfully');
    } catch (error) {
        console.error('❌ Notes Schema: Error ensuring notes tables:', error.message);
        throw error;
    }
};

const createTablesIfNotExist = async (pool) => {
    console.log('📝 Notes Schema: Creating notes table...');
    // Create notes table
    await pool.query(`
        CREATE TABLE IF NOT EXISTS notes (
            pk_id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            title VARCHAR(255) NOT NULL,
            content TEXT NOT NULL,
            note_type ENUM('personal', 'contact', 'group') DEFAULT 'personal',
            contact_id INT NULL,
            group_id INT NULL,
            color ENUM('pink', 'blue', 'green', 'yellow', 'purple') DEFAULT 'blue',
            is_important BOOLEAN DEFAULT FALSE,
            is_deleted BOOLEAN DEFAULT FALSE,
            createdOn DATETIME DEFAULT CURRENT_TIMESTAMP,
            modifiedOn DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES app_user(pk_id) ON DELETE CASCADE,
            FOREIGN KEY (contact_id) REFERENCES contacts(pk_id) ON DELETE CASCADE,
            FOREIGN KEY (group_id) REFERENCES \`groups\`(pk_id) ON DELETE CASCADE,
            INDEX idx_user_id (user_id),
            INDEX idx_note_type (note_type),
            INDEX idx_contact_id (contact_id),
            INDEX idx_group_id (group_id),
            INDEX idx_is_important (is_important),
            INDEX idx_created_on (createdOn),
            INDEX idx_title (title),
            CONSTRAINT chk_note_reference CHECK (
                (note_type = 'personal' AND contact_id IS NULL AND group_id IS NULL) OR
                (note_type = 'contact' AND contact_id IS NOT NULL AND group_id IS NULL) OR
                (note_type = 'group' AND group_id IS NOT NULL AND contact_id IS NULL)
            )
        )
    `);

    console.log('🏷️ Notes Schema: Creating note_keywords table...');
    // Create note_keywords table for searchable keywords/tags
    await pool.query(`
        CREATE TABLE IF NOT EXISTS note_keywords (
            pk_id INT AUTO_INCREMENT PRIMARY KEY,
            note_id INT NOT NULL,
            keyword VARCHAR(100) NOT NULL,
            createdOn DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (note_id) REFERENCES notes(pk_id) ON DELETE CASCADE,
            INDEX idx_note_id (note_id),
            INDEX idx_keyword (keyword),
            UNIQUE KEY unique_note_keyword (note_id, keyword)
        )
    `);
    console.log('✅ Notes Schema: Tables created successfully');
};

const validateAndUpdateSchema = async (pool) => {
    console.log('🔍 Notes Schema: Validating notes table schema...');
    // Get current schema information for notes table
    const [notesColumns] = await pool.query(`
        SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'notes'
    `);

    console.log(`🔍 Notes Schema: Found ${notesColumns.length} existing columns`);

    // Check and add missing columns for notes table
    const requiredColumns = {
        'is_important': "ALTER TABLE notes ADD COLUMN is_important BOOLEAN DEFAULT FALSE AFTER content",
        'note_type': "ALTER TABLE notes ADD COLUMN note_type ENUM('personal', 'contact', 'group') DEFAULT 'personal' AFTER content",
        'contact_id': "ALTER TABLE notes ADD COLUMN contact_id INT NULL AFTER note_type",
        'group_id': "ALTER TABLE notes ADD COLUMN group_id INT NULL AFTER contact_id",
        'color': "ALTER TABLE notes ADD COLUMN color ENUM('pink', 'blue', 'green', 'yellow', 'purple') DEFAULT 'blue' AFTER group_id"
    };

    const existingColumns = notesColumns.map(col => col.COLUMN_NAME);

    for (const [column, query] of Object.entries(requiredColumns)) {
        if (!existingColumns.includes(column)) {
            try {
                await pool.query(query);
                console.log(`✅ Notes Schema: Added missing column: ${column}`);
            } catch (error) {
                console.error(`❌ Notes Schema: Error adding column ${column}:`, error.message);
            }
        }
    }

    // Check and add missing indexes for notes table
    console.log('🔍 Notes Schema: Checking indexes...');
    const [existingIndexes] = await pool.query(`
        SHOW INDEX FROM notes
    `);

    const requiredIndexes = {
        'idx_note_type': "CREATE INDEX idx_note_type ON notes(note_type)",
        'idx_contact_id': "CREATE INDEX idx_contact_id ON notes(contact_id)",
        'idx_group_id': "CREATE INDEX idx_group_id ON notes(group_id)",
        'idx_is_important': "CREATE INDEX idx_is_important ON notes(is_important)",
        'idx_created_on': "CREATE INDEX idx_created_on ON notes(createdOn)",
        'idx_title': "CREATE INDEX idx_title ON notes(title)"
    };

    const existingIndexNames = existingIndexes.map(idx => idx.Key_name);

    for (const [indexName, query] of Object.entries(requiredIndexes)) {
        if (!existingIndexNames.includes(indexName)) {
            try {
                await pool.query(query);
                console.log(`✅ Notes Schema: Added missing index: ${indexName}`);
            } catch (error) {
                console.error(`❌ Notes Schema: Error adding index ${indexName}:`, error.message);
            }
        }
    }

    // Add foreign key constraints if they don't exist
    console.log('🔗 Notes Schema: Adding foreign key constraints...');
    try {
        await pool.query(`
            ALTER TABLE notes 
            ADD CONSTRAINT fk_notes_contact 
            FOREIGN KEY (contact_id) REFERENCES contacts(pk_id) ON DELETE CASCADE
        `);
        console.log('✅ Notes Schema: Added foreign key constraint for contact_id');
    } catch (error) {
        // Constraint might already exist, ignore error
        console.log('🔗 Notes Schema: Foreign key constraint for contact_id already exists');
    }

    try {
        await pool.query(`
            ALTER TABLE notes 
            ADD CONSTRAINT fk_notes_group 
            FOREIGN KEY (group_id) REFERENCES \`groups\`(pk_id) ON DELETE CASCADE
        `);
        console.log('✅ Notes Schema: Added foreign key constraint for group_id');
    } catch (error) {
        // Constraint might already exist, ignore error
        console.log('🔗 Notes Schema: Foreign key constraint for group_id already exists');
    }

    console.log('✅ Notes Schema: Schema validation and updates for notes table completed.');
};

module.exports = ensureNotesTable;
