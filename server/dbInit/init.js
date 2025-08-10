const initDB = require('../db');
const ensureAppUserTable = require('./schemas/userSchema');
const ensureContactsTable = require('./schemas/contactSchema');
const ensureGroupsTable = require('./schemas/groupSchema');
const ensureNotesTable = require('./schemas/notesSchema');
const ensureCustomAttributesTables = require('./schemas/customAttributesSchema');

/**
 * Initialize all database schemas and tables
 * This function should be called during application startup or deployment
 */
const initializeDatabase = async () => {
    const startTime = Date.now();
    console.log('🚀 Starting database initialization...');
    
    try {
        // Test database connection first
        console.log('📡 Testing database connection...');
        const pool = await initDB();
        
        // Test the connection with a simple query
        try {
            await pool.execute('SELECT 1');
            console.log('✅ Database connection successful');
        } catch (connectionError) {
            console.error('❌ Database connection failed:', connectionError.message);
            throw new Error('Failed to connect to database');
        }

        // Initialize schemas in dependency order
        console.log('📋 Initializing database schemas...');
        
        console.log('  └── Creating user tables...');
        await ensureAppUserTable();
        console.log('  ✅ User schema initialized');

        console.log('  └── Creating contacts tables...');
        await ensureContactsTable();
        console.log('  ✅ Contacts schema initialized');

        console.log('  └── Creating groups tables...');
        await ensureGroupsTable();
        console.log('  ✅ Groups schema initialized');

        console.log('  └── Creating notes tables...');
        await ensureNotesTable();
        console.log('  ✅ Notes schema initialized');

    console.log('  └── Creating custom attributes tables...');
    await ensureCustomAttributesTables();
    console.log('  ✅ Custom attributes schema initialized');

        const endTime = Date.now();
        const duration = endTime - startTime;
        
        console.log(`🎉 Database initialization completed successfully in ${duration}ms`);
        console.log('📊 Database is ready for application use');
        
        return {
            success: true,
            duration,
            message: 'Database initialization completed successfully'
        };

    } catch (error) {
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        console.error('💥 Database initialization failed:');
        console.error(`   Error: ${error.message}`);
        console.error(`   Duration: ${duration}ms`);
        console.error(`   Stack: ${error.stack}`);
        
        return {
            success: false,
            duration,
            error: error.message,
            message: 'Database initialization failed'
        };
    }
};

/**
 * Verify database schema integrity
 * Checks if all required tables exist and are properly configured
 */
const verifyDatabaseSchema = async () => {
    console.log('🔍 Verifying database schema integrity...');
    
    try {
        const pool = await initDB();
        
        // Check if all required tables exist
    const requiredTables = ['app_user', 'contacts', 'contact_tags', 'contact_tag_mapping', 'groups', 'group_members', 'notes', 'note_keywords', 'custom_attributes', 'contact_attribute_values'];
        const existingTables = [];
        
        for (const tableName of requiredTables) {
            try {
                const [result] = await pool.query(`
                    SELECT COUNT(*) as count 
                    FROM information_schema.tables 
                    WHERE table_schema = DATABASE() 
                    AND table_name = ?
                `, [tableName]);
                
                if (result[0].count > 0) {
                    existingTables.push(tableName);
                    console.log(`  ✅ Table '${tableName}' exists`);
                } else {
                    console.log(`  ❌ Table '${tableName}' missing`);
                }
            } catch (error) {
                console.log(`  ❌ Error checking table '${tableName}': ${error.message}`);
            }
        }
        
        const missingTables = requiredTables.filter(table => !existingTables.includes(table));
        
        if (missingTables.length === 0) {
            console.log('✅ All required tables exist');
            return {
                success: true,
                existingTables,
                missingTables: [],
                message: 'Database schema verification passed'
            };
        } else {
            console.log(`❌ Missing tables: ${missingTables.join(', ')}`);
            return {
                success: false,
                existingTables,
                missingTables,
                message: `Missing tables: ${missingTables.join(', ')}`
            };
        }
        
    } catch (error) {
        console.error('💥 Schema verification failed:', error.message);
        return {
            success: false,
            error: error.message,
            message: 'Database schema verification failed'
        };
    }
};

/**
 * Get database initialization status and statistics
 */
const getDatabaseStatus = async () => {
    try {
        const pool = await initDB();
        
        // Get database name and version
        const [dbInfo] = await pool.query('SELECT DATABASE() as db_name, VERSION() as db_version');
        
        // Get table list first with explicit column selection
        const [tableList] = await pool.query(`
            SELECT 
                TABLE_NAME as table_name,
                ROUND(((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024), 2) as size_mb
            FROM information_schema.TABLES 
            WHERE TABLE_SCHEMA = DATABASE()
            ORDER BY TABLE_NAME
        `);
        
        // Get actual row counts for each table
        const tableInfo = [];
        for (const table of tableList) {
            try {
                const tableName = table.table_name;
                const [rowCount] = await pool.query(`SELECT COUNT(*) as row_count FROM \`${tableName}\``);
                tableInfo.push({
                    table_name: tableName,
                    table_rows: rowCount[0].row_count,
                    size_mb: table.size_mb || 0.00
                });
            } catch (error) {
                console.warn(`Warning: Could not get row count for table ${table.table_name}:`, error.message);
                tableInfo.push({
                    table_name: table.table_name || 'unknown',
                    table_rows: 'N/A',
                    size_mb: table.size_mb || 0.00
                });
            }
        }
        
        return {
            success: true,
            database: dbInfo[0],
            tables: tableInfo,
            message: 'Database status retrieved successfully'
        };
        
    } catch (error) {
        console.error('Error getting database status:', error.message);
        return {
            success: false,
            error: error.message,
            message: 'Failed to retrieve database status'
        };
    }
};

// Export functions for use in other modules
module.exports = {
    initializeDatabase,
    verifyDatabaseSchema,
    getDatabaseStatus
};

// If this file is run directly, execute database initialization
if (require.main === module) {
    console.log('🎯 Running standalone database initialization...');
    
    initializeDatabase()
        .then((result) => {
            if (result.success) {
                console.log('✅ Standalone initialization completed successfully');
                process.exit(0);
            } else {
                console.error('❌ Standalone initialization failed');
                process.exit(1);
            }
        })
        .catch((error) => {
            console.error('💥 Standalone initialization error:', error);
            process.exit(1);
        });
}
