const initDB = require('../db');
const encryption = require('../utils/dbEncryption');

let encryptionInstance;
(async () => {
    encryptionInstance = await encryption();
})();

const dashboardModel = async () => {
    const pool = await initDB();

    const getTagsDistribution = async (userId) => {
        try {
            const [rows] = await pool.execute(`
                SELECT 
                    t.name,
                    COUNT(ctm.contact_id) as count
                FROM contact_tags t
                LEFT JOIN contact_tag_mapping ctm ON t.pk_id = ctm.tag_id
                LEFT JOIN contacts c ON ctm.contact_id = c.pk_id
                WHERE t.user_id = decryptId(?)
                AND c.is_deleted = 0
                GROUP BY t.pk_id, t.name
                ORDER BY count DESC
            `, [userId]);

            return {
                counts: rows.map(row => row.count),
                labels: rows.map(row => row.name)
            };
        } catch (error) {
            console.error('Error getting tags distribution:', error);
            throw error;
        }
    };

    const getFavoritesCount = async (userId) => {
        try {
            const [rows] = await pool.execute(`
                SELECT 
                    SUM(CASE WHEN is_favorite = 1 THEN 1 ELSE 0 END) as favorite,
                    SUM(CASE WHEN is_favorite = 0 THEN 1 ELSE 0 END) as regular
                FROM contacts
                WHERE user_id = decryptId(?)
                AND is_deleted = 0
            `, [userId]);

            return {
                favorite: parseInt(rows[0].favorite) || 0,
                regular: parseInt(rows[0].regular) || 0
            };
        } catch (error) {
            console.error('Error getting favorites count:', error);
            throw error;
        }
    };

    const getDashboardContacts = async (userId, tags = [], page = 1, pageSize = 9) => {
        const logContext = {
            function: 'getDashboardContacts',
            userId: userId.substring(0, 8) + '...', // Log only first 8 chars of userId for privacy
            tagsCount: tags.length,
            page,
            pageSize
        };

        try {
            // Log input parameters
            console.log('[Dashboard] Input parameters:', JSON.stringify(logContext));

            // Parameter processing
            const safeUserId = String(userId);
            const safePage = parseInt(page, 10) || 1;
            const safePageSize = parseInt(pageSize, 10) || 9;
            const offset = (safePage - 1) * safePageSize;

            // Base query construction
            let baseQuery = `
                SELECT DISTINCT
                    c.pk_id,
                    c.firstName,
                    c.lastName,
                    c.phone,
                    c.email,
                    c.is_favorite
                FROM contacts c
                WHERE c.user_id = decryptId(?)
                AND c.is_deleted = 0
            `;
            let params = [safeUserId];

            // Add tag filtering if needed
            if (tags?.length > 0 && tags[0] !== '') {
                console.log('[Dashboard] Applying tag filters:', JSON.stringify({ 
                    tagCount: tags.length,
                    tags: tags.join(', ')
                }));

                baseQuery += ` AND c.pk_id IN (
                    SELECT DISTINCT ctm.contact_id 
                    FROM contact_tag_mapping ctm 
                    JOIN contact_tags t ON ctm.tag_id = t.pk_id 
                    WHERE t.name IN (${tags.map(() => '?').join(',')})
                    AND t.user_id = decryptId(?)
                )`;
                params = [...params, ...tags, safeUserId];
            }

            // Execute count query
            console.time(`[Dashboard] Count query for ${logContext.userId}`);
            const [totalRows] = await pool.query(
                `SELECT COUNT(DISTINCT temp.pk_id) as total FROM (${baseQuery}) temp`,
                params
            );
            console.timeEnd(`[Dashboard] Count query for ${logContext.userId}`);

            // Add pagination
            baseQuery += ` ORDER BY c.firstName LIMIT ? OFFSET ?`;
            params.push(safePageSize, offset);

            // Execute main query
            console.time(`[Dashboard] Main query for ${logContext.userId}`);
            const [contacts] = await pool.query(baseQuery, params);
            console.timeEnd(`[Dashboard] Main query for ${logContext.userId}`);

            console.log('[Dashboard] Query results:', JSON.stringify({
                totalContacts: contacts.length,
                totalInDB: totalRows[0].total,
                page: safePage,
                pageSize: safePageSize
            }));

            // Process contacts and fetch tags
            console.time(`[Dashboard] Process contacts for ${logContext.userId}`);
            const contactsWithTags = await Promise.all(
                contacts.map(async (contact) => {
                    const encryptedId = await encryptionInstance.dbEncryptID(contact.pk_id);
                    
                    // Fetch tags for contact
                    const [contactTags] = await pool.query(`
                        SELECT t.pk_id, t.name
                        FROM contact_tags t
                        JOIN contact_tag_mapping ctm ON t.pk_id = ctm.tag_id
                        WHERE ctm.contact_id = ?
                        AND t.user_id = decryptId(?)
                    `, [contact.pk_id, safeUserId]);

                    const tagsWithEncryptedIds = await Promise.all(
                        contactTags.map(async (tag) => ({
                            uid: await encryptionInstance.dbEncryptID(tag.pk_id),
                            name: tag.name
                        }))
                    );

                    return {
                        uid: encryptedId,
                        firstName: contact.firstName,
                        lastName: contact.lastName,
                        phone: contact.phone,
                        email: contact.email,
                        is_favorite: contact.is_favorite,
                        tags: tagsWithEncryptedIds
                    };
                })
            );
            console.timeEnd(`[Dashboard] Process contacts for ${logContext.userId}`);

            return {
                contacts: contactsWithTags,
                total: totalRows[0].total
            };

        } catch (error) {
            console.error('[Dashboard] Error:', JSON.stringify({
                ...logContext,
                error: error.message,
                stack: error.stack?.split('\n')[0] // Log only first line of stack trace
            }));
            throw error;
        }
    };

    const getGroupsStatistics = async (userId) => {
        const endpoint = '[MODEL] getGroupsStatistics';
        console.log(`${endpoint} - Request received for userId: ${userId.substring(0, 8)}...`);
        
        try {
            let groupContactsData = [];
            let tagContactsData = [];
            
            // Get group-wise contact counts (for line chart)
            console.log(`${endpoint} - Fetching group-wise contact counts`);
            try {
                const [groupContactsResult] = await pool.execute(`
                    SELECT 
                        g.name as group_name,
                        COUNT(DISTINCT gm.contact_id) as contact_count
                    FROM \`groups\` g
                    LEFT JOIN group_members gm ON g.pk_id = gm.group_id
                    LEFT JOIN contacts c ON gm.contact_id = c.pk_id
                    WHERE g.user_id = decryptId(?)
                    AND g.is_deleted = 0
                    AND (c.is_deleted = 0 OR c.is_deleted IS NULL)
                    GROUP BY g.pk_id, g.name
                    ORDER BY contact_count DESC
                    LIMIT 10
                `, [userId]);
                
                groupContactsData = groupContactsResult;
                console.log(`${endpoint} - Group contacts query success: Found ${groupContactsData.length} groups with contacts`);
                
            } catch (groupContactsError) {
                console.error(`${endpoint} - Group contacts query error:`, groupContactsError.message);
                groupContactsData = [];
            }

            // Get tag-wise contact counts (for bar chart)
            console.log(`${endpoint} - Fetching tag-wise contact counts`);
            try {
                const [tagContactsResult] = await pool.execute(`
                    SELECT 
                        t.name as tag_name,
                        COUNT(DISTINCT ctm.contact_id) as contact_count
                    FROM contact_tags t
                    LEFT JOIN contact_tag_mapping ctm ON t.pk_id = ctm.tag_id
                    LEFT JOIN contacts c ON ctm.contact_id = c.pk_id
                    WHERE t.user_id = decryptId(?)
                    AND c.is_deleted = 0
                    GROUP BY t.pk_id, t.name
                    ORDER BY contact_count DESC
                    LIMIT 8
                `, [userId]);
                
                tagContactsData = tagContactsResult;
                console.log(`${endpoint} - Tag contacts query success: Found ${tagContactsData.length} tags with contacts`);
                
            } catch (tagContactsError) {
                console.error(`${endpoint} - Tag contacts query error:`, tagContactsError.message);
                tagContactsData = [];
            }

            // Return structured data for multi-chart display
            const result = {
                group_data: groupContactsData.map(item => ({
                    name: item.group_name,
                    count: parseInt(item.contact_count) || 0
                })),
                tag_data: tagContactsData.map(item => ({
                    name: item.tag_name,
                    count: parseInt(item.contact_count) || 0
                }))
            };
            
            console.log(`${endpoint} - Success: Returning ${result.group_data.length} groups, ${result.tag_data.length} tags`);
            return result;
            
        } catch (error) {
            console.error(`${endpoint} - Fatal error:`, error.message);
            console.error(`${endpoint} - Error stack:`, error.stack);
            
            // Return empty data structure
            const fallbackResult = {
                group_data: [],
                tag_data: []
            };
            
            console.log(`${endpoint} - Returning fallback data due to error`);
            return fallbackResult;
        }
    };

    return {
        getTagsDistribution,
        getFavoritesCount,
        getDashboardContacts,
        getGroupsStatistics
    };
};

module.exports = dashboardModel;