import { Router } from 'express';
import { requireLogin } from '../../middleware/auth.js';
import * as ratingsController from '../controllers/ratings-controller.js';

const router = Router();

router.post('/', requireLogin, ratingsController.createRating);

export default router;
