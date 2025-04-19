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
            const [rows] = await pool.execute(`SELECT (select encryptId(pk_id)) uid, firstName, lastName, phone, alt_phone, mobile, email, address_line, 
                city, state, postal_code, country, company, job_title, is_favorite, 
                notes, createdOn, modifiedOn, (select encryptId(user_id)) \`user.uid\` FROM contacts WHERE pk_id in (select decryptId(?)) AND is_deleted = 0`, [contactId]);
            return rows[0];
        } catch (error) {
            console.error(`Error fetching contact info: ${error}`);
            throw error;
        }
    };

    const getContactsList = async (userId) => {
        try {
            console.log(`userId: ${userId}`);
            const [rows] = await pool.execute(`SELECT (select encryptId(pk_id)) uid, firstName, lastName, phone, email, 
                status, createdOn, is_favorite, modifiedOn, (select encryptId(user_id)) \`user.uid\` FROM contacts WHERE user_id in (select decryptId(?)) AND is_deleted = 0 ORDER BY pk_id DESC`, [userId]);
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

    return {
        getContactById,
        contactSave,
        getContactsList,
        deleteContact
    };
};
module.exports = contactModel;