const express = require('express');
const router = express.Router();
const notesModel = require('../models/notesModel');
const encryption = require('../utils/dbEncryption');

let notesModelInstance;
let encryptionInstance;

// Initialize the encryption instance
(async () => {
    encryptionInstance = await encryption();
})();

// Initialize the notesModel instance
(async () => {
    notesModelInstance = await notesModel();
})();

// Create a new note
router.post('/createNote', async (req, res) => {
    try {
        console.log('📝 Notes API: Creating new note...');
        const noteData = req.body;
        const { title, content, note_type, user_id, color } = noteData;

        console.log(`📝 Notes API: User ${user_id} creating ${note_type || 'personal'} note: "${title}" with color: ${color || 'blue'}`);

        // Validate required fields
        if (!title || !content || !user_id) {
            console.warn('⚠️ Notes API: Missing required fields for note creation');
            return res.status(400).json({ 
                success: false, 
                message: 'Title, content, and user_id are required' 
            });
        }

        // Validate note_type
        const validNoteTypes = ['personal', 'contact', 'group'];
        if (note_type && !validNoteTypes.includes(note_type)) {
            console.warn(`⚠️ Notes API: Invalid note type: ${note_type}`);
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid note type. Must be personal, contact, or group' 
            });
        }

        // Validate color
        const validColors = ['pink', 'blue', 'green', 'yellow', 'purple'];
        if (color && !validColors.includes(color)) {
            console.warn(`⚠️ Notes API: Invalid color: ${color}`);
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid color. Must be pink, blue, green, yellow, or purple' 
            });
        }

        const noteId = await notesModelInstance.createNote(noteData);
        const encryptedNoteId = await encryptionInstance.dbEncryptID(noteId);
        
        console.log(`✅ Notes API: Note created successfully with ID: ${encryptedNoteId}`);
        res.status(201).json({ 
            success: true, 
            uid: encryptedNoteId, 
            message: 'Note created successfully' 
        });
    } catch (error) {
        console.error('❌ Notes API: Error creating note:', error.message);
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Error creating note' 
        });
    }
});

// Get list of notes with filtering and pagination
router.get('/notesList', async (req, res) => {
    try {
        console.log('📋 Notes API: Fetching notes list...');
        const { 
            userId, 
            note_type, 
            contact_id, 
            group_id, 
            search, 
            is_important,
            keyword,
            page = 1, 
            pageSize = 10 
        } = req.query;

        console.log(`📋 Notes API: User ${userId}, type: ${note_type || 'all'}, page: ${page}, search: "${search || 'none'}"`);

        if (!userId) {
            console.warn('⚠️ Notes API: Missing userId in notes list request');
            return res.status(400).json({ 
                success: false, 
                message: 'User ID is required' 
            });
        }

        const filters = {
            note_type,
            contact_id,
            group_id,
            search,
            is_important: is_important !== undefined ? is_important === 'true' : undefined,
            keyword
        };

        const result = await notesModelInstance.getNotesList(
            userId, 
            filters, 
            parseInt(page), 
            parseInt(pageSize)
        );

        console.log(`✅ Notes API: Retrieved ${result.notes.length} notes (total: ${result.total})`);
        res.status(200).json({
            success: true,
            notes: result.notes,
            pagination: {
                current: result.page,
                pageSize: result.pageSize,
                total: result.total
            },
            message: 'Notes list retrieved successfully'
        });
    } catch (error) {
        console.error('❌ Notes API: Error retrieving notes list:', error.message);
        res.status(500).json({ 
            success: false, 
            message: 'Error retrieving notes' 
        });
    }
});

// Get note by ID
router.get('/note/:id', async (req, res) => {
    try {
        console.log('📖 Notes API: Fetching note by ID...');
        const noteId = req.params.id;
        console.log(`📖 Notes API: Requested note ID: ${noteId}`);
        
        const note = await notesModelInstance.getNoteById(noteId);

        if (!note) {
            console.warn(`⚠️ Notes API: Note not found with ID: ${noteId}`);
            return res.status(404).json({ 
                success: false, 
                message: 'Note not found' 
            });
        }

        console.log(`✅ Notes API: Note retrieved: "${note.title}"`);
        res.status(200).json({ 
            success: true, 
            note 
        });
    } catch (error) {
        console.error('❌ Notes API: Error retrieving note:', error.message);
        res.status(500).json({ 
            success: false, 
            message: 'Error retrieving note' 
        });
    }
});

// Update note
router.put('/updateNote/:id', async (req, res) => {
    try {
        console.log('✏️ Notes API: Updating note...');
        const noteId = req.params.id;
        const noteData = req.body;
        const { title, content, color } = noteData;

        console.log(`✏️ Notes API: Updating note ID: ${noteId}, new title: "${title}", color: ${color || 'unchanged'}`);

        // Validate required fields
        if (!title || !content) {
            console.warn('⚠️ Notes API: Missing required fields for note update');
            return res.status(400).json({ 
                success: false, 
                message: 'Title and content are required' 
            });
        }

        // Validate color if provided
        const validColors = ['pink', 'blue', 'green', 'yellow', 'purple'];
        if (color && !validColors.includes(color)) {
            console.warn(`⚠️ Notes API: Invalid color: ${color}`);
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid color. Must be pink, blue, green, yellow, or purple' 
            });
        }

        const result = await notesModelInstance.updateNote(noteId, noteData);

        if (result) {
            console.log(`✅ Notes API: Note updated successfully: ${noteId}`);
            res.status(200).json({ 
                success: true, 
                message: 'Note updated successfully' 
            });
        } else {
            console.warn(`⚠️ Notes API: Note not found or no changes made: ${noteId}`);
            res.status(404).json({ 
                success: false, 
                message: 'Note not found or no changes made' 
            });
        }
    } catch (error) {
        console.error('❌ Notes API: Error updating note:', error.message);
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Error updating note' 
        });
    }
});

// Delete note (soft delete)
router.delete('/deleteNote/:id', async (req, res) => {
    try {
        console.log('🗑️ Notes API: Deleting note...');
        const noteId = req.params.id;
        console.log(`🗑️ Notes API: Deleting note ID: ${noteId}`);
        
        const result = await notesModelInstance.deleteNote(noteId);
        
        if (result) {
            console.log(`✅ Notes API: Note deleted successfully: ${noteId}`);
            res.status(200).json({ 
                success: true, 
                message: 'Note deleted successfully' 
            });
        } else {
            console.warn(`⚠️ Notes API: Note not found for deletion: ${noteId}`);
            res.status(404).json({ 
                success: false, 
                message: 'Note not found' 
            });
        }
    } catch (error) {
        console.error('❌ Notes API: Error deleting note:', error.message);
        res.status(500).json({ 
            success: false, 
            message: 'Error deleting note' 
        });
    }
});

// Get notes statistics
router.get('/notesStats/:userId', async (req, res) => {
    try {
        console.log('📊 Notes API: Fetching notes statistics...');
        const userId = req.params.userId;
        console.log(`📊 Notes API: Getting stats for user: ${userId}`);
        
        const stats = await notesModelInstance.getNotesStats(userId);

        console.log(`✅ Notes API: Statistics retrieved for user ${userId}`);
        res.status(200).json({
            success: true,
            stats,
            message: 'Notes statistics retrieved successfully'
        });
    } catch (error) {
        console.error('❌ Notes API: Error retrieving notes statistics:', error.message);
        res.status(500).json({ 
            success: false, 
            message: 'Error retrieving notes statistics' 
        });
    }
});

// Search notes by keyword
router.get('/searchNotes', async (req, res) => {
    try {
        console.log('🔍 Notes API: Searching notes...');
        const { userId, keyword, page = 1, pageSize = 10 } = req.query;

        console.log(`🔍 Notes API: User ${userId} searching for: "${keyword}"`);

        if (!userId || !keyword) {
            console.warn('⚠️ Notes API: Missing userId or keyword for search');
            return res.status(400).json({ 
                success: false, 
                message: 'User ID and keyword are required' 
            });
        }

        const result = await notesModelInstance.searchNotesByKeyword(
            userId, 
            keyword, 
            parseInt(page), 
            parseInt(pageSize)
        );

        console.log(`✅ Notes API: Search completed - found ${result.notes.length} notes for "${keyword}"`);
        res.status(200).json({
            success: true,
            notes: result.notes,
            pagination: {
                current: result.page,
                pageSize: result.pageSize,
                total: result.total
            },
            searchKeyword: keyword,
            message: 'Notes search completed successfully'
        });
    } catch (error) {
        console.error('❌ Notes API: Error searching notes:', error.message);
        res.status(500).json({ 
            success: false, 
            message: 'Error searching notes' 
        });
    }
});

// Get notes for a specific contact
router.get('/contactNotes/:contactId', async (req, res) => {
    try {
        console.log('👤 Notes API: Fetching contact notes...');
        const { contactId } = req.params;
        const { userId, page = 1, pageSize = 10 } = req.query;

        console.log(`👤 Notes API: Getting notes for contact ${contactId}, user ${userId}`);

        if (!userId) {
            console.warn('⚠️ Notes API: Missing userId for contact notes request');
            return res.status(400).json({ 
                success: false, 
                message: 'User ID is required' 
            });
        }

        const filters = {
            note_type: 'contact',
            contact_id: contactId
        };

        const result = await notesModelInstance.getNotesList(
            userId, 
            filters, 
            parseInt(page), 
            parseInt(pageSize)
        );

        console.log(`✅ Notes API: Retrieved ${result.notes.length} notes for contact ${contactId}`);
        res.status(200).json({
            success: true,
            notes: result.notes,
            pagination: {
                current: result.page,
                pageSize: result.pageSize,
                total: result.total
            },
            contactId,
            message: 'Contact notes retrieved successfully'
        });
    } catch (error) {
        console.error('❌ Notes API: Error retrieving contact notes:', error.message);
        res.status(500).json({ 
            success: false, 
            message: 'Error retrieving contact notes' 
        });
    }
});

// Get notes for a specific group
router.get('/groupNotes/:groupId', async (req, res) => {
    try {
        console.log('👥 Notes API: Fetching group notes...');
        const { groupId } = req.params;
        const { userId, page = 1, pageSize = 10 } = req.query;

        console.log(`👥 Notes API: Getting notes for group ${groupId}, user ${userId}`);

        if (!userId) {
            console.warn('⚠️ Notes API: Missing userId for group notes request');
            return res.status(400).json({ 
                success: false, 
                message: 'User ID is required' 
            });
        }

        const filters = {
            note_type: 'group',
            group_id: groupId
        };

        const result = await notesModelInstance.getNotesList(
            userId, 
            filters, 
            parseInt(page), 
            parseInt(pageSize)
        );

        console.log(`✅ Notes API: Retrieved ${result.notes.length} notes for group ${groupId}`);
        res.status(200).json({
            success: true,
            notes: result.notes,
            pagination: {
                current: result.page,
                pageSize: result.pageSize,
                total: result.total
            },
            groupId,
            message: 'Group notes retrieved successfully'
        });
    } catch (error) {
        console.error('❌ Notes API: Error retrieving group notes:', error.message);
        res.status(500).json({ 
            success: false, 
            message: 'Error retrieving group notes' 
        });
    }
});

// Toggle note importance
router.patch('/toggleImportant/:id', async (req, res) => {
    try {
        console.log('⭐ Notes API: Toggling note importance...');
        const noteId = req.params.id;
        const { is_important } = req.body;

        console.log(`⭐ Notes API: Setting note ${noteId} importance to: ${is_important}`);

        if (is_important === undefined) {
            console.warn('⚠️ Notes API: Missing is_important field');
            return res.status(400).json({ 
                success: false, 
                message: 'is_important field is required' 
            });
        }

        const noteData = { is_important };
        const result = await notesModelInstance.updateNote(noteId, noteData);

        if (result) {
            console.log(`✅ Notes API: Note importance toggled successfully: ${noteId}`);
            res.status(200).json({ 
                success: true, 
                message: `Note marked as ${is_important ? 'important' : 'normal'}` 
            });
        } else {
            console.warn(`⚠️ Notes API: Note not found for importance toggle: ${noteId}`);
            res.status(404).json({ 
                success: false, 
                message: 'Note not found' 
            });
        }
    } catch (error) {
        console.error('❌ Notes API: Error toggling note importance:', error.message);
        res.status(500).json({ 
            success: false, 
            message: 'Error updating note importance' 
        });
    }
});

// Update note color
router.patch('/updateColor/:id', async (req, res) => {
    try {
        console.log('🎨 Notes API: Updating note color...');
        const noteId = req.params.id;
        const { color } = req.body;

        console.log(`🎨 Notes API: Setting note ${noteId} color to: ${color}`);

        if (!color) {
            console.warn('⚠️ Notes API: Missing color field');
            return res.status(400).json({ 
                success: false, 
                message: 'color field is required' 
            });
        }

        // Validate color
        const validColors = ['pink', 'blue', 'green', 'yellow', 'purple'];
        if (!validColors.includes(color)) {
            console.warn(`⚠️ Notes API: Invalid color: ${color}`);
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid color. Must be pink, blue, green, yellow, or purple' 
            });
        }

        const noteData = { color };
        const result = await notesModelInstance.updateNote(noteId, noteData);

        if (result) {
            console.log(`✅ Notes API: Note color updated successfully: ${noteId} to ${color}`);
            res.status(200).json({ 
                success: true, 
                message: `Note color updated to ${color}` 
            });
        } else {
            console.warn(`⚠️ Notes API: Note not found for color update: ${noteId}`);
            res.status(404).json({ 
                success: false, 
                message: 'Note not found' 
            });
        }
    } catch (error) {
        console.error('❌ Notes API: Error updating note color:', error.message);
        res.status(500).json({ 
            success: false, 
            message: 'Error updating note color' 
        });
    }
});

// Add highlight to a note
router.post('/addHighlight/:noteId', async (req, res) => {
    try {
        console.log('🎨 Notes API: Adding highlight to note...');
        const { noteId } = req.params;
        const { selectedText, start, end, color = 'yellow' } = req.body;

        console.log(`🎨 Notes API: Adding highlight to note ${noteId}: "${selectedText}" (${start}-${end}) in ${color}`);

        if (!selectedText || start === undefined || end === undefined) {
            console.warn('⚠️ Notes API: Missing required highlight data');
            return res.status(400).json({
                success: false,
                message: 'Selected text, start position, and end position are required'
            });
        }

        if (start < 0 || end <= start) {
            console.warn('⚠️ Notes API: Invalid highlight positions');
            return res.status(400).json({
                success: false,
                message: 'Invalid highlight positions'
            });
        }

        const noteIdDecrypted = await encryptionInstance.dbDecryptID(noteId);
        await notesModelInstance.addNoteHighlight(noteIdDecrypted, selectedText, start, end, color);

        console.log(`✅ Notes API: Highlight added successfully to note ${noteId}`);
        res.status(201).json({
            success: true,
            message: 'Highlight added successfully'
        });
    } catch (error) {
        console.error('❌ Notes API: Error adding highlight:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error adding highlight'
        });
    }
});

// Remove highlight from a note
router.delete('/removeHighlight/:noteId', async (req, res) => {
    try {
        console.log('🗑️ Notes API: Removing highlight from note...');
        const { noteId } = req.params;
        const { start, end } = req.body;

        console.log(`🗑️ Notes API: Removing highlight from note ${noteId} at position ${start}-${end}`);

        if (start === undefined || end === undefined) {
            console.warn('⚠️ Notes API: Missing highlight position data');
            return res.status(400).json({
                success: false,
                message: 'Start and end positions are required'
            });
        }

        const noteIdDecrypted = await encryptionInstance.dbDecryptID(noteId);
        const removed = await notesModelInstance.removeNoteHighlight(noteIdDecrypted, start, end);

        if (removed) {
            console.log(`✅ Notes API: Highlight removed successfully from note ${noteId}`);
            res.status(200).json({
                success: true,
                message: 'Highlight removed successfully'
            });
        } else {
            console.warn(`⚠️ Notes API: Highlight not found in note ${noteId} at position ${start}-${end}`);
            res.status(404).json({
                success: false,
                message: 'Highlight not found'
            });
        }
    } catch (error) {
        console.error('❌ Notes API: Error removing highlight:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error removing highlight'
        });
    }
});

// Get highlights for a note
router.get('/getHighlights/:noteId', async (req, res) => {
    try {
        console.log('🎨 Notes API: Fetching highlights for note...');
        const { noteId } = req.params;

        console.log(`🎨 Notes API: Fetching highlights for note ${noteId}`);

        const highlights = await notesModelInstance.getNoteHighlights(noteId);

        console.log(`✅ Notes API: Retrieved ${highlights.length} highlights for note ${noteId}`);
        res.status(200).json({
            success: true,
            highlights: highlights,
            message: 'Highlights retrieved successfully'
        });
    } catch (error) {
        console.error('❌ Notes API: Error fetching highlights:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error fetching highlights'
        });
    }
});

module.exports = router;
