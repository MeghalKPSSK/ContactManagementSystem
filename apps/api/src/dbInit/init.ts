import { prisma } from '../lib/prisma';
import initFunctions from '../../prisma/init-functions';
import ensureAppUserTable from './schemas/userSchema';
import ensureContactsTable from './schemas/contactSchema';
import ensureGroupsTable from './schemas/groupSchema';
import ensureNotesTable from './schemas/notesSchema';
import ensureCustomAttributesTables from './schemas/customAttributesSchema';

export interface InitResult {
  success: boolean;
  duration: number;
  message: string;
  error?: string;
}

export interface VerifyResult {
  success: boolean;
  existingTables: string[];
  missingTables: string[];
  message: string;
  error?: string;
}

export interface TableStat {
  table_name: string;
  table_rows: number | string;
  size_mb: number;
}

export interface StatusResult {
  success: boolean;
  database?: { db_name: string; db_version: string };
  tables?: TableStat[];
  message: string;
  error?: string;
}

/**
 * Initialize all database schemas, tables and stored functions
 */
export const initializeDatabase = async (): Promise<InitResult> => {
  const startTime = Date.now();
  console.log('🚀 Starting database initialization...');

  try {
    console.log('📡 Testing Prisma database connection...');
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database connection successful');

    console.log('📋 Initializing database schemas...');

    console.log('  └── Ensuring user tables...');
    await ensureAppUserTable();

    console.log('  └── Ensuring contacts tables...');
    await ensureContactsTable();

    console.log('  └── Ensuring groups tables...');
    await ensureGroupsTable();

    console.log('  └── Ensuring notes tables...');
    await ensureNotesTable();

    console.log('  └── Ensuring custom attributes tables...');
    await ensureCustomAttributesTables();

    console.log('  └── Initializing stored functions (encryptId / decryptId)...');
    await initFunctions();

    const duration = Date.now() - startTime;

    console.log(`🎉 Database initialization completed successfully in ${duration}ms`);
    return { success: true, duration, message: 'Database initialization completed successfully' };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.error('💥 Database initialization failed:');
    console.error(`   Error: ${errorMessage}`);

    return { success: false, duration, error: errorMessage, message: 'Database initialization failed' };
  }
};

/**
 * Verify database schema integrity
 */
export const verifyDatabaseSchema = async (): Promise<VerifyResult> => {
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
    const existingTables: string[] = [];

    for (const tableName of requiredTables) {
      try {
        const result = await prisma.$queryRawUnsafe<Array<{ count: bigint | number }>>(`
                    SELECT COUNT(*) as count 
                    FROM information_schema.tables 
                    WHERE table_schema = DATABASE() 
                    AND table_name = '${tableName}'
                `);

        const count = Number(result[0]?.count || 0);
        if (count > 0) {
          existingTables.push(tableName);
          console.log(`  ✅ Table '${tableName}' exists`);
        } else {
          console.log(`  ❌ Table '${tableName}' missing`);
        }
      } catch (error) {
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
  } catch (error) {
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

/**
 * Get database initialization status and statistics
 */
export const getDatabaseStatus = async (): Promise<StatusResult> => {
  try {
    const dbInfo = await prisma.$queryRawUnsafe<Array<{ db_name: string; db_version: string }>>(
      'SELECT DATABASE() as db_name, VERSION() as db_version'
    );

    const tableList = await prisma.$queryRawUnsafe<Array<{ table_name: string; size_mb: number }>>(`
            SELECT 
                TABLE_NAME as table_name,
                ROUND(((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024), 2) as size_mb
            FROM information_schema.TABLES 
            WHERE TABLE_SCHEMA = DATABASE()
            ORDER BY TABLE_NAME
        `);

    const tableInfo: TableStat[] = [];
    for (const table of tableList) {
      try {
        const tableName = table.table_name;
        const rowCount = await prisma.$queryRawUnsafe<Array<{ row_count: bigint | number }>>(
          `SELECT COUNT(*) as row_count FROM \`${tableName}\``
        );
        tableInfo.push({
          table_name: tableName,
          table_rows: Number(rowCount[0]?.row_count || 0),
          size_mb: table.size_mb || 0.0,
        });
      } catch {
        tableInfo.push({ table_name: table.table_name || 'unknown', table_rows: 'N/A', size_mb: table.size_mb || 0.0 });
      }
    }

    return { success: true, database: dbInfo[0], tables: tableInfo, message: 'Database status retrieved successfully' };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('Error getting database status:', errMsg);
    return { success: false, error: errMsg, message: 'Failed to retrieve database status' };
  }
};

if (require.main === module) {
  initializeDatabase()
    .then((result) => {
      process.exit(result.success ? 0 : 1);
    })
    .catch(() => {
      process.exit(1);
    });
}
