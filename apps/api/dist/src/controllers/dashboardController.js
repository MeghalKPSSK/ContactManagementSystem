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
exports.getDashboardContacts = exports.getGroupsStats = exports.getFavoritesCount = exports.getTagsDistribution = void 0;
const dashboardService = __importStar(require("../services/dashboardService"));
const errors_1 = require("../utils/errors");
const getTagsDistribution = async (req, res) => {
    const endpoint = 'GET /dashboard/tags-distribution';
    console.log(`[${endpoint}] Request received - UserId: ${req.query.userId}`);
    try {
        const tagsDistribution = await dashboardService.getTagsDistribution(req.query.userId);
        console.log(`[${endpoint}] Success - Found ${tagsDistribution.labels.length} tags, Total counts: ${tagsDistribution.counts.reduce((a, b) => a + b, 0)}`);
        res.status(200).json({ success: true, counts: tagsDistribution.counts, labels: tagsDistribution.labels });
    }
    catch (error) {
        console.error(`[${endpoint}] Error:`, (0, errors_1.getErrorMessage)(error));
        res.status((0, errors_1.getErrorStatus)(error)).json({ success: false, message: 'Error fetching tags distribution' });
    }
};
exports.getTagsDistribution = getTagsDistribution;
const getFavoritesCount = async (req, res) => {
    const endpoint = 'GET /dashboard/favorites-count';
    console.log(`[${endpoint}] Request received - UserId: ${req.query.userId}`);
    try {
        const favoritesCount = await dashboardService.getFavoritesCount(req.query.userId);
        console.log(`[${endpoint}] Success - Favorites: ${favoritesCount.favorite}, Regular: ${favoritesCount.regular}, Total: ${favoritesCount.favorite + favoritesCount.regular}`);
        res.status(200).json({ success: true, favorite: favoritesCount.favorite, regular: favoritesCount.regular });
    }
    catch (error) {
        console.error(`[${endpoint}] Error:`, (0, errors_1.getErrorMessage)(error));
        res.status((0, errors_1.getErrorStatus)(error)).json({ success: false, message: 'Error fetching favorites count' });
    }
};
exports.getFavoritesCount = getFavoritesCount;
const getGroupsStats = async (req, res) => {
    const endpoint = 'GET /dashboard/groups-stats';
    console.log(`[${endpoint}] Request received - UserId: ${req.query.userId}`);
    try {
        if (!req.query.userId) {
            console.log(`[${endpoint}] Validation failed - Missing userId parameter`);
            res.status(400).json({ success: false, message: 'UserId is required' });
            return;
        }
        const groupsStats = await dashboardService.getGroupsStatistics(req.query.userId);
        console.log(`[${endpoint}] Success - Groups: ${groupsStats.group_data.length}, Tags: ${groupsStats.tag_data.length}`);
        res.status(200).json({ success: true, data: groupsStats });
    }
    catch (error) {
        console.error(`[${endpoint}] Error:`, (0, errors_1.getErrorMessage)(error));
        res.status((0, errors_1.getErrorStatus)(error)).json({ success: false, message: 'Error fetching groups statistics', error: (0, errors_1.getErrorMessage)(error) });
    }
};
exports.getGroupsStats = getGroupsStats;
const getDashboardContacts = async (req, res) => {
    const endpoint = 'GET /dashboard/contacts';
    const { userId, tags, page = '1', pageSize = '9' } = req.query;
    console.log(`[${endpoint}] Request received - UserId: ${userId}, Tags: ${tags || 'none'}, Page: ${page}, PageSize: ${pageSize}`);
    try {
        const contactsList = await dashboardService.getDashboardContacts(userId, tags ? tags.split(',') : [], parseInt(page, 10), parseInt(pageSize, 10));
        console.log(`[${endpoint}] Success - Returned ${contactsList.contacts.length} contacts out of ${contactsList.total} total`);
        res.status(200).json({ success: true, contacts: contactsList.contacts, total: contactsList.total });
    }
    catch (error) {
        console.error(`[${endpoint}] Error:`, (0, errors_1.getErrorMessage)(error));
        res.status((0, errors_1.getErrorStatus)(error)).json({ success: false, message: 'Error retrieving contacts' });
    }
};
exports.getDashboardContacts = getDashboardContacts;
//# sourceMappingURL=dashboardController.js.map