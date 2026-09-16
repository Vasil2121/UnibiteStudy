import { Router } from 'express';
import { requireLogin } from '../../middleware/auth.js';
import * as profileController from '../controllers/profile-controller.js';

const router = Router();

router.get('/transactions', requireLogin, profileController.listMyTransactions);

export default router;
