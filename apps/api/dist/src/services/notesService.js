"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchNotesByKeyword = exports.getNotesStats = exports.deleteNote = exports.updateNote = exports.getNotesList = exports.getNoteById = exports.createNote = void 0;
const client_1 = require("@prisma/client");
const notesModel_1 = require("../models/notesModel");
const dbEncryption_1 = require("../utils/dbEncryption");
const errors_1 = require("../utils/errors");
const normalizeKeywords = (keywords) => {
    if (!Array.isArray(keywords))
        return [];
    return [
        ...new Set(keywords
            .map((k) => (typeof k === 'string' ? k : k?.keyword))
            .filter((k) => Boolean(k))
            .map((s) => s.toLowerCase().trim())),
    ];
};
const normalizeDrawing = (value) => {
    if (value === null || value === undefined)
        return null;
    if (typeof value !== 'object' || !Array.isArray(value.strokes)) {
        throw new errors_1.AppError('Invalid note drawing data', 400);
    }
    const rawStrokes = value.strokes;
    if (rawStrokes.length > 500)
        throw new errors_1.AppError('Drawing has too many strokes', 400);
    const strokes = rawStrokes.map((stroke) => {
        if (!stroke || !/^#[0-9a-fA-F]{6}$/.test(stroke.color) || !Number.isFinite(stroke.width) || stroke.width < 1 || stroke.width > 32) {
            throw new errors_1.AppError('Invalid note drawing stroke', 400);
        }
        if (!Array.isArray(stroke.points) || stroke.points.length > 10000) {
            throw new errors_1.AppError('Invalid note drawing points', 400);
        }
        return {
            color: stroke.color.toLowerCase(),
            width: stroke.width,
            points: stroke.points.map((point) => {
                if (!Number.isFinite(point.x) || !Number.isFinite(point.y) || point.x < 0 || point.x > 1 || point.y < 0 || point.y > 1) {
                    throw new errors_1.AppError('Invalid note drawing coordinates', 400);
                }
                return { x: point.x, y: point.y };
            }),
        };
    });
    const drawing = { strokes };
    if (JSON.stringify(drawing).length > 1_000_000)
        throw new errors_1.AppError('Drawing is too large', 400);
    return drawing;
};
const normalizeTitleFormatting = (value) => {
    if (value === undefined || value === null)
        return null;
    if (typeof value !== 'object' || Array.isArray(value) || value.type !== 'doc' || !Array.isArray(value.content)) {
        throw new errors_1.AppError('Invalid formatted note title', 400);
    }
    const serialized = JSON.stringify(value);
    if (serialized.length > 32768)
        throw new errors_1.AppError('Formatted note title is too large', 400);
    return JSON.parse(serialized);
};
const toPlainText = (content) => content
    .replace(/<\/(p|div|li|h[1-6]|blockquote)>/gi, ' ')
    .replace(/<br\s*\/?\s*>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
const createNote = async (noteData) => {
    const { user_id, title, title_formatting, content, note_type = 'personal', contact_id = null, group_id = null, color = 'blue', font_family = 'handwritten', drawing_data = null, is_important = false, keywords = [], } = noteData;
    const userIdDecrypted = (0, dbEncryption_1.decryptIdToNumber)(user_id);
    if (!userIdDecrypted)
        throw new errors_1.AppError('Invalid user ID', 400);
    const contactIdDecrypted = contact_id ? (0, dbEncryption_1.decryptIdToNumber)(contact_id) : null;
    const groupIdDecrypted = group_id ? (0, dbEncryption_1.decryptIdToNumber)(group_id) : null;
    if (note_type === 'contact' && !contactIdDecrypted) {
        throw new errors_1.AppError('Contact ID is required for contact notes', 400);
    }
    if (note_type === 'group' && !groupIdDecrypted) {
        throw new errors_1.AppError('Group ID is required for group notes', 400);
    }
    if (note_type === 'personal' && (contactIdDecrypted || groupIdDecrypted)) {
        throw new errors_1.AppError('Personal notes cannot have contact or group references', 400);
    }
    const uniqueKeywords = normalizeKeywords(keywords);
    const normalizedDrawing = normalizeDrawing(drawing_data);
    const normalizedTitleFormatting = normalizeTitleFormatting(title_formatting);
    const newNote = await notesModel_1.NoteModel.create({
        data: {
            user_id: userIdDecrypted,
            title,
            title_formatting: normalizedTitleFormatting ?? client_1.Prisma.DbNull,
            content,
            note_type,
            contact_id: contactIdDecrypted,
            group_id: groupIdDecrypted,
            color: color || 'blue',
            font_family,
            ...(normalizedDrawing ? { drawing_data: normalizedDrawing } : {}),
            is_important: Boolean(is_important),
            keywords: { create: uniqueKeywords.map((kw) => ({ keyword: kw })) },
        },
    });
    return newNote.pk_id;
};
exports.createNote = createNote;
const getNoteById = async (noteId) => {
    const decryptedNoteId = (0, dbEncryption_1.decryptIdToNumber)(noteId);
    if (!decryptedNoteId)
        return null;
    const note = await notesModel_1.NoteModel.findFirst({
        where: { pk_id: decryptedNoteId, is_deleted: false },
        include: {
            contact: { select: { firstName: true, lastName: true } },
            group: { select: { name: true } },
            keywords: { orderBy: { keyword: 'asc' }, select: { keyword: true } },
        },
    });
    if (!note)
        return null;
    return {
        uid: (0, dbEncryption_1.encryptId)(note.pk_id),
        user_id: (0, dbEncryption_1.encryptId)(note.user_id),
        title: note.title,
        title_formatting: note.title_formatting,
        content: note.content,
        note_type: note.note_type,
        contact_id: note.contact_id ? (0, dbEncryption_1.encryptId)(note.contact_id) : null,
        group_id: note.group_id ? (0, dbEncryption_1.encryptId)(note.group_id) : null,
        color: note.color,
        font_family: note.font_family,
        drawing_data: note.drawing_data,
        is_important: note.is_important,
        createdOn: note.createdOn,
        modifiedOn: note.modifiedOn,
        contact_first_name: note.contact?.firstName || null,
        contact_last_name: note.contact?.lastName || null,
        group_name: note.group?.name || null,
        keywords: (note.keywords || []).map((k) => k.keyword),
    };
};
exports.getNoteById = getNoteById;
const getNotesList = async (userId, filters = {}, page = 1, pageSize = 10) => {
    const { note_type, contact_id, group_id, search, is_important, keyword } = filters;
    const decryptedUserId = (0, dbEncryption_1.decryptIdToNumber)(userId);
    if (!decryptedUserId)
        throw new errors_1.AppError('Invalid user ID', 400);
    const offset = (page - 1) * pageSize;
    const whereClause = { user_id: decryptedUserId, is_deleted: false };
    if (note_type) {
        whereClause.note_type = note_type;
    }
    if (contact_id) {
        const decryptedContactId = (0, dbEncryption_1.decryptIdToNumber)(contact_id);
        if (decryptedContactId)
            whereClause.contact_id = decryptedContactId;
    }
    if (group_id) {
        const decryptedGroupId = (0, dbEncryption_1.decryptIdToNumber)(group_id);
        if (decryptedGroupId)
            whereClause.group_id = decryptedGroupId;
    }
    if (is_important !== undefined) {
        whereClause.is_important = Boolean(is_important);
    }
    if (search) {
        whereClause.OR = [
            { title: { contains: String(search) } },
            { content: { contains: String(search) } },
        ];
    }
    if (keyword) {
        whereClause.keywords = { some: { keyword: { contains: String(keyword).toLowerCase() } } };
    }
    const [total, notes] = await Promise.all([
        notesModel_1.NoteModel.count({ where: whereClause }),
        notesModel_1.NoteModel.findMany({
            where: whereClause,
            orderBy: [{ is_important: 'desc' }, { modifiedOn: 'desc' }],
            skip: offset,
            take: pageSize,
            include: {
                contact: { select: { firstName: true, lastName: true } },
                group: { select: { name: true } },
            },
        }),
    ]);
    const items = notes.map((n) => ({
        uid: (0, dbEncryption_1.encryptId)(n.pk_id),
        title: n.title,
        title_formatting: n.title_formatting,
        content_preview: n.content ? toPlainText(n.content).substring(0, 200) : '',
        note_type: n.note_type,
        contact_id: n.contact_id ? (0, dbEncryption_1.encryptId)(n.contact_id) : null,
        group_id: n.group_id ? (0, dbEncryption_1.encryptId)(n.group_id) : null,
        color: n.color,
        font_family: n.font_family,
        drawing_data: n.drawing_data,
        is_important: n.is_important,
        createdOn: n.createdOn,
        modifiedOn: n.modifiedOn,
        contact_first_name: n.contact?.firstName || null,
        contact_last_name: n.contact?.lastName || null,
        group_name: n.group?.name || null,
    }));
    return { items, total, page, pageSize };
};
exports.getNotesList = getNotesList;
const updateNote = async (noteId, noteData) => {
    const { title, title_formatting, content, note_type, contact_id, group_id, color, font_family, drawing_data, is_important, keywords = [] } = noteData;
    const decryptedNoteId = (0, dbEncryption_1.decryptIdToNumber)(noteId);
    if (!decryptedNoteId)
        throw new errors_1.AppError('Invalid note ID', 400);
    const contactIdDecrypted = contact_id ? (0, dbEncryption_1.decryptIdToNumber)(contact_id) : null;
    const groupIdDecrypted = group_id ? (0, dbEncryption_1.decryptIdToNumber)(group_id) : null;
    if (note_type === 'contact' && !contactIdDecrypted) {
        throw new errors_1.AppError('Contact ID is required for contact notes', 400);
    }
    if (note_type === 'group' && !groupIdDecrypted) {
        throw new errors_1.AppError('Group ID is required for group notes', 400);
    }
    if (note_type === 'personal' && (contactIdDecrypted || groupIdDecrypted)) {
        throw new errors_1.AppError('Personal notes cannot have contact or group references', 400);
    }
    const normalizedDrawing = drawing_data === undefined ? undefined : normalizeDrawing(drawing_data);
    const normalizedTitleFormatting = title_formatting === undefined ? undefined : normalizeTitleFormatting(title_formatting);
    await notesModel_1.NoteModel.update({
        where: { pk_id: decryptedNoteId },
        data: {
            title,
            ...(normalizedTitleFormatting === undefined
                ? {}
                : { title_formatting: normalizedTitleFormatting ?? client_1.Prisma.DbNull }),
            content,
            note_type,
            contact_id: contactIdDecrypted,
            group_id: groupIdDecrypted,
            color: color || 'blue',
            ...(font_family ? { font_family } : {}),
            ...(normalizedDrawing === undefined
                ? {}
                : { drawing_data: normalizedDrawing ? normalizedDrawing : client_1.Prisma.DbNull }),
            is_important: Boolean(is_important),
            modifiedOn: new Date(),
        },
    });
    await notesModel_1.NoteKeywordModel.deleteMany({ where: { note_id: decryptedNoteId } });
    const uniqueKeywords = normalizeKeywords(keywords);
    if (uniqueKeywords.length > 0) {
        await notesModel_1.NoteKeywordModel.createMany({
            data: uniqueKeywords.map((kw) => ({ note_id: decryptedNoteId, keyword: kw })),
            skipDuplicates: true,
        });
    }
    return true;
};
exports.updateNote = updateNote;
const deleteNote = async (noteId) => {
    const decryptedNoteId = (0, dbEncryption_1.decryptIdToNumber)(noteId);
    if (!decryptedNoteId)
        return false;
    const deleted = await notesModel_1.NoteModel.update({
        where: { pk_id: decryptedNoteId },
        data: { is_deleted: true, modifiedOn: new Date() },
    });
    return !!deleted;
};
exports.deleteNote = deleteNote;
const getNotesStats = async (userId) => {
    const decryptedUserId = (0, dbEncryption_1.decryptIdToNumber)(userId);
    if (!decryptedUserId)
        throw new errors_1.AppError('Invalid user ID', 400);
    const [total, important, personal, contact, group] = await Promise.all([
        notesModel_1.NoteModel.count({ where: { user_id: decryptedUserId, is_deleted: false } }),
        notesModel_1.NoteModel.count({ where: { user_id: decryptedUserId, is_deleted: false, is_important: true } }),
        notesModel_1.NoteModel.count({ where: { user_id: decryptedUserId, is_deleted: false, note_type: 'personal' } }),
        notesModel_1.NoteModel.count({ where: { user_id: decryptedUserId, is_deleted: false, note_type: 'contact' } }),
        notesModel_1.NoteModel.count({ where: { user_id: decryptedUserId, is_deleted: false, note_type: 'group' } }),
    ]);
    return {
        total_notes: total,
        important_notes: important,
        personal_notes: personal,
        contact_notes: contact,
        group_notes: group,
    };
};
exports.getNotesStats = getNotesStats;
const searchNotesByKeyword = async (userId, keyword, page = 1, pageSize = 10) => {
    const decryptedUserId = (0, dbEncryption_1.decryptIdToNumber)(userId);
    if (!decryptedUserId)
        throw new errors_1.AppError('Invalid user ID', 400);
    const offset = (page - 1) * pageSize;
    const searchKeyword = String(keyword).toLowerCase();
    const whereClause = {
        user_id: decryptedUserId,
        is_deleted: false,
        keywords: { some: { keyword: { contains: searchKeyword } } },
    };
    const [total, notes] = await Promise.all([
        notesModel_1.NoteModel.count({ where: whereClause }),
        notesModel_1.NoteModel.findMany({
            where: whereClause,
            orderBy: [{ is_important: 'desc' }, { modifiedOn: 'desc' }],
            skip: offset,
            take: pageSize,
            include: { keywords: { select: { keyword: true } } },
        }),
    ]);
    const items = notes.map((n) => ({
        uid: (0, dbEncryption_1.encryptId)(n.pk_id),
        title: n.title,
        content_preview: n.content ? n.content.substring(0, 200) : '',
        note_type: n.note_type,
        is_important: n.is_important,
        createdOn: n.createdOn,
        matched_keywords: (n.keywords || []).map((k) => k.keyword).join(','),
    }));
    return { items, total, page, pageSize };
};
exports.searchNotesByKeyword = searchNotesByKeyword;
//# sourceMappingURL=notesService.js.map