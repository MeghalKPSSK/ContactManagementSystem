import { Prisma } from '@prisma/client';
import { NoteModel, NoteKeywordModel } from '../models/notesModel';
import { encryptId, decryptIdToNumber } from '../utils/dbEncryption';
import { AppError } from '../utils/errors';
import type {
  NoteCreatePayload,
  NoteUpdatePayload,
  NoteFilters,
  NoteDetail,
  NoteSummary,
  NoteSearchResult,
  NotesStats,
  NoteDrawing,
  NoteDrawingStroke,
  NoteFontFamily,
} from '../types/note';
import type { PaginatedResult } from '../types/pagination';

const normalizeKeywords = (keywords: Array<string | { keyword: string }> | undefined): string[] => {
  if (!Array.isArray(keywords)) return [];
  return [
    ...new Set(
      keywords
        .map((k) => (typeof k === 'string' ? k : k?.keyword))
        .filter((k): k is string => Boolean(k))
        .map((s) => s.toLowerCase().trim())
    ),
  ];
};

const normalizeDrawing = (value: unknown): NoteDrawing | null => {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'object' || !Array.isArray((value as NoteDrawing).strokes)) {
    throw new AppError('Invalid note drawing data', 400);
  }

  const rawStrokes = (value as NoteDrawing).strokes;
  if (rawStrokes.length > 500) throw new AppError('Drawing has too many strokes', 400);

  const strokes: NoteDrawingStroke[] = rawStrokes.map((stroke) => {
    if (!stroke || !/^#[0-9a-fA-F]{6}$/.test(stroke.color) || !Number.isFinite(stroke.width) || stroke.width < 1 || stroke.width > 32) {
      throw new AppError('Invalid note drawing stroke', 400);
    }
    if (!Array.isArray(stroke.points) || stroke.points.length > 10000) {
      throw new AppError('Invalid note drawing points', 400);
    }

    return {
      color: stroke.color.toLowerCase(),
      width: stroke.width,
      points: stroke.points.map((point) => {
        if (!Number.isFinite(point.x) || !Number.isFinite(point.y) || point.x < 0 || point.x > 1 || point.y < 0 || point.y > 1) {
          throw new AppError('Invalid note drawing coordinates', 400);
        }
        return { x: point.x, y: point.y };
      }),
    };
  });

  const drawing = { strokes };
  if (JSON.stringify(drawing).length > 1_000_000) throw new AppError('Drawing is too large', 400);
  return drawing;
};

const normalizeTitleFormatting = (value: unknown): Prisma.InputJsonValue | null => {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'object' || Array.isArray(value) || (value as { type?: unknown }).type !== 'doc' || !Array.isArray((value as { content?: unknown }).content)) {
    throw new AppError('Invalid formatted note title', 400);
  }
  const serialized = JSON.stringify(value);
  if (serialized.length > 32768) throw new AppError('Formatted note title is too large', 400);
  return JSON.parse(serialized) as Prisma.InputJsonValue;
};

const toPlainText = (content: string): string => content
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

export const createNote = async (noteData: NoteCreatePayload): Promise<number> => {
  const {
    user_id,
    title,
    title_formatting,
    content,
    note_type = 'personal',
    contact_id = null,
    group_id = null,
    color = 'blue',
    font_family = 'handwritten',
    drawing_data = null,
    is_important = false,
    keywords = [],
  } = noteData;

  const userIdDecrypted = decryptIdToNumber(user_id);
  if (!userIdDecrypted) throw new AppError('Invalid user ID', 400);

  const contactIdDecrypted = contact_id ? decryptIdToNumber(contact_id) : null;
  const groupIdDecrypted = group_id ? decryptIdToNumber(group_id) : null;

  if (note_type === 'contact' && !contactIdDecrypted) {
    throw new AppError('Contact ID is required for contact notes', 400);
  }
  if (note_type === 'group' && !groupIdDecrypted) {
    throw new AppError('Group ID is required for group notes', 400);
  }
  if (note_type === 'personal' && (contactIdDecrypted || groupIdDecrypted)) {
    throw new AppError('Personal notes cannot have contact or group references', 400);
  }

  const uniqueKeywords = normalizeKeywords(keywords);
  const normalizedDrawing = normalizeDrawing(drawing_data);
  const normalizedTitleFormatting = normalizeTitleFormatting(title_formatting);

  const newNote = await NoteModel.create({
    data: {
      user_id: userIdDecrypted,
      title,
      title_formatting: normalizedTitleFormatting ?? Prisma.DbNull,
      content,
      note_type,
      contact_id: contactIdDecrypted,
      group_id: groupIdDecrypted,
      color: color || 'blue',
      font_family,
      ...(normalizedDrawing ? { drawing_data: normalizedDrawing as unknown as Prisma.InputJsonValue } : {}),
      is_important: Boolean(is_important),
      keywords: { create: uniqueKeywords.map((kw) => ({ keyword: kw })) },
    },
  });

  return newNote.pk_id;
};

export const getNoteById = async (noteId: string): Promise<NoteDetail | null> => {
  const decryptedNoteId = decryptIdToNumber(noteId);
  if (!decryptedNoteId) return null;

  const note = await NoteModel.findFirst({
    where: { pk_id: decryptedNoteId, is_deleted: false },
    include: {
      contact: { select: { firstName: true, lastName: true } },
      group: { select: { name: true } },
      keywords: { orderBy: { keyword: 'asc' }, select: { keyword: true } },
    },
  });

  if (!note) return null;

  return {
    uid: encryptId(note.pk_id),
    user_id: encryptId(note.user_id),
    title: note.title,
    title_formatting: note.title_formatting as unknown | null,
    content: note.content,
    note_type: note.note_type,
    contact_id: note.contact_id ? encryptId(note.contact_id) : null,
    group_id: note.group_id ? encryptId(note.group_id) : null,
    color: note.color,
    font_family: note.font_family as NoteFontFamily,
    drawing_data: note.drawing_data as unknown as NoteDrawing | null,
    is_important: note.is_important,
    createdOn: note.createdOn,
    modifiedOn: note.modifiedOn,
    contact_first_name: note.contact?.firstName || null,
    contact_last_name: note.contact?.lastName || null,
    group_name: note.group?.name || null,
    keywords: (note.keywords || []).map((k) => k.keyword),
  };
};

export const getNotesList = async (
  userId: string,
  filters: NoteFilters = {},
  page = 1,
  pageSize = 10
): Promise<PaginatedResult<NoteSummary>> => {
  const { note_type, contact_id, group_id, search, is_important, keyword } = filters;

  const decryptedUserId = decryptIdToNumber(userId);
  if (!decryptedUserId) throw new AppError('Invalid user ID', 400);

  const offset = (page - 1) * pageSize;
  const whereClause: Prisma.NoteWhereInput = { user_id: decryptedUserId, is_deleted: false };

  if (note_type) {
    whereClause.note_type = note_type;
  }

  if (contact_id) {
    const decryptedContactId = decryptIdToNumber(contact_id);
    if (decryptedContactId) whereClause.contact_id = decryptedContactId;
  }

  if (group_id) {
    const decryptedGroupId = decryptIdToNumber(group_id);
    if (decryptedGroupId) whereClause.group_id = decryptedGroupId;
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
    NoteModel.count({ where: whereClause }),
    NoteModel.findMany({
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

  const items: NoteSummary[] = notes.map((n) => ({
    uid: encryptId(n.pk_id),
    title: n.title,
    title_formatting: n.title_formatting as unknown | null,
    content_preview: n.content ? toPlainText(n.content).substring(0, 200) : '',
    note_type: n.note_type,
    contact_id: n.contact_id ? encryptId(n.contact_id) : null,
    group_id: n.group_id ? encryptId(n.group_id) : null,
    color: n.color,
    font_family: n.font_family as NoteFontFamily,
    drawing_data: n.drawing_data as unknown as NoteDrawing | null,
    is_important: n.is_important,
    createdOn: n.createdOn,
    modifiedOn: n.modifiedOn,
    contact_first_name: n.contact?.firstName || null,
    contact_last_name: n.contact?.lastName || null,
    group_name: n.group?.name || null,
  }));

  return { items, total, page, pageSize };
};

export const updateNote = async (noteId: string, noteData: NoteUpdatePayload): Promise<true> => {
  const { title, title_formatting, content, note_type, contact_id, group_id, color, font_family, drawing_data, is_important, keywords = [] } = noteData;

  const decryptedNoteId = decryptIdToNumber(noteId);
  if (!decryptedNoteId) throw new AppError('Invalid note ID', 400);

  const contactIdDecrypted = contact_id ? decryptIdToNumber(contact_id) : null;
  const groupIdDecrypted = group_id ? decryptIdToNumber(group_id) : null;

  if (note_type === 'contact' && !contactIdDecrypted) {
    throw new AppError('Contact ID is required for contact notes', 400);
  }
  if (note_type === 'group' && !groupIdDecrypted) {
    throw new AppError('Group ID is required for group notes', 400);
  }
  if (note_type === 'personal' && (contactIdDecrypted || groupIdDecrypted)) {
    throw new AppError('Personal notes cannot have contact or group references', 400);
  }

  const normalizedDrawing = drawing_data === undefined ? undefined : normalizeDrawing(drawing_data);
  const normalizedTitleFormatting = title_formatting === undefined ? undefined : normalizeTitleFormatting(title_formatting);
  await NoteModel.update({
    where: { pk_id: decryptedNoteId },
    data: {
      title,
      ...(normalizedTitleFormatting === undefined
        ? {}
        : { title_formatting: normalizedTitleFormatting ?? Prisma.DbNull }),
      content,
      note_type,
      contact_id: contactIdDecrypted,
      group_id: groupIdDecrypted,
      color: color || 'blue',
      ...(font_family ? { font_family } : {}),
      ...(normalizedDrawing === undefined
        ? {}
        : { drawing_data: normalizedDrawing ? normalizedDrawing as unknown as Prisma.InputJsonValue : Prisma.DbNull }),
      is_important: Boolean(is_important),
      modifiedOn: new Date(),
    },
  });

  await NoteKeywordModel.deleteMany({ where: { note_id: decryptedNoteId } });

  const uniqueKeywords = normalizeKeywords(keywords);
  if (uniqueKeywords.length > 0) {
    await NoteKeywordModel.createMany({
      data: uniqueKeywords.map((kw) => ({ note_id: decryptedNoteId, keyword: kw })),
      skipDuplicates: true,
    });
  }

  return true;
};

export const deleteNote = async (noteId: string): Promise<boolean> => {
  const decryptedNoteId = decryptIdToNumber(noteId);
  if (!decryptedNoteId) return false;

  const deleted = await NoteModel.update({
    where: { pk_id: decryptedNoteId },
    data: { is_deleted: true, modifiedOn: new Date() },
  });

  return !!deleted;
};

export const getNotesStats = async (userId: string): Promise<NotesStats> => {
  const decryptedUserId = decryptIdToNumber(userId);
  if (!decryptedUserId) throw new AppError('Invalid user ID', 400);

  const [total, important, personal, contact, group] = await Promise.all([
    NoteModel.count({ where: { user_id: decryptedUserId, is_deleted: false } }),
    NoteModel.count({ where: { user_id: decryptedUserId, is_deleted: false, is_important: true } }),
    NoteModel.count({ where: { user_id: decryptedUserId, is_deleted: false, note_type: 'personal' } }),
    NoteModel.count({ where: { user_id: decryptedUserId, is_deleted: false, note_type: 'contact' } }),
    NoteModel.count({ where: { user_id: decryptedUserId, is_deleted: false, note_type: 'group' } }),
  ]);

  return {
    total_notes: total,
    important_notes: important,
    personal_notes: personal,
    contact_notes: contact,
    group_notes: group,
  };
};

export const searchNotesByKeyword = async (
  userId: string,
  keyword: string,
  page = 1,
  pageSize = 10
): Promise<PaginatedResult<NoteSearchResult>> => {
  const decryptedUserId = decryptIdToNumber(userId);
  if (!decryptedUserId) throw new AppError('Invalid user ID', 400);

  const offset = (page - 1) * pageSize;
  const searchKeyword = String(keyword).toLowerCase();

  const whereClause: Prisma.NoteWhereInput = {
    user_id: decryptedUserId,
    is_deleted: false,
    keywords: { some: { keyword: { contains: searchKeyword } } },
  };

  const [total, notes] = await Promise.all([
    NoteModel.count({ where: whereClause }),
    NoteModel.findMany({
      where: whereClause,
      orderBy: [{ is_important: 'desc' }, { modifiedOn: 'desc' }],
      skip: offset,
      take: pageSize,
      include: { keywords: { select: { keyword: true } } },
    }),
  ]);

  const items: NoteSearchResult[] = notes.map((n) => ({
    uid: encryptId(n.pk_id),
    title: n.title,
    content_preview: n.content ? n.content.substring(0, 200) : '',
    note_type: n.note_type,
    is_important: n.is_important,
    createdOn: n.createdOn,
    matched_keywords: (n.keywords || []).map((k) => k.keyword).join(','),
  }));

  return { items, total, page, pageSize };
};
