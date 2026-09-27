import type { Pool } from 'mysql2/promise';
import initDB from '../../lib/db';

interface ColumnRow {
  COLUMN_NAME: string;
}
interface IndexRow {
  Key_name: string;
}

const ensureGroupsTable = async (): Promise<void> => {
  const pool = await initDB();

  try {
    await createTablesIfNotExist(pool);
    await validateAndUpdateSchema(pool);
  } catch (error) {
    console.error('Error ensuring groups tables:', error);
    throw error;
  }
};

const createTablesIfNotExist = async (pool: Pool): Promise<void> => {
  await pool.query(`
        CREATE TABLE IF NOT EXISTS \`groups\` (
            pk_id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            name VARCHAR(50) NOT NULL,
            description TEXT,
            is_deleted BOOLEAN DEFAULT FALSE,
          group_icon LONGTEXT,
            createdOn DATETIME DEFAULT CURRENT_TIMESTAMP,
            modifiedOn DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES app_user(pk_id) ON DELETE CASCADE,
            INDEX idx_user_id (user_id),
            INDEX idx_name (name)
        )
    `);

  await pool.query(`
        CREATE TABLE IF NOT EXISTS group_members (
            pk_id INT AUTO_INCREMENT PRIMARY KEY,
            group_id INT NOT NULL,
            contact_id INT NOT NULL,
            createdOn DATETIME DEFAULT CURRENT_TIMESTAMP,
            modifiedOn DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (group_id) REFERENCES \`groups\`(pk_id) ON DELETE CASCADE,
            FOREIGN KEY (contact_id) REFERENCES contacts(pk_id) ON DELETE CASCADE,
            INDEX idx_group_id (group_id),
            INDEX idx_contact_id (contact_id)
        )
    `);
};

const validateAndUpdateSchema = async (pool: Pool): Promise<void> => {
  const [groupsColumns] = (await pool.query(`
        SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'groups'
    `)) as [ColumnRow[], unknown];

  const requiredColumns: Record<string, string> = {
    description: 'ALTER TABLE groups ADD COLUMN description TEXT AFTER name',
    is_deleted: 'ALTER TABLE groups ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE AFTER description',
    group_icon: 'ALTER TABLE `groups` ADD COLUMN group_icon LONGTEXT AFTER is_deleted',
  };

  const existingColumns = groupsColumns.map((col) => col.COLUMN_NAME);

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

  const [existingIndexes] = (await pool.query(`SHOW INDEX FROM \`groups\``)) as [IndexRow[], unknown];

  const requiredIndexes: Record<string, string> = {
    idx_name: 'CREATE INDEX idx_name ON `groups`(name)',
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

  await pool.query('ALTER TABLE `groups` MODIFY COLUMN group_icon LONGTEXT NULL');

  console.log('Schema validation and updates for groups table completed.');
};

export default ensureGroupsTable;
