import { Prisma } from '@prisma/client';
import { ContactModel, ContactTagModel } from '../models/contactModel';
import { GroupModel } from '../models/groupModel';
import { encryptId, decryptIdToNumber } from '../utils/dbEncryption';
import { AppError } from '../utils/errors';
import type { TagsDistribution, FavoritesCount, DashboardContact, GroupsStatistics } from '../types/dashboard';

export const getTagsDistribution = async (userId: string): Promise<TagsDistribution> => {
  const decryptedUserId = decryptIdToNumber(userId);
  if (!decryptedUserId) throw new AppError('Invalid user ID', 400);

  const tags = await ContactTagModel.findMany({
    where: { user_id: decryptedUserId },
    include: { tagMappings: { where: { contact: { is_deleted: false } } } },
  });

  const tagsWithCounts = tags
    .map((tag) => ({ name: tag.name, count: tag.tagMappings.length }))
    .sort((a, b) => b.count - a.count);

  return {
    counts: tagsWithCounts.map((t) => t.count),
    labels: tagsWithCounts.map((t) => t.name),
  };
};

export const getFavoritesCount = async (userId: string): Promise<FavoritesCount> => {
  const decryptedUserId = decryptIdToNumber(userId);
  if (!decryptedUserId) throw new AppError('Invalid user ID', 400);

  const [favoriteCount, regularCount] = await Promise.all([
    ContactModel.count({ where: { user_id: decryptedUserId, is_deleted: false, is_favorite: true } }),
    ContactModel.count({ where: { user_id: decryptedUserId, is_deleted: false, is_favorite: false } }),
  ]);

  return { favorite: favoriteCount, regular: regularCount };
};

export const getDashboardContacts = async (
  userId: string,
  tags: string[] = [],
  page = 1,
  pageSize = 9
): Promise<{ contacts: DashboardContact[]; total: number }> => {
  const decryptedUserId = decryptIdToNumber(userId);
  if (!decryptedUserId) throw new AppError('Invalid user ID', 400);

  const safePage = page || 1;
  const safePageSize = pageSize || 9;
  const offset = (safePage - 1) * safePageSize;

  const cleanTags = (Array.isArray(tags) ? tags : [tags]).filter((t) => t && String(t).trim() !== '');

  const whereClause: Prisma.ContactWhereInput = { user_id: decryptedUserId, is_deleted: false };

  if (cleanTags.length > 0) {
    whereClause.tagMappings = {
      some: { tag: { name: { in: cleanTags }, user_id: decryptedUserId } },
    };
  }

  const [total, contacts] = await Promise.all([
    ContactModel.count({ where: whereClause }),
    ContactModel.findMany({
      where: whereClause,
      orderBy: { firstName: 'asc' },
      skip: offset,
      take: safePageSize,
      include: { tagMappings: { include: { tag: true } } },
    }),
  ]);

  const formattedContacts: DashboardContact[] = contacts.map((c) => ({
    uid: encryptId(c.pk_id),
    firstName: c.firstName,
    lastName: c.lastName,
    phone: c.phone,
    email: c.email,
    is_favorite: c.is_favorite,
    tags: (c.tagMappings || []).map((tm) => ({ uid: encryptId(tm.tag.pk_id), name: tm.tag.name })),
  }));

  return { contacts: formattedContacts, total };
};

export const getGroupsStatistics = async (userId: string): Promise<GroupsStatistics> => {
  try {
    const decryptedUserId = decryptIdToNumber(userId);
    if (!decryptedUserId) throw new AppError('Invalid user ID', 400);

    const groups = await GroupModel.findMany({
      where: { user_id: decryptedUserId, is_deleted: false },
      include: { members: { where: { contact: { is_deleted: false } } } },
      take: 10,
    });

    const group_data = groups
      .map((g) => ({ name: g.name, count: g.members.length }))
      .sort((a, b) => b.count - a.count);

    const tags = await ContactTagModel.findMany({
      where: { user_id: decryptedUserId },
      include: { tagMappings: { where: { contact: { is_deleted: false } } } },
      take: 8,
    });

    const tag_data = tags
      .map((t) => ({ name: t.name, count: t.tagMappings.length }))
      .sort((a, b) => b.count - a.count);

    return { group_data, tag_data };
  } catch (error) {
    console.error('getGroupsStatistics - Error:', error instanceof Error ? error.message : error);
    return { group_data: [], tag_data: [] };
  }
};
