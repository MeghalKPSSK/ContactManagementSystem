const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const initDB = require('./db'); 
const userRoutes = require('./Routes/userRoutes');
const contactRoutes = require('./Routes/contactRoutes');
const dashboardRoutes = require('./Routes/dashboardRoutes');
const groupRoutes = require('./Routes/groupRoutes');
const notesRoutes = require('./Routes/notesRoutes');
const { initializeDatabase, verifyDatabaseSchema, getDatabaseStatus } = require('./dbInit/init');

const app = express();
const port = 5000;

// Setup logging
const logFilePath = path.join(__dirname, 'app.log');
const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });

const logMessage = (message, level = 'INFO') => {
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const formattedMessage = `[${level} - ${timestamp}]: ${message}\n`;
    logStream.write(formattedMessage);
    process.stdout.write(formattedMessage);
};

console.log = (...args) => logMessage(args.join(' '), 'LOG');
console.error = (...args) => logMessage(args.join(' '), 'ERROR');
console.warn = (...args) => logMessage(args.join(' '), 'WARNING');

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Async function to initialize the DB connection before starting the server
const startServer = async () => {

    try {
        // Initialize the database connection and wait for it to complete
        const pool = await initDB();  // Initialize the database connection

        // Test route to check DB connection
        app.get('/api/test', async (req, res) => {
            try {
                const [result] = await pool.execute('SELECT encryptID(1) AS encryptedID', []);
                console.log(`Database connection successful: ${result[0].encryptedID}`);
                res.status(200).json({ message: 'Database connection successful', encryptedID: result[0].encryptedID });
            } catch (error) {
                console.error(`Database connection error: ${error}`);
                res.status(500).json({ message: 'Database connection error', error: error.message });
            }
        });

        // Database initialization endpoint
        app.get('/api/database/initialize', async (req, res) => {
            try {
                console.log('🚀 API: Starting database initialization...');
                const startTime = Date.now();
                
                // Initialize database
                const initResult = await initializeDatabase();
                
                if (initResult.success) {
                    console.log('✅ API: Database initialization completed successfully');
                    
                    // Auto-verify after initialization
                    console.log('🔍 API: Performing post-initialization verification...');
                    const verifyResult = await verifyDatabaseSchema();
                    
                    const endTime = Date.now();
                    const totalDuration = endTime - startTime;
                    
                    if (verifyResult.success) {
                        console.log('✅ API: Post-initialization verification passed');
                        
                        res.status(200).json({
                            success: true,
                            message: 'Database initialized and verified successfully',
                            duration: totalDuration,
                            initialization: {
                                success: initResult.success,
                                duration: initResult.duration,
                                message: initResult.message
                            },
                            verification: {
                                success: verifyResult.success,
                                existingTables: verifyResult.existingTables,
                                missingTables: verifyResult.missingTables
                            },
                            timestamp: new Date().toISOString()
                        });
                    } else {
                        console.warn('⚠️  API: Post-initialization verification had issues');
                        
                        res.status(207).json({ // 207 Multi-Status
                            success: true,
                            message: 'Database initialized but verification had issues',
                            duration: totalDuration,
                            initialization: {
                                success: initResult.success,
                                duration: initResult.duration,
                                message: initResult.message
                            },
                            verification: {
                                success: verifyResult.success,
                                message: verifyResult.message,
                                existingTables: verifyResult.existingTables,
                                missingTables: verifyResult.missingTables
                            },
                            timestamp: new Date().toISOString()
                        });
                    }
                } else {
                    console.error('❌ API: Database initialization failed');
                    
                    res.status(500).json({
                        success: false,
                        message: 'Database initialization failed',
                        duration: initResult.duration,
                        error: initResult.message,
                        timestamp: new Date().toISOString()
                    });
                }
            } catch (error) {
                console.error('💥 API: Unexpected error during database initialization:', error);
                
                res.status(500).json({
                    success: false,
                    message: 'Unexpected error during database initialization',
                    error: error.message,
                    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
                    timestamp: new Date().toISOString()
                });
            }
        });

        // Database verification endpoint
        app.get('/api/database/verify', async (req, res) => {
            try {
                console.log('🔍 API: Starting database verification...');
                const startTime = Date.now();
                
                const verifyResult = await verifyDatabaseSchema();
                const endTime = Date.now();
                const duration = endTime - startTime;
                
                if (verifyResult.success) {
                    console.log('✅ API: Database verification completed successfully');
                    
                    res.status(200).json({
                        success: true,
                        message: 'Database schema verification passed',
                        duration: duration,
                        existingTables: verifyResult.existingTables,
                        missingTables: verifyResult.missingTables,
                        tableCount: verifyResult.existingTables.length,
                        timestamp: new Date().toISOString()
                    });
                } else {
                    console.warn('⚠️  API: Database verification failed');
                    
                    res.status(422).json({
                        success: false,
                        message: 'Database schema verification failed',
                        duration: duration,
                        error: verifyResult.message,
                        existingTables: verifyResult.existingTables,
                        missingTables: verifyResult.missingTables,
                        timestamp: new Date().toISOString()
                    });
                }
            } catch (error) {
                console.error('💥 API: Unexpected error during database verification:', error);
                
                res.status(500).json({
                    success: false,
                    message: 'Unexpected error during database verification',
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            }
        });

        // Database status endpoint
        app.get('/api/database/status', async (req, res) => {
            try {
                console.log('📊 API: Retrieving database status...');
                const startTime = Date.now();
                
                const { getDatabaseStatus } = require('./dbInit/init');
                const statusResult = await getDatabaseStatus();
                const endTime = Date.now();
                const duration = endTime - startTime;
                
                if (statusResult.success) {
                    console.log('✅ API: Database status retrieved successfully');
                    
                    res.status(200).json({
                        success: true,
                        message: 'Database status retrieved successfully',
                        duration: duration,
                        database: statusResult.database,
                        tables: statusResult.tables,
                        summary: {
                            totalTables: statusResult.tables.length,
                            totalRows: statusResult.tables.reduce((sum, table) => sum + parseInt(table.table_rows), 0),
                            totalSize: statusResult.tables.reduce((sum, table) => sum + parseFloat(table.size_mb), 0).toFixed(2) + ' MB'
                        },
                        timestamp: new Date().toISOString()
                    });
                } else {
                    console.warn('⚠️  API: Failed to retrieve database status');
                    
                    res.status(500).json({
                        success: false,
                        message: 'Failed to retrieve database status',
                        duration: duration,
                        error: statusResult.message,
                        timestamp: new Date().toISOString()
                    });
                }
            } catch (error) {
                console.error('💥 API: Unexpected error retrieving database status:', error);
                
                res.status(500).json({
                    success: false,
                    message: 'Unexpected error retrieving database status',
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            }
        });

    } catch (error) {
        console.error(`Error initializing DB: ${error}`);
    }
};

// Start the server
app.listen(port, async () => {
    console.log(`Server is running on port ${port}`);
    console.log('🎯 Database initialization endpoints available:');
    console.log('   GET /api/database/initialize - Initialize database');
    console.log('   GET  /api/database/verify     - Verify database schema');
    console.log('   GET  /api/database/status     - Get database status');
    console.log('✅ Server ready for requests');
});
// Initialize the database and start the server
// Import user routes

// Use user routes
app.use('/api/users', userRoutes);

// Use user routes
app.use('/api/contacts', contactRoutes);

// Use user routes
app.use('/api/groups', groupRoutes);

// Use dashboard routes
app.use('/api/dashboard', dashboardRoutes);

// Use notes routes
app.use('/api/notes', notesRoutes);

// Initialize the database and start the server
startServer();
