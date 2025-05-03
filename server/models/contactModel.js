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
            const { user_id, firstName, lastName, phone, alt_phone, mobile, email, address_line, city, state, postal_code, country, company, job_title, is_favorite, notes, tags } = contactData;
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
            
            tags.forEach(async element => {
                await pool.execute(`INSERT INTO contact_tag_mapping (contact_id, tag_id) VALUES (?, (SELECT decryptId(?)))`, [result.insertId, element]);
            });   

            return result.insertId;
        } catch (error) {
            console.error(`Error creating contact: ${error}`);
            throw error;
        }
    };

    const getContactById = async (contactId) => {
        try {
            const [contact] = await pool.execute(`
                SELECT 
                    (SELECT encryptId(user_id)) AS user_id,
                    (SELECT encryptId(pk_id))  AS uid, 
                    firstName, 
                    lastName, 
                    phone, 
                    alt_phone, 
                    mobile, 
                    email, 
                    address_line, 
                    city, 
                    state, 
                    postal_code, 
                    country, 
                    company, 
                    job_title, 
                    is_favorite,
                    notes
                FROM contacts WHERE pk_id = decryptId(?) AND is_deleted = 0
            `, [contactId]);
            
            if (contact && contact[0]) {
                const tags = await pool.execute(
                    `SELECT 
                        (SELECT encryptId(t.pk_id)) AS uid, 
                        t.name 
                    FROM contact_tags t 
                    JOIN contact_tag_mapping ctm ON t.pk_id = ctm.tag_id 
                        AND ctm.contact_id = decryptId(?)`, [contactId]
                );
                contact[0].tags = tags[0] || [];
                console.log(`Contact: ${JSON.stringify(contact[0])}`);
            }
            
            return contact[0];
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
            const { firstName, lastName, phone, alt_phone, mobile, email, address_line, city, state, postal_code, country, company, job_title, notes, tags } = contactData;
            
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
            
            await pool.execute(`DELETE FROM contact_tag_mapping WHERE contact_id = decryptId(?)`, [contactId]);
            // console.log(`tags: ${JSON.stringify(tags)}`);
            tags.forEach(async element => {

                await pool.execute(`INSERT INTO contact_tag_mapping (contact_id, tag_id) VALUES ((select decryptId(?)), (SELECT decryptId(?)))`, [contactId, element]);
            });  

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
                'SELECT pk_id, name, color FROM contact_attributes WHERE user_id = ?',
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
            // First remove existing attributes
            await pool.execute(
                'DELETE FROM contact_attribute_mapping WHERE contact_id = ?',
                [contactId]
            );

            // Then add new ones if any
            if (attributeIds.length > 0) {
                const values = attributeIds.map(attrId => [contactId, attrId]);
                await pool.query(
                    'INSERT INTO contact_attribute_mapping (contact_id, attribute_id) VALUES ?',
                    [values]
                );
            }
            return true;
        } catch (error) {
            console.error('Error updating contact attributes:', error);
            throw error;
        }
    };

    const getTags = async (userId) => {
        try {
            const [rows] = await pool.execute(`
                SELECT encryptId(pk_id) as id, name 
                FROM contact_tags 
                WHERE user_id = decryptId(?)
                ORDER BY name
            `, [userId]);
            return rows;
        } catch (error) {
            console.error('Error fetching tags:', error);
            throw error;
        }
    };

    const createTag = async (name, userId) => {
        try {
            const [result] = await pool.execute(
                'INSERT INTO contact_tags (name, user_id) VALUES (?, decryptId(?))',
                [name, userId]
            );
            return {
                id: await pool.execute('SELECT encryptId(?) as id', [result.insertId])
                    .then(([rows]) => rows[0].id),
                name
            };
        } catch (error) {
            console.error('Error creating tag:', error);
            throw error;
        }
    };

    const getContactTags = async (contactId) => {
        try {
            const [rows] = await pool.execute(`
                SELECT t.pk_id, t.name
                FROM contact_tags t
                JOIN contact_tag_mapping ctm ON t.pk_id = ctm.tag_id
                WHERE ctm.contact_id IN (SELECT decryptId(?))
            `, [contactId]);
            return rows;
        } catch (error) {
            console.error('Error fetching contact tags:', error);
            throw error;
        }
    };

    const updateContactTags = async (contactId, tagIds) => {
        try {
            await pool.execute(
                'DELETE FROM contact_tag_mapping WHERE contact_id = decryptId(?)',
                [contactId]
            );

            if (tagIds && tagIds.length > 0) {
                await pool.query(`
                    INSERT INTO contact_tag_mapping (contact_id, tag_id)
                    SELECT decryptId(?), decryptId(?) FROM DUAL
                    WHERE decryptId(?) IS NOT NULL
                `, tagIds.flatMap(tagId => [contactId, tagId, tagId]));
            }
            return true;
        } catch (error) {
            console.error('Error updating contact tags:', error);
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
        addContactAttributes,
        getTags,
        createTag,
        getContactTags,
        updateContactTags
    };
};
module.exports = contactModel;