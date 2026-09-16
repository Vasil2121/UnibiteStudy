import { Router } from 'express';
import { requireLogin } from '../../middleware/auth.js';
import * as requestsController from '../controllers/requests-controller.js';

const router = Router();

router.post('/', requireLogin, requestsController.createRequest);
router.get('/mine', requireLogin, requestsController.listMyRequests);
router.get('/incoming', requireLogin, requestsController.listIncomingRequests);
router.patch('/:id', requireLogin, requestsController.updateRequestStatus);

export default router;
