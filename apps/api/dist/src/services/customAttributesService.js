"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.upsertContactAttributes = exports.getContactAttributes = exports.updateDefinition = exports.createDefinition = exports.listDefinitions = void 0;
const client_1 = require("@prisma/client");
const customAttributesModel_1 = require("../models/customAttributesModel");
const contactModel_1 = require("../models/contactModel");
const userModel_1 = require("../models/userModel");
const dbEncryption_1 = require("../utils/dbEncryption");
const errors_1 = require("../utils/errors");
const ALLOWED_TYPES = ['text', 'number', 'date', 'boolean', 'select', 'radio'];
// Resolve per-plan limits. Prefers explicit app_user.plan; falls back to role.
const getUserAttributeLimit = (planOrRole) => {
    const v = (planOrRole || '').toString().toLowerCase();
    switch (v) {
        case 'free':
        case 'user':
            return 3;
        case 'pro':
            return 5;
        case 'enterprise':
        case 'admin':
            return 10;
        default:
            return 3;
    }
};
const parseOptions = (optionsJson) => {
    if (optionsJson === null || optionsJson === undefined)
        return null;
    return typeof optionsJson === 'string' ? JSON.parse(optionsJson) : optionsJson;
};
const listDefinitions = async (userId, includeInactive = true) => {
    const decryptedUserId = (0, dbEncryption_1.decryptIdToNumber)(userId);
    if (!decryptedUserId)
        throw new errors_1.AppError('Invalid user ID', 400);
    const whereClause = { user_id: decryptedUserId };
    if (!includeInactive) {
        whereClause.is_active = true;
    }
    const rows = await customAttributesModel_1.CustomAttributeModel.findMany({
        where: whereClause,
        orderBy: [{ is_active: 'desc' }, { sort_order: 'asc' }, { pk_id: 'asc' }],
    });
    return rows.map((r) => ({
        uid: (0, dbEncryption_1.encryptId)(r.pk_id),
        key_name: r.key_name,
        label: r.label,
        type: r.type,
        options: parseOptions(r.options_json),
        is_required: r.is_required,
        is_active: r.is_active,
        sort_order: r.sort_order,
        createdOn: r.createdOn,
        modifiedOn: r.modifiedOn,
    }));
};
exports.listDefinitions = listDefinitions;
const createDefinition = async (def) => {
    const { userId, key_name, label, type, options = null, is_required = false, is_active = true, sort_order = 0, } = def;
    const decryptedUserId = (0, dbEncryption_1.decryptIdToNumber)(userId);
    if (!decryptedUserId)
        throw new errors_1.AppError('Invalid user ID', 400);
    const user = await userModel_1.AppUserModel.findFirst({
        where: { pk_id: decryptedUserId, is_deleted: false },
        select: { plan: true, role: true },
    });
    if (!user) {
        throw new errors_1.AppError('Invalid user', 400);
    }
    const limit = getUserAttributeLimit(user.plan || user.role);
    const activeCount = await customAttributesModel_1.CustomAttributeModel.count({
        where: { user_id: decryptedUserId, is_active: true },
    });
    if (activeCount >= limit) {
        throw new errors_1.AppError(`Attribute limit reached for plan (max ${limit})`, 400);
    }
    if (!/^[a-z0-9_]{2,64}$/.test(key_name)) {
        throw new errors_1.AppError('Invalid key_name (use lowercase letters, numbers, underscore)', 400);
    }
    if (!ALLOWED_TYPES.includes(type)) {
        throw new errors_1.AppError('Invalid type', 400);
    }
    let optionsJson = null;
    if (type === 'select' || type === 'radio') {
        if (!Array.isArray(options) || options.some((o) => typeof o !== 'string')) {
            throw new errors_1.AppError('Options must be an array of strings', 400);
        }
        optionsJson = options;
    }
    const created = await customAttributesModel_1.CustomAttributeModel.create({
        data: {
            user_id: decryptedUserId,
            key_name,
            label,
            type,
            options_json: optionsJson ?? client_1.Prisma.JsonNull,
            is_required: Boolean(is_required),
            is_active: Boolean(is_active),
            sort_order: Number(sort_order) || 0,
        },
    });
    return {
        uid: (0, dbEncryption_1.encryptId)(created.pk_id),
        key_name: created.key_name,
        label: created.label,
        type: created.type,
        options: parseOptions(created.options_json),
        is_required: created.is_required,
        is_active: created.is_active,
        sort_order: created.sort_order,
    };
};
exports.createDefinition = createDefinition;
const updateDefinition = async (attrId, patch) => {
    const decryptedAttrId = (0, dbEncryption_1.decryptIdToNumber)(attrId);
    if (!decryptedAttrId)
        throw new errors_1.AppError('Invalid attribute ID', 400);
    // If re-activating, ensure plan limit isn't exceeded
    if (patch.is_active === true) {
        const attr = await customAttributesModel_1.CustomAttributeModel.findFirst({
            where: { pk_id: decryptedAttrId },
            include: { user: true },
        });
        if (!attr) {
            throw new errors_1.AppError('Attribute not found', 404);
        }
        if (!attr.is_active) {
            const limit = getUserAttributeLimit(attr.user?.plan || attr.user?.role);
            const count = await customAttributesModel_1.CustomAttributeModel.count({
                where: { user_id: attr.user_id, is_active: true },
            });
            if (count >= limit) {
                throw new errors_1.AppError(`Cannot activate attribute: plan limit reached (max ${limit})`, 400);
            }
        }
    }
    const updateData = { modifiedOn: new Date() };
    if (patch.label !== undefined)
        updateData.label = patch.label;
    if (patch.type !== undefined) {
        if (!ALLOWED_TYPES.includes(patch.type)) {
            throw new errors_1.AppError('Invalid type', 400);
        }
        updateData.type = patch.type;
    }
    if (patch.options !== undefined) {
        if (patch.options === null) {
            updateData.options_json = client_1.Prisma.JsonNull;
        }
        else if (Array.isArray(patch.options) && patch.options.every((o) => typeof o === 'string')) {
            updateData.options_json = patch.options;
        }
        else {
            throw new errors_1.AppError('Options must be an array of strings or null', 400);
        }
    }
    if (patch.is_required !== undefined)
        updateData.is_required = Boolean(patch.is_required);
    if (patch.is_active !== undefined)
        updateData.is_active = Boolean(patch.is_active);
    if (patch.sort_order !== undefined)
        updateData.sort_order = Number(patch.sort_order) || 0;
    const updated = await customAttributesModel_1.CustomAttributeModel.update({
        where: { pk_id: decryptedAttrId },
        data: updateData,
    });
    return !!updated;
};
exports.updateDefinition = updateDefinition;
const getContactAttributes = async (contactId, includeInactive = false) => {
    const decryptedContactId = (0, dbEncryption_1.decryptIdToNumber)(contactId);
    if (!decryptedContactId)
        return [];
    const contact = await contactModel_1.ContactModel.findFirst({
        where: { pk_id: decryptedContactId, is_deleted: false },
        select: { user_id: true },
    });
    if (!contact)
        return [];
    const whereDef = { user_id: contact.user_id };
    if (!includeInactive) {
        whereDef.is_active = true;
    }
    const defs = await customAttributesModel_1.CustomAttributeModel.findMany({
        where: whereDef,
        orderBy: [{ sort_order: 'asc' }, { pk_id: 'asc' }],
    });
    const values = await customAttributesModel_1.ContactAttributeValueModel.findMany({
        where: { contact_id: decryptedContactId },
    });
    const valueByAttrId = new Map(values.map((v) => [v.attribute_id, v.value_text]));
    return defs.map((d) => ({
        key_name: d.key_name,
        label: d.label,
        type: d.type,
        options: parseOptions(d.options_json),
        value: valueByAttrId.get(d.pk_id) ?? null,
    }));
};
exports.getContactAttributes = getContactAttributes;
const upsertContactAttributes = async (contactId, values) => {
    if (!Array.isArray(values)) {
        throw new errors_1.AppError('values must be an array', 400);
    }
    const decryptedContactId = (0, dbEncryption_1.decryptIdToNumber)(contactId);
    if (!decryptedContactId)
        throw new errors_1.AppError('Invalid contact ID', 400);
    const contact = await contactModel_1.ContactModel.findFirst({
        where: { pk_id: decryptedContactId, is_deleted: false },
        select: { user_id: true },
    });
    if (!contact)
        throw new errors_1.AppError('Contact not found', 404);
    const defs = await customAttributesModel_1.CustomAttributeModel.findMany({ where: { user_id: contact.user_id } });
    const defByKey = new Map(defs.map((d) => [d.key_name, { ...d, options: parseOptions(d.options_json) }]));
    const requiredDefs = defs.filter((d) => d.is_active && d.is_required);
    let currentReqValues = new Map();
    if (requiredDefs.length > 0) {
        const ids = requiredDefs.map((d) => d.pk_id);
        const curRows = await customAttributesModel_1.ContactAttributeValueModel.findMany({
            where: { contact_id: decryptedContactId, attribute_id: { in: ids } },
        });
        currentReqValues = new Map(curRows.map((r) => [r.attribute_id, r.value_text]));
    }
    const updates = [];
    for (const item of values) {
        const { key_name, value } = item || {};
        const def = defByKey.get(key_name);
        if (!def || !def.is_active)
            continue;
        let strValue = null;
        if (value === null || value === undefined || value === '') {
            strValue = null;
        }
        else {
            switch (def.type) {
                case 'text': {
                    strValue = String(value);
                    if (strValue.length > 500) {
                        throw new errors_1.AppError(`Value too long for ${key_name}`, 400);
                    }
                    break;
                }
                case 'number': {
                    if (typeof value === 'string' && value.trim() === '') {
                        strValue = null;
                        break;
                    }
                    const num = Number(value);
                    if (!Number.isFinite(num)) {
                        throw new errors_1.AppError(`Invalid number for ${key_name}`, 400);
                    }
                    strValue = String(num);
                    break;
                }
                case 'date': {
                    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
                        throw new errors_1.AppError(`Invalid date for ${key_name}`, 400);
                    }
                    strValue = String(value);
                    break;
                }
                case 'boolean': {
                    strValue = value === true || value === 'true' ? 'true' : value === false || value === 'false' ? 'false' : null;
                    if (strValue === null) {
                        throw new errors_1.AppError(`Invalid boolean for ${key_name}`, 400);
                    }
                    break;
                }
                case 'select':
                case 'radio': {
                    if (!Array.isArray(def.options) || !def.options.includes(String(value))) {
                        throw new errors_1.AppError(`Invalid option for ${key_name}`, 400);
                    }
                    strValue = String(value);
                    break;
                }
                default:
                    strValue = String(value);
            }
        }
        updates.push({ def, key_name, strValue });
    }
    const missing = [];
    for (const d of requiredDefs) {
        const incoming = updates.find((u) => u.def.pk_id === d.pk_id);
        const incomingValid = incoming !== undefined && incoming.strValue !== null && incoming.strValue !== '';
        const currentVal = currentReqValues.get(d.pk_id);
        const hasCurrent = currentVal !== undefined && currentVal !== null && String(currentVal) !== '';
        if (!incomingValid && !hasCurrent) {
            missing.push(d.key_name);
        }
    }
    if (missing.length > 0) {
        throw new errors_1.AppError(`Missing required attributes: ${missing.join(', ')}`, 400);
    }
    for (const u of updates) {
        await customAttributesModel_1.ContactAttributeValueModel.upsert({
            where: {
                contact_id_attribute_id: { contact_id: decryptedContactId, attribute_id: u.def.pk_id },
            },
            create: { contact_id: decryptedContactId, attribute_id: u.def.pk_id, value_text: u.strValue },
            update: { value_text: u.strValue, modifiedOn: new Date() },
        });
    }
    return true;
};
exports.upsertContactAttributes = upsertContactAttributes;
//# sourceMappingURL=customAttributesService.js.map