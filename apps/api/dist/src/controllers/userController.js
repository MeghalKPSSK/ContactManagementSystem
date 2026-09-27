"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePreferences = exports.getPreferences = exports.updatePlan = exports.uploadProfileImage = exports.changePassword = exports.deleteUser = exports.getUser = exports.listUsers = exports.updateUser = exports.login = exports.registerUser = void 0;
const userService = __importStar(require("../services/userService"));
const imageStorage_1 = require("../lib/imageStorage");
const dbEncryption_1 = require("../utils/dbEncryption");
const errors_1 = require("../utils/errors");
const http_1 = require("../utils/http");
const registerUser = async (req, res) => {
    try {
        const userId = (0, dbEncryption_1.encryptId)(await userService.registerUser(req.body));
        console.log(`User created with ID: ${userId}`);
        res.status(201).json({ success: true, uid: userId, message: 'User registered successfully' });
    }
    catch (error) {
        console.error(`Error registering user: ${(0, errors_1.getErrorMessage)(error)}`);
        res.status((0, errors_1.getErrorStatus)(error)).json({ success: false, message: 'Error registering user', error: (0, errors_1.getErrorMessage)(error) });
    }
};
exports.registerUser = registerUser;
const login = async (req, res) => {
    try {
        const user = await userService.loginUser(req.body);
        console.log(`User Session details: ${JSON.stringify(user)}`);
        res.status(200).json({ success: true, message: 'User Logged In successfully', user });
    }
    catch (error) {
        console.error(`Invalid User: ${(0, errors_1.getErrorMessage)(error)}`);
        res.status(200).json({ success: false, message: 'Invalid User' });
    }
};
exports.login = login;
const updateUser = async (req, res) => {
    try {
        const userId = (0, http_1.paramStr)(req.params.id);
        const userData = req.body;
        if (req.file) {
            userData.profileImage = await (0, imageStorage_1.persistUploadedImage)(req.file, 'profiles');
        }
        const updatedUser = await userService.updateUser(userId, userData);
        if (!updatedUser) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }
        const user = await userService.getUserById(userId);
        res.status(200).json({ success: true, user, message: 'User updated successfully' });
    }
    catch (error) {
        console.error(`Error updating user: ${(0, errors_1.getErrorMessage)(error)}`);
        res.status((0, errors_1.getErrorStatus)(error)).json({ success: false, message: 'Error updating user', error: (0, errors_1.getErrorMessage)(error) });
    }
};
exports.updateUser = updateUser;
const listUsers = async (_req, res) => {
    try {
        const users = await userService.getUsersList();
        res.status(200).json({ success: true, users, message: 'Users list retrieved successfully' });
    }
    catch (error) {
        console.error(`Error retrieving users list: ${(0, errors_1.getErrorMessage)(error)}`);
        res.status((0, errors_1.getErrorStatus)(error)).json({ success: false, message: 'Error retrieving users list', error: (0, errors_1.getErrorMessage)(error) });
    }
};
exports.listUsers = listUsers;
const getUser = async (req, res) => {
    try {
        console.log(`User UID: ${req.params.id}`);
        const user = await userService.getUserById((0, http_1.paramStr)(req.params.id));
        if (!user) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }
        console.log(`User details: ${JSON.stringify(user)}`);
        res.status(200).json({ success: true, user, message: 'User retrieved successfully' });
    }
    catch (error) {
        console.error(`Error retrieving user: ${(0, errors_1.getErrorMessage)(error)}`);
        res.status((0, errors_1.getErrorStatus)(error)).json({ message: 'Error retrieving user', error: (0, errors_1.getErrorMessage)(error) });
    }
};
exports.getUser = getUser;
const deleteUser = async (req, res) => {
    try {
        const userId = (0, http_1.paramStr)(req.params.id);
        console.log(`User UID for Deletion: ${userId}`);
        const result = await userService.deleteUser(userId);
        if (result) {
            res.status(200).json({ success: true, message: 'User deleted successfully' });
        }
        else {
            res.status(404).json({ success: false, message: 'User not found' });
        }
    }
    catch (error) {
        console.error(`Error deleting user: ${(0, errors_1.getErrorMessage)(error)}`);
        res.status((0, errors_1.getErrorStatus)(error)).json({ success: false, message: 'Error deleting user', error: (0, errors_1.getErrorMessage)(error) });
    }
};
exports.deleteUser = deleteUser;
const changePassword = async (req, res) => {
    try {
        const userId = (0, http_1.paramStr)(req.params.id);
        const { currentPassword, newPassword } = req.body;
        const result = await userService.changePassword(userId, currentPassword, newPassword);
        if (result) {
            res.status(200).json({ success: true, message: 'Password changed successfully' });
        }
        else {
            res.status(400).json({ success: false, message: 'Current password is incorrect' });
        }
    }
    catch (error) {
        console.error(`Error changing password: ${(0, errors_1.getErrorMessage)(error)}`);
        res.status((0, errors_1.getErrorStatus)(error)).json({ success: false, message: (0, errors_1.getErrorMessage)(error) });
    }
};
exports.changePassword = changePassword;
const uploadProfileImage = async (req, res) => {
    try {
        const userId = (0, http_1.paramStr)(req.params.id);
        if (!req.file) {
            res.status(400).json({ success: false, message: 'No file uploaded' });
            return;
        }
        const imageRef = await (0, imageStorage_1.persistUploadedImage)(req.file, 'profiles');
        const updatedUser = await userService.updateUser(userId, { profileImage: imageRef });
        if (!updatedUser) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }
        res.status(200).json({ success: true, message: 'Profile image uploaded successfully', user: updatedUser });
    }
    catch (error) {
        console.error(`Error uploading profile image: ${(0, errors_1.getErrorMessage)(error)}`);
        res.status((0, errors_1.getErrorStatus)(error)).json({ success: false, message: 'Error uploading profile image', error: (0, errors_1.getErrorMessage)(error) });
    }
};
exports.uploadProfileImage = uploadProfileImage;
const updatePlan = async (req, res) => {
    try {
        const userId = (0, http_1.paramStr)(req.params.id);
        const { plan } = req.body;
        if (!plan) {
            res.status(400).json({ success: false, message: 'Plan is required' });
            return;
        }
        const updated = await userService.updatePlan(userId, plan);
        if (!updated) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }
        const user = await userService.getUserById(userId);
        res.status(200).json({ success: true, message: 'Plan updated successfully', user });
    }
    catch (error) {
        console.error(`Error updating plan: ${(0, errors_1.getErrorMessage)(error)}`);
        res.status((0, errors_1.getErrorStatus)(error)).json({ success: false, message: (0, errors_1.getErrorMessage)(error) });
    }
};
exports.updatePlan = updatePlan;
const getPreferences = async (req, res) => {
    try {
        const preferences = await userService.getUserPreferences((0, http_1.paramStr)(req.params.id));
        res.status(200).json({ success: true, preferences });
    }
    catch (error) {
        res.status((0, errors_1.getErrorStatus)(error)).json({ success: false, message: (0, errors_1.getErrorMessage)(error) });
    }
};
exports.getPreferences = getPreferences;
const updatePreferences = async (req, res) => {
    try {
        const preferences = await userService.updateUserPreferences((0, http_1.paramStr)(req.params.id), req.body);
        res.status(200).json({ success: true, preferences, message: 'Preferences saved' });
    }
    catch (error) {
        res.status((0, errors_1.getErrorStatus)(error)).json({ success: false, message: (0, errors_1.getErrorMessage)(error) });
    }
};
exports.updatePreferences = updatePreferences;
//# sourceMappingURL=userController.js.map