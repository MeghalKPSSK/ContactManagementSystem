#!/usr/bin/env node

/**
 * Standalone Database Initialization Script
 *
 * Usage:
 *   tsx dbInit/standalone.ts [options]
 *
 * Options:
 *   --verify-only    Only verify database schema without initialization
 *   --status         Show database status and statistics
 *   --help           Show this help message
 */

import { initializeDatabase, verifyDatabaseSchema, getDatabaseStatus } from './init';

const args = process.argv.slice(2);
const options = {
  verifyOnly: args.includes('--verify-only'),
  statusOnly: args.includes('--status'),
  help: args.includes('--help'),
};

if (options.help) {
  console.log(`
📚 Database Initialization Script Help

Usage: tsx dbInit/standalone.ts [options]

Options:
  --verify-only     Only verify database schema without initialization
  --status          Show database status and statistics  
  --help            Show this help message

Examples:
  tsx dbInit/standalone.ts                    # Full database initialization
  tsx dbInit/standalone.ts --verify-only     # Only verify schema
  tsx dbInit/standalone.ts --status          # Show database status
    `);
  process.exit(0);
}

async function main(): Promise<void> {
  console.log('🎯 ContactManagementSystem - Database Initialization');
  console.log('================================================');

  try {
    if (options.statusOnly) {
      console.log('📊 Retrieving database status...');
      const statusResult = await getDatabaseStatus();

      if (statusResult.success && statusResult.database && statusResult.tables) {
        console.log('\n📋 Database Information:');
        console.log(`  Database: ${statusResult.database.db_name}`);
        console.log(`  Version: ${statusResult.database.db_version}`);

        console.log('\n📊 Tables:');
        statusResult.tables.forEach((table) => {
          console.log(`  ${table.table_name}: ${table.table_rows} rows (${table.size_mb} MB)`);
        });

        process.exit(0);
      } else {
        console.error('❌ Failed to retrieve database status:', statusResult.message);
        process.exit(1);
      }
    }

    if (options.verifyOnly) {
      console.log('🔍 Verifying database schema...');
      const verifyResult = await verifyDatabaseSchema();

      if (verifyResult.success) {
        console.log('✅ Database schema verification completed successfully');
        console.log(`📋 Found ${verifyResult.existingTables.length} tables`);
        process.exit(0);
      } else {
        console.error('❌ Database schema verification failed:', verifyResult.message);
        if (verifyResult.missingTables.length > 0) {
          console.error(`📋 Missing tables: ${verifyResult.missingTables.join(', ')}`);
        }
        process.exit(1);
      }
    }

    console.log('🚀 Starting full database initialization...');
    const initResult = await initializeDatabase();

    if (initResult.success) {
      console.log('\n✅ Database initialization completed successfully!');
      console.log(`⏱️  Duration: ${initResult.duration}ms`);

      console.log('\n🔍 Performing post-initialization verification...');
      const verifyResult = await verifyDatabaseSchema();

      if (verifyResult.success) {
        console.log('✅ Post-initialization verification passed');
        console.log('\n🎉 Database is ready for application use!');
        process.exit(0);
      } else {
        console.warn('⚠️  Post-initialization verification had issues:', verifyResult.message);
        process.exit(1);
      }
    } else {
      console.error('\n❌ Database initialization failed!');
      console.error(`💥 Error: ${initResult.message}`);
      console.error(`⏱️  Duration: ${initResult.duration}ms`);
      process.exit(1);
    }
  } catch (error) {
    console.error('\n💥 Unexpected error during database initialization:');
    console.error(`   ${error instanceof Error ? error.message : error}`);
    console.error(`   ${error instanceof Error ? error.stack : ''}`);
    process.exit(1);
  }
}

process.on('SIGINT', () => {
  console.log('\n⚠️  Database initialization interrupted by user');
  process.exit(130);
});

process.on('SIGTERM', () => {
  console.log('\n⚠️  Database initialization terminated');
  process.exit(143);
});

main().catch((error) => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
