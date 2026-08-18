import { Prisma } from '@prisma/client';
import { ContactModel, ContactTagModel, ContactTagMappingModel } from '../models/contactModel';
import { GroupMemberModel } from '../models/groupModel';
import { encryptId, decryptIdToNumber } from '../utils/dbEncryption';
import { AppError } from '../utils/errors';
import type {
  ContactCreatePayload,
  ContactUpdatePayload,
  ContactDetail,
  ContactSummary,
  ContactForSelection,
  ContactTag,
} from '../types/contact';
import type { PaginatedResult } from '../types/pagination';

export const contactSave = async (contactData: ContactCreatePayload): Promise<number> => {
  const {
    user_id,
    firstName,
    lastName,
    phone,
    alt_phone,
    mobile,
    email,
    address_line,
    city,
    state,
    postal_code,
    country,
    company,
    job_title,
    is_favorite,
    notes,
    tags = [],
  } = contactData;

  const userIdDecrypted = decryptIdToNumber(user_id);
  if (!userIdDecrypted) throw new AppError('Invalid user ID', 400);

  const newContact = await ContactModel.create({
    data: {
      user_id: userIdDecrypted,
      firstName: firstName || '',
      lastName: lastName || null,
      phone: phone || null,
      alt_phone: alt_phone || null,
      mobile: mobile || null,
      email: email || null,
      address_line: address_line || null,
      city: city || null,
      state: state || null,
      postal_code: postal_code || null,
      country: country || null,
      company: company || null,
      job_title: job_title || null,
      is_favorite: is_favorite !== undefined ? Boolean(is_favorite) : false,
      notes: notes || null,
    },
  });

  if (Array.isArray(tags) && tags.length > 0) {
    const tagMappings = tags
      .map((tagUid) => {
        const tagId = decryptIdToNumber(tagUid);
        return tagId ? { contact_id: newContact.pk_id, tag_id: tagId } : null;
      })
      .filter((m): m is { contact_id: number; tag_id: number } => m !== null);

    if (tagMappings.length > 0) {
      await ContactTagMappingModel.createMany({ data: tagMappings, skipDuplicates: true });
    }
  }

  return newContact.pk_id;
};

export const getContactById = async (contactId: string): Promise<ContactDetail | null> => {
  const decryptedId = decryptIdToNumber(contactId);
  if (!decryptedId) return null;

  const contact = await ContactModel.findFirst({
    where: { pk_id: decryptedId, is_deleted: false },
    include: { tagMappings: { include: { tag: true } } },
  });

  if (!contact) return null;

  const tags: ContactTag[] = (contact.tagMappings || []).map((tm) => ({
    uid: encryptId(tm.tag.pk_id),
    name: tm.tag.name,
  }));

  return {
    uid: encryptId(contact.pk_id),
    user_id: encryptId(contact.user_id),
    firstName: contact.firstName,
    lastName: contact.lastName,
    phone: contact.phone,
    alt_phone: contact.alt_phone,
    mobile: contact.mobile,
    email: contact.email,
    address_line: contact.address_line,
    city: contact.city,
    state: contact.state,
    postal_code: contact.postal_code,
    country: contact.country,
    company: contact.company,
    job_title: contact.job_title,
    is_favorite: contact.is_favorite,
    notes: contact.notes,
    tags,
  };
};

export const getContactsList = async (
  userId: string,
  filter = '',
  page = 1,
  pageSize = 10
): Promise<PaginatedResult<ContactSummary>> => {
  const decryptedUserId = decryptIdToNumber(userId);
  if (!decryptedUserId) throw new AppError('Invalid user ID', 400);

  const offset = (page - 1) * pageSize;
  const filterCheck = filter ? String(filter).trim() : '';

  const whereClause: Prisma.ContactWhereInput = {
    user_id: decryptedUserId,
    is_deleted: false,
  };

  if (filterCheck) {
    whereClause.OR = [
      { firstName: { contains: filterCheck } },
      { lastName: { contains: filterCheck } },
      { phone: { contains: filterCheck } },
      { email: { contains: filterCheck } },
    ];
  }

  const [total, contacts] = await Promise.all([
    ContactModel.count({ where: whereClause }),
    ContactModel.findMany({
      where: whereClause,
      orderBy: { pk_id: 'desc' },
      skip: offset,
      take: pageSize,
    }),
  ]);

  const items: ContactSummary[] = contacts.map((c) => ({
    uid: encryptId(c.pk_id),
    firstName: c.firstName,
    lastName: c.lastName,
    phone: c.phone,
    email: c.email,
    status: c.status,
    createdOn: c.createdOn,
    is_favorite: c.is_favorite,
    modifiedOn: c.modifiedOn,
    'user.uid': encryptId(c.user_id),
  }));

  return { items, total, page, pageSize };
};

export const getContactsForSelection = async (
  userId: string,
  groupId: string | null = null,
  filter = '',
  page = 1,
  pageSize = 10
): Promise<PaginatedResult<ContactForSelection>> => {
  const decryptedUserId = decryptIdToNumber(userId);
  if (!decryptedUserId) throw new AppError('Invalid user ID', 400);

  const offset = (page - 1) * pageSize;
  const filterCheck = filter ? String(filter).trim() : '';

  const whereClause: Prisma.ContactWhereInput = {
    user_id: decryptedUserId,
    is_deleted: false,
  };

  if (groupId) {
    const decryptedGroupId = decryptIdToNumber(groupId);
    if (decryptedGroupId) {
      const existingMembers = await GroupMemberModel.findMany({
        where: { group_id: decryptedGroupId },
        select: { contact_id: true },
      });
      const excludedContactIds = existingMembers.map((m) => m.contact_id);
      if (excludedContactIds.length > 0) {
        whereClause.pk_id = { notIn: excludedContactIds };
      }
    }
  }

  if (filterCheck) {
    whereClause.OR = [
      { firstName: { contains: filterCheck } },
      { lastName: { contains: filterCheck } },
      { email: { contains: filterCheck } },
    ];
  }

  const [total, contacts] = await Promise.all([
    ContactModel.count({ where: whereClause }),
    ContactModel.findMany({
      where: whereClause,
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
      skip: offset,
      take: pageSize,
      select: { pk_id: true, firstName: true, lastName: true, email: true },
    }),
  ]);

  const items: ContactForSelection[] = contacts.map((c) => ({
    uid: encryptId(c.pk_id),
    firstName: c.firstName,
    lastName: c.lastName,
    email: c.email,
  }));

  return { items, total, page, pageSize };
};

export const deleteContact = async (contactId: string): Promise<boolean> => {
  const decryptedId = decryptIdToNumber(contactId);
  if (!decryptedId) return false;

  const deleted = await ContactModel.update({
    where: { pk_id: decryptedId },
    data: { is_deleted: true },
  });

  return !!deleted;
};

export const updateContact = async (contactId: string, contactData: ContactUpdatePayload): Promise<true> => {
  const decryptedId = decryptIdToNumber(contactId);
  if (!decryptedId) throw new AppError('Invalid contact ID', 400);

  const {
    firstName,
    lastName,
    phone,
    alt_phone,
    mobile,
    email,
    address_line,
    city,
    state,
    postal_code,
    country,
    company,
    job_title,
    notes,
  } = contactData;

  await ContactModel.update({
    where: { pk_id: decryptedId },
    data: {
      firstName,
      lastName: lastName || null,
      phone: phone || null,
      alt_phone: alt_phone || null,
      mobile: mobile || null,
      email: email || null,
      address_line: address_line || null,
      city: city || null,
      state: state || null,
      postal_code: postal_code || null,
      country: country || null,
      company: company || null,
      job_title: job_title || null,
      notes: notes || null,
      modifiedOn: new Date(),
    },
  });

  return true;
};

export const updateContactTags = async (contactId: string, tags: string[]): Promise<void> => {
  const decryptedId = decryptIdToNumber(contactId);
  if (!decryptedId) throw new AppError('Invalid contact ID', 400);

  await ContactTagMappingModel.deleteMany({ where: { contact_id: decryptedId } });

  const tagMappings = tags
    .map((tagUid) => {
      const tagId = decryptIdToNumber(tagUid);
      return tagId ? { contact_id: decryptedId, tag_id: tagId } : null;
    })
    .filter((m): m is { contact_id: number; tag_id: number } => m !== null);

  if (tagMappings.length > 0) {
    await ContactTagMappingModel.createMany({ data: tagMappings, skipDuplicates: true });
  }
};

export const toggleFavorite = async (contactId: string, isFavorite: boolean): Promise<boolean> => {
  const decryptedId = decryptIdToNumber(contactId);
  if (!decryptedId) return false;

  const updated = await ContactModel.update({
    where: { pk_id: decryptedId },
    data: { is_favorite: Boolean(isFavorite), modifiedOn: new Date() },
  });

  return !!updated;
};

export const getTags = async (userId: string): Promise<ContactTag[]> => {
  const decryptedUserId = decryptIdToNumber(userId);
  if (!decryptedUserId) throw new AppError('Invalid user ID', 400);

  const tags = await ContactTagModel.findMany({
    where: { user_id: decryptedUserId },
    orderBy: { name: 'asc' },
  });

  return tags.map((t) => ({ uid: encryptId(t.pk_id), name: t.name }));
};

export const createTag = async (name: string, userId: string): Promise<ContactTag> => {
  const decryptedUserId = decryptIdToNumber(userId);
  if (!decryptedUserId) throw new AppError('Invalid user ID', 400);

  const tag = await ContactTagModel.create({ data: { name, user_id: decryptedUserId } });

  return { uid: encryptId(tag.pk_id), name: tag.name };
};
