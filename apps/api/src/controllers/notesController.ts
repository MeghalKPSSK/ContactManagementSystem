import type { Request, Response } from 'express';
import * as notesService from '../services/notesService';
import { encryptId } from '../utils/dbEncryption';
import { getErrorMessage, getErrorStatus } from '../utils/errors';
import { paramStr } from '../utils/http';
import type { NoteType, NoteColor, NoteFontFamily } from '../types/note';

const VALID_NOTE_TYPES: NoteType[] = ['personal', 'contact', 'group'];
const VALID_COLORS: NoteColor[] = ['pink', 'blue', 'green', 'yellow', 'purple'];
const VALID_NOTE_FONTS: NoteFontFamily[] = [
  'handwritten', 'sans', 'serif', 'mono', 'rounded', 'humanist',
  'book', 'editorial', 'geometric', 'cursive', 'slab', 'system',
];

export const createNote = async (req: Request, res: Response): Promise<void> => {
  try {
    const noteData = req.body;
    const { title, content, note_type, user_id, color, font_family } = noteData;

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

    if (font_family && !VALID_NOTE_FONTS.includes(font_family)) {
      res.status(400).json({ success: false, message: 'Invalid note font' });
      return;
    }

    const noteId = await notesService.createNote(noteData);
    const encryptedNoteId = encryptId(noteId);

    res.status(201).json({ success: true, uid: encryptedNoteId, message: 'Note created successfully' });
  } catch (error) {
    console.error('Error creating note:', getErrorMessage(error));
    res.status(getErrorStatus(error)).json({ success: false, message: getErrorMessage(error) || 'Error creating note' });
  }
};

export const listNotes = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      userId,
      note_type,
      contact_id,
      group_id,
      search,
      is_important,
      keyword,
      page = '1',
      pageSize = '10',
    } = req.query as Record<string, string>;

    if (!userId) {
      res.status(400).json({ success: false, message: 'User ID is required' });
      return;
    }

    const filters = {
      note_type: note_type as NoteType | undefined,
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
  } catch (error) {
    console.error('Error retrieving notes list:', getErrorMessage(error));
    res.status(getErrorStatus(error)).json({ success: false, message: 'Error retrieving notes' });
  }
};

export const getNote = async (req: Request, res: Response): Promise<void> => {
  try {
    const note = await notesService.getNoteById(paramStr(req.params.id));

    if (!note) {
      res.status(404).json({ success: false, message: 'Note not found' });
      return;
    }

    res.status(200).json({ success: true, note });
  } catch (error) {
    console.error('Error retrieving note:', getErrorMessage(error));
    res.status(getErrorStatus(error)).json({ success: false, message: 'Error retrieving note' });
  }
};

export const updateNote = async (req: Request, res: Response): Promise<void> => {
  try {
    const noteId = paramStr(req.params.id);
    const noteData = req.body;
    const { title, content, color, font_family } = noteData;

    if (!title || !content) {
      res.status(400).json({ success: false, message: 'Title and content are required' });
      return;
    }

    if (color && !VALID_COLORS.includes(color)) {
      res.status(400).json({ success: false, message: 'Invalid color. Must be pink, blue, green, yellow, or purple' });
      return;
    }

    if (font_family && !VALID_NOTE_FONTS.includes(font_family)) {
      res.status(400).json({ success: false, message: 'Invalid note font' });
      return;
    }

    const result = await notesService.updateNote(noteId, noteData);

    if (result) {
      res.status(200).json({ success: true, message: 'Note updated successfully' });
    } else {
      res.status(404).json({ success: false, message: 'Note not found or no changes made' });
    }
  } catch (error) {
    console.error('Error updating note:', getErrorMessage(error));
    res.status(getErrorStatus(error)).json({ success: false, message: getErrorMessage(error) || 'Error updating note' });
  }
};

export const deleteNote = async (req: Request, res: Response): Promise<void> => {
  try {
    const noteId = paramStr(req.params.id);
    const result = await notesService.deleteNote(noteId);

    if (result) {
      res.status(200).json({ success: true, message: 'Note deleted successfully' });
    } else {
      res.status(404).json({ success: false, message: 'Note not found' });
    }
  } catch (error) {
    console.error('Error deleting note:', getErrorMessage(error));
    res.status(getErrorStatus(error)).json({ success: false, message: 'Error deleting note' });
  }
};

export const getNotesStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = paramStr(req.params.userId);
    const stats = await notesService.getNotesStats(userId);

    res.status(200).json({ success: true, stats, message: 'Notes statistics retrieved successfully' });
  } catch (error) {
    console.error('Error retrieving notes statistics:', getErrorMessage(error));
    res.status(getErrorStatus(error)).json({ success: false, message: 'Error retrieving notes statistics' });
  }
};

export const searchNotes = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, keyword, page = '1', pageSize = '10' } = req.query as Record<string, string>;

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
  } catch (error) {
    console.error('Error searching notes:', getErrorMessage(error));
    res.status(getErrorStatus(error)).json({ success: false, message: 'Error searching notes' });
  }
};

export const getContactNotes = async (req: Request, res: Response): Promise<void> => {
  try {
    const contactId = paramStr(req.params.contactId);
    const { userId, page = '1', pageSize = '10' } = req.query as Record<string, string>;

    if (!userId) {
      res.status(400).json({ success: false, message: 'User ID is required' });
      return;
    }

    const filters = { note_type: 'contact' as const, contact_id: contactId };
    const result = await notesService.getNotesList(userId, filters, parseInt(page, 10), parseInt(pageSize, 10));

    res.status(200).json({
      success: true,
      notes: result.items,
      pagination: { current: result.page, pageSize: result.pageSize, total: result.total },
      contactId,
      message: 'Contact notes retrieved successfully',
    });
  } catch (error) {
    console.error('Error retrieving contact notes:', getErrorMessage(error));
    res.status(getErrorStatus(error)).json({ success: false, message: 'Error retrieving contact notes' });
  }
};

export const getGroupNotes = async (req: Request, res: Response): Promise<void> => {
  try {
    const groupId = paramStr(req.params.groupId);
    const { userId, page = '1', pageSize = '10' } = req.query as Record<string, string>;

    if (!userId) {
      res.status(400).json({ success: false, message: 'User ID is required' });
      return;
    }

    const filters = { note_type: 'group' as const, group_id: groupId };
    const result = await notesService.getNotesList(userId, filters, parseInt(page, 10), parseInt(pageSize, 10));

    res.status(200).json({
      success: true,
      notes: result.items,
      pagination: { current: result.page, pageSize: result.pageSize, total: result.total },
      groupId,
      message: 'Group notes retrieved successfully',
    });
  } catch (error) {
    console.error('Error retrieving group notes:', getErrorMessage(error));
    res.status(getErrorStatus(error)).json({ success: false, message: 'Error retrieving group notes' });
  }
};
