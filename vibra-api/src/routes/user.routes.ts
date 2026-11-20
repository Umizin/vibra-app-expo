import { Router } from 'express';

import { getMyProfileController, updateMyProfileController } from '../controllers/user.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { updateUserProfileSchema } from '../schemas/user.schema.js';

const userRoutes = Router();

userRoutes.get('/me', authMiddleware, getMyProfileController);
userRoutes.patch(
  '/me',
  authMiddleware,
  validate(updateUserProfileSchema, 'body'),
  updateMyProfileController,
);

export default userRoutes;
