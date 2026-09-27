"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchNotesByKeyword = exports.getNotesStats = exports.deleteNote = exports.updateNote = exports.getNotesList = exports.getNoteById = exports.createNote = void 0;
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
const createNote = async (noteData) => {
    const { user_id, title, content, note_type = 'personal', contact_id = null, group_id = null, color = 'blue', is_important = false, keywords = [], } = noteData;
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
    const newNote = await notesModel_1.NoteModel.create({
        data: {
            user_id: userIdDecrypted,
            title,
            content,
            note_type,
            contact_id: contactIdDecrypted,
            group_id: groupIdDecrypted,
            color: color || 'blue',
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
        content: note.content,
        note_type: note.note_type,
        contact_id: note.contact_id ? (0, dbEncryption_1.encryptId)(note.contact_id) : null,
        group_id: note.group_id ? (0, dbEncryption_1.encryptId)(note.group_id) : null,
        color: note.color,
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
        content_preview: n.content ? n.content.substring(0, 200) : '',
        note_type: n.note_type,
        contact_id: n.contact_id ? (0, dbEncryption_1.encryptId)(n.contact_id) : null,
        group_id: n.group_id ? (0, dbEncryption_1.encryptId)(n.group_id) : null,
        color: n.color,
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
    const { title, content, note_type, contact_id, group_id, color, is_important, keywords = [] } = noteData;
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
    await notesModel_1.NoteModel.update({
        where: { pk_id: decryptedNoteId },
        data: {
            title,
            content,
            note_type,
            contact_id: contactIdDecrypted,
            group_id: groupIdDecrypted,
            color: color || 'blue',
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