const initDB = require('../db');
const encryption = require('../utils/dbEncryption');

let encryptionInstance;
// Initialize the encryption instance
(async () => {
    encryptionInstance = await encryption();
})();

const groupModel = async () => {
    const pool = await initDB();

    const groupSave = async (groupData) => {
        try {
            let { user_id, name, description,  group_icon } = groupData;
            const userId = await encryptionInstance.dbDecryptID(user_id);

            const params = [
                userId || null, 
                name || null,
                description || null,
                group_icon || null
            ];

            const [result] = await pool.execute(
                `INSERT INTO \`groups\` (user_id, name, description, group_icon) VALUES (?, ?, ?, ?)`,
                [...params]
            );

            const groupId = result.insertId;
            console.log(`Group created with ID: ${groupId}`);


            return groupId;
        } catch (error) {
            console.error(`Error creating group: ${error}`);
            throw error;
        }
    };

    const getGroupById = async (groupId) => {
        try {
            const [group] = await pool.execute(
                `SELECT 
                    encryptId(pk_id) AS uid,
                    name,
                    description,
                    group_icon,
                    (SELECT encryptId(user_id)) AS user_id
                FROM \`groups\`
                WHERE pk_id = decryptId(?) AND is_deleted = 0`,
                [groupId]
            );

            if (group && group[0]) {
                const [members] = await pool.execute(
                    `SELECT 
                        encryptId(c.pk_id) AS uid,
                        c.firstName,
                        c.lastName,
                        c.email
                    FROM contacts c
                    JOIN group_members gm ON c.pk_id = gm.contact_id
                    WHERE gm.group_id = decryptId(?)`,
                    [groupId]
                );
                group[0].members = members || [];
            }

            return group[0];
        } catch (error) {
            console.error('Error fetching group:', error);
            throw error;
        }
    };

    const getGroupsList = async (userId, filter, page = 1) => {
        try {
            const pageSize = 10;
            const offset = (page - 1) * pageSize;
            const filterCheck = filter ? filter : '';

            const [totalRows] = await pool.query(
                `SELECT COUNT(*) as total 
                FROM \`groups\` 
                WHERE user_id = decryptId(?) 
                AND CASE 
                    WHEN IFNULL(?,'') != '' 
                    THEN (name LIKE ?) 
                    ELSE 1=1 
                END
                AND is_deleted = 0`,
                [userId, filterCheck, `%${filterCheck}%`]
            );

            const [rows] = await pool.query(
                `SELECT 
                    encryptId(g.pk_id) AS uid,
                    g.name AS name,
                    g.createdOn AS createdOn,
                    g.modifiedOn AS modifiedOn,
                    g.group_icon AS group_icon,
                    g.description AS description,
                    (SELECT encryptId(g.user_id)) AS user_id,
                    COUNT(m.pk_id) AS group_members
                FROM \`groups\` g
                LEFT JOIN group_members m ON m.group_id =g.pk_id
                WHERE user_id = decryptId(?)
                AND CASE 
                    WHEN IFNULL(?,'') != '' 
                    THEN (name LIKE ?) 
                    ELSE 1=1 
                END
                AND g.is_deleted = 0
                GROUP BY g.pk_id
                ORDER BY g.pk_id DESC
                LIMIT ? OFFSET ?`,
                [userId, filterCheck, `%${filterCheck}%`, pageSize, offset]
            );

            return {
                groups: rows,
                total: totalRows[0].total,
                page,
                pageSize
            };
        } catch (error) {
            console.error(`Error fetching groups list: ${error}`);
            throw error;
        }
    };

    const deleteGroup = async (groupId) => {
        try {
            const [result] = await pool.execute(
                `UPDATE \`groups\` SET is_deleted = 1 WHERE pk_id = decryptId(?)`,
                [groupId]
            );
            return result.affectedRows > 0;
        } catch (error) {
            console.error(`Error deleting group: ${error}`);
            throw error;
        }
    };

    const updateGroup = async (groupId, groupData) => {
        try {
            const { name, description, group_icon } = groupData;

            let query = 'UPDATE `groups` SET name = ?, modifiedOn = CURRENT_TIMESTAMP, description = ?';
            const params = [name, description];

            if (group_icon) {
                query += ', group_icon = ?';
                params.push(group_icon);
            }

            query += ' WHERE pk_id = decryptId(?) AND is_deleted = 0';
            params.push(groupId);

            const [result] = await pool.execute(query, params);

            return result.affectedRows > 0;
        } catch (error) {
            console.error(`Error updating group: ${error}`);
            throw error;
        }
    };

    return {
        groupSave,
        getGroupById,
        getGroupsList,
        deleteGroup,
        updateGroup
    };
};

module.exports = groupModel;