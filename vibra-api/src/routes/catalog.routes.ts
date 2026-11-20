import { Router } from 'express';

import {
  getAlbumController,
  getArtistController,
  getTrackController,
  searchAlbumsController,
  searchArtistsController,
  searchTracksController,
} from '../controllers/catalog.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  catalogAlbumParamsSchema,
  catalogAlbumsQuerySchema,
  catalogArtistParamsSchema,
  catalogArtistsQuerySchema,
  catalogTrackParamsSchema,
  catalogTracksQuerySchema,
} from '../schemas/catalog.schema.js';

const catalogRoutes = Router();

catalogRoutes.get(
  '/catalog/tracks',
  authMiddleware,
  validate(catalogTracksQuerySchema, 'query'),
  searchTracksController,
);
catalogRoutes.get('/catalog/artists', authMiddleware, validate(catalogArtistsQuerySchema, 'query'), searchArtistsController);
catalogRoutes.get(
  '/catalog/artists/:artistId',
  authMiddleware,
  validate(catalogArtistParamsSchema, 'params', 'validatedParams'),
  getArtistController,
);
catalogRoutes.get('/catalog/albums', authMiddleware, validate(catalogAlbumsQuerySchema, 'query'), searchAlbumsController);
catalogRoutes.get(
  '/catalog/albums/:albumId',
  authMiddleware,
  validate(catalogAlbumParamsSchema, 'params', 'validatedParams'),
  getAlbumController,
);
catalogRoutes.get(
  '/catalog/tracks/:trackId',
  authMiddleware,
  validate(catalogTrackParamsSchema, 'params', 'validatedParams'),
  getTrackController,
);

export default catalogRoutes;
