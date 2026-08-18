import type { Request, Response } from 'express';
import * as contactService from '../services/contactService';
import * as customAttributesService from '../services/customAttributesService';
import { encryptId } from '../utils/dbEncryption';
import { getErrorMessage, getErrorStatus } from '../utils/errors';
import { paramStr } from '../utils/http';

export const saveContact = async (req: Request, res: Response): Promise<void> => {
  try {
    const contactId = encryptId(await contactService.contactSave(req.body));
    console.log(`Contacts created with ID: ${contactId}`);
    res.status(201).json({ success: true, uid: contactId, message: 'Contact added successfully' });
  } catch (error) {
    console.error('Error adding contact:', error);
    res.status(getErrorStatus(error)).json({ success: false, message: getErrorMessage(error) || 'Error adding contact' });
  }
};

export const listContacts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, filter, page = '1', pageSize = '10' } = req.query as Record<string, string>;
    const result = await contactService.getContactsList(userId, filter, parseInt(page, 10), parseInt(pageSize, 10));
    res.status(200).json({
      success: true,
      contacts: result.items,
      pagination: { current: result.page, pageSize: result.pageSize, total: result.total },
      message: 'Contacts list retrieved successfully',
    });
  } catch (error) {
    console.error('Error retrieving contacts:', error);
    res.status(getErrorStatus(error)).json({ success: false, message: 'Error retrieving contacts' });
  }
};

export const listContactsForSelection = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, groupId, page = '1', pageSize = '10', filter } = req.query as Record<string, string>;

    if (!userId) {
      res.status(400).json({ success: false, message: 'User ID is required' });
      return;
    }

    const result = await contactService.getContactsForSelection(
      userId,
      groupId ?? null,
      filter,
      parseInt(page, 10),
      parseInt(pageSize, 10)
    );
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
  } catch (error) {
    console.error('Error retrieving contacts for selection:', error);
    res.status(getErrorStatus(error)).json({ success: false, message: 'Error retrieving contacts for selection' });
  }
};

export const getContact = async (req: Request, res: Response): Promise<void> => {
  try {
    const contact = await contactService.getContactById(paramStr(req.params.id));

    if (!contact) {
      res.status(404).json({ success: false, message: 'Contact not found' });
      return;
    }

    res.status(200).json({ success: true, contact });
  } catch (error) {
    console.error('Error retrieving contact:', error);
    res.status(getErrorStatus(error)).json({ success: false, message: 'Error retrieving contact' });
  }
};

export const deleteContact = async (req: Request, res: Response): Promise<void> => {
  try {
    const contactId = paramStr(req.params.id);
    console.log(`Contact UID for Deletion: ${contactId}`);
    const result = await contactService.deleteContact(contactId);
    if (result) {
      res.status(200).json({ success: true, message: 'Contact deleted successfully' });
    } else {
      res.status(404).json({ success: false, message: 'Contact not found' });
    }
  } catch (error) {
    console.error('Error deleting contact:', error);
    res.status(getErrorStatus(error)).json({ success: false, message: 'Error deleting contact' });
  }
};

export const updateContact = async (req: Request, res: Response): Promise<void> => {
  try {
    const { tag_ids, ...contactData } = req.body;
    await contactService.updateContact(paramStr(req.params.id), contactData);

    if (tag_ids?.length) {
      await contactService.updateContactTags(paramStr(req.params.id), tag_ids);
    }

    res.status(200).json({ success: true, message: 'Contact updated successfully' });
  } catch (error) {
    console.error('Error updating contact:', error);
    res.status(getErrorStatus(error)).json({ success: false, message: 'Error updating contact' });
  }
};

export const toggleFavorite = async (req: Request, res: Response): Promise<void> => {
  try {
    const contactId = paramStr(req.params.id);
    const { is_favorite } = req.body;
    const result = await contactService.toggleFavorite(contactId, is_favorite);
    if (result) {
      res.status(200).json({
        success: true,
        message: `Contact ${is_favorite ? 'marked as favorite' : 'removed from favorites'}`,
      });
    } else {
      res.status(404).json({ success: false, message: 'Contact not found' });
    }
  } catch (error) {
    console.error('Error toggling favorite status:', error);
    res.status(getErrorStatus(error)).json({ success: false, message: 'Error toggling favorite status' });
  }
};

export const listTags = async (req: Request, res: Response): Promise<void> => {
  try {
    const tags = await contactService.getTags(req.query.userId as string);
    res.status(200).json({ success: true, tags, message: 'Tags retrieved successfully' });
  } catch (error) {
    console.error('Error retrieving tags:', error);
    res.status(getErrorStatus(error)).json({ success: false, message: 'Error retrieving tags' });
  }
};

export const createTag = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, userId } = req.body;
    const tag = await contactService.createTag(name, userId);
    res.status(201).json({ success: true, tag });
  } catch (error) {
    console.error('Error creating tag:', error);
    res.status(getErrorStatus(error)).json({ success: false, message: 'Error creating tag' });
  }
};

export const listCustomAttributes = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, includeInactive } = req.query as Record<string, string>;
    if (!userId) {
      res.status(400).json({ success: false, message: 'User ID is required' });
      return;
    }
    const defs = await customAttributesService.listDefinitions(userId, includeInactive !== 'false');
    res.status(200).json({ success: true, attributes: defs });
  } catch (error) {
    console.error('Error listing custom attributes:', getErrorMessage(error));
    res.status(getErrorStatus(error)).json({ success: false, message: getErrorMessage(error) || 'Error listing attributes' });
  }
};

export const createCustomAttribute = async (req: Request, res: Response): Promise<void> => {
  try {
    const def = await customAttributesService.createDefinition(req.body);
    res.status(201).json({ success: true, attribute: def, message: 'Attribute created' });
  } catch (error) {
    console.error('Error creating custom attribute:', getErrorMessage(error));
    res.status(getErrorStatus(error)).json({ success: false, message: getErrorMessage(error) || 'Error creating attribute' });
  }
};

export const updateCustomAttribute = async (req: Request, res: Response): Promise<void> => {
  try {
    const ok = await customAttributesService.updateDefinition(paramStr(req.params.attrId), req.body);
    if (!ok) {
      res.status(400).json({ success: false, message: 'No changes applied' });
      return;
    }
    res.status(200).json({ success: true, message: 'Attribute updated' });
  } catch (error) {
    console.error('Error updating custom attribute:', getErrorMessage(error));
    res.status(getErrorStatus(error)).json({ success: false, message: getErrorMessage(error) || 'Error updating attribute' });
  }
};

export const getContactAttributes = async (req: Request, res: Response): Promise<void> => {
  try {
    const attrs = await customAttributesService.getContactAttributes(paramStr(req.params.id));
    res.status(200).json({ success: true, attributes: attrs });
  } catch (error) {
    console.error('Error getting contact attributes:', getErrorMessage(error));
    res.status(getErrorStatus(error)).json({ success: false, message: getErrorMessage(error) || 'Error retrieving attributes' });
  }
};

export const upsertContactAttributes = async (req: Request, res: Response): Promise<void> => {
  try {
    const { values } = req.body;
    await customAttributesService.upsertContactAttributes(paramStr(req.params.id), values);
    res.status(200).json({ success: true, message: 'Attributes saved' });
  } catch (error) {
    console.error('Error saving contact attributes:', getErrorMessage(error));
    res.status(getErrorStatus(error)).json({ success: false, message: getErrorMessage(error) || 'Error saving attributes' });
  }
};
