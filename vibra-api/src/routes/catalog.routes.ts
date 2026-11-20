import { Router } from 'express';

import { getTrackController, searchTracksController } from '../controllers/catalog.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { catalogTrackParamsSchema, catalogTracksQuerySchema } from '../schemas/catalog.schema.js';

const catalogRoutes = Router();

catalogRoutes.get(
  '/catalog/tracks',
  authMiddleware,
  validate(catalogTracksQuerySchema, 'query'),
  searchTracksController,
);
catalogRoutes.get(
  '/catalog/tracks/:trackId',
  authMiddleware,
  validate(catalogTrackParamsSchema, 'params', 'validatedParams'),
  getTrackController,
);

export default catalogRoutes;
