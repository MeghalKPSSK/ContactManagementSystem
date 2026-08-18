import { Router } from 'express';
import * as groupController from '../controllers/groupController';
import groupIconUpload from '../utils/groupIconUpload';

const router = Router();

router.post('/groupSave', groupIconUpload.single('group_icon'), groupController.saveGroup);
router.get('/groupsList', groupController.listGroups);
router.get('/group/:id', groupController.getGroup);
router.delete('/deleteGroup/:id', groupController.deleteGroup);
router.put('/updateGroup/:id', groupController.maybeParseGroupIcon(groupIconUpload), groupController.updateGroup);
router.post('/addMembers/:groupId', groupController.addGroupMembers);
router.delete('/removeMember/:groupId/:memberId', groupController.removeGroupMember);

export default router;
