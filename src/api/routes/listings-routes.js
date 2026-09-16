import { Router } from 'express';
import { requireLogin } from '../../middleware/auth.js';
import { uploadPhoto } from '../../middleware/upload.js';
import * as listingsController from '../controllers/listings-controller.js';

const router = Router();

router.get('/mine', requireLogin, listingsController.listMyListings);
router.get('/:id', requireLogin, listingsController.getListing);
router.get('/', requireLogin, listingsController.listFeed);
router.post('/', requireLogin, uploadPhoto, listingsController.createListing);
router.put('/:id', requireLogin, uploadPhoto, listingsController.updateListing);
router.delete('/:id', requireLogin, listingsController.deleteListing);

export default router;
