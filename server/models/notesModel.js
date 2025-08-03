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

            // Add keywords (including highlights) if provided
            if (keywords && keywords.length > 0) {
                console.log(`📝 Notes Model: Adding ${keywords.length} keywords to note ${noteId}`);
                for (const keywordItem of keywords) {
                    if (typeof keywordItem === 'string') {
                        // Regular keyword
                        await addNoteKeywords(noteId, [keywordItem]);
                    } else if (keywordItem.highlight_start !== null && keywordItem.highlight_start !== undefined) {
                        // Highlight keyword (legacy format)
                        await addNoteHighlight(
                            noteId, 
                            keywordItem.keyword, 
                            keywordItem.highlight_start, 
                            keywordItem.highlight_end, 
                            keywordItem.highlight_color || 'yellow'
                        );
                    } else if (keywordItem.isHighlight) {
                        // Highlight keyword (new format)
                        await addNoteHighlight(
                            noteId, 
                            keywordItem.keyword, 
                            keywordItem.start, 
                            keywordItem.end, 
                            keywordItem.color || 'yellow'
                        );
                    } else {
                        // Regular keyword object
                        await addNoteKeywords(noteId, [keywordItem.keyword || keywordItem]);
                    }
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

    const addNoteHighlight = async (noteId, selectedText, start, end, color = 'yellow') => {
        try {
            console.log(`🎨 Notes Model: Adding highlight to note ${noteId}...`);
            console.log(`🎨 Notes Model: Highlighting "${selectedText}" from ${start} to ${end} in ${color}`);
            
            const trimmedText = selectedText.trim();
            if (!trimmedText) {
                throw new Error('Selected text cannot be empty');
            }

            await pool.execute(`
                INSERT INTO note_keywords (note_id, keyword, highlight_start, highlight_end, highlight_color) 
                VALUES (?, ?, ?, ?, ?)
            `, [noteId, trimmedText, start, end, color]);
            
            console.log(`✅ Notes Model: Highlight added successfully to note ${noteId}`);
        } catch (error) {
            console.error('❌ Notes Model: Error adding highlight:', error.message);
            throw error;
        }
    };

    const removeNoteHighlight = async (noteId, start, end) => {
        try {
            console.log(`🗑️ Notes Model: Removing highlight from note ${noteId} at position ${start}-${end}...`);
            
            const [result] = await pool.execute(`
                DELETE FROM note_keywords 
                WHERE note_id = ? AND highlight_start = ? AND highlight_end = ?
            `, [noteId, start, end]);

            if (result.affectedRows > 0) {
                console.log(`✅ Notes Model: Highlight removed successfully from note ${noteId}`);
            } else {
                console.warn(`⚠️ Notes Model: No highlight found to remove at position ${start}-${end}`);
            }

            return result.affectedRows > 0;
        } catch (error) {
            console.error('❌ Notes Model: Error removing highlight:', error.message);
            throw error;
        }
    };

    const getNoteHighlights = async (noteId) => {
        try {
            console.log(`🎨 Notes Model: Fetching highlights for note ${noteId}...`);
            
            const [highlights] = await pool.execute(`
                SELECT keyword, highlight_start, highlight_end, highlight_color
                FROM note_keywords
                WHERE note_id = decryptId(?) AND highlight_start IS NOT NULL
                ORDER BY highlight_start ASC
            `, [noteId]);

            console.log(`✅ Notes Model: Retrieved ${highlights.length} highlights for note ${noteId}`);
            return highlights.map(h => ({
                keyword: h.keyword,
                start: h.highlight_start,
                end: h.highlight_end,
                color: h.highlight_color || 'yellow'
            }));
        } catch (error) {
            console.error('❌ Notes Model: Error fetching highlights:', error.message);
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
                // Get all keywords (including highlights) for this note
                const [keywordData] = await pool.execute(`
                    SELECT keyword, highlight_start, highlight_end, highlight_color
                    FROM note_keywords
                    WHERE note_id = decryptId(?)
                    ORDER BY highlight_start ASC, keyword
                `, [noteId]);

                // Transform all keyword data into unified format
                notes[0].keywords = keywordData.map(k => ({
                    keyword: k.keyword,
                    isHighlight: k.highlight_start !== null,
                    start: k.highlight_start,
                    end: k.highlight_end,
                    color: k.highlight_color || 'yellow'
                }));
                
                console.log(`✅ Notes Model: Note retrieved with ${keywordData.length} keywords (including highlights)`);
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
                
                // Add all keywords (regular and highlights)
                if (keywords && keywords.length > 0) {
                    console.log(`✏️ Notes Model: Adding ${keywords.length} keywords to note ${noteId}`);
                    for (const keywordItem of keywords) {
                        if (typeof keywordItem === 'string') {
                            // Regular keyword
                            await addNoteKeywords(noteIdDecrypted, [keywordItem]);
                        } else if (keywordItem.highlight_start !== null && keywordItem.highlight_start !== undefined) {
                            // Highlight keyword (legacy format)
                            await addNoteHighlight(
                                noteIdDecrypted, 
                                keywordItem.keyword, 
                                keywordItem.highlight_start, 
                                keywordItem.highlight_end, 
                                keywordItem.highlight_color || 'yellow'
                            );
                        } else if (keywordItem.isHighlight) {
                            // Highlight keyword (new format)
                            await addNoteHighlight(
                                noteIdDecrypted, 
                                keywordItem.keyword, 
                                keywordItem.start, 
                                keywordItem.end, 
                                keywordItem.color || 'yellow'
                            );
                        } else {
                            // Regular keyword object
                            await addNoteKeywords(noteIdDecrypted, [keywordItem.keyword || keywordItem]);
                        }
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
        searchNotesByKeyword,
        addNoteHighlight,
        removeNoteHighlight,
        getNoteHighlights
    };
};

module.exports = notesModel;
