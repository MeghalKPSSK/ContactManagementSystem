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
exports.upsertContactAttributes = exports.getContactAttributes = exports.updateCustomAttribute = exports.createCustomAttribute = exports.listCustomAttributes = exports.createTag = exports.listTags = exports.toggleFavorite = exports.updateContact = exports.deleteContact = exports.getContact = exports.listContactsForSelection = exports.listContacts = exports.saveContact = void 0;
const contactService = __importStar(require("../services/contactService"));
const customAttributesService = __importStar(require("../services/customAttributesService"));
const dbEncryption_1 = require("../utils/dbEncryption");
const errors_1 = require("../utils/errors");
const http_1 = require("../utils/http");
const saveContact = async (req, res) => {
    try {
        const contactId = (0, dbEncryption_1.encryptId)(await contactService.contactSave(req.body));
        console.log(`Contacts created with ID: ${contactId}`);
        res.status(201).json({ success: true, uid: contactId, message: 'Contact added successfully' });
    }
    catch (error) {
        console.error('Error adding contact:', error);
        res.status((0, errors_1.getErrorStatus)(error)).json({ success: false, message: (0, errors_1.getErrorMessage)(error) || 'Error adding contact' });
    }
};
exports.saveContact = saveContact;
const listContacts = async (req, res) => {
    try {
        const { userId, filter, page = '1', pageSize = '10', tagId } = req.query;
        const result = await contactService.getContactsList(userId, filter, parseInt(page, 10), parseInt(pageSize, 10), tagId);
        res.status(200).json({
            success: true,
            contacts: result.items,
            pagination: { current: result.page, pageSize: result.pageSize, total: result.total },
            message: 'Contacts list retrieved successfully',
        });
    }
    catch (error) {
        console.error('Error retrieving contacts:', error);
        res.status((0, errors_1.getErrorStatus)(error)).json({ success: false, message: 'Error retrieving contacts' });
    }
};
exports.listContacts = listContacts;
const listContactsForSelection = async (req, res) => {
    try {
        const { userId, groupId, page = '1', pageSize = '10', filter } = req.query;
        if (!userId) {
            res.status(400).json({ success: false, message: 'User ID is required' });
            return;
        }
        const result = await contactService.getContactsForSelection(userId, groupId ?? null, filter, parseInt(page, 10), parseInt(pageSize, 10));
        res.status(200).json({
            success: true,
            contacts: result.items,
            pagination: {
                current: result.page,
                pageSize: result.pageSize,
                total: result.total,
                totalPages: Math.ceil(result.total / result.pageSize),
            },
            message: 'Contacts retrieved for selection successfully',
        });
    }
    catch (error) {
        console.error('Error retrieving contacts for selection:', error);
        res.status((0, errors_1.getErrorStatus)(error)).json({ success: false, message: 'Error retrieving contacts for selection' });
    }
};
exports.listContactsForSelection = listContactsForSelection;
const getContact = async (req, res) => {
    try {
        const contact = await contactService.getContactById((0, http_1.paramStr)(req.params.id));
        if (!contact) {
            res.status(404).json({ success: false, message: 'Contact not found' });
            return;
        }
        res.status(200).json({ success: true, contact });
    }
    catch (error) {
        console.error('Error retrieving contact:', error);
        res.status((0, errors_1.getErrorStatus)(error)).json({ success: false, message: 'Error retrieving contact' });
    }
};
exports.getContact = getContact;
const deleteContact = async (req, res) => {
    try {
        const contactId = (0, http_1.paramStr)(req.params.id);
        console.log(`Contact UID for Deletion: ${contactId}`);
        const result = await contactService.deleteContact(contactId);
        if (result) {
            res.status(200).json({ success: true, message: 'Contact deleted successfully' });
        }
        else {
            res.status(404).json({ success: false, message: 'Contact not found' });
        }
    }
    catch (error) {
        console.error('Error deleting contact:', error);
        res.status((0, errors_1.getErrorStatus)(error)).json({ success: false, message: 'Error deleting contact' });
    }
};
exports.deleteContact = deleteContact;
const updateContact = async (req, res) => {
    try {
        const { tag_ids, ...contactData } = req.body;
        await contactService.updateContact((0, http_1.paramStr)(req.params.id), contactData);
        if (tag_ids?.length) {
            await contactService.updateContactTags((0, http_1.paramStr)(req.params.id), tag_ids);
        }
        res.status(200).json({ success: true, message: 'Contact updated successfully' });
    }
    catch (error) {
        console.error('Error updating contact:', error);
        res.status((0, errors_1.getErrorStatus)(error)).json({ success: false, message: 'Error updating contact' });
    }
};
exports.updateContact = updateContact;
const toggleFavorite = async (req, res) => {
    try {
        const contactId = (0, http_1.paramStr)(req.params.id);
        const { is_favorite } = req.body;
        const result = await contactService.toggleFavorite(contactId, is_favorite);
        if (result) {
            res.status(200).json({
                success: true,
                message: `Contact ${is_favorite ? 'marked as favorite' : 'removed from favorites'}`,
            });
        }
        else {
            res.status(404).json({ success: false, message: 'Contact not found' });
        }
    }
    catch (error) {
        console.error('Error toggling favorite status:', error);
        res.status((0, errors_1.getErrorStatus)(error)).json({ success: false, message: 'Error toggling favorite status' });
    }
};
exports.toggleFavorite = toggleFavorite;
const listTags = async (req, res) => {
    try {
        const tags = await contactService.getTags(req.query.userId);
        res.status(200).json({ success: true, tags, message: 'Tags retrieved successfully' });
    }
    catch (error) {
        console.error('Error retrieving tags:', error);
        res.status((0, errors_1.getErrorStatus)(error)).json({ success: false, message: 'Error retrieving tags' });
    }
};
exports.listTags = listTags;
const createTag = async (req, res) => {
    try {
        const { name, userId } = req.body;
        const tag = await contactService.createTag(name, userId);
        res.status(201).json({ success: true, tag });
    }
    catch (error) {
        console.error('Error creating tag:', error);
        res.status((0, errors_1.getErrorStatus)(error)).json({ success: false, message: 'Error creating tag' });
    }
};
exports.createTag = createTag;
const listCustomAttributes = async (req, res) => {
    try {
        const { userId, includeInactive } = req.query;
        if (!userId) {
            res.status(400).json({ success: false, message: 'User ID is required' });
            return;
        }
        const defs = await customAttributesService.listDefinitions(userId, includeInactive !== 'false');
        res.status(200).json({ success: true, attributes: defs });
    }
    catch (error) {
        console.error('Error listing custom attributes:', (0, errors_1.getErrorMessage)(error));
        res.status((0, errors_1.getErrorStatus)(error)).json({ success: false, message: (0, errors_1.getErrorMessage)(error) || 'Error listing attributes' });
    }
};
exports.listCustomAttributes = listCustomAttributes;
const createCustomAttribute = async (req, res) => {
    try {
        const def = await customAttributesService.createDefinition(req.body);
        res.status(201).json({ success: true, attribute: def, message: 'Attribute created' });
    }
    catch (error) {
        console.error('Error creating custom attribute:', (0, errors_1.getErrorMessage)(error));
        res.status((0, errors_1.getErrorStatus)(error)).json({ success: false, message: (0, errors_1.getErrorMessage)(error) || 'Error creating attribute' });
    }
};
exports.createCustomAttribute = createCustomAttribute;
const updateCustomAttribute = async (req, res) => {
    try {
        const ok = await customAttributesService.updateDefinition((0, http_1.paramStr)(req.params.attrId), req.body);
        if (!ok) {
            res.status(400).json({ success: false, message: 'No changes applied' });
            return;
        }
        res.status(200).json({ success: true, message: 'Attribute updated' });
    }
    catch (error) {
        console.error('Error updating custom attribute:', (0, errors_1.getErrorMessage)(error));
        res.status((0, errors_1.getErrorStatus)(error)).json({ success: false, message: (0, errors_1.getErrorMessage)(error) || 'Error updating attribute' });
    }
};
exports.updateCustomAttribute = updateCustomAttribute;
const getContactAttributes = async (req, res) => {
    try {
        const attrs = await customAttributesService.getContactAttributes((0, http_1.paramStr)(req.params.id));
        res.status(200).json({ success: true, attributes: attrs });
    }
    catch (error) {
        console.error('Error getting contact attributes:', (0, errors_1.getErrorMessage)(error));
        res.status((0, errors_1.getErrorStatus)(error)).json({ success: false, message: (0, errors_1.getErrorMessage)(error) || 'Error retrieving attributes' });
    }
};
exports.getContactAttributes = getContactAttributes;
const upsertContactAttributes = async (req, res) => {
    try {
        const { values } = req.body;
        await customAttributesService.upsertContactAttributes((0, http_1.paramStr)(req.params.id), values);
        res.status(200).json({ success: true, message: 'Attributes saved' });
    }
    catch (error) {
        console.error('Error saving contact attributes:', (0, errors_1.getErrorMessage)(error));
        res.status((0, errors_1.getErrorStatus)(error)).json({ success: false, message: (0, errors_1.getErrorMessage)(error) || 'Error saving attributes' });
    }
};
exports.upsertContactAttributes = upsertContactAttributes;
//# sourceMappingURL=contactController.js.map