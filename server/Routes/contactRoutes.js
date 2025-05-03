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
        console.log(`Contact UID: ${req.params.id}`);
        const contact = await contactModelInstance.getContactById(req.params.id);
        if (!contact) {
            return res.status(404).json({ success: false, message: 'Contact not found' });
        }
        console.log(`Contact details: ${JSON.stringify(contact)}`);
        res.status(200).json({success: true, contact: contact, message: 'Contact retrieved successfully' });
    } catch (error) {
        console.error(`Error retrieving contact: ${error.message}`);
        res.status(500).json({ message: 'Error retrieving contact', error: error.message });
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
        const contactId = req.params.id;
        console.log(`Updating contact: ${contactId}`);
        const result = await contactModelInstance.updateContact(contactId, req.body);
        if (result) {
            res.status(200).json({ success: true, message: 'Contact updated successfully' });
        } else {
            res.status(404).json({ success: false, message: 'Contact not found' });
        }
    } catch (error) {
        console.error(`Error updating contact: ${error.message}`);
        res.status(500).json({ success: false, message: 'Error updating contact', error: error.message });
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
        const attributes = await contactModelInstance.getAttributes(req.user.id);
        res.status(200).json({ success: true, attributes });
    } catch (error) {
        console.error('Error fetching attributes:', error);
        res.status(500).json({ success: false, message: 'Error fetching attributes' });
    }
});

// Create new attribute
router.post('/attributes', async (req, res) => {
    try {
        const { name, color } = req.body;
        const attribute = await contactModelInstance.createAttribute(name, color, req.user.id);
        res.status(201).json({ success: true, attribute });
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

module.exports = router;