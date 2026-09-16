import { Router } from 'express';
import { requireLogin, requireAdmin } from '../../middleware/auth.js';
import * as adminController from '../controllers/admin-controller.js';

const router = Router();

router.get('/stats', requireLogin, requireAdmin, adminController.getStats);
router.get('/leaderboard', requireLogin, requireAdmin, adminController.getLeaderboard);

export default router;
