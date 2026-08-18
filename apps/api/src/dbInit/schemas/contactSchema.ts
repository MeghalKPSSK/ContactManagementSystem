import type { Pool } from 'mysql2/promise';
import initDB from '../../lib/db';

interface ColumnRow {
  COLUMN_NAME: string;
  COLUMN_TYPE: string;
  IS_NULLABLE: string;
  COLUMN_DEFAULT: string | null;
}

interface IndexRow {
  Key_name: string;
}

const ensureContactsTable = async (): Promise<void> => {
  const pool = await initDB();

  try {
    await createTablesIfNotExist(pool);
    await validateAndUpdateSchema(pool);
  } catch (error) {
    console.error('Error ensuring contact tables:', error);
    throw error;
  }
};

const createTablesIfNotExist = async (pool: Pool): Promise<void> => {
  await pool.query(`
        CREATE TABLE IF NOT EXISTS contacts (
            pk_id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            firstName VARCHAR(50) NOT NULL,
            lastName VARCHAR(50),
            email VARCHAR(100),
            phone VARCHAR(20),
            mobile VARCHAR(20),
            alt_phone VARCHAR(20),
            address_line TEXT,
            city VARCHAR(50),
            state VARCHAR(50),
            postal_code VARCHAR(20),
            country VARCHAR(50),
            company VARCHAR(100),
            is_favorite BOOLEAN DEFAULT FALSE,
            job_title VARCHAR(100),
            notes TEXT,
            status ENUM('Active', 'Inactive') DEFAULT 'Active',
            is_deleted BOOLEAN DEFAULT FALSE,
            createdOn DATETIME DEFAULT CURRENT_TIMESTAMP,
            modifiedOn DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES app_user(pk_id) ON DELETE CASCADE,
            INDEX idx_user_id (user_id),
            INDEX idx_firstName (firstName),
            INDEX idx_lastName (lastName),
            INDEX idx_email (email),
            INDEX idx_mobile (mobile),
            INDEX idx_favorite (is_favorite),
            INDEX idx_name_combined (firstName, lastName)
        )
    `);

  await pool.query(`
        CREATE TABLE IF NOT EXISTS contact_tags (
            pk_id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(50) NOT NULL,
            user_id INT NOT NULL,
            createdOn DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES app_user(pk_id) ON DELETE CASCADE,
            UNIQUE KEY unique_tag (name, user_id),
            INDEX idx_user_tags (user_id)
        )
    `);

  await pool.query(`
        CREATE TABLE IF NOT EXISTS contact_tag_mapping (
            contact_id INT,
            tag_id INT,
            createdOn DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (contact_id, tag_id),
            FOREIGN KEY (contact_id) REFERENCES contacts(pk_id) ON DELETE CASCADE,
            FOREIGN KEY (tag_id) REFERENCES contact_tags(pk_id) ON DELETE CASCADE,
            INDEX idx_contact_tags (contact_id)
        )
    `);
};

const validateAndUpdateSchema = async (pool: Pool): Promise<void> => {
  const [contactColumns] = (await pool.query(`
        SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'contacts'
    `)) as [ColumnRow[], unknown];

  const requiredColumns: Record<string, string> = {
    mobile: 'ALTER TABLE contacts ADD COLUMN mobile VARCHAR(20) AFTER phone',
    alt_phone: 'ALTER TABLE contacts ADD COLUMN alt_phone VARCHAR(20) AFTER mobile',
    is_favorite: 'ALTER TABLE contacts ADD COLUMN is_favorite BOOLEAN DEFAULT FALSE',
    job_title: 'ALTER TABLE contacts ADD COLUMN job_title VARCHAR(100)',
    status: "ALTER TABLE contacts ADD COLUMN status ENUM('Active', 'Inactive') DEFAULT 'Active'",
  };

  const existingColumns = contactColumns.map((col) => col.COLUMN_NAME);

  for (const [column, query] of Object.entries(requiredColumns)) {
    if (!existingColumns.includes(column)) {
      try {
        await pool.query(query);
        console.log(`Added missing column: ${column}`);
      } catch (error) {
        console.error(`Error adding column ${column}:`, error);
      }
    }
  }

  const [existingIndexes] = (await pool.query(`SHOW INDEX FROM contacts`)) as [IndexRow[], unknown];

  const requiredIndexes: Record<string, string> = {
    idx_mobile: 'CREATE INDEX idx_mobile ON contacts(mobile)',
    idx_favorite: 'CREATE INDEX idx_favorite ON contacts(is_favorite)',
    idx_name_combined: 'CREATE INDEX idx_name_combined ON contacts(firstName, lastName)',
  };

  const existingIndexNames = existingIndexes.map((idx) => idx.Key_name);

  for (const [indexName, query] of Object.entries(requiredIndexes)) {
    if (!existingIndexNames.includes(indexName)) {
      try {
        await pool.query(query);
        console.log(`Added missing index: ${indexName}`);
      } catch (error) {
        console.error(`Error adding index ${indexName}:`, error);
      }
    }
  }

  console.log('Schema validation and updates completed.');
};

export default ensureContactsTable;
