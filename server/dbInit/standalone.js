#!/usr/bin/env node

/**
 * Standalone Database Initialization Script
 * 
 * This script can be run independently to initialize the database
 * during deployment or development setup.
 * 
 * Usage:
 *   node dbInit/standalone.js [options]
 * 
 * Options:
 *   --verify-only    Only verify database schema without initialization
 *   --status         Show database status and statistics
 *   --help           Show this help message
 */

const { initializeDatabase, verifyDatabaseSchema, getDatabaseStatus } = require('./init');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
    verifyOnly: args.includes('--verify-only'),
    statusOnly: args.includes('--status'),
    help: args.includes('--help')
};

// Show help message
if (options.help) {
    console.log(`
📚 Database Initialization Script Help

Usage: node dbInit/standalone.js [options]

Options:
  --verify-only     Only verify database schema without initialization
  --status          Show database status and statistics  
  --help            Show this help message

Examples:
  node dbInit/standalone.js                    # Full database initialization
  node dbInit/standalone.js --verify-only     # Only verify schema
  node dbInit/standalone.js --status          # Show database status
    `);
    process.exit(0);
}

// Main execution function
async function main() {
    console.log('🎯 ContactManagementSystem - Database Initialization');
    console.log('================================================');
    
    try {
        if (options.statusOnly) {
            // Show database status only
            console.log('📊 Retrieving database status...');
            const statusResult = await getDatabaseStatus();
            
            if (statusResult.success) {
                console.log('\n📋 Database Information:');
                console.log(`  Database: ${statusResult.database.db_name}`);
                console.log(`  Version: ${statusResult.database.db_version}`);
                
                console.log('\n📊 Tables:');
                statusResult.tables.forEach(table => {
                    console.log(`  ${table.table_name}: ${table.table_rows} rows (${table.size_mb} MB)`);
                });
                
                process.exit(0);
            } else {
                console.error('❌ Failed to retrieve database status:', statusResult.message);
                process.exit(1);
            }
        }
        
        if (options.verifyOnly) {
            // Verify schema only
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
        
        // Full database initialization
        console.log('🚀 Starting full database initialization...');
        const initResult = await initializeDatabase();
        
        if (initResult.success) {
            console.log('\n✅ Database initialization completed successfully!');
            console.log(`⏱️  Duration: ${initResult.duration}ms`);
            
            // Auto-verify after initialization
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
        console.error(`   ${error.message}`);
        console.error(`   ${error.stack}`);
        process.exit(1);
    }
}

// Handle process termination gracefully
process.on('SIGINT', () => {
    console.log('\n⚠️  Database initialization interrupted by user');
    process.exit(130);
});

process.on('SIGTERM', () => {
    console.log('\n⚠️  Database initialization terminated');
    process.exit(143);
});

// Run the main function
main().catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
});
