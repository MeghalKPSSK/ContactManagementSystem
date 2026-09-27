import { Router } from 'express';
import * as userController from '../controllers/userController';
import upload from '../utils/fileUpload';

const router = Router();

router.post('/registerUser', userController.registerUser);
router.post('/login', userController.login);
router.put('/updateUser/:id', upload.single('profileImage'), userController.updateUser);
router.get('/usersList', userController.listUsers);
router.get('/user/:id', userController.getUser);
router.delete('/deleteUser/:id', userController.deleteUser);
router.put('/changePassword/:id', userController.changePassword);
router.post('/uploadProfileImage/:id', upload.single('profileImage'), userController.uploadProfileImage);
router.put('/updatePlan/:id', userController.updatePlan);
router.get('/preferences/:id', userController.getPreferences);
router.put('/preferences/:id', userController.updatePreferences);

export default router;
