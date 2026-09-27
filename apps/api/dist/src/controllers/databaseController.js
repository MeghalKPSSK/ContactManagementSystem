"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.status = exports.verify = exports.initialize = exports.testConnection = void 0;
const prisma_1 = require("../lib/prisma");
const dbEncryption_1 = require("../utils/dbEncryption");
const errors_1 = require("../utils/errors");
const init_1 = require("../dbInit/init");
const testConnection = async (_req, res) => {
    try {
        await prisma_1.prisma.$queryRaw `SELECT 1`;
        const encryptedID = (0, dbEncryption_1.encryptId)(1);
        console.log(`Database connection successful: ${encryptedID}`);
        res.status(200).json({ message: 'Database connection successful', encryptedID });
    }
    catch (error) {
        console.error(`Database connection error: ${error}`);
        res.status(500).json({ message: 'Database connection error', error: (0, errors_1.getErrorMessage)(error) });
    }
};
exports.testConnection = testConnection;
const initialize = async (_req, res) => {
    try {
        console.log('🚀 API: Starting database initialization...');
        const startTime = Date.now();
        const initResult = await (0, init_1.initializeDatabase)();
        if (initResult.success) {
            console.log('✅ API: Database initialization completed successfully');
            console.log('🔍 API: Performing post-initialization verification...');
            const verifyResult = await (0, init_1.verifyDatabaseSchema)();
            const totalDuration = Date.now() - startTime;
            if (verifyResult.success) {
                console.log('✅ API: Post-initialization verification passed');
                res.status(200).json({
                    success: true,
                    message: 'Database initialized and verified successfully',
                    duration: totalDuration,
                    initialization: initResult,
                    verification: verifyResult,
                    timestamp: new Date().toISOString(),
                });
            }
            else {
                console.warn('⚠️ API: Post-initialization verification had issues');
                res.status(207).json({
                    success: true,
                    message: 'Database initialized but verification had issues',
                    duration: totalDuration,
                    initialization: initResult,
                    verification: verifyResult,
                    timestamp: new Date().toISOString(),
                });
            }
        }
        else {
            console.error('❌ API: Database initialization failed');
            res.status(500).json({
                success: false,
                message: 'Database initialization failed',
                duration: initResult.duration,
                error: initResult.message,
                timestamp: new Date().toISOString(),
            });
        }
    }
    catch (error) {
        console.error('💥 API: Unexpected error during database initialization:', error);
        res.status(500).json({
            success: false,
            message: 'Unexpected error during database initialization',
            error: (0, errors_1.getErrorMessage)(error),
            timestamp: new Date().toISOString(),
        });
    }
};
exports.initialize = initialize;
const verify = async (_req, res) => {
    try {
        console.log('🔍 API: Starting database verification...');
        const startTime = Date.now();
        const verifyResult = await (0, init_1.verifyDatabaseSchema)();
        const duration = Date.now() - startTime;
        if (verifyResult.success) {
            res.status(200).json({
                success: true,
                message: 'Database schema verification passed',
                duration,
                existingTables: verifyResult.existingTables,
                missingTables: verifyResult.missingTables ?? [],
                tableCount: verifyResult.existingTables?.length ?? 0,
                timestamp: new Date().toISOString(),
            });
        }
        else {
            res.status(422).json({
                success: false,
                message: 'Database schema verification failed',
                duration,
                error: verifyResult.message,
                existingTables: verifyResult.existingTables,
                missingTables: verifyResult.missingTables,
                timestamp: new Date().toISOString(),
            });
        }
    }
    catch (error) {
        console.error('💥 API: Unexpected error during database verification:', error);
        res.status(500).json({
            success: false,
            message: 'Unexpected error during database verification',
            error: (0, errors_1.getErrorMessage)(error),
            timestamp: new Date().toISOString(),
        });
    }
};
exports.verify = verify;
const status = async (_req, res) => {
    try {
        console.log('📊 API: Retrieving database status...');
        const startTime = Date.now();
        const statusResult = await (0, init_1.getDatabaseStatus)();
        const duration = Date.now() - startTime;
        if (statusResult.success && statusResult.database && statusResult.tables) {
            res.status(200).json({
                success: true,
                message: 'Database status retrieved successfully',
                duration,
                database: statusResult.database,
                tables: statusResult.tables,
                summary: {
                    totalTables: statusResult.tables.length,
                    totalRows: statusResult.tables.reduce((sum, table) => sum + (parseInt(String(table.table_rows), 10) || 0), 0),
                    totalSize: statusResult.tables.reduce((sum, table) => sum + (parseFloat(String(table.size_mb)) || 0), 0).toFixed(2) + ' MB',
                },
                timestamp: new Date().toISOString(),
            });
        }
        else {
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve database status',
                duration,
                error: statusResult.error,
                timestamp: new Date().toISOString(),
            });
        }
    }
    catch (error) {
        console.error('💥 API: Unexpected error retrieving database status:', error);
        res.status(500).json({
            success: false,
            message: 'Unexpected error retrieving database status',
            error: (0, errors_1.getErrorMessage)(error),
            timestamp: new Date().toISOString(),
        });
    }
};
exports.status = status;
//# sourceMappingURL=databaseController.js.map