import { Router } from 'express';

import {
  createPlaylistController,
  deletePlaylistController,
  getPlaylistController,
  listMyPlaylistsController,
  updatePlaylistController,
} from '../controllers/playlist.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  createPlaylistSchema,
  playlistIdParamsSchema,
  updatePlaylistSchema,
} from '../schemas/playlist.schema.js';

const playlistRoutes = Router();

playlistRoutes.get('/me/playlists', authMiddleware, listMyPlaylistsController);
playlistRoutes.post(
  '/me/playlists',
  authMiddleware,
  validate(createPlaylistSchema, 'body'),
  createPlaylistController,
);

playlistRoutes.get(
  '/playlists/:playlistId',
  authMiddleware,
  validate(playlistIdParamsSchema, 'params', 'validatedParams'),
  getPlaylistController,
);
playlistRoutes.patch(
  '/playlists/:playlistId',
  authMiddleware,
  validate(playlistIdParamsSchema, 'params', 'validatedParams'),
  validate(updatePlaylistSchema, 'body'),
  updatePlaylistController,
);
playlistRoutes.delete(
  '/playlists/:playlistId',
  authMiddleware,
  validate(playlistIdParamsSchema, 'params', 'validatedParams'),
  deletePlaylistController,
);

export default playlistRoutes;
