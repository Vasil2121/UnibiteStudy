import { Router } from 'express';
import * as allergensController from '../controllers/allergens-controller.js';

const router = Router();

router.get('/', allergensController.listAllergens);

export default router;
