import { Router } from 'express';
import * as notesController from '../controllers/notesController';

const router = Router();

router.post('/createNote', notesController.createNote);
router.get('/notesList', notesController.listNotes);
router.get('/note/:id', notesController.getNote);
router.put('/updateNote/:id', notesController.updateNote);
router.delete('/deleteNote/:id', notesController.deleteNote);
router.get('/notesStats/:userId', notesController.getNotesStats);
router.get('/searchNotes', notesController.searchNotes);
router.get('/contactNotes/:contactId', notesController.getContactNotes);
router.get('/groupNotes/:groupId', notesController.getGroupNotes);

export default router;
