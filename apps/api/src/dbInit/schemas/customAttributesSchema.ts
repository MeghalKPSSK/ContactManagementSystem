import initDB from '../../lib/db';

const ensureCustomAttributesTables = async (): Promise<void> => {
  const pool = await initDB();

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS custom_attributes (
        pk_id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        key_name VARCHAR(64) NOT NULL,
        label VARCHAR(100) NOT NULL,
        type ENUM('text','number','date','boolean','select','radio') NOT NULL,
        options_json JSON NULL,
        is_required BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        sort_order INT DEFAULT 0,
        createdOn DATETIME DEFAULT CURRENT_TIMESTAMP,
        modifiedOn DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_ca_user FOREIGN KEY (user_id) REFERENCES app_user(pk_id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_key (user_id, key_name),
        INDEX idx_user (user_id),
        INDEX idx_active (is_active)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS contact_attribute_values (
        contact_id INT NOT NULL,
        attribute_id INT NOT NULL,
        value_text TEXT NULL,
        createdOn DATETIME DEFAULT CURRENT_TIMESTAMP,
        modifiedOn DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (contact_id, attribute_id),
        CONSTRAINT fk_cav_contact FOREIGN KEY (contact_id) REFERENCES contacts(pk_id) ON DELETE CASCADE,
        CONSTRAINT fk_cav_attribute FOREIGN KEY (attribute_id) REFERENCES custom_attributes(pk_id) ON DELETE CASCADE,
        INDEX idx_contact (contact_id),
        INDEX idx_attribute (attribute_id)
      )
    `);

    console.log('✅ Custom attributes schema ensured');
  } catch (error) {
    console.error('Error ensuring custom attributes tables:', error);
    throw error;
  }
};

export default ensureCustomAttributesTables;
