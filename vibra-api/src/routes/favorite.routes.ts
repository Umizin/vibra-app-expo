import { Router } from 'express';

import {
  addFavoriteController,
  getFavoriteController,
  listFavoritesController,
  removeFavoriteController,
} from '../controllers/favorite.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { addFavoriteSchema, favoriteParamsSchema } from '../schemas/favorite.schema.js';

const favoriteRoutes = Router();

favoriteRoutes.get('/me/favorites', authMiddleware, listFavoritesController);
favoriteRoutes.post(
  '/me/favorites',
  authMiddleware,
  validate(addFavoriteSchema, 'body'),
  addFavoriteController,
);
favoriteRoutes.get(
  '/me/favorites/:jamendoTrackId',
  authMiddleware,
  validate(favoriteParamsSchema, 'params', 'validatedParams'),
  getFavoriteController,
);
favoriteRoutes.delete(
  '/me/favorites/:jamendoTrackId',
  authMiddleware,
  validate(favoriteParamsSchema, 'params', 'validatedParams'),
  removeFavoriteController,
);

export default favoriteRoutes;
