"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGroupsStatistics = exports.getDashboardContacts = exports.getFavoritesCount = exports.getTagsDistribution = void 0;
const contactModel_1 = require("../models/contactModel");
const groupModel_1 = require("../models/groupModel");
const dbEncryption_1 = require("../utils/dbEncryption");
const errors_1 = require("../utils/errors");
const getTagsDistribution = async (userId) => {
    const decryptedUserId = (0, dbEncryption_1.decryptIdToNumber)(userId);
    if (!decryptedUserId)
        throw new errors_1.AppError('Invalid user ID', 400);
    const tags = await contactModel_1.ContactTagModel.findMany({
        where: { user_id: decryptedUserId },
        include: { tagMappings: { where: { contact: { is_deleted: false } } } },
    });
    const tagsWithCounts = tags
        .map((tag) => ({ name: tag.name, count: tag.tagMappings.length }))
        .sort((a, b) => b.count - a.count);
    return {
        counts: tagsWithCounts.map((t) => t.count),
        labels: tagsWithCounts.map((t) => t.name),
    };
};
exports.getTagsDistribution = getTagsDistribution;
const getFavoritesCount = async (userId) => {
    const decryptedUserId = (0, dbEncryption_1.decryptIdToNumber)(userId);
    if (!decryptedUserId)
        throw new errors_1.AppError('Invalid user ID', 400);
    const [favoriteCount, regularCount] = await Promise.all([
        contactModel_1.ContactModel.count({ where: { user_id: decryptedUserId, is_deleted: false, is_favorite: true } }),
        contactModel_1.ContactModel.count({ where: { user_id: decryptedUserId, is_deleted: false, is_favorite: false } }),
    ]);
    return { favorite: favoriteCount, regular: regularCount };
};
exports.getFavoritesCount = getFavoritesCount;
const getDashboardContacts = async (userId, tags = [], page = 1, pageSize = 9) => {
    const decryptedUserId = (0, dbEncryption_1.decryptIdToNumber)(userId);
    if (!decryptedUserId)
        throw new errors_1.AppError('Invalid user ID', 400);
    const safePage = page || 1;
    const safePageSize = pageSize || 9;
    const offset = (safePage - 1) * safePageSize;
    const cleanTags = (Array.isArray(tags) ? tags : [tags]).filter((t) => t && String(t).trim() !== '');
    const whereClause = { user_id: decryptedUserId, is_deleted: false };
    if (cleanTags.length > 0) {
        whereClause.tagMappings = {
            some: { tag: { name: { in: cleanTags }, user_id: decryptedUserId } },
        };
    }
    const [total, contacts] = await Promise.all([
        contactModel_1.ContactModel.count({ where: whereClause }),
        contactModel_1.ContactModel.findMany({
            where: whereClause,
            orderBy: { firstName: 'asc' },
            skip: offset,
            take: safePageSize,
            include: { tagMappings: { include: { tag: true } } },
        }),
    ]);
    const formattedContacts = contacts.map((c) => ({
        uid: (0, dbEncryption_1.encryptId)(c.pk_id),
        firstName: c.firstName,
        lastName: c.lastName,
        phone: c.phone,
        email: c.email,
        is_favorite: c.is_favorite,
        tags: (c.tagMappings || []).map((tm) => ({ uid: (0, dbEncryption_1.encryptId)(tm.tag.pk_id), name: tm.tag.name })),
    }));
    return { contacts: formattedContacts, total };
};
exports.getDashboardContacts = getDashboardContacts;
const getGroupsStatistics = async (userId) => {
    try {
        const decryptedUserId = (0, dbEncryption_1.decryptIdToNumber)(userId);
        if (!decryptedUserId)
            throw new errors_1.AppError('Invalid user ID', 400);
        const groups = await groupModel_1.GroupModel.findMany({
            where: { user_id: decryptedUserId, is_deleted: false },
            include: { members: { where: { contact: { is_deleted: false } } } },
            take: 10,
        });
        const group_data = groups
            .map((g) => ({ name: g.name, count: g.members.length }))
            .sort((a, b) => b.count - a.count);
        const tags = await contactModel_1.ContactTagModel.findMany({
            where: { user_id: decryptedUserId },
            include: { tagMappings: { where: { contact: { is_deleted: false } } } },
            take: 8,
        });
        const tag_data = tags
            .map((t) => ({ name: t.name, count: t.tagMappings.length }))
            .sort((a, b) => b.count - a.count);
        return { group_data, tag_data };
    }
    catch (error) {
        console.error('getGroupsStatistics - Error:', error instanceof Error ? error.message : error);
        return { group_data: [], tag_data: [] };
    }
};
exports.getGroupsStatistics = getGroupsStatistics;
//# sourceMappingURL=dashboardService.js.map