import { Router } from 'express';

import { loginController, registerController } from '../controllers/auth.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import { loginSchema, registerSchema } from '../schemas/auth.schema.js';

const authRoutes = Router();

authRoutes.post('/register', validate(registerSchema, 'body'), registerController);
authRoutes.post('/login', validate(loginSchema, 'body'), loginController);

export default authRoutes;
