const initDB = require('../db'); 
const encryption = require('../utils/dbEncryption');

let encryptionInstance;
// Initialize the encryption instance   
(async () => {
    encryptionInstance = await encryption();
})();

const contactModel = async () => {
    const pool = await initDB(); 

    const contactSave = async (contactData) => {
        try {
            console.log(`contactData: ${JSON.stringify(contactData)}`);
            const { user_id, firstName, lastName, phone, alt_phone, mobile, email, address_line, city, state, postal_code, country, company, job_title, is_favorite, notes } = contactData;
            const userId = await encryptionInstance.dbDecryptID(user_id);
            const params = [
                userId || null,
                firstName || null,
                lastName || null,
                phone || null,
                alt_phone || null,
                mobile || null,
                email || null,
                address_line || null,
                city || null,
                state || null,
                postal_code || null,
                country || null,
                company || null,
                job_title || null,
                is_favorite !== undefined ? is_favorite : false,
                notes || null
              ];
            const [result] = await pool.execute(`INSERT INTO contacts (user_id, firstName, lastName, phone, alt_phone, mobile, email, address_line, city, state, postal_code, country, company, job_title, is_favorite, notes) 
                                                VALUES ( ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [...params]);
            return result.insertId;
        } catch (error) {
            console.error(`Error creating contact: ${error}`);
            throw error;
        }
    };

    const getContactById = async (contactId) => {
        try {
            const [contact] = await pool.execute(`
                SELECT c.*, 
                    GROUP_CONCAT(DISTINCT ca.pk_id) as attribute_ids,
                    GROUP_CONCAT(DISTINCT ca.name) as attribute_names,
                    GROUP_CONCAT(DISTINCT ca.color) as attribute_colors
                FROM contacts c
                LEFT JOIN contact_attribute_mapping cam ON c.pk_id = cam.contact_id
                LEFT JOIN contact_attributes ca ON cam.attribute_id = ca.pk_id
                WHERE c.pk_id = ? AND c.is_deleted = 0
                GROUP BY c.pk_id
            `, [contactId]);
            
            if (contact) {
                // Parse attributes into array of objects
                contact.attributes = contact.attribute_ids ? 
                    contact.attribute_ids.split(',').map((id, index) => ({
                        id,
                        name: contact.attribute_names.split(',')[index],
                        color: contact.attribute_colors.split(',')[index]
                    })) : [];
                
                // Clean up concatenated fields
                delete contact.attribute_ids;
                delete contact.attribute_names;
                delete contact.attribute_colors;
            }
            
            return contact;
        } catch (error) {
            console.error('Error fetching contact:', error);
            throw error;
        }
    };

    const getContactsList = async (userId, filter) => {
        try {
            console.log(`userId: ${userId}`);
            const filterCheck = filter ? filter : '';
            const [rows] = await pool.execute(`SELECT (select encryptId(pk_id)) uid, firstName, lastName, phone, email, 
                status, createdOn, is_favorite, modifiedOn, (select encryptId(user_id)) \`user.uid\` FROM contacts WHERE user_id in (select decryptId(?)) 
                AND CASE WHEN IFNULL(?,'') != '' THEN ( firstName LIKE ? OR lastName LIKE ? OR phone LIKE ? OR email LIKE ? ) ELSE 1=1 END
                AND is_deleted = 0 ORDER BY pk_id DESC`, [userId, filterCheck, `%${filterCheck}%`, `%${filterCheck}%`, `%${filterCheck}%`, `%${filterCheck}%`]);
            console.log(`rows: ${JSON.stringify(rows)}`);
            return rows;
        } catch (error) {
            console.error(`Error fetching contats list: ${error}`);
            throw error;
        }
    };

    const deleteContact = async (contactId) => {
        try {
            const [result] = await pool.execute(`UPDATE contacts SET is_deleted = 1 WHERE pk_id in (select decryptId(?))`, [contactId]);
            return result.affectedRows > 0;
        } catch (error) {
            console.error(`Error deleting contact: ${error}`);
            throw error;
        }
    };

    const updateContact = async (contactId, contactData) => {
        try {
            const { firstName, lastName, phone, alt_phone, mobile, email, address_line, city, state, postal_code, country, company, job_title, notes } = contactData;
            
            const params = [
                firstName || null,
                lastName || null,
                phone || null,
                alt_phone || null,
                mobile || null,
                email || null,
                address_line || null,
                city || null,
                state || null,
                postal_code || null,
                country || null,
                company || null,
                job_title || null,
                notes || null,
                contactId
            ];

            const [result] = await pool.execute(`
                UPDATE contacts 
                SET firstName = ?, lastName = ?, phone = ?, alt_phone = ?, 
                    mobile = ?, email = ?, address_line = ?, city = ?, 
                    state = ?, postal_code = ?, country = ?, company = ?, 
                    job_title = ?, notes = ?, modifiedOn = CURRENT_TIMESTAMP
                WHERE pk_id in (select decryptId(?)) AND is_deleted = 0
            `, [...params]);

            return result.affectedRows > 0;
        } catch (error) {
            console.error(`Error updating contact: ${error}`);
            throw error;
        }
    };

    const toggleFavorite = async (contactId, isFavorite) => {
        try {
            const [result] = await pool.execute(`
                UPDATE contacts 
                SET is_favorite = ?, modifiedOn = CURRENT_TIMESTAMP
                WHERE pk_id in (select decryptId(?)) AND is_deleted = 0
            `, [isFavorite, contactId]);

            return result.affectedRows > 0;
        } catch (error) {
            console.error(`Error toggling favorite: ${error}`);
            throw error;
        }
    };

    const getAttributes = async (userId) => {
        try {
            const [rows] = await pool.execute(
                'SELECT * FROM contact_attributes WHERE user_id = ?',
                [userId]
            );
            return rows;
        } catch (error) {
            console.error('Error fetching attributes:', error);
            throw error;
        }
    };

    const createAttribute = async (name, color, userId) => {
        try {
            const [result] = await pool.execute(
                'INSERT INTO contact_attributes (name, color, user_id) VALUES (?, ?, ?)',
                [name, color, userId]
            );
            return { id: result.insertId, name, color };
        } catch (error) {
            console.error('Error creating attribute:', error);
            throw error;
        }
    };

    const addContactAttributes = async (contactId, attributeIds) => {
        try {
            const values = attributeIds.map(attrId => [contactId, attrId]);
            await pool.query(
                'INSERT INTO contact_attribute_mapping (contact_id, attribute_id) VALUES ?',
                [values]
            );
            return true;
        } catch (error) {
            console.error('Error adding contact attributes:', error);
            throw error;
        }
    };

    return {
        getContactById,
        contactSave,
        getContactsList,
        deleteContact,
        updateContact,
        toggleFavorite,
        getAttributes,
        createAttribute,
        addContactAttributes
    };
};
module.exports = contactModel;