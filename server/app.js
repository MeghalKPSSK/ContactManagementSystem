const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const initDB = require('./db'); 
const userRoutes = require('./Routes/userRoutes');
const contactRoutes = require('./Routes/contactRoutes');
const dashboardRoutes = require('./Routes/dashboardRoutes');
const groupRoutes = require('./Routes/groupRoutes');
const ensureAppUserTable = require('./Schemas/userSchema');
const ensureContactsTable = require('./Schemas/contactScehma');
const ensureGroupsTable = require('./Schemas/groupSchema');

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



    } catch (error) {
        console.error(`Error initializing DB: ${error}`);
    }
};

// Start the server
app.listen(port, async () => {
    console.log(`Server is running on port ${port}`);
    // await ensureAppUserTable();
    // await ensureContactsTable();
    // await ensureGroupsTable();
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

// Initialize the database and start the server
startServer();
