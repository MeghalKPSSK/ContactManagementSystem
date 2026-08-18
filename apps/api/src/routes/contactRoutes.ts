import { Router } from 'express';
import * as contactController from '../controllers/contactController';

const router = Router();

// Contacts
router.post('/contactSave', contactController.saveContact);
router.get('/contactsList', contactController.listContacts);
router.get('/contactsForSelection', contactController.listContactsForSelection);
router.get('/contact/:id', contactController.getContact);
router.delete('/deleteContact/:id', contactController.deleteContact);
router.put('/updateContact/:id', contactController.updateContact);
router.put('/toggleFavorite/:id', contactController.toggleFavorite);

// Tags
router.get('/tags', contactController.listTags);
router.post('/tags', contactController.createTag);

// Custom attributes
router.get('/customAttributes', contactController.listCustomAttributes);
router.post('/customAttributes', contactController.createCustomAttribute);
router.put('/customAttributes/:attrId', contactController.updateCustomAttribute);
router.get('/contact/:id/attributes', contactController.getContactAttributes);
router.put('/contact/:id/attributes', contactController.upsertContactAttributes);

export default router;
