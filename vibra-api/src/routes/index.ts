import { Router } from 'express';

import { healthController } from '../controllers/health.controller.js';
import authRoutes from './auth.routes.js';

const router = Router();

router.get('/health', healthController);
router.use('/api/v1/auth', authRoutes);

export default router;
