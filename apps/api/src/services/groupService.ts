import { Prisma } from '@prisma/client';
import { GroupModel, GroupMemberModel } from '../models/groupModel';
import { encryptId, decryptIdToNumber } from '../utils/dbEncryption';
import { AppError } from '../utils/errors';
import type { GroupSavePayload, GroupUpdatePayload, GroupDetail, GroupSummary } from '../types/group';
import type { PaginatedResult } from '../types/pagination';

const normalizeGroupIconRef = (value: string | null): string | null => {
  if (!value) return null;
  if (value.startsWith('data:') || value.startsWith('http://') || value.startsWith('https://')) return value;
  if (value.startsWith('/uploads/')) return value;
  return `/uploads/group_icons/${value}`;
};

export const groupSave = async (groupData: GroupSavePayload): Promise<number> => {
  const { user_id, name, description, group_icon } = groupData;
  const decryptedUserId = decryptIdToNumber(user_id);
  if (!decryptedUserId) throw new AppError('Invalid user ID', 400);

  const newGroup = await GroupModel.create({
    data: {
      user_id: decryptedUserId,
      name: name || '',
      description: description || null,
      group_icon: group_icon || null,
    },
  });

  console.log(`Group created with ID: ${newGroup.pk_id}`);
  return newGroup.pk_id;
};

export const getGroupById = async (groupId: string, page = 1, pageSize = 10): Promise<GroupDetail | null> => {
  const decryptedGroupId = decryptIdToNumber(groupId);
  if (!decryptedGroupId) return null;

  const group = await GroupModel.findFirst({
    where: { pk_id: decryptedGroupId, is_deleted: false },
    include: {
      members: {
        orderBy: { pk_id: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          contact: { select: { pk_id: true, firstName: true, lastName: true, email: true } },
        },
      },
      _count: { select: { members: true } },
    },
  });

  if (!group) return null;

  const members = (group.members || []).map((m) => ({
    uid: encryptId(m.contact.pk_id),
    firstName: m.contact.firstName,
    lastName: m.contact.lastName,
    email: m.contact.email,
  }));

  return {
    uid: encryptId(group.pk_id),
    name: group.name,
    description: group.description,
    group_icon: normalizeGroupIconRef(group.group_icon),
    user_id: encryptId(group.user_id),
    members,
    membersTotal: group._count.members,
  };
};

export const getGroupsList = async (
  userId: string,
  filter = '',
  page = 1,
  pageSize = 10
): Promise<PaginatedResult<GroupSummary>> => {
  const decryptedUserId = decryptIdToNumber(userId);
  if (!decryptedUserId) throw new AppError('Invalid user ID', 400);

  const offset = (page - 1) * pageSize;
  const filterCheck = filter ? String(filter).trim() : '';

  const whereClause: Prisma.GroupWhereInput = { user_id: decryptedUserId, is_deleted: false };
  if (filterCheck) {
    whereClause.name = { contains: filterCheck };
  }

  const [total, groups] = await Promise.all([
    GroupModel.count({ where: whereClause }),
    GroupModel.findMany({
      where: whereClause,
      orderBy: { pk_id: 'desc' },
      skip: offset,
      take: pageSize,
      include: { _count: { select: { members: true } } },
    }),
  ]);

  const items: GroupSummary[] = groups.map((g) => ({
    uid: encryptId(g.pk_id),
    name: g.name,
    createdOn: g.createdOn,
    modifiedOn: g.modifiedOn,
    group_icon: normalizeGroupIconRef(g.group_icon),
    description: g.description,
    user_id: encryptId(g.user_id),
    group_members: g._count.members,
  }));

  return { items, total, page, pageSize };
};

export const deleteGroup = async (groupId: string): Promise<boolean> => {
  const decryptedGroupId = decryptIdToNumber(groupId);
  if (!decryptedGroupId) return false;

  const deleted = await GroupModel.update({
    where: { pk_id: decryptedGroupId },
    data: { is_deleted: true },
  });

  return !!deleted;
};

export const updateGroup = async (groupId: string, groupData: GroupUpdatePayload): Promise<boolean> => {
  const decryptedGroupId = decryptIdToNumber(groupId);
  if (!decryptedGroupId) throw new AppError('Invalid group ID', 400);

  const { name, description, group_icon } = groupData;
  const dataToUpdate: Prisma.GroupUpdateInput = {
    name,
    description: description !== undefined ? description : undefined,
    modifiedOn: new Date(),
  };

  if (group_icon !== undefined) {
    dataToUpdate.group_icon = group_icon;
  }

  const updated = await GroupModel.update({
    where: { pk_id: decryptedGroupId },
    data: dataToUpdate,
  });

  return !!updated;
};

export const addGroupMembers = async (groupId: string, memberIds: string[]): Promise<true> => {
  if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
    throw new AppError('Invalid member IDs provided', 400);
  }

  const decryptedGroupId = decryptIdToNumber(groupId);
  if (!decryptedGroupId) throw new AppError('Invalid group ID', 400);

  for (const memberId of memberIds) {
    const decryptedContactId = decryptIdToNumber(memberId);
    if (!decryptedContactId) continue;

    const existing = await GroupMemberModel.findFirst({
      where: { group_id: decryptedGroupId, contact_id: decryptedContactId },
    });

    if (!existing) {
      await GroupMemberModel.create({
        data: { group_id: decryptedGroupId, contact_id: decryptedContactId },
      });
    }
  }

  return true;
};

export const removeGroupMember = async (groupId: string, memberId: string): Promise<boolean> => {
  const decryptedGroupId = decryptIdToNumber(groupId);
  const decryptedContactId = decryptIdToNumber(memberId);
  if (!decryptedGroupId || !decryptedContactId) return false;

  const deleted = await GroupMemberModel.deleteMany({
    where: { group_id: decryptedGroupId, contact_id: decryptedContactId },
  });

  return deleted.count > 0;
};
