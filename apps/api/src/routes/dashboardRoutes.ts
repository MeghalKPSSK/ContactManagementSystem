import { Router } from 'express';
import * as dashboardController from '../controllers/dashboardController';

const router = Router();

router.get('/tags-distribution', dashboardController.getTagsDistribution);
router.get('/favorites-count', dashboardController.getFavoritesCount);
router.get('/groups-stats', dashboardController.getGroupsStats);
router.get('/contacts', dashboardController.getDashboardContacts);

export default router;
