import { Router } from 'express';

import {
  addPlaylistTrackController,
  getPlaylistTrackController,
  listPlaylistTracksController,
  removePlaylistTrackController,
} from '../controllers/playlist-track.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  addPlaylistTrackSchema,
  playlistTrackItemParamsSchema,
  playlistTrackParamsSchema,
} from '../schemas/playlist-track.schema.js';

const playlistTrackRoutes = Router();

playlistTrackRoutes.get(
  '/playlists/:playlistId/tracks',
  authMiddleware,
  validate(playlistTrackParamsSchema, 'params', 'validatedParams'),
  listPlaylistTracksController,
);
playlistTrackRoutes.post(
  '/playlists/:playlistId/tracks',
  authMiddleware,
  validate(playlistTrackParamsSchema, 'params', 'validatedParams'),
  validate(addPlaylistTrackSchema, 'body'),
  addPlaylistTrackController,
);
playlistTrackRoutes.get(
  '/playlists/:playlistId/tracks/:jamendoTrackId',
  authMiddleware,
  validate(playlistTrackItemParamsSchema, 'params', 'validatedParams'),
  getPlaylistTrackController,
);
playlistTrackRoutes.delete(
  '/playlists/:playlistId/tracks/:jamendoTrackId',
  authMiddleware,
  validate(playlistTrackItemParamsSchema, 'params', 'validatedParams'),
  removePlaylistTrackController,
);

export default playlistTrackRoutes;
