"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeGroupMember = exports.addGroupMembers = exports.updateGroup = exports.deleteGroup = exports.getGroupsList = exports.getGroupById = exports.groupSave = void 0;
const groupModel_1 = require("../models/groupModel");
const dbEncryption_1 = require("../utils/dbEncryption");
const errors_1 = require("../utils/errors");
const groupSave = async (groupData) => {
    const { user_id, name, description, group_icon } = groupData;
    const decryptedUserId = (0, dbEncryption_1.decryptIdToNumber)(user_id);
    if (!decryptedUserId)
        throw new errors_1.AppError('Invalid user ID', 400);
    const newGroup = await groupModel_1.GroupModel.create({
        data: {
            user_id: decryptedUserId,
            name: name || '',
            description: description || null,
            group_icon: group_icon || null,
        },
    });
    console.log(`Group created with ID: ${newGroup.pk_id}`);
    return newGroup.pk_id;
};
exports.groupSave = groupSave;
const getGroupById = async (groupId) => {
    const decryptedGroupId = (0, dbEncryption_1.decryptIdToNumber)(groupId);
    if (!decryptedGroupId)
        return null;
    const group = await groupModel_1.GroupModel.findFirst({
        where: { pk_id: decryptedGroupId, is_deleted: false },
        include: {
            members: {
                include: {
                    contact: { select: { pk_id: true, firstName: true, lastName: true, email: true } },
                },
            },
        },
    });
    if (!group)
        return null;
    const members = (group.members || []).map((m) => ({
        uid: (0, dbEncryption_1.encryptId)(m.contact.pk_id),
        firstName: m.contact.firstName,
        lastName: m.contact.lastName,
        email: m.contact.email,
    }));
    return {
        uid: (0, dbEncryption_1.encryptId)(group.pk_id),
        name: group.name,
        description: group.description,
        group_icon: group.group_icon,
        user_id: (0, dbEncryption_1.encryptId)(group.user_id),
        members,
    };
};
exports.getGroupById = getGroupById;
const getGroupsList = async (userId, filter = '', page = 1, pageSize = 10) => {
    const decryptedUserId = (0, dbEncryption_1.decryptIdToNumber)(userId);
    if (!decryptedUserId)
        throw new errors_1.AppError('Invalid user ID', 400);
    const offset = (page - 1) * pageSize;
    const filterCheck = filter ? String(filter).trim() : '';
    const whereClause = { user_id: decryptedUserId, is_deleted: false };
    if (filterCheck) {
        whereClause.name = { contains: filterCheck };
    }
    const [total, groups] = await Promise.all([
        groupModel_1.GroupModel.count({ where: whereClause }),
        groupModel_1.GroupModel.findMany({
            where: whereClause,
            orderBy: { pk_id: 'desc' },
            skip: offset,
            take: pageSize,
            include: { _count: { select: { members: true } } },
        }),
    ]);
    const items = groups.map((g) => ({
        uid: (0, dbEncryption_1.encryptId)(g.pk_id),
        name: g.name,
        createdOn: g.createdOn,
        modifiedOn: g.modifiedOn,
        group_icon: g.group_icon,
        description: g.description,
        user_id: (0, dbEncryption_1.encryptId)(g.user_id),
        group_members: g._count.members,
    }));
    return { items, total, page, pageSize };
};
exports.getGroupsList = getGroupsList;
const deleteGroup = async (groupId) => {
    const decryptedGroupId = (0, dbEncryption_1.decryptIdToNumber)(groupId);
    if (!decryptedGroupId)
        return false;
    const deleted = await groupModel_1.GroupModel.update({
        where: { pk_id: decryptedGroupId },
        data: { is_deleted: true },
    });
    return !!deleted;
};
exports.deleteGroup = deleteGroup;
const updateGroup = async (groupId, groupData) => {
    const decryptedGroupId = (0, dbEncryption_1.decryptIdToNumber)(groupId);
    if (!decryptedGroupId)
        throw new errors_1.AppError('Invalid group ID', 400);
    const { name, description, group_icon } = groupData;
    const dataToUpdate = {
        name,
        description: description !== undefined ? description : undefined,
        modifiedOn: new Date(),
    };
    if (group_icon !== undefined) {
        dataToUpdate.group_icon = group_icon;
    }
    const updated = await groupModel_1.GroupModel.update({
        where: { pk_id: decryptedGroupId },
        data: dataToUpdate,
    });
    return !!updated;
};
exports.updateGroup = updateGroup;
const addGroupMembers = async (groupId, memberIds) => {
    if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
        throw new errors_1.AppError('Invalid member IDs provided', 400);
    }
    const decryptedGroupId = (0, dbEncryption_1.decryptIdToNumber)(groupId);
    if (!decryptedGroupId)
        throw new errors_1.AppError('Invalid group ID', 400);
    for (const memberId of memberIds) {
        const decryptedContactId = (0, dbEncryption_1.decryptIdToNumber)(memberId);
        if (!decryptedContactId)
            continue;
        const existing = await groupModel_1.GroupMemberModel.findFirst({
            where: { group_id: decryptedGroupId, contact_id: decryptedContactId },
        });
        if (!existing) {
            await groupModel_1.GroupMemberModel.create({
                data: { group_id: decryptedGroupId, contact_id: decryptedContactId },
            });
        }
    }
    return true;
};
exports.addGroupMembers = addGroupMembers;
const removeGroupMember = async (groupId, memberId) => {
    const decryptedGroupId = (0, dbEncryption_1.decryptIdToNumber)(groupId);
    const decryptedContactId = (0, dbEncryption_1.decryptIdToNumber)(memberId);
    if (!decryptedGroupId || !decryptedContactId)
        return false;
    const deleted = await groupModel_1.GroupMemberModel.deleteMany({
        where: { group_id: decryptedGroupId, contact_id: decryptedContactId },
    });
    return deleted.count > 0;
};
exports.removeGroupMember = removeGroupMember;
//# sourceMappingURL=groupService.js.map