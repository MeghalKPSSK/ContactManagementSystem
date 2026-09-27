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
exports.removeGroupMember = exports.addGroupMembers = exports.updateGroup = exports.maybeParseGroupIcon = exports.deleteGroup = exports.getGroup = exports.listGroups = exports.saveGroup = void 0;
const imageStorage_1 = require("../lib/imageStorage");
const groupService = __importStar(require("../services/groupService"));
const dbEncryption_1 = require("../utils/dbEncryption");
const errors_1 = require("../utils/errors");
const http_1 = require("../utils/http");
const saveGroup = async (req, res) => {
    try {
        const groupData = req.body;
        if (req.file) {
            groupData.group_icon = await (0, imageStorage_1.persistUploadedImage)(req.file, 'groups');
        }
        const groupId = (0, dbEncryption_1.encryptId)(await groupService.groupSave(groupData));
        console.log(`Group created with ID: ${groupId}`);
        res.status(201).json({ success: true, uid: groupId, message: 'Group added successfully' });
    }
    catch (error) {
        console.error('Error adding group:', error);
        res.status((0, errors_1.getErrorStatus)(error)).json({ success: false, message: 'Error adding group' });
    }
};
exports.saveGroup = saveGroup;
const listGroups = async (req, res) => {
    try {
        const { userId, filter, page = '1', pageSize = '10' } = req.query;
        const result = await groupService.getGroupsList(userId, filter, parseInt(page, 10), parseInt(pageSize, 10));
        res.status(200).json({
            success: true,
            groups: result.items,
            pagination: { current: result.page, pageSize: result.pageSize, total: result.total },
            message: 'Groups list retrieved successfully',
        });
    }
    catch (error) {
        console.error('Error retrieving groups:', error);
        res.status((0, errors_1.getErrorStatus)(error)).json({ success: false, message: 'Error retrieving groups' });
    }
};
exports.listGroups = listGroups;
const getGroup = async (req, res) => {
    try {
        const requestedPage = Number.parseInt(String(req.query.page || '1'), 10);
        const requestedPageSize = Number.parseInt(String(req.query.pageSize || '10'), 10);
        const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
        const pageSize = [10, 20, 50, 100].includes(requestedPageSize) ? requestedPageSize : 10;
        const group = await groupService.getGroupById((0, http_1.paramStr)(req.params.id), page, pageSize);
        if (!group) {
            res.status(404).json({ success: false, message: 'Group not found' });
            return;
        }
        res.status(200).json({
            success: true,
            group,
            pagination: { current: page, pageSize, total: group.membersTotal },
        });
    }
    catch (error) {
        console.error('Error retrieving group:', error);
        res.status((0, errors_1.getErrorStatus)(error)).json({ success: false, message: 'Error retrieving group' });
    }
};
exports.getGroup = getGroup;
const deleteGroup = async (req, res) => {
    try {
        const groupId = (0, http_1.paramStr)(req.params.id);
        console.log(`Group UID for Deletion: ${groupId}`);
        const result = await groupService.deleteGroup(groupId);
        if (result) {
            res.status(200).json({ success: true, message: 'Group deleted successfully' });
        }
        else {
            res.status(404).json({ success: false, message: 'Group not found' });
        }
    }
    catch (error) {
        console.error('Error deleting group:', error);
        res.status((0, errors_1.getErrorStatus)(error)).json({ success: false, message: 'Error deleting group' });
    }
};
exports.deleteGroup = deleteGroup;
// Only runs multipart parsing when the request is multipart/form-data; otherwise passes through to updateGroup.
const maybeParseGroupIcon = (upload) => {
    return (req, res, next) => {
        if (req.headers['content-type']?.includes('multipart/form-data')) {
            upload.single('group_icon')(req, res, next);
        }
        else {
            next();
        }
    };
};
exports.maybeParseGroupIcon = maybeParseGroupIcon;
const updateGroup = async (req, res) => {
    try {
        const groupData = req.body;
        if (req.file) {
            groupData.group_icon = await (0, imageStorage_1.persistUploadedImage)(req.file, 'groups');
        }
        else if (Object.prototype.hasOwnProperty.call(groupData, 'group_icon') && groupData.group_icon === '') {
            groupData.group_icon = null;
        }
        if (typeof groupData.members === 'string') {
            groupData.members = JSON.parse(groupData.members);
        }
        const result = await groupService.updateGroup((0, http_1.paramStr)(req.params.id), groupData);
        if (result) {
            res.status(200).json({ success: true, message: 'Group updated successfully' });
        }
        else {
            res.status(404).json({ success: false, message: 'Group not found' });
        }
    }
    catch (error) {
        console.error('Error updating group:', error);
        res.status((0, errors_1.getErrorStatus)(error)).json({ success: false, message: 'Error updating group' });
    }
};
exports.updateGroup = updateGroup;
const addGroupMembers = async (req, res) => {
    try {
        const groupId = (0, http_1.paramStr)(req.params.groupId);
        const { memberIds } = req.body;
        if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
            res.status(400).json({ success: false, message: 'Invalid member IDs provided' });
            return;
        }
        const result = await groupService.addGroupMembers(groupId, memberIds);
        if (result) {
            res.status(200).json({
                success: true,
                message: `${memberIds.length} member${memberIds.length !== 1 ? 's' : ''} added successfully`,
            });
        }
        else {
            res.status(500).json({ success: false, message: 'Failed to add members' });
        }
    }
    catch (error) {
        console.error('Error adding members:', error);
        res.status((0, errors_1.getErrorStatus)(error)).json({ success: false, message: 'Error adding members' });
    }
};
exports.addGroupMembers = addGroupMembers;
const removeGroupMember = async (req, res) => {
    try {
        const groupId = (0, http_1.paramStr)(req.params.groupId);
        const memberId = (0, http_1.paramStr)(req.params.memberId);
        const result = await groupService.removeGroupMember(groupId, memberId);
        if (result) {
            res.status(200).json({ success: true, message: 'Member removed successfully' });
        }
        else {
            res.status(404).json({ success: false, message: 'Member not found in group' });
        }
    }
    catch (error) {
        console.error('Error removing member:', error);
        res.status((0, errors_1.getErrorStatus)(error)).json({ success: false, message: 'Error removing member' });
    }
};
exports.removeGroupMember = removeGroupMember;
//# sourceMappingURL=groupController.js.map