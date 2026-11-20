import { Router } from 'express';

import { healthController } from '../controllers/health.controller.js';
import authRoutes from './auth.routes.js';
import playlistRoutes from './playlist.routes.js';
import userRoutes from './user.routes.js';

const router = Router();

router.get('/health', healthController);
router.use('/api/v1/auth', authRoutes);
router.use('/api/v1/users', userRoutes);
router.use('/api/v1', playlistRoutes);

export default router;
