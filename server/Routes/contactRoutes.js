const express = require('express');
const router = express.Router();
const contactModel = require('../models/contactModel');
const encryption = require('../utils/dbEncryption');

let contactModelInstance;
let encryptionInstance;
// Initialize the encryption instance   
(async () => {
    encryptionInstance = await encryption();
})();

// Initialize the contactModel instance
(async () => {
    contactModelInstance = await contactModel();
})();

// Add a new contact
router.post('/contactSave', async (req, res) => {
    try {
        const contactId = await encryptionInstance.dbEncryptID(await contactModelInstance.contactSave(req.body));
        console.log(`Contacts created with ID: ${contactId}`);
        res.status(201).json({ success: true, uid: contactId, message: 'Contact added successfully' });
    } catch (error) {
        console.error(`Error adding contact: ${error.message}`);
        res.status(500).json({ success: false, message: 'Error adding contact', error: `${error.message}` });
    }
});

// Get list of contacts
router.get('/contactsList', async (req, res) => {
    try {
        console.log(`User ID: ${req.query.userId}, Filter: ${req.query.filter}`);
        const contacts = await contactModelInstance.getContactsList(req.query.userId, req.query.filter);
        res.status(200).json({success: true, contacts: contacts, message: 'Contacts list retrieved successfully'});
    } catch (error) {
        console.error(`Error retrieving Contacts list: ${error.message}`);
        res.status(500).json({ success: false, message: 'Error retrieving Contacts list', error: error.message });
    }
});

// Get contact by ID
router.get('/contact/:id', async (req, res) => {
    try {
        const contact = await contactModelInstance.getContactById(req.params.id);
        
        if (!contact) {
            return res.status(404).json({ success: false, message: 'Contact not found' });
        }
        
        res.status(200).json({ success: true, contact });
    } catch (error) {
        console.error('Error fetching contact:', error);
        res.status(500).json({ success: false, message: 'Error fetching contact' });
    }
});

// Delete contact by ID
router.delete('/deleteContact/:id', async (req, res) => {
    try {
        const contactId = req.params.id;
        console.log(`Contact UID for Deletion: ${contactId}`);
        const result = await contactModelInstance.deleteContact(contactId);
        if (result) {
            res.status(200).json({ success: true, message: 'Contact deleted successfully' });
        } else {
            res.status(404).json({ success: false, message: 'Contact not found' });
        }
    } catch (error) {
        console.error(`Error deleting contact: ${error.message}`);
        res.status(500).json({ success: false, message: 'Error deleting contact', error: error.message });
    }
});

// Update contact
router.put('/updateContact/:id', async (req, res) => {
    try {
        const { tag_ids, ...contactData } = req.body;
        await contactModelInstance.updateContact(req.params.id, contactData);
        
        if (tag_ids) {
            await contactModelInstance.updateContactTags(req.params.id, tag_ids);
        }
        
        res.status(200).json({ success: true, message: 'Contact updated successfully' });
    } catch (error) {
        console.error('Error updating contact:', error);
        res.status(500).json({ success: false, message: 'Error updating contact' });
    }
});

// Toggle favorite status
router.put('/toggleFavorite/:id', async (req, res) => {
    try {
        const contactId = req.params.id;
        const { is_favorite } = req.body;
        const result = await contactModelInstance.toggleFavorite(contactId, is_favorite);
        if (result) {
            res.status(200).json({ 
                success: true, 
                message: `Contact ${is_favorite ? 'marked as favorite' : 'removed from favorites'}`
            });
        } else {
            res.status(404).json({ success: false, message: 'Contact not found' });
        }
    } catch (error) {
        console.error(`Error toggling favorite: ${error.message}`);
        res.status(500).json({ success: false, message: 'Error updating favorite status', error: error.message });
    }
});

// Get all attributes for a user
router.get('/attributes', async (req, res) => {
    try {
        const userId = await encryptionInstance.dbDecryptID(req.query.userId);
        const attributes = await contactModelInstance.getAttributes(userId);
        res.status(200).json({ 
            success: true, 
            attributes: attributes.map(attr => ({
                id: encryptionInstance.dbEncryptID(attr.pk_id),
                name: attr.name,
                color: attr.color
            }))
        });
    } catch (error) {
        console.error('Error fetching attributes:', error);
        res.status(500).json({ success: false, message: 'Error fetching attributes' });
    }
});

// Create new attribute
router.post('/attributes', async (req, res) => {
    try {
        const { name, color } = req.body;
        const userId = await encryptionInstance.dbDecryptID(req.body.userId);
        const attribute = await contactModelInstance.createAttribute(name, color, userId);
        res.status(201).json({ 
            success: true, 
            attribute: {
                id: encryptionInstance.dbEncryptID(attribute.id),
                name: attribute.name,
                color: attribute.color
            }
        });
    } catch (error) {
        console.error('Error creating attribute:', error);
        res.status(500).json({ success: false, message: 'Error creating attribute' });
    }
});

// Add attributes to contact
router.post('/contact/:id/attributes', async (req, res) => {
    try {
        const { attributes } = req.body;
        await contactModelInstance.addContactAttributes(req.params.id, attributes);
        res.status(200).json({ success: true, message: 'Attributes added successfully' });
    } catch (error) {
        console.error('Error adding attributes:', error);
        res.status(500).json({ success: false, message: 'Error adding attributes' });
    }
});

// Get all tags for a user
router.get('/tags', async (req, res) => {
    try {
        const tags = await contactModelInstance.getTags(req.query.userId);
        res.status(200).json({ success: true, tags });
    } catch (error) {
        console.error('Error fetching tags:', error);
        res.status(500).json({ success: false, message: 'Error fetching tags' });
    }
});

// Create new tag
router.post('/tags', async (req, res) => {
    try {
        const { name, userId } = req.body;
        const tag = await contactModelInstance.createTag(name, userId);
        res.status(201).json({ success: true, tag });
    } catch (error) {
        console.error('Error creating tag:', error);
        res.status(500).json({ success: false, message: 'Error creating tag' });
    }
});

module.exports = router;