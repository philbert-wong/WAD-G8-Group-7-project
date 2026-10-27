// The /api/shortlist routes: which address runs which function in controllers/shortlist-controller.js
import { Router } from 'express';
import * as shortlistController from '../controllers/shortlist-controller.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = Router();

// Every shortlist address needs a logged-in user
router.use(requireAuth);

router.get('/', shortlistController.listShortlist);
router.post('/', shortlistController.addToShortlist);
router.patch('/:id', shortlistController.updateNote);
router.delete('/:id', shortlistController.removeFromShortlist);

export default router;
