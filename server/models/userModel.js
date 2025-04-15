const initDB = require('../db'); 

const userModel = async () => {
    const pool = await initDB(); 

    const registerUser = async (userData) => {
        try {
            console.log(`userData: ${JSON.stringify(userData)}`);
            const { firstName, lastName, phone, email, username, password } = userData;
            const [result] = await pool.execute(`INSERT INTO app_user (firstName, lastName, phone, email, username, password) 
                                                VALUES (?, ?, ?, ? ,? ,?)`, [firstName, lastName, phone, email, username, password]);
            
            console.log(`User created with ID: ${result.insertId}`);
            return result.insertId;
        } catch (error) {
            console.error(`Error creating user: ${error}`);
            throw error;
        }
    };

    const getUserById = async (userId) => {
        try {
            const [rows] = await pool.execute(`SELECT (select encryptId(pk_id)) uid, firstName, lastName, phone, email, 
                username, status, registeredOn, modifiedOn FROM app_user WHERE pk_id = ? AND is_deleted = 0`, [userId]);
            return rows[0];
        } catch (error) {
            console.error(`Error fetching user: ${error}`);
            throw error;
        }
    };

    const getUsersList = async () => {
        try {
            const [rows] = await pool.execute(`SELECT (select encryptId(pk_id)) uid, firstName, lastName, phone, email, 
                username, status, registeredOn, modifiedOn FROM app_user WHERE is_deleted = 0 ORDER BY pk_id DESC`);
            console.log(`rows: ${JSON.stringify(rows)}`);
            return rows;
        } catch (error) {
            console.error(`Error fetching users list: ${error}`);
            throw error;
        }
    };

    return {
        getUserById,
        registerUser,
        getUsersList
    };
};
module.exports = userModel;