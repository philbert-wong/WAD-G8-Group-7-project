// The /api/auth routes: which address runs which function in controllers/auth-controller.js
import { Router } from 'express';
import * as authController from '../controllers/auth-controller.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
// requireAuth runs first: only a logged-in user gets to their preferences
router.get('/preferences', requireAuth, authController.getPreferences);
router.put('/preferences', requireAuth, authController.savePreferences);

export default router;
