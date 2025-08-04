const initDB = require('../db');
const encryption = require('../utils/dbEncryption');

let encryptionInstance;
// Initialize the encryption instance
(async () => {
    encryptionInstance = await encryption();
})();

const notesModel = async () => {
    const pool = await initDB();

    const createNote = async (noteData) => {
        try {
            console.log('📝 Notes Model: Creating new note...');
            const { 
                user_id, 
                title, 
                content, 
                note_type = 'personal', 
                contact_id = null, 
                group_id = null, 
                color = 'blue',
                is_important = false,
                keywords = []
            } = noteData;

            console.log(`📝 Notes Model: Note details - Type: ${note_type}, Title: "${title}", Keywords: ${keywords.length}`);

            const userId = await encryptionInstance.dbDecryptID(user_id);
            const contactIdDecrypted = contact_id ? await encryptionInstance.dbDecryptID(contact_id) : null;
            const groupIdDecrypted = group_id ? await encryptionInstance.dbDecryptID(group_id) : null;

            // Validate note type constraints
            if (note_type === 'contact' && !contactIdDecrypted) {
                console.warn('⚠️ Notes Model: Contact ID required for contact note but missing');
                throw new Error('Contact ID is required for contact notes');
            }
            if (note_type === 'group' && !groupIdDecrypted) {
                console.warn('⚠️ Notes Model: Group ID required for group note but missing');
                throw new Error('Group ID is required for group notes');
            }
            if (note_type === 'personal' && (contactIdDecrypted || groupIdDecrypted)) {
                console.warn('⚠️ Notes Model: Personal note cannot have contact/group references');
                throw new Error('Personal notes cannot have contact or group references');
            }

            const params = [
                userId,
                title,
                content,
                note_type,
                contactIdDecrypted,
                groupIdDecrypted,
                color,
                is_important
            ];

            const [result] = await pool.execute(`
                INSERT INTO notes (user_id, title, content, note_type, contact_id, group_id, color, is_important) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, params);

            const noteId = result.insertId;

            // Add keywords if provided
            if (keywords && keywords.length > 0) {
                console.log(`📝 Notes Model: Adding ${keywords.length} keywords to note ${noteId}`);
                const keywordList = keywords.map(keywordItem => {
                    if (typeof keywordItem === 'string') {
                        return keywordItem;
                    } else {
                        return keywordItem.keyword || keywordItem;
                    }
                }).filter(Boolean);
                
                if (keywordList.length > 0) {
                    await addNoteKeywords(noteId, keywordList);
                }
            }

            console.log(`✅ Notes Model: Note created successfully with ID: ${noteId}`);
            return noteId;
        } catch (error) {
            console.error('❌ Notes Model: Error creating note:', error.message);
            throw error;
        }
    };

    const addNoteKeywords = async (noteId, keywords) => {
        try {
            console.log(`🏷️ Notes Model: Adding keywords to note ${noteId}...`);
            const uniqueKeywords = [...new Set(keywords.map(k => k.toLowerCase().trim()))];
            console.log(`🏷️ Notes Model: Processing ${uniqueKeywords.length} unique keywords`);
            
            for (const keyword of uniqueKeywords) {
                if (keyword) {
                    await pool.execute(`
                        INSERT IGNORE INTO note_keywords (note_id, keyword) 
                        VALUES (?, ?)
                    `, [noteId, keyword]);
                }
            }
            console.log(`✅ Notes Model: Keywords added successfully to note ${noteId}`);
        } catch (error) {
            console.error('❌ Notes Model: Error adding keywords:', error.message);
            throw error;
        }
    };

    const getNoteById = async (noteId) => {
        try {
            console.log('📖 Notes Model: Fetching note by ID...');
            console.log(`📖 Notes Model: Requested note ID: ${noteId}`);
            const [notes] = await pool.execute(`
                SELECT 
                    encryptId(n.pk_id) AS uid,
                    encryptId(n.user_id) AS user_id,
                    n.title,
                    n.content,
                    n.note_type,
                    encryptId(n.contact_id) AS contact_id,
                    encryptId(n.group_id) AS group_id,
                    n.color,
                    n.is_important,
                    n.createdOn,
                    n.modifiedOn,
                    c.firstName as contact_first_name,
                    c.lastName as contact_last_name,
                    g.name as group_name
                FROM notes n
                LEFT JOIN contacts c ON n.contact_id = c.pk_id
                LEFT JOIN \`groups\` g ON n.group_id = g.pk_id
                WHERE n.pk_id = decryptId(?) AND n.is_deleted = 0
            `, [noteId]);

            if (notes && notes[0]) {
                console.log(`📖 Notes Model: Note found: "${notes[0].title}"`);
                // Get keywords for this note
                const [keywordData] = await pool.execute(`
                    SELECT keyword
                    FROM note_keywords
                    WHERE note_id = decryptId(?)
                    ORDER BY keyword
                `, [noteId]);

                // Transform keyword data into simple format
                notes[0].keywords = keywordData.map(k => k.keyword);
                
                console.log(`✅ Notes Model: Note retrieved with ${keywordData.length} keywords`);
                return notes[0];
            }

            console.warn(`⚠️ Notes Model: Note not found with ID: ${noteId}`);
            return null;
        } catch (error) {
            console.error('❌ Notes Model: Error fetching note:', error.message);
            throw error;
        }
    };

    const getNotesList = async (userId, filters = {}, page = 1, pageSize = 10) => {
        try {
            console.log('📋 Notes Model: Fetching notes list...');
            const { 
                note_type, 
                contact_id, 
                group_id, 
                search, 
                is_important,
                keyword
            } = filters;

            console.log(`📋 Notes Model: Filters - Type: ${note_type || 'all'}, Search: "${search || 'none'}", Page: ${page}`);

            const offset = (page - 1) * pageSize;
            let whereConditions = ['n.user_id = decryptId(?)', 'n.is_deleted = 0'];
            let params = [userId];

            // Build dynamic WHERE clause
            if (note_type) {
                whereConditions.push('n.note_type = ?');
                params.push(note_type);
            }

            if (contact_id) {
                whereConditions.push('n.contact_id = decryptId(?)');
                params.push(contact_id);
            }

            if (group_id) {
                whereConditions.push('n.group_id = decryptId(?)');
                params.push(group_id);
            }

            if (is_important !== undefined) {
                whereConditions.push('n.is_important = ?');
                params.push(is_important);
            }

            if (search) {
                whereConditions.push('(n.title LIKE ? OR n.content LIKE ?)');
                params.push(`%${search}%`, `%${search}%`);
            }

            if (keyword) {
                whereConditions.push('n.pk_id IN (SELECT note_id FROM note_keywords WHERE keyword LIKE ?)');
                params.push(`%${keyword}%`);
            }

            const whereClause = whereConditions.join(' AND ');

            // Get total count
            const [totalRows] = await pool.query(`
                SELECT COUNT(*) as total 
                FROM notes n
                WHERE ${whereClause}
            `, params);

            // Get paginated data
            const [rows] = await pool.query(`
                SELECT 
                    encryptId(n.pk_id) AS uid,
                    n.title,
                    LEFT(n.content, 200) as content_preview,
                    n.note_type,
                    encryptId(n.contact_id) AS contact_id,
                    encryptId(n.group_id) AS group_id,
                    n.color,
                    n.is_important,
                    n.createdOn,
                    n.modifiedOn,
                    c.firstName as contact_first_name,
                    c.lastName as contact_last_name,
                    g.name as group_name
                FROM notes n
                LEFT JOIN contacts c ON n.contact_id = c.pk_id
                LEFT JOIN \`groups\` g ON n.group_id = g.pk_id
                WHERE ${whereClause}
                ORDER BY n.is_important DESC, n.modifiedOn DESC
                LIMIT ? OFFSET ?
            `, [...params, pageSize, offset]);

            console.log(`✅ Notes Model: Retrieved ${rows.length} notes (total: ${totalRows[0].total})`);
            return {
                notes: rows,
                total: totalRows[0].total,
                page,
                pageSize
            };
        } catch (error) {
            console.error('❌ Notes Model: Error fetching notes list:', error.message);
            throw error;
        }
    };

    const updateNote = async (noteId, noteData) => {
        try {
            console.log('✏️ Notes Model: Updating note...');
            const { 
                title, 
                content, 
                note_type, 
                contact_id, 
                group_id, 
                color,
                is_important,
                keywords = []
            } = noteData;

            console.log(`✏️ Notes Model: Updating note ${noteId}, title: "${title}", Keywords: ${keywords.length}`);

            const contactIdDecrypted = contact_id ? await encryptionInstance.dbDecryptID(contact_id) : null;
            const groupIdDecrypted = group_id ? await encryptionInstance.dbDecryptID(group_id) : null;

            // Validate note type constraints
            if (note_type === 'contact' && !contactIdDecrypted) {
                console.warn('⚠️ Notes Model: Contact ID required for contact note but missing');
                throw new Error('Contact ID is required for contact notes');
            }
            if (note_type === 'group' && !groupIdDecrypted) {
                console.warn('⚠️ Notes Model: Group ID required for group note but missing');
                throw new Error('Group ID is required for group notes');
            }
            if (note_type === 'personal' && (contactIdDecrypted || groupIdDecrypted)) {
                console.warn('⚠️ Notes Model: Personal note cannot have contact/group references');
                throw new Error('Personal notes cannot have contact or group references');
            }

            const params = [
                title,
                content,
                note_type,
                contactIdDecrypted,
                groupIdDecrypted,
                color,
                is_important,
                noteId
            ];

            const [result] = await pool.execute(`
                UPDATE notes 
                SET title = ?, content = ?, note_type = ?, contact_id = ?, 
                    group_id = ?, color = ?, is_important = ?, modifiedOn = CURRENT_TIMESTAMP
                WHERE pk_id = decryptId(?) AND is_deleted = 0
            `, params);

            if (result.affectedRows > 0) {
                console.log(`✏️ Notes Model: Note updated successfully, updating keywords...`);
                // Update keywords - clear all existing ones first
                const noteIdDecrypted = await encryptionInstance.dbDecryptID(noteId);
                await pool.execute('DELETE FROM note_keywords WHERE note_id = ?', [noteIdDecrypted]);
                
                // Add keywords
                if (keywords && keywords.length > 0) {
                    console.log(`✏️ Notes Model: Adding ${keywords.length} keywords to note ${noteId}`);
                    const keywordList = keywords.map(keywordItem => {
                        if (typeof keywordItem === 'string') {
                            return keywordItem;
                        } else {
                            return keywordItem.keyword || keywordItem;
                        }
                    }).filter(Boolean);
                    
                    if (keywordList.length > 0) {
                        await addNoteKeywords(noteIdDecrypted, keywordList);
                    }
                }
                
                console.log(`✅ Notes Model: Note and keywords updated successfully`);
            } else {
                console.warn(`⚠️ Notes Model: No note found to update or no changes made: ${noteId}`);
            }

            return result.affectedRows > 0;
        } catch (error) {
            console.error('❌ Notes Model: Error updating note:', error.message);
            throw error;
        }
    };

    const deleteNote = async (noteId) => {
        try {
            console.log('🗑️ Notes Model: Deleting note...');
            console.log(`🗑️ Notes Model: Soft deleting note ID: ${noteId}`);
            const [result] = await pool.execute(`
                UPDATE notes 
                SET is_deleted = 1, modifiedOn = CURRENT_TIMESTAMP
                WHERE pk_id = decryptId(?) AND is_deleted = 0
            `, [noteId]);

            if (result.affectedRows > 0) {
                console.log(`✅ Notes Model: Note deleted successfully: ${noteId}`);
            } else {
                console.warn(`⚠️ Notes Model: Note not found for deletion: ${noteId}`);
            }

            return result.affectedRows > 0;
        } catch (error) {
            console.error('❌ Notes Model: Error deleting note:', error.message);
            throw error;
        }
    };

    const getNotesStats = async (userId) => {
        try {
            console.log('📊 Notes Model: Fetching notes statistics...');
            console.log(`📊 Notes Model: Getting stats for user: ${userId}`);
            const [stats] = await pool.execute(`
                SELECT 
                    COUNT(*) as total_notes,
                    SUM(CASE WHEN is_important = 1 THEN 1 ELSE 0 END) as important_notes,
                    SUM(CASE WHEN note_type = 'personal' THEN 1 ELSE 0 END) as personal_notes,
                    SUM(CASE WHEN note_type = 'contact' THEN 1 ELSE 0 END) as contact_notes,
                    SUM(CASE WHEN note_type = 'group' THEN 1 ELSE 0 END) as group_notes
                FROM notes
                WHERE user_id = decryptId(?) AND is_deleted = 0
            `, [userId]);

            console.log(`✅ Notes Model: Statistics retrieved - Total: ${stats[0].total_notes}, Important: ${stats[0].important_notes}`);
            return stats[0];
        } catch (error) {
            console.error('❌ Notes Model: Error fetching notes stats:', error.message);
            throw error;
        }
    };

    const searchNotesByKeyword = async (userId, keyword, page = 1, pageSize = 10) => {
        try {
            console.log('🔍 Notes Model: Searching notes by keyword...');
            console.log(`🔍 Notes Model: User ${userId} searching for: "${keyword}"`);
            const offset = (page - 1) * pageSize;

            const [totalRows] = await pool.query(`
                SELECT COUNT(DISTINCT n.pk_id) as total
                FROM notes n
                JOIN note_keywords nk ON n.pk_id = nk.note_id
                WHERE n.user_id = decryptId(?) 
                AND n.is_deleted = 0
                AND nk.keyword LIKE ?
            `, [userId, `%${keyword}%`]);

            const [rows] = await pool.query(`
                SELECT DISTINCT
                    encryptId(n.pk_id) AS uid,
                    n.title,
                    LEFT(n.content, 200) as content_preview,
                    n.note_type,
                    n.is_important,
                    n.createdOn,
                    GROUP_CONCAT(nk.keyword) as matched_keywords
                FROM notes n
                JOIN note_keywords nk ON n.pk_id = nk.note_id
                WHERE n.user_id = decryptId(?) 
                AND n.is_deleted = 0
                AND nk.keyword LIKE ?
                GROUP BY n.pk_id
                ORDER BY n.is_important DESC, n.modifiedOn DESC
                LIMIT ? OFFSET ?
            `, [userId, `%${keyword}%`, pageSize, offset]);

            console.log(`✅ Notes Model: Search completed - found ${rows.length} notes for "${keyword}"`);
            return {
                notes: rows,
                total: totalRows[0].total,
                page,
                pageSize
            };
        } catch (error) {
            console.error('❌ Notes Model: Error searching notes by keyword:', error.message);
            throw error;
        }
    };

    return {
        createNote,
        getNoteById,
        getNotesList,
        updateNote,
        deleteNote,
        getNotesStats,
        searchNotesByKeyword
    };
};

module.exports = notesModel;
