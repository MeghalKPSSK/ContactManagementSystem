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
        const noteData = req.body;
        const { title, content, note_type, user_id } = noteData;

        // Validate required fields
        if (!title || !content || !user_id) {
            return res.status(400).json({ 
                success: false, 
                message: 'Title, content, and user_id are required' 
            });
        }

        // Validate note_type
        const validNoteTypes = ['personal', 'contact', 'group'];
        if (note_type && !validNoteTypes.includes(note_type)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid note type. Must be personal, contact, or group' 
            });
        }

        const noteId = await notesModelInstance.createNote(noteData);
        const encryptedNoteId = await encryptionInstance.dbEncryptID(noteId);
        
        console.log(`Note created with ID: ${encryptedNoteId}`);
        res.status(201).json({ 
            success: true, 
            uid: encryptedNoteId, 
            message: 'Note created successfully' 
        });
    } catch (error) {
        console.error('Error creating note:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Error creating note' 
        });
    }
});

// Get list of notes with filtering and pagination
router.get('/notesList', async (req, res) => {
    try {
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

        if (!userId) {
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
        console.error('Error retrieving notes:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error retrieving notes' 
        });
    }
});

// Get note by ID
router.get('/note/:id', async (req, res) => {
    try {
        const noteId = req.params.id;
        const note = await notesModelInstance.getNoteById(noteId);

        if (!note) {
            return res.status(404).json({ 
                success: false, 
                message: 'Note not found' 
            });
        }

        res.status(200).json({ 
            success: true, 
            note 
        });
    } catch (error) {
        console.error('Error retrieving note:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error retrieving note' 
        });
    }
});

// Update note
router.put('/updateNote/:id', async (req, res) => {
    try {
        const noteId = req.params.id;
        const noteData = req.body;
        const { title, content } = noteData;

        // Validate required fields
        if (!title || !content) {
            return res.status(400).json({ 
                success: false, 
                message: 'Title and content are required' 
            });
        }

        const result = await notesModelInstance.updateNote(noteId, noteData);

        if (result) {
            res.status(200).json({ 
                success: true, 
                message: 'Note updated successfully' 
            });
        } else {
            res.status(404).json({ 
                success: false, 
                message: 'Note not found or no changes made' 
            });
        }
    } catch (error) {
        console.error('Error updating note:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Error updating note' 
        });
    }
});

// Delete note (soft delete)
router.delete('/deleteNote/:id', async (req, res) => {
    try {
        const noteId = req.params.id;
        console.log(`Note UID for Deletion: ${noteId}`);
        
        const result = await notesModelInstance.deleteNote(noteId);
        
        if (result) {
            res.status(200).json({ 
                success: true, 
                message: 'Note deleted successfully' 
            });
        } else {
            res.status(404).json({ 
                success: false, 
                message: 'Note not found' 
            });
        }
    } catch (error) {
        console.error('Error deleting note:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error deleting note' 
        });
    }
});

// Get notes statistics
router.get('/notesStats/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const stats = await notesModelInstance.getNotesStats(userId);

        res.status(200).json({
            success: true,
            stats,
            message: 'Notes statistics retrieved successfully'
        });
    } catch (error) {
        console.error('Error retrieving notes stats:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error retrieving notes statistics' 
        });
    }
});

// Search notes by keyword
router.get('/searchNotes', async (req, res) => {
    try {
        const { userId, keyword, page = 1, pageSize = 10 } = req.query;

        if (!userId || !keyword) {
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
        console.error('Error searching notes:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error searching notes' 
        });
    }
});

// Get notes for a specific contact
router.get('/contactNotes/:contactId', async (req, res) => {
    try {
        const { contactId } = req.params;
        const { userId, page = 1, pageSize = 10 } = req.query;

        if (!userId) {
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
        console.error('Error retrieving contact notes:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error retrieving contact notes' 
        });
    }
});

// Get notes for a specific group
router.get('/groupNotes/:groupId', async (req, res) => {
    try {
        const { groupId } = req.params;
        const { userId, page = 1, pageSize = 10 } = req.query;

        if (!userId) {
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
        console.error('Error retrieving group notes:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error retrieving group notes' 
        });
    }
});

// Toggle note importance
router.patch('/toggleImportant/:id', async (req, res) => {
    try {
        const noteId = req.params.id;
        const { is_important } = req.body;

        if (is_important === undefined) {
            return res.status(400).json({ 
                success: false, 
                message: 'is_important field is required' 
            });
        }

        const noteData = { is_important };
        const result = await notesModelInstance.updateNote(noteId, noteData);

        if (result) {
            res.status(200).json({ 
                success: true, 
                message: `Note marked as ${is_important ? 'important' : 'normal'}` 
            });
        } else {
            res.status(404).json({ 
                success: false, 
                message: 'Note not found' 
            });
        }
    } catch (error) {
        console.error('Error toggling note importance:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error updating note importance' 
        });
    }
});

module.exports = router;
