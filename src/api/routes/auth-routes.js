import { Router } from 'express';
import { requireLogin } from '../../middleware/auth.js';
import * as authController from '../controllers/auth-controller.js';

const router = Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.get('/me', requireLogin, authController.getCurrentUser);

export default router;
