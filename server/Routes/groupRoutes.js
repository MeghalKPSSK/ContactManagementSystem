const express = require('express');
const router = express.Router();
const groupModel = require('../models/groupModel');
const encryption = require('../utils/dbEncryption');

const groupIconUpload = require('../utils/groupIconUpload');

let groupModelInstance;
let encryptionInstance;

// Initialize the encryption instance
(async () => {
    encryptionInstance = await encryption();
})();

// Initialize the groupModel instance
(async () => {
    groupModelInstance = await groupModel();
})();

// Add a new group
router.post('/groupSave', groupIconUpload.single('group_icon'), async (req, res) => {
    try {
        const groupData = req.body;
        if (req.file) {
            groupData.group_icon = req.file.filename;
        }
        const groupId = await encryptionInstance.dbEncryptID(await groupModelInstance.groupSave(groupData));
        console.log(`Group created with ID: ${groupId}`);
        res.status(201).json({ success: true, uid: groupId, message: 'Group added successfully' });
    } catch (error) {
        console.error('Error adding group:', error);
        res.status(500).json({ success: false, message: 'Error adding group' });
    }
});

const groupSave = async (groupData) => {
    try {
        const { user_id, name, description, members } = groupData;

        if (!user_id || !name || !Array.isArray(members)) {
            throw new Error('Invalid input data');
        }

        const userId = await encryptionInstance.dbDecryptID(user_id);

        const [result] = await pool.execute(
            `INSERT INTO \`groups\` (user_id, name, description) VALUES (?, ?, ?)`,
            [userId, name, description]
        );

        const groupId = result.insertId;

        // Use batch insert for members
        await batchInsertMembers(groupId, members);

        return groupId;
    } catch (error) {
        console.error(`Error creating group: ${error}`);
        throw error;
    }
};

const batchInsertMembers = async (groupId, members) => {
    const batchSize = 100; // Adjust batch size as needed
    for (let i = 0; i < members.length; i += batchSize) {
        const batch = members.slice(i, i + batchSize);
        const values = [];
        for (const memberId of batch) {
            const decryptedId = await encryptionInstance.dbDecryptID(memberId);
            values.push([groupId, decryptedId]);
        }
        await pool.query(
            `INSERT INTO group_members (group_id, contact_id) VALUES ?`,
            [values]
        );
    }
};

// Get list of groups
router.get('/groupsList', async (req, res) => {
    try {
        const { userId, filter, page = 1 } = req.query;
        const result = await groupModelInstance.getGroupsList(userId, filter, parseInt(page));
        res.status(200).json({
            success: true,
            groups: result.groups,
            pagination: {
                current: result.page,
                pageSize: result.pageSize,
                total: result.total
            },
            message: 'Groups list retrieved successfully'
        });
    } catch (error) {
        console.error('Error retrieving groups:', error);
        res.status(500).json({ success: false, message: 'Error retrieving groups' });
    }
});

// Get group by ID
router.get('/group/:id', async (req, res) => {
    try {
        const group = await groupModelInstance.getGroupById(req.params.id);

        if (!group) {
            return res.status(404).json({ success: false, message: 'Group not found' });
        }

        res.status(200).json({ success: true, group });
    } catch (error) {
        console.error('Error retrieving group:', error);
        res.status(500).json({ success: false, message: 'Error retrieving group' });
    }
});

// Delete group by ID
router.delete('/deleteGroup/:id', async (req, res) => {
    try {
        const groupId = req.params.id;
        console.log(`Group UID for Deletion: ${groupId}`);
        const result = await groupModelInstance.deleteGroup(groupId);
        if (result) {
            res.status(200).json({ success: true, message: 'Group deleted successfully' });
        } else {
            res.status(404).json({ success: false, message: 'Group not found' });
        }
    } catch (error) {
        console.error('Error deleting group:', error);
        res.status(500).json({ success: false, message: 'Error deleting group' });
    }
});

// Update group
router.put('/updateGroup/:id', (req, res, next) => {
    // Check if request has file upload (multipart) or JSON
    if (req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data')) {
        groupIconUpload.single('group_icon')(req, res, next);
    } else {
        next();
    }
}, async (req, res) => {
    try {
        const groupData = req.body;
        if (req.file) {
            groupData.group_icon = req.file.filename;
        }
        if (typeof groupData.members === 'string') {
            groupData.members = JSON.parse(groupData.members);
        }
        const result = await groupModelInstance.updateGroup(req.params.id, groupData);

        if (result) {
            res.status(200).json({ success: true, message: 'Group updated successfully' });
        } else {
            res.status(404).json({ success: false, message: 'Group not found' });
        }
    } catch (error) {
        console.error('Error updating group:', error);
        res.status(500).json({ success: false, message: 'Error updating group' });
    }
});

// Add members to a group
router.post('/addMembers/:groupId', async (req, res) => {
    try {
        const { groupId } = req.params;
        const { memberIds } = req.body;

        if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
            return res.status(400).json({ success: false, message: 'Invalid member IDs provided' });
        }

        const result = await groupModelInstance.addGroupMembers(groupId, memberIds);

        if (result) {
            res.status(200).json({ 
                success: true, 
                message: `${memberIds.length} member${memberIds.length !== 1 ? 's' : ''} added successfully` 
            });
        } else {
            res.status(500).json({ success: false, message: 'Failed to add members' });
        }
    } catch (error) {
        console.error('Error adding members:', error);
        res.status(500).json({ success: false, message: 'Error adding members' });
    }
});

// Remove a member from a group
router.delete('/removeMember/:groupId/:memberId', async (req, res) => {
    try {
        const { groupId, memberId } = req.params;

        const result = await groupModelInstance.removeGroupMember(groupId, memberId);

        if (result) {
            res.status(200).json({ success: true, message: 'Member removed successfully' });
        } else {
            res.status(404).json({ success: false, message: 'Member not found in group' });
        }
    } catch (error) {
        console.error('Error removing member:', error);
        res.status(500).json({ success: false, message: 'Error removing member' });
    }
});

module.exports = router;