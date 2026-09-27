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
exports.getGroupNotes = exports.getContactNotes = exports.searchNotes = exports.getNotesStats = exports.deleteNote = exports.updateNote = exports.getNote = exports.listNotes = exports.createNote = void 0;
const notesService = __importStar(require("../services/notesService"));
const dbEncryption_1 = require("../utils/dbEncryption");
const errors_1 = require("../utils/errors");
const http_1 = require("../utils/http");
const VALID_NOTE_TYPES = ['personal', 'contact', 'group'];
const VALID_COLORS = ['pink', 'blue', 'green', 'yellow', 'purple'];
const createNote = async (req, res) => {
    try {
        const noteData = req.body;
        const { title, content, note_type, user_id, color } = noteData;
        if (!title || !content || !user_id) {
            res.status(400).json({ success: false, message: 'Title, content, and user_id are required' });
            return;
        }
        if (note_type && !VALID_NOTE_TYPES.includes(note_type)) {
            res.status(400).json({ success: false, message: 'Invalid note type. Must be personal, contact, or group' });
            return;
        }
        if (color && !VALID_COLORS.includes(color)) {
            res.status(400).json({ success: false, message: 'Invalid color. Must be pink, blue, green, yellow, or purple' });
            return;
        }
        const noteId = await notesService.createNote(noteData);
        const encryptedNoteId = (0, dbEncryption_1.encryptId)(noteId);
        res.status(201).json({ success: true, uid: encryptedNoteId, message: 'Note created successfully' });
    }
    catch (error) {
        console.error('Error creating note:', (0, errors_1.getErrorMessage)(error));
        res.status((0, errors_1.getErrorStatus)(error)).json({ success: false, message: (0, errors_1.getErrorMessage)(error) || 'Error creating note' });
    }
};
exports.createNote = createNote;
const listNotes = async (req, res) => {
    try {
        const { userId, note_type, contact_id, group_id, search, is_important, keyword, page = '1', pageSize = '10', } = req.query;
        if (!userId) {
            res.status(400).json({ success: false, message: 'User ID is required' });
            return;
        }
        const filters = {
            note_type: note_type,
            contact_id,
            group_id,
            search,
            is_important: is_important !== undefined ? is_important === 'true' : undefined,
            keyword,
        };
        const result = await notesService.getNotesList(userId, filters, parseInt(page, 10), parseInt(pageSize, 10));
        res.status(200).json({
            success: true,
            notes: result.items,
            pagination: { current: result.page, pageSize: result.pageSize, total: result.total },
            message: 'Notes list retrieved successfully',
        });
    }
    catch (error) {
        console.error('Error retrieving notes list:', (0, errors_1.getErrorMessage)(error));
        res.status((0, errors_1.getErrorStatus)(error)).json({ success: false, message: 'Error retrieving notes' });
    }
};
exports.listNotes = listNotes;
const getNote = async (req, res) => {
    try {
        const note = await notesService.getNoteById((0, http_1.paramStr)(req.params.id));
        if (!note) {
            res.status(404).json({ success: false, message: 'Note not found' });
            return;
        }
        res.status(200).json({ success: true, note });
    }
    catch (error) {
        console.error('Error retrieving note:', (0, errors_1.getErrorMessage)(error));
        res.status((0, errors_1.getErrorStatus)(error)).json({ success: false, message: 'Error retrieving note' });
    }
};
exports.getNote = getNote;
const updateNote = async (req, res) => {
    try {
        const noteId = (0, http_1.paramStr)(req.params.id);
        const noteData = req.body;
        const { title, content, color } = noteData;
        if (!title || !content) {
            res.status(400).json({ success: false, message: 'Title and content are required' });
            return;
        }
        if (color && !VALID_COLORS.includes(color)) {
            res.status(400).json({ success: false, message: 'Invalid color. Must be pink, blue, green, yellow, or purple' });
            return;
        }
        const result = await notesService.updateNote(noteId, noteData);
        if (result) {
            res.status(200).json({ success: true, message: 'Note updated successfully' });
        }
        else {
            res.status(404).json({ success: false, message: 'Note not found or no changes made' });
        }
    }
    catch (error) {
        console.error('Error updating note:', (0, errors_1.getErrorMessage)(error));
        res.status((0, errors_1.getErrorStatus)(error)).json({ success: false, message: (0, errors_1.getErrorMessage)(error) || 'Error updating note' });
    }
};
exports.updateNote = updateNote;
const deleteNote = async (req, res) => {
    try {
        const noteId = (0, http_1.paramStr)(req.params.id);
        const result = await notesService.deleteNote(noteId);
        if (result) {
            res.status(200).json({ success: true, message: 'Note deleted successfully' });
        }
        else {
            res.status(404).json({ success: false, message: 'Note not found' });
        }
    }
    catch (error) {
        console.error('Error deleting note:', (0, errors_1.getErrorMessage)(error));
        res.status((0, errors_1.getErrorStatus)(error)).json({ success: false, message: 'Error deleting note' });
    }
};
exports.deleteNote = deleteNote;
const getNotesStats = async (req, res) => {
    try {
        const userId = (0, http_1.paramStr)(req.params.userId);
        const stats = await notesService.getNotesStats(userId);
        res.status(200).json({ success: true, stats, message: 'Notes statistics retrieved successfully' });
    }
    catch (error) {
        console.error('Error retrieving notes statistics:', (0, errors_1.getErrorMessage)(error));
        res.status((0, errors_1.getErrorStatus)(error)).json({ success: false, message: 'Error retrieving notes statistics' });
    }
};
exports.getNotesStats = getNotesStats;
const searchNotes = async (req, res) => {
    try {
        const { userId, keyword, page = '1', pageSize = '10' } = req.query;
        if (!userId || !keyword) {
            res.status(400).json({ success: false, message: 'User ID and keyword are required' });
            return;
        }
        const result = await notesService.searchNotesByKeyword(userId, keyword, parseInt(page, 10), parseInt(pageSize, 10));
        res.status(200).json({
            success: true,
            notes: result.items,
            pagination: { current: result.page, pageSize: result.pageSize, total: result.total },
            searchKeyword: keyword,
            message: 'Notes search completed successfully',
        });
    }
    catch (error) {
        console.error('Error searching notes:', (0, errors_1.getErrorMessage)(error));
        res.status((0, errors_1.getErrorStatus)(error)).json({ success: false, message: 'Error searching notes' });
    }
};
exports.searchNotes = searchNotes;
const getContactNotes = async (req, res) => {
    try {
        const contactId = (0, http_1.paramStr)(req.params.contactId);
        const { userId, page = '1', pageSize = '10' } = req.query;
        if (!userId) {
            res.status(400).json({ success: false, message: 'User ID is required' });
            return;
        }
        const filters = { note_type: 'contact', contact_id: contactId };
        const result = await notesService.getNotesList(userId, filters, parseInt(page, 10), parseInt(pageSize, 10));
        res.status(200).json({
            success: true,
            notes: result.items,
            pagination: { current: result.page, pageSize: result.pageSize, total: result.total },
            contactId,
            message: 'Contact notes retrieved successfully',
        });
    }
    catch (error) {
        console.error('Error retrieving contact notes:', (0, errors_1.getErrorMessage)(error));
        res.status((0, errors_1.getErrorStatus)(error)).json({ success: false, message: 'Error retrieving contact notes' });
    }
};
exports.getContactNotes = getContactNotes;
const getGroupNotes = async (req, res) => {
    try {
        const groupId = (0, http_1.paramStr)(req.params.groupId);
        const { userId, page = '1', pageSize = '10' } = req.query;
        if (!userId) {
            res.status(400).json({ success: false, message: 'User ID is required' });
            return;
        }
        const filters = { note_type: 'group', group_id: groupId };
        const result = await notesService.getNotesList(userId, filters, parseInt(page, 10), parseInt(pageSize, 10));
        res.status(200).json({
            success: true,
            notes: result.items,
            pagination: { current: result.page, pageSize: result.pageSize, total: result.total },
            groupId,
            message: 'Group notes retrieved successfully',
        });
    }
    catch (error) {
        console.error('Error retrieving group notes:', (0, errors_1.getErrorMessage)(error));
        res.status((0, errors_1.getErrorStatus)(error)).json({ success: false, message: 'Error retrieving group notes' });
    }
};
exports.getGroupNotes = getGroupNotes;
//# sourceMappingURL=notesController.js.map