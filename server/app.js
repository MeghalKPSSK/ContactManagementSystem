const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const initDB = require('./db'); // Import the database initialization function

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

// Async function to initialize the DB connection before starting the server
const startServer = async () => {
    try {
        // Initialize the database connection and wait for it to complete
        const pool = await initDB();  // Initialize the database connection

        // Test route to check DB connection
        app.get('/api/test', async (req, res) => {
            try {
                const [result] = await pool.execute('SELECT 1 + 1 AS solution', []);
                console.log(`Database connection successful: ${result[0].solution}`);
                res.status(200).json({ message: 'Database connection successful', solution: result[0].solution });
            } catch (error) {
                console.error(`Database connection error: ${error}`);
                res.status(500).json({ message: 'Database connection error', error: error.message });
            }
        });

        // Start the server after DB is initialized
        app.listen(port, () => {
            console.log(`Server is running on http://localhost:${port}`);
        });

    } catch (error) {
        console.error(`Error initializing DB: ${error}`);
    }
};

// Start the server
startServer();
