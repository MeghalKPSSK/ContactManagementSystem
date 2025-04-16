const initDB = require('../db'); 

const encryption = async () => {
    const pool = await initDB(); 

    const dbEncryptID = async (id) => {
        try {
            const [result] = await pool.execute('SELECT encryptId(?) AS encryptedID', [id]);
            console.log(`Encrypted ID: ${result[0].encryptedID}`);
            return result[0].encryptedID;
        } catch (error) {
            console.error(`Error encrypting ID: ${error}`);
            throw error;
        }
    };

    const dbDecryptID = async (encryptedId) => {
        try {
            const [result] = await pool.execute('SELECT decryptId(?) AS decryptedID', [encryptedId]);
            console.log(`Decrypted ID: ${result[0].decryptedID}`);
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