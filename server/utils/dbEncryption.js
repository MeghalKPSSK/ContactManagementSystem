const initDB = require('../db'); 

const encryption = async () => {
    const pool = await initDB(); 

    const dbEncryptID = async (id) => {
        try {
            const [result] = await pool.execute('SELECT encryptId(?) AS encryptedID', [id]);
            return result[0].encryptedID;
        } catch (error) {
            console.error(`Error encrypting ID: ${error}`);
            throw error;
        }
    };

    const dbDecryptID = async (encryptedId) => {
        try {
            const [result] = await pool.execute('SELECT decryptId(?) AS decryptedID', [encryptedId]);
            return result[0].decryptedID;
        } catch (error) {
            console.error(`Error decrypting ID: ${error}`);
            throw error;
        }
    };

    return {
        dbDecryptID,
        dbEncryptID
    };
};
module.exports = encryption;