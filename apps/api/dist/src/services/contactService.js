"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTag = exports.getTags = exports.toggleFavorite = exports.updateContactTags = exports.updateContact = exports.deleteContact = exports.getContactsForSelection = exports.getContactsList = exports.getContactById = exports.contactSave = void 0;
const contactModel_1 = require("../models/contactModel");
const groupModel_1 = require("../models/groupModel");
const dbEncryption_1 = require("../utils/dbEncryption");
const errors_1 = require("../utils/errors");
const contactSave = async (contactData) => {
    const { user_id, firstName, lastName, phone, alt_phone, mobile, email, address_line, city, state, postal_code, country, company, job_title, is_favorite, notes, tags = [], } = contactData;
    const userIdDecrypted = (0, dbEncryption_1.decryptIdToNumber)(user_id);
    if (!userIdDecrypted)
        throw new errors_1.AppError('Invalid user ID', 400);
    const newContact = await contactModel_1.ContactModel.create({
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
            const tagId = (0, dbEncryption_1.decryptIdToNumber)(tagUid);
            return tagId ? { contact_id: newContact.pk_id, tag_id: tagId } : null;
        })
            .filter((m) => m !== null);
        if (tagMappings.length > 0) {
            await contactModel_1.ContactTagMappingModel.createMany({ data: tagMappings, skipDuplicates: true });
        }
    }
    return newContact.pk_id;
};
exports.contactSave = contactSave;
const getContactById = async (contactId) => {
    const decryptedId = (0, dbEncryption_1.decryptIdToNumber)(contactId);
    if (!decryptedId)
        return null;
    const contact = await contactModel_1.ContactModel.findFirst({
        where: { pk_id: decryptedId, is_deleted: false },
        include: { tagMappings: { include: { tag: true } } },
    });
    if (!contact)
        return null;
    const tags = (contact.tagMappings || []).map((tm) => ({
        uid: (0, dbEncryption_1.encryptId)(tm.tag.pk_id),
        name: tm.tag.name,
    }));
    return {
        uid: (0, dbEncryption_1.encryptId)(contact.pk_id),
        user_id: (0, dbEncryption_1.encryptId)(contact.user_id),
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
exports.getContactById = getContactById;
const getContactsList = async (userId, filter = '', page = 1, pageSize = 10, tagId) => {
    const decryptedUserId = (0, dbEncryption_1.decryptIdToNumber)(userId);
    if (!decryptedUserId)
        throw new errors_1.AppError('Invalid user ID', 400);
    const offset = (page - 1) * pageSize;
    const filterCheck = filter ? String(filter).trim() : '';
    const whereClause = {
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
    if (tagId) {
        const decryptedTagId = (0, dbEncryption_1.decryptIdToNumber)(tagId);
        if (!decryptedTagId)
            throw new errors_1.AppError('Invalid tag ID', 400);
        whereClause.tagMappings = {
            some: {
                tag_id: decryptedTagId,
                tag: { is: { user_id: decryptedUserId } },
            },
        };
    }
    const [total, contacts] = await Promise.all([
        contactModel_1.ContactModel.count({ where: whereClause }),
        contactModel_1.ContactModel.findMany({
            where: whereClause,
            orderBy: { pk_id: 'desc' },
            skip: offset,
            take: pageSize,
        }),
    ]);
    const items = contacts.map((c) => ({
        uid: (0, dbEncryption_1.encryptId)(c.pk_id),
        firstName: c.firstName,
        lastName: c.lastName,
        phone: c.phone,
        email: c.email,
        status: c.status,
        createdOn: c.createdOn,
        is_favorite: c.is_favorite,
        modifiedOn: c.modifiedOn,
        'user.uid': (0, dbEncryption_1.encryptId)(c.user_id),
    }));
    return { items, total, page, pageSize };
};
exports.getContactsList = getContactsList;
const getContactsForSelection = async (userId, groupId = null, filter = '', page = 1, pageSize = 10) => {
    const decryptedUserId = (0, dbEncryption_1.decryptIdToNumber)(userId);
    if (!decryptedUserId)
        throw new errors_1.AppError('Invalid user ID', 400);
    const offset = (page - 1) * pageSize;
    const filterCheck = filter ? String(filter).trim() : '';
    const whereClause = {
        user_id: decryptedUserId,
        is_deleted: false,
    };
    if (groupId) {
        const decryptedGroupId = (0, dbEncryption_1.decryptIdToNumber)(groupId);
        if (decryptedGroupId) {
            const existingMembers = await groupModel_1.GroupMemberModel.findMany({
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
        contactModel_1.ContactModel.count({ where: whereClause }),
        contactModel_1.ContactModel.findMany({
            where: whereClause,
            orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
            skip: offset,
            take: pageSize,
            select: { pk_id: true, firstName: true, lastName: true, email: true },
        }),
    ]);
    const items = contacts.map((c) => ({
        uid: (0, dbEncryption_1.encryptId)(c.pk_id),
        firstName: c.firstName,
        lastName: c.lastName,
        email: c.email,
    }));
    return { items, total, page, pageSize };
};
exports.getContactsForSelection = getContactsForSelection;
const deleteContact = async (contactId) => {
    const decryptedId = (0, dbEncryption_1.decryptIdToNumber)(contactId);
    if (!decryptedId)
        return false;
    const deleted = await contactModel_1.ContactModel.update({
        where: { pk_id: decryptedId },
        data: { is_deleted: true },
    });
    return !!deleted;
};
exports.deleteContact = deleteContact;
const updateContact = async (contactId, contactData) => {
    const decryptedId = (0, dbEncryption_1.decryptIdToNumber)(contactId);
    if (!decryptedId)
        throw new errors_1.AppError('Invalid contact ID', 400);
    const { firstName, lastName, phone, alt_phone, mobile, email, address_line, city, state, postal_code, country, company, job_title, notes, } = contactData;
    await contactModel_1.ContactModel.update({
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
exports.updateContact = updateContact;
const updateContactTags = async (contactId, tags) => {
    const decryptedId = (0, dbEncryption_1.decryptIdToNumber)(contactId);
    if (!decryptedId)
        throw new errors_1.AppError('Invalid contact ID', 400);
    await contactModel_1.ContactTagMappingModel.deleteMany({ where: { contact_id: decryptedId } });
    const tagMappings = tags
        .map((tagUid) => {
        const tagId = (0, dbEncryption_1.decryptIdToNumber)(tagUid);
        return tagId ? { contact_id: decryptedId, tag_id: tagId } : null;
    })
        .filter((m) => m !== null);
    if (tagMappings.length > 0) {
        await contactModel_1.ContactTagMappingModel.createMany({ data: tagMappings, skipDuplicates: true });
    }
};
exports.updateContactTags = updateContactTags;
const toggleFavorite = async (contactId, isFavorite) => {
    const decryptedId = (0, dbEncryption_1.decryptIdToNumber)(contactId);
    if (!decryptedId)
        return false;
    const updated = await contactModel_1.ContactModel.update({
        where: { pk_id: decryptedId },
        data: { is_favorite: Boolean(isFavorite), modifiedOn: new Date() },
    });
    return !!updated;
};
exports.toggleFavorite = toggleFavorite;
const getTags = async (userId) => {
    const decryptedUserId = (0, dbEncryption_1.decryptIdToNumber)(userId);
    if (!decryptedUserId)
        throw new errors_1.AppError('Invalid user ID', 400);
    const tags = await contactModel_1.ContactTagModel.findMany({
        where: { user_id: decryptedUserId },
        orderBy: { name: 'asc' },
    });
    return tags.map((t) => ({ uid: (0, dbEncryption_1.encryptId)(t.pk_id), name: t.name }));
};
exports.getTags = getTags;
const createTag = async (name, userId) => {
    const decryptedUserId = (0, dbEncryption_1.decryptIdToNumber)(userId);
    if (!decryptedUserId)
        throw new errors_1.AppError('Invalid user ID', 400);
    const tag = await contactModel_1.ContactTagModel.create({ data: { name, user_id: decryptedUserId } });
    return { uid: (0, dbEncryption_1.encryptId)(tag.pk_id), name: tag.name };
};
exports.createTag = createTag;
//# sourceMappingURL=contactService.js.map