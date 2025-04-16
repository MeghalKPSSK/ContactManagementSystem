const initDB = require('../db'); 
const passCrypto = require('../utils/passCrypto');

const userModel = async () => {
    const pool = await initDB(); 

    const registerUser = async (userData) => {
        try {
            console.log(`userData: ${JSON.stringify(userData)}`);
            const { firstName, lastName, phone, email, username, password, confirmPassword } = userData;
            
            // Check for existing user with same username, phone, or email
            const [existingUser] = await pool.execute(
                `SELECT username, phone, email FROM app_user 
                 WHERE (username = ? OR phone = ? OR email = ?) AND is_deleted = 0`,
                [username, phone, email]
            );

            if (existingUser.length > 0) {
                const duplicate = existingUser[0];
                if (duplicate.username === username) throw new Error("Username already exists");
                if (duplicate.phone === phone) throw new Error("Phone number already exists");
                if (duplicate.email === email) throw new Error("Email already exists");
            }

            if (password !== confirmPassword) {
                throw new Error("Passwords do not match");
            } else if (password.length < 6 || password.length > 12) {
                throw new Error("Password must be at least 6 and maximum 12 characters long");
            } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{6,12}$/.test(password)) {
                throw new Error("Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character");
            }
            
            const hashedPassword = passCrypto.encrypt16Bit(password);
            const [result] = await pool.execute(`INSERT INTO app_user (firstName, lastName, phone, email, username, password) 
                                                VALUES (?, ?, ?, ? ,? ,?)`, [firstName, lastName, phone, email, username, hashedPassword]);
            
            return result.insertId;
        } catch (error) {
            console.error(`Error creating user: ${error}`);
            throw error;
        }
    };

    const loginUser = async (userData) => {
        try {
            const { loginUsername, loginPassword} = userData;
            const hashedPassword = passCrypto.encrypt16Bit(loginPassword);
            
            const [rows] = await pool.execute(`SELECT (select encryptId(pk_id)) uid, firstName, lastName, phone, email, 
                username, status, registeredOn, modifiedOn, now() lastLogin FROM app_user WHERE username = ? AND password = ? 
                AND status = 'Active' AND is_deleted = 0`, [loginUsername, hashedPassword]);
            if (rows.length === 0) {
                throw new Error("Invalid username or password");
            }
            const [id] = await pool.execute(`UPDATE app_user SET lastLogin = now() WHERE pk_id in (SELECT decryptId(?));`, [rows[0].uid]);
            return rows[0];
        } catch (error) {
            throw error;
        }
    };

    const getUserById = async (userId) => {
        try {
            const [rows] = await pool.execute(`SELECT (select encryptId(pk_id)) uid, firstName, lastName, phone, email, 
                username, status, registeredOn, modifiedOn FROM app_user WHERE pk_id in (select decryptId(?)) AND is_deleted = 0`, [userId]);
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

    const deleteUser = async (userId) => {
        try {
            const [result] = await pool.execute(`UPDATE app_user SET is_deleted = 1 WHERE pk_id in (select decryptId(?))`, [userId]);
            return result.affectedRows > 0;
        } catch (error) {
            console.error(`Error deleting user: ${error}`);
            throw error;
        }
    };

    return {
        getUserById,
        registerUser,
        getUsersList,
        loginUser,
        deleteUser
    };
};
module.exports = userModel;