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
        console.log(`User ID: ${req.query.userId}`);
        const contacts = await contactModelInstance.getContactsList(req.query.userId);
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

module.exports = router;