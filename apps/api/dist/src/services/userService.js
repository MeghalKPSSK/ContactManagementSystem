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
exports.changePassword = exports.deleteUser = exports.updatePlan = exports.getUsersList = exports.updateUser = exports.getUserById = exports.loginUser = exports.registerUser = exports.updateUserPreferences = exports.getUserPreferences = exports.DEFAULT_USER_PREFERENCES = void 0;
const userModel_1 = require("../models/userModel");
const customAttributesModel_1 = require("../models/customAttributesModel");
const passCrypto = __importStar(require("../utils/passCrypto"));
const dbEncryption_1 = require("../utils/dbEncryption");
const errors_1 = require("../utils/errors");
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{6,12}$/;
const SIDEBAR_ITEM_KEYS = ['dragon', 'dashboard', 'contacts', 'notes', 'profile', 'groups', 'settings'];
const normalizeProfileImageRef = (value) => {
    if (!value)
        return null;
    if (value.startsWith('data:') || value.startsWith('http://') || value.startsWith('https://'))
        return value;
    if (value.startsWith('/uploads/'))
        return value;
    if (value.includes('/uploads/')) {
        return value.slice(value.indexOf('/uploads/'));
    }
    return `/uploads/profiles/${value}`;
};
exports.DEFAULT_USER_PREFERENCES = {
    themeMode: 'light',
    primaryColor: '#138b7c',
    secondaryColor: '#087568',
    backgroundColor: '#f2f7f5',
    surfaceColor: '#ffffff',
    textColor: '#203a39',
    sidebarOrder: [...SIDEBAR_ITEM_KEYS],
    dashboardChartTypes: { tags: 'donut', favorites: 'bar', groups: 'mixed' },
    dashboardColors: ['#138b7c', '#d78248', '#4a92a4', '#b85f69', '#809958', '#af85bc'],
};
const normalizePreferences = (value) => {
    const candidate = value && typeof value === 'object' ? value : {};
    const validColor = (color, fallback) => typeof color === 'string' && /^#[0-9a-fA-F]{6}$/.test(color) ? color.toLowerCase() : fallback;
    const requestedOrder = Array.isArray(candidate.sidebarOrder)
        ? candidate.sidebarOrder.filter((key) => SIDEBAR_ITEM_KEYS.includes(key))
        : [];
    const sidebarOrder = [...new Set(requestedOrder)];
    SIDEBAR_ITEM_KEYS.forEach((key) => {
        if (!sidebarOrder.includes(key))
            sidebarOrder.push(key);
    });
    const chartTypeCandidate = candidate.dashboardChartTypes;
    const chartTypeDefaults = exports.DEFAULT_USER_PREFERENCES.dashboardChartTypes;
    const dashboardChartTypes = {
        tags: chartTypeCandidate?.tags === 'pie' || chartTypeCandidate?.tags === 'donut' ? chartTypeCandidate.tags : chartTypeDefaults.tags,
        favorites: chartTypeCandidate?.favorites === 'bar' || chartTypeCandidate?.favorites === 'line'
            ? chartTypeCandidate.favorites
            : chartTypeDefaults.favorites,
        groups: ['mixed', 'line', 'bar', 'area'].includes(String(chartTypeCandidate?.groups))
            ? chartTypeCandidate?.groups
            : chartTypeDefaults.groups,
    };
    const dashboardColors = exports.DEFAULT_USER_PREFERENCES.dashboardColors.map((fallback, index) => validColor(candidate.dashboardColors?.[index], fallback));
    const themeMode = candidate.themeMode === 'dark' ? 'dark' : 'light';
    return {
        themeMode,
        primaryColor: validColor(candidate.primaryColor, exports.DEFAULT_USER_PREFERENCES.primaryColor),
        secondaryColor: validColor(candidate.secondaryColor, exports.DEFAULT_USER_PREFERENCES.secondaryColor),
        backgroundColor: validColor(candidate.backgroundColor, exports.DEFAULT_USER_PREFERENCES.backgroundColor),
        surfaceColor: validColor(candidate.surfaceColor, exports.DEFAULT_USER_PREFERENCES.surfaceColor),
        textColor: validColor(candidate.textColor, exports.DEFAULT_USER_PREFERENCES.textColor),
        sidebarOrder,
        dashboardChartTypes,
        dashboardColors,
    };
};
const getUserPreferences = async (userId) => {
    const decryptedId = (0, dbEncryption_1.decryptIdToNumber)(userId);
    if (!decryptedId)
        throw new errors_1.AppError('Invalid user ID', 400);
    const user = await userModel_1.AppUserModel.findFirst({
        where: { pk_id: decryptedId, is_deleted: false },
        select: { preferences: true },
    });
    if (!user)
        throw new errors_1.AppError('User not found', 404);
    let storedPreferences = user.preferences;
    if (typeof storedPreferences === 'string') {
        try {
            storedPreferences = JSON.parse(storedPreferences);
        }
        catch {
            storedPreferences = null;
        }
    }
    return normalizePreferences(storedPreferences);
};
exports.getUserPreferences = getUserPreferences;
const updateUserPreferences = async (userId, preferences) => {
    const decryptedId = (0, dbEncryption_1.decryptIdToNumber)(userId);
    if (!decryptedId)
        throw new errors_1.AppError('Invalid user ID', 400);
    const userExists = await userModel_1.AppUserModel.findFirst({
        where: { pk_id: decryptedId, is_deleted: false },
        select: { pk_id: true },
    });
    if (!userExists)
        throw new errors_1.AppError('User not found', 404);
    const normalized = normalizePreferences(preferences);
    await userModel_1.AppUserModel.update({
        where: { pk_id: decryptedId },
        data: { preferences: normalized },
    });
    return normalized;
};
exports.updateUserPreferences = updateUserPreferences;
const registerUser = async (userData) => {
    const { firstName, lastName, phone, email, username, password, confirmPassword } = userData;
    const existingUser = await userModel_1.AppUserModel.findFirst({
        where: { is_deleted: false, OR: [{ username }, { phone }, { email }] },
        select: { username: true, phone: true, email: true },
    });
    if (existingUser) {
        if (existingUser.username === username)
            throw new errors_1.AppError('Username already exists', 400);
        if (existingUser.phone === phone)
            throw new errors_1.AppError('Phone number already exists', 400);
        if (existingUser.email === email)
            throw new errors_1.AppError('Email already exists', 400);
    }
    if (password !== confirmPassword) {
        throw new errors_1.AppError('Passwords do not match', 400);
    }
    else if (password.length < 6 || password.length > 12) {
        throw new errors_1.AppError('Password must be at least 6 and maximum 12 characters long', 400);
    }
    else if (!PASSWORD_REGEX.test(password)) {
        throw new errors_1.AppError('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character', 400);
    }
    const hashedPassword = passCrypto.encrypt16Bit(password);
    const newUser = await userModel_1.AppUserModel.create({
        data: { firstName, lastName: lastName || null, phone, email, username, password: hashedPassword },
    });
    return newUser.pk_id;
};
exports.registerUser = registerUser;
const loginUser = async (userData) => {
    const { loginUsername, loginPassword } = userData;
    const hashedPassword = passCrypto.encrypt16Bit(loginPassword);
    const user = await userModel_1.AppUserModel.findFirst({
        where: { username: loginUsername, password: hashedPassword, status: 'Active', is_deleted: false },
    });
    if (!user) {
        throw new errors_1.AppError('Invalid username or password', 401);
    }
    const now = new Date();
    await userModel_1.AppUserModel.update({ where: { pk_id: user.pk_id }, data: { lastLogin: now } });
    return {
        uid: (0, dbEncryption_1.encryptId)(user.pk_id),
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        email: user.email,
        username: user.username,
        profileImage: normalizeProfileImageRef(user.profileImage),
        status: user.status,
        registeredOn: user.registeredOn,
        modifiedOn: user.modifiedOn,
        plan: user.plan || 'free',
        role: user.role || 'User',
        lastLogin: now,
    };
};
exports.loginUser = loginUser;
const getUserById = async (userId) => {
    const decryptedId = (0, dbEncryption_1.decryptId)(userId);
    if (!decryptedId)
        return null;
    const user = await userModel_1.AppUserModel.findFirst({
        where: { pk_id: Number(decryptedId), is_deleted: false },
    });
    if (!user)
        return null;
    return {
        uid: (0, dbEncryption_1.encryptId)(user.pk_id),
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        email: user.email,
        username: user.username,
        profileImage: normalizeProfileImageRef(user.profileImage),
        status: user.status,
        registeredOn: user.registeredOn,
        modifiedOn: user.modifiedOn,
        plan: user.plan || 'free',
        role: user.role || 'User',
    };
};
exports.getUserById = getUserById;
const updateUser = async (userId, userData) => {
    const { firstName, lastName, phone, email, username, profileImage } = userData;
    const decryptedId = (0, dbEncryption_1.decryptIdToNumber)(userId);
    if (!decryptedId)
        throw new errors_1.AppError('Invalid user ID', 400);
    const existingUser = await userModel_1.AppUserModel.findFirst({
        where: { pk_id: { not: decryptedId }, is_deleted: false, OR: [{ username }, { phone }, { email }] },
        select: { username: true, phone: true, email: true },
    });
    if (existingUser) {
        if (existingUser.username === username)
            throw new errors_1.AppError('Username already exists', 400);
        if (existingUser.phone === phone)
            throw new errors_1.AppError('Phone number already exists', 400);
        if (existingUser.email === email)
            throw new errors_1.AppError('Email already exists', 400);
    }
    const updated = await userModel_1.AppUserModel.update({
        where: { pk_id: decryptedId },
        data: {
            firstName,
            lastName: lastName || null,
            phone,
            email,
            username,
            modifiedOn: new Date(),
            ...(profileImage !== undefined ? { profileImage } : {}),
        },
    });
    return !!updated;
};
exports.updateUser = updateUser;
const getUsersList = async () => {
    const users = await userModel_1.AppUserModel.findMany({ where: { is_deleted: false }, orderBy: { pk_id: 'desc' } });
    return users.map((user) => ({
        uid: (0, dbEncryption_1.encryptId)(user.pk_id),
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        email: user.email,
        username: user.username,
        status: user.status,
        registeredOn: user.registeredOn,
        modifiedOn: user.modifiedOn,
        plan: user.plan || 'free',
        role: user.role || 'User',
    }));
};
exports.getUsersList = getUsersList;
const updatePlan = async (userId, plan) => {
    const normalized = (plan || '').toString().toLowerCase();
    const validPlans = new Set(['free', 'pro', 'enterprise']);
    if (!validPlans.has(normalized)) {
        throw new errors_1.AppError('Invalid plan', 400);
    }
    const decryptedId = (0, dbEncryption_1.decryptIdToNumber)(userId);
    if (!decryptedId)
        throw new errors_1.AppError('Invalid user ID', 400);
    const activeAttrCount = await customAttributesModel_1.CustomAttributeModel.count({
        where: { user_id: decryptedId, is_active: true },
    });
    const limits = { free: 3, pro: 5, enterprise: 10 };
    const limit = limits[normalized] ?? 3;
    if (activeAttrCount > limit) {
        throw new errors_1.AppError(`Cannot set plan to '${normalized}': you have ${activeAttrCount} active custom fields, limit is ${limit}. Deactivate some fields first.`, 400);
    }
    const updated = await userModel_1.AppUserModel.update({
        where: { pk_id: decryptedId },
        data: { plan: normalized, modifiedOn: new Date() },
    });
    return !!updated;
};
exports.updatePlan = updatePlan;
const deleteUser = async (userId) => {
    const decryptedId = (0, dbEncryption_1.decryptIdToNumber)(userId);
    if (!decryptedId)
        return false;
    const deleted = await userModel_1.AppUserModel.update({ where: { pk_id: decryptedId }, data: { is_deleted: true } });
    return !!deleted;
};
exports.deleteUser = deleteUser;
const changePassword = async (userId, currentPassword, newPassword) => {
    const decryptedId = (0, dbEncryption_1.decryptIdToNumber)(userId);
    if (!decryptedId)
        return false;
    const hashedCurrentPass = passCrypto.encrypt16Bit(currentPassword);
    const user = await userModel_1.AppUserModel.findFirst({
        where: { pk_id: decryptedId, password: hashedCurrentPass },
    });
    if (!user) {
        return false;
    }
    if (!PASSWORD_REGEX.test(newPassword)) {
        throw new errors_1.AppError('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character', 400);
    }
    const hashedNewPass = passCrypto.encrypt16Bit(newPassword);
    const updated = await userModel_1.AppUserModel.update({ where: { pk_id: decryptedId }, data: { password: hashedNewPass } });
    return !!updated;
};
exports.changePassword = changePassword;
//# sourceMappingURL=userService.js.map