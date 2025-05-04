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
router.post('/addContact', async (req, res) => {
    try {
        const contactId = await encryptionInstance.dbEncryptID(await contactModelInstance.contactSave(req.body));
        console.log(`Contacts created with ID: ${contactId}`);
        res.status(201).json({ success: true, uid: contactId, message: 'Contact added successfully' });
    } catch (error) {
        console.error('Error adding contact:', error);
        res.status(500).json({ success: false, message: 'Error adding contact' });
    }
});

// Get list of contacts
router.get('/contactsList', async (req, res) => {
    try {
        console.log(`User ID: ${req.query.userId}, Filter: ${req.query.filter}`);
        const contacts = await contactModelInstance.getContactsList(req.query.userId, req.query.filter);
        res.status(200).json({success: true, contacts: contacts, message: 'Contacts list retrieved successfully'});
    } catch (error) {
        console.error('Error retrieving contacts:', error);
        res.status(500).json({ success: false, message: 'Error retrieving contacts' });
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
        console.error('Error retrieving contact:', error);
        res.status(500).json({ success: false, message: 'Error retrieving contact' });
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
        console.error('Error deleting contact:', error);
        res.status(500).json({ success: false, message: 'Error deleting contact' });
    }
});

// Update contact
router.put('/updateContact/:id', async (req, res) => {
    try {
        const { tag_ids, ...contactData } = req.body;
        await contactModelInstance.updateContact(req.params.id, contactData);
        
        if (tag_ids?.length) {
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
        console.error('Error toggling favorite status:', error);
        res.status(500).json({ success: false, message: 'Error toggling favorite status' });
    }
});

// Tags routes
router.get('/tags', async (req, res) => {
    try {
        const tags = await contactModelInstance.getTags(req.query.userId);
        res.status(200).json({ 
            success: true, 
            tags,
            message: 'Tags retrieved successfully' 
        });
    } catch (error) {
        console.error('Error retrieving tags:', error);
        res.status(500).json({ success: false, message: 'Error retrieving tags' });
    }
});

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