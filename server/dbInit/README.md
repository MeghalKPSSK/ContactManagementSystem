# Database Initialization System

This directory contains the centralized database initialization system for the Contact Management System.

## Overview

The database initialization system provides a clean separation between application logic and database setup concerns. It handles:

- 📋 **Schema Management**: Centralized table creation and management
- 🔍 **Verification**: Database schema validation
- 📊 **Status Monitoring**: Database health and statistics
- 🚀 **Deployment Ready**: Standalone initialization scripts

## Directory Structure

```
dbInit/
├── init.js              # Core initialization functions
├── standalone.js        # Standalone CLI script
├── README.md           # This documentation
└── schemas/
    ├── userSchema.js       # User table schema
    ├── contactSchema.js    # Contact table schema
    ├── groupSchema.js      # Group table schema
    └── notesSchema.js      # Notes table schema
```

## Usage

### API Endpoints (Remote Database Management)

The database initialization system is also available via HTTP API endpoints for remote management:

```bash
# Check database status and health
GET /api/database/status

# Verify database schema integrity  
GET /api/database/verify

# Initialize/setup database tables
POST /api/database/initialize
```

#### API Examples

**PowerShell:**
```powershell
# Check database status
Invoke-RestMethod -Uri "http://localhost:5000/api/database/status" -Method Get

# Verify database schema
Invoke-RestMethod -Uri "http://localhost:5000/api/database/verify" -Method Get

# Initialize database
Invoke-RestMethod -Uri "http://localhost:5000/api/database/initialize" -Method Post -ContentType "application/json"
```

**CURL:**
```bash
# Check database status
curl -X GET http://localhost:5000/api/database/status

# Verify database schema
curl -X GET http://localhost:5000/api/database/verify

# Initialize database
curl -X POST http://localhost:5000/api/database/initialize \
     -H "Content-Type: application/json"
```

**JavaScript/Fetch:**
```javascript
// Initialize database via API
const response = await fetch('http://localhost:5000/api/database/initialize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
});
const result = await response.json();
console.log('Database initialization:', result);
```

#### API Response Examples

**Successful Initialization:**
```json
{
  "success": true,
  "message": "Database initialized and verified successfully",
  "duration": 1250,
  "initialization": {
    "success": true,
    "duration": 1100,
    "message": "Database initialization completed successfully"
  },
  "verification": {
    "success": true,
    "existingTables": ["users", "contacts", "groups", "notes"],
    "missingTables": []
  },
  "timestamp": "2025-08-03T06:44:07.123Z"
}
```

**Database Status Response:**
```json
{
  "success": true,
  "message": "Database status retrieved successfully",
  "duration": 45,
  "database": {
    "db_name": "contact_management",
    "db_version": "8.0.35"
  },
  "tables": [
    {
      "table_name": "users",
      "table_rows": "3",
      "size_mb": "0.02"
    },
    {
      "table_name": "contacts", 
      "table_rows": "15",
      "size_mb": "0.05"
    }
  ],
  "summary": {
    "totalTables": 4,
    "totalRows": 23,
    "totalSize": "0.12 MB"
  },
  "timestamp": "2025-08-03T06:44:07.123Z"
}
```

### NPM Scripts (Recommended)

```bash
# Full database initialization
npm run db:init

# Verify database schema only
npm run db:verify

# Show database status and statistics
npm run db:status
```

### Direct Node.js Execution

```bash
# Full initialization
node dbInit/standalone.js

# Verify only
node dbInit/standalone.js --verify-only

# Show status
node dbInit/standalone.js --status

# Show help
node dbInit/standalone.js --help
```

### Programmatic Usage

```javascript
const { initializeDatabase, verifyDatabaseSchema, getDatabaseStatus } = require('./dbInit/init');

// Initialize database
const result = await initializeDatabase();
if (result.success) {
    console.log('Database initialized successfully');
}

// Verify schema
const verifyResult = await verifyDatabaseSchema();
if (verifyResult.success) {
    console.log('Schema verification passed');
}

// Get status
const statusResult = await getDatabaseStatus();
console.log('Database status:', statusResult);
```

## Schema Management

### Adding New Tables

1. Create a new schema file in `schemas/` directory:

```javascript
// schemas/newTableSchema.js
const createNewTable = async (connection) => {
    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS new_table (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `;
    await connection.execute(createTableQuery);
};

module.exports = { createNewTable };
```

2. Import and add to `init.js`:

```javascript
const { createNewTable } = require('./schemas/newTableSchema');

// Add to initializeDatabase function
await createNewTable(connection);
```

### Schema Best Practices

- ✅ Use `IF NOT EXISTS` for safe table creation
- ✅ Include proper indexing for performance
- ✅ Add foreign key constraints where appropriate
- ✅ Use consistent naming conventions
- ✅ Include created_at/updated_at timestamps
- ✅ Implement soft deletes with is_active flags

## Features

### 🔒 Security Features

- **Encrypted IDs**: All primary keys are encrypted before client exposure
- **Secure Defaults**: Tables created with security-first approach
- **Input Validation**: Schema constraints prevent invalid data

### 📊 Performance Optimizations

- **Strategic Indexing**: Key columns indexed for fast queries
- **Foreign Key Constraints**: Database-level relationship enforcement
- **Soft Deletes**: Data preservation with is_active flags

### 🚀 Deployment Features

- **Environment Agnostic**: Works in development, staging, and production
- **Error Handling**: Comprehensive error reporting and recovery
- **Logging**: Detailed operation logging for debugging
- **Verification**: Post-initialization schema validation

## Database Schema

### Core Tables

1. **Users** (`users`)
   - User authentication and profile management
   - Encrypted profile images and personal data

2. **Contacts** (`contacts`)
   - Contact information storage
   - Tag-based categorization
   - Soft delete support

3. **Groups** (`groups`)
   - Group management and organization
   - Member tracking and statistics

4. **Notes** (`notes`)
   - Multi-context note system
   - Personal, contact, and group notes
   - Keyword tagging and search

### Relationships

```
Users (1) ──→ (N) Contacts
Users (1) ──→ (N) Groups  
Users (1) ──→ (N) Notes

Contacts (N) ──→ (N) Groups (via group_id)
Notes (N) ──→ (1) Contacts (optional)
Notes (N) ──→ (1) Groups (optional)
```

## Error Handling

The initialization system includes comprehensive error handling:

- **Connection Errors**: Database connectivity issues
- **Schema Errors**: Table creation failures
- **Constraint Errors**: Foreign key and validation issues
- **Permission Errors**: Database access problems

All errors are logged with detailed context for debugging.

## Monitoring and Maintenance

### Database Status

The status command provides:
- Database connection health
- Table row counts
- Storage usage statistics
- Schema version information

### Regular Maintenance

```bash
# Check database health
npm run db:status

# Verify schema integrity
npm run db:verify

# Full re-initialization (if needed)
npm run db:init
```

## Troubleshooting

### Common Issues

1. **Connection Refused**
   - Check database server is running
   - Verify connection credentials in `.env`
   - Ensure database exists

2. **Permission Denied**
   - Check user has CREATE, ALTER, DROP permissions
   - Verify database user configuration

3. **Table Already Exists**
   - Normal behavior with `IF NOT EXISTS`
   - Use `--verify-only` to check without changes

### Debug Mode

Set environment variable for detailed logging:
```bash
DEBUG=db:init npm run db:init
```

## Integration

This system integrates seamlessly with:
- 🚀 **Express.js**: Automatic initialization on app startup + API endpoints
- 🌐 **HTTP APIs**: Remote database management via REST endpoints
- 🐳 **Docker**: Container-ready initialization scripts
- ☁️ **Cloud Deployment**: Platform-agnostic database setup
- 🔄 **CI/CD**: Automated testing and deployment pipelines
- 📱 **Frontend Apps**: Initialize database from client applications

## Contributing

When adding new database features:

1. Create schema files following existing patterns
2. Add appropriate error handling
3. Include verification logic
4. Update this documentation
5. Test with `npm run db:verify`

---

*This database initialization system provides a robust foundation for the Contact Management System's data layer.*
