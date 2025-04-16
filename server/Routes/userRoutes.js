const express = require('express');
const router = express.Router();
const userModel = require('../models/userModel');
const encryption = require('../utils/encryption');

let userModelInstance;
let encryptionInstance;
// Initialize the encryption instance   
(async () => {
    encryptionInstance = await encryption();
})();

// Initialize the userModel instance
(async () => {
    userModelInstance = await userModel();
})();

// Get user by ID
router.get('/user/:id', async (req, res) => {
    try {
        console.log(`User UID: ${req.params.id}`);
        const user = await userModelInstance.getUserById(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        console.log(`User details: ${JSON.stringify(user)}`);
        res.status(200).json({success: true, user: user, message: 'User retrieved successfully' });
    } catch (error) {
        console.error(`Error retrieving user: ${error}`);
        res.status(500).json({ message: 'Error retrieving user', error });
    }
});

// Register a new user
router.post('/registerUser', async (req, res) => {
    try {

        const userId = await encryptionInstance.dbEncryptID(await userModelInstance.registerUser(req.body));
        res.status(201).json({ success: true, uid: userId, message: 'User registered successfully' });
    } catch (error) {
        console.error(`Error registering user: ${error}`);
        res.status(500).json({ success: false, message: 'Error registering user', error: error });
    }
});

// Get list of users
router.get('/usersList', async (req, res) => {
    try {
        const users = await userModelInstance.getUsersList();
        res.status(200).json({success: true, users: users, message: 'Users list retrieved successfully'});
    } catch (error) {
        console.error(`Error retrieving users list: ${error}`);
        res.status(500).json({ success: false, message: 'Error retrieving users list', error: error });
    }
});

module.exports = router;