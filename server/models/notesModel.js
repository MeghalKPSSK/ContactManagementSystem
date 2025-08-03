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
            const { 
                user_id, 
                title, 
                content, 
                note_type = 'personal', 
                contact_id = null, 
                group_id = null, 
                is_important = false,
                keywords = []
            } = noteData;

            const userId = await encryptionInstance.dbDecryptID(user_id);
            const contactIdDecrypted = contact_id ? await encryptionInstance.dbDecryptID(contact_id) : null;
            const groupIdDecrypted = group_id ? await encryptionInstance.dbDecryptID(group_id) : null;

            // Validate note type constraints
            if (note_type === 'contact' && !contactIdDecrypted) {
                throw new Error('Contact ID is required for contact notes');
            }
            if (note_type === 'group' && !groupIdDecrypted) {
                throw new Error('Group ID is required for group notes');
            }
            if (note_type === 'personal' && (contactIdDecrypted || groupIdDecrypted)) {
                throw new Error('Personal notes cannot have contact or group references');
            }

            const params = [
                userId,
                title,
                content,
                note_type,
                contactIdDecrypted,
                groupIdDecrypted,
                is_important
            ];

            const [result] = await pool.execute(`
                INSERT INTO notes (user_id, title, content, note_type, contact_id, group_id, is_important) 
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, params);

            const noteId = result.insertId;

            // Add keywords if provided
            if (keywords && keywords.length > 0) {
                await addNoteKeywords(noteId, keywords);
            }

            return noteId;
        } catch (error) {
            console.error(`Error creating note: ${error}`);
            throw error;
        }
    };

    const addNoteKeywords = async (noteId, keywords) => {
        try {
            const uniqueKeywords = [...new Set(keywords.map(k => k.toLowerCase().trim()))];
            
            for (const keyword of uniqueKeywords) {
                if (keyword) {
                    await pool.execute(`
                        INSERT IGNORE INTO note_keywords (note_id, keyword) 
                        VALUES (?, ?)
                    `, [noteId, keyword]);
                }
            }
        } catch (error) {
            console.error(`Error adding keywords: ${error}`);
            throw error;
        }
    };

    const getNoteById = async (noteId) => {
        try {
            const [notes] = await pool.execute(`
                SELECT 
                    encryptId(n.pk_id) AS uid,
                    encryptId(n.user_id) AS user_id,
                    n.title,
                    n.content,
                    n.note_type,
                    encryptId(n.contact_id) AS contact_id,
                    encryptId(n.group_id) AS group_id,
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
                // Get keywords for this note
                const [keywords] = await pool.execute(`
                    SELECT keyword
                    FROM note_keywords
                    WHERE note_id = decryptId(?)
                    ORDER BY keyword
                `, [noteId]);

                notes[0].keywords = keywords.map(k => k.keyword);
                return notes[0];
            }

            return null;
        } catch (error) {
            console.error('Error fetching note:', error);
            throw error;
        }
    };

    const getNotesList = async (userId, filters = {}, page = 1, pageSize = 10) => {
        try {
            const { 
                note_type, 
                contact_id, 
                group_id, 
                search, 
                is_important,
                keyword
            } = filters;

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

            return {
                notes: rows,
                total: totalRows[0].total,
                page,
                pageSize
            };
        } catch (error) {
            console.error(`Error fetching notes list: ${error}`);
            throw error;
        }
    };

    const updateNote = async (noteId, noteData) => {
        try {
            const { 
                title, 
                content, 
                note_type, 
                contact_id, 
                group_id, 
                is_important,
                keywords = []
            } = noteData;

            const contactIdDecrypted = contact_id ? await encryptionInstance.dbDecryptID(contact_id) : null;
            const groupIdDecrypted = group_id ? await encryptionInstance.dbDecryptID(group_id) : null;

            // Validate note type constraints
            if (note_type === 'contact' && !contactIdDecrypted) {
                throw new Error('Contact ID is required for contact notes');
            }
            if (note_type === 'group' && !groupIdDecrypted) {
                throw new Error('Group ID is required for group notes');
            }
            if (note_type === 'personal' && (contactIdDecrypted || groupIdDecrypted)) {
                throw new Error('Personal notes cannot have contact or group references');
            }

            const params = [
                title,
                content,
                note_type,
                contactIdDecrypted,
                groupIdDecrypted,
                is_important,
                noteId
            ];

            const [result] = await pool.execute(`
                UPDATE notes 
                SET title = ?, content = ?, note_type = ?, contact_id = ?, 
                    group_id = ?, is_important = ?, modifiedOn = CURRENT_TIMESTAMP
                WHERE pk_id = decryptId(?) AND is_deleted = 0
            `, params);

            if (result.affectedRows > 0) {
                // Update keywords
                const noteIdDecrypted = await encryptionInstance.dbDecryptID(noteId);
                await pool.execute('DELETE FROM note_keywords WHERE note_id = ?', [noteIdDecrypted]);
                
                if (keywords && keywords.length > 0) {
                    await addNoteKeywords(noteIdDecrypted, keywords);
                }
            }

            return result.affectedRows > 0;
        } catch (error) {
            console.error(`Error updating note: ${error}`);
            throw error;
        }
    };

    const deleteNote = async (noteId) => {
        try {
            const [result] = await pool.execute(`
                UPDATE notes 
                SET is_deleted = 1, modifiedOn = CURRENT_TIMESTAMP
                WHERE pk_id = decryptId(?) AND is_deleted = 0
            `, [noteId]);

            return result.affectedRows > 0;
        } catch (error) {
            console.error(`Error deleting note: ${error}`);
            throw error;
        }
    };

    const getNotesStats = async (userId) => {
        try {
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

            return stats[0];
        } catch (error) {
            console.error('Error fetching notes stats:', error);
            throw error;
        }
    };

    const searchNotesByKeyword = async (userId, keyword, page = 1, pageSize = 10) => {
        try {
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

            return {
                notes: rows,
                total: totalRows[0].total,
                page,
                pageSize
            };
        } catch (error) {
            console.error('Error searching notes by keyword:', error);
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
