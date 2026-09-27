"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDatabaseStatus = exports.verifyDatabaseSchema = exports.initializeDatabase = void 0;
const prisma_1 = require("../lib/prisma");
const init_functions_1 = __importDefault(require("../../prisma/init-functions"));
const userSchema_1 = __importDefault(require("./schemas/userSchema"));
const contactSchema_1 = __importDefault(require("./schemas/contactSchema"));
const groupSchema_1 = __importDefault(require("./schemas/groupSchema"));
const notesSchema_1 = __importDefault(require("./schemas/notesSchema"));
const customAttributesSchema_1 = __importDefault(require("./schemas/customAttributesSchema"));
/**
 * Initialize all database schemas, tables and stored functions
 */
const initializeDatabase = async () => {
    const startTime = Date.now();
    console.log('🚀 Starting database initialization...');
    try {
        console.log('📡 Testing Prisma database connection...');
        await prisma_1.prisma.$connect();
        await prisma_1.prisma.$queryRaw `SELECT 1`;
        console.log('✅ Database connection successful');
        console.log('📋 Initializing database schemas...');
        console.log('  └── Ensuring user tables...');
        await (0, userSchema_1.default)();
        console.log('  └── Ensuring contacts tables...');
        await (0, contactSchema_1.default)();
        console.log('  └── Ensuring groups tables...');
        await (0, groupSchema_1.default)();
        console.log('  └── Ensuring notes tables...');
        await (0, notesSchema_1.default)();
        console.log('  └── Ensuring custom attributes tables...');
        await (0, customAttributesSchema_1.default)();
        console.log('  └── Initializing stored functions (encryptId / decryptId)...');
        await (0, init_functions_1.default)();
        const duration = Date.now() - startTime;
        console.log(`🎉 Database initialization completed successfully in ${duration}ms`);
        return { success: true, duration, message: 'Database initialization completed successfully' };
    }
    catch (error) {
        const duration = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('💥 Database initialization failed:');
        console.error(`   Error: ${errorMessage}`);
        return { success: false, duration, error: errorMessage, message: 'Database initialization failed' };
    }
};
exports.initializeDatabase = initializeDatabase;
/**
 * Verify database schema integrity
 */
const verifyDatabaseSchema = async () => {
    console.log('🔍 Verifying database schema integrity...');
    try {
        const requiredTables = [
            'app_user',
            'contacts',
            'contact_tags',
            'contact_tag_mapping',
            'groups',
            'group_members',
            'notes',
            'note_keywords',
            'custom_attributes',
            'contact_attribute_values',
        ];
        const existingTables = [];
        for (const tableName of requiredTables) {
            try {
                const result = await prisma_1.prisma.$queryRawUnsafe(`
                    SELECT COUNT(*) as count 
                    FROM information_schema.tables 
                    WHERE table_schema = DATABASE() 
                    AND table_name = '${tableName}'
                `);
                const count = Number(result[0]?.count || 0);
                if (count > 0) {
                    existingTables.push(tableName);
                    console.log(`  ✅ Table '${tableName}' exists`);
                }
                else {
                    console.log(`  ❌ Table '${tableName}' missing`);
                }
            }
            catch (error) {
                console.log(`  ❌ Error checking table '${tableName}': ${error instanceof Error ? error.message : error}`);
            }
        }
        const missingTables = requiredTables.filter((table) => !existingTables.includes(table));
        if (missingTables.length === 0) {
            console.log('✅ All required tables exist');
            return { success: true, existingTables, missingTables: [], message: 'Database schema verification passed' };
        }
        console.log(`❌ Missing tables: ${missingTables.join(', ')}`);
        return {
            success: false,
            existingTables,
            missingTables,
            message: `Missing tables: ${missingTables.join(', ')}`,
        };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('💥 Schema verification failed:', message);
        return {
            success: false,
            existingTables: [],
            missingTables: [],
            error: message,
            message: 'Database schema verification failed',
        };
    }
};
exports.verifyDatabaseSchema = verifyDatabaseSchema;
/**
 * Get database initialization status and statistics
 */
const getDatabaseStatus = async () => {
    try {
        const dbInfo = await prisma_1.prisma.$queryRawUnsafe('SELECT DATABASE() as db_name, VERSION() as db_version');
        const tableList = await prisma_1.prisma.$queryRawUnsafe(`
            SELECT 
                TABLE_NAME as table_name,
                ROUND(((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024), 2) as size_mb
            FROM information_schema.TABLES 
            WHERE TABLE_SCHEMA = DATABASE()
            ORDER BY TABLE_NAME
        `);
        const tableInfo = [];
        for (const table of tableList) {
            try {
                const tableName = table.table_name;
                const rowCount = await prisma_1.prisma.$queryRawUnsafe(`SELECT COUNT(*) as row_count FROM \`${tableName}\``);
                tableInfo.push({
                    table_name: tableName,
                    table_rows: Number(rowCount[0]?.row_count || 0),
                    size_mb: table.size_mb || 0.0,
                });
            }
            catch {
                tableInfo.push({ table_name: table.table_name || 'unknown', table_rows: 'N/A', size_mb: table.size_mb || 0.0 });
            }
        }
        return { success: true, database: dbInfo[0], tables: tableInfo, message: 'Database status retrieved successfully' };
    }
    catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        console.error('Error getting database status:', errMsg);
        return { success: false, error: errMsg, message: 'Failed to retrieve database status' };
    }
};
exports.getDatabaseStatus = getDatabaseStatus;
if (require.main === module) {
    (0, exports.initializeDatabase)()
        .then((result) => {
        process.exit(result.success ? 0 : 1);
    })
        .catch(() => {
        process.exit(1);
    });
}
//# sourceMappingURL=init.js.map