const express = require('express');
const router = express.Router();
const userModel = require('../models/userModel');
const encryption = require('../utils/dbEncryption');

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

// Register a new user
router.post('/registerUser', async (req, res) => {
    try {

        const userId = await encryptionInstance.dbEncryptID(await userModelInstance.registerUser(req.body));
        console.log(`User created with ID: ${userId}`);
        res.status(201).json({ success: true, uid: userId, message: 'User registered successfully' });
    } catch (error) {
        console.error(`Error registering user: ${error.message}`);
        res.status(500).json({ success: false, message: 'Error registering user', error: `${error.message}` });
    }
});

// Login user
router.post('/login', async (req, res) => {
    try {
        const user = await userModelInstance.loginUser(req.body);
        console.log(`User Session details: ${JSON.stringify(user)}`);
        res.status(200).json({ success: true, message: 'User Logged In successfully', user: user });
    } catch (error) {
        console.error(`Invalid User: ${error.message}`);
        res.status(500).json({ success: false, message: 'Invalid User'});
    }
});

// Update user
router.put('/updateUser/:id', async (req, res) => {
    try {
        const userId = req.params.id;
        const updatedUser = await userModelInstance.updateUser(userId, req.body);
        if (!updatedUser) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        res.status(200).json({ success: true, user: updatedUser, message: 'User updated successfully' });
    } catch (error) {
        console.error(`Error updating user: ${error.message}`);
        res.status(500).json({ success: false, message: 'Error updating user', error: error.message });
    }
});

// Get list of users
router.get('/usersList', async (req, res) => {
    try {
        const users = await userModelInstance.getUsersList();
        res.status(200).json({success: true, users: users, message: 'Users list retrieved successfully'});
    } catch (error) {
        console.error(`Error retrieving users list: ${error.message}`);
        res.status(500).json({ success: false, message: 'Error retrieving users list', error: error.message });
    }
});

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
        console.error(`Error retrieving user: ${error.message}`);
        res.status(500).json({ message: 'Error retrieving user', error: error.message });
    }
});

// Delete user by ID
router.delete('/deleteUser/:id', async (req, res) => {
    try {
        const userId = req.params.id;
        console.log(`User UID for Deletion: ${userId}`);
        const result = await userModelInstance.deleteUser(userId);
        if (result) {
            res.status(200).json({ success: true, message: 'User deleted successfully' });
        } else {
            res.status(404).json({ success: false, message: 'User not found' });
        }
    } catch (error) {
        console.error(`Error deleting user: ${error.message}`);
        res.status(500).json({ success: false, message: 'Error deleting user', error: error.message });
    }
});

// Add this new route for password change
router.put('/changePassword/:id', async (req, res) => {
    try {
        const userId = req.params.id;
        const { currentPassword, newPassword } = req.body;
        const result = await userModelInstance.changePassword(userId, currentPassword, newPassword);
        
        if (result) {
            res.status(200).json({ success: true, message: 'Password changed successfully' });
        } else {
            res.status(400).json({ success: false, message: 'Current password is incorrect' });
        }
    } catch (error) {
        console.error(`Error changing password: ${error.message}`);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;