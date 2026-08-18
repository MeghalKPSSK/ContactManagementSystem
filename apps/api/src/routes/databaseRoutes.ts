import { Router } from 'express';
import * as databaseController from '../controllers/databaseController';

const router = Router();

router.get('/initialize', databaseController.initialize);
router.get('/verify', databaseController.verify);
router.get('/status', databaseController.status);

export default router;
