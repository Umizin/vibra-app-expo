import type { RequestHandler } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { ParsedQs } from 'qs';

import type { PlaylistRecord } from '../repositories/playlist.repository.js';
import type { AuthenticatedLocals } from '../middlewares/auth.middleware.js';
import type { ValidatedLocals } from '../middlewares/validate.middleware.js';
import type { CreatePlaylistInput, PlaylistIdParams, UpdatePlaylistInput } from '../schemas/playlist.schema.js';
import { playlistService } from '../services/playlist.service.js';

type ProfileLocals = AuthenticatedLocals;
type PlaylistParamsLocals = AuthenticatedLocals & ValidatedLocals<PlaylistIdParams, 'validatedParams'>;

function toPlaylistResponse(playlist: PlaylistRecord) {
  return {
    id: playlist.id,
    name: playlist.name,
    description: playlist.description,
    createdAt: playlist.createdAt,
    updatedAt: playlist.updatedAt,
    trackCount: playlist._count.tracks,
  };
}

export const listMyPlaylistsController: RequestHandler<
  ParamsDictionary,
  unknown,
  unknown,
  ParsedQs,
  ProfileLocals
> = async (_request, response) => {
  const playlists = await playlistService.listByOwner(response.locals.authenticatedUserId);
  response.status(200).json({ data: playlists.map(toPlaylistResponse) });
};

export const createPlaylistController: RequestHandler<
  ParamsDictionary,
  unknown,
  unknown,
  ParsedQs,
  AuthenticatedLocals & ValidatedLocals<CreatePlaylistInput>
> = async (_request, response) => {
  const playlist = await playlistService.create(
    response.locals.authenticatedUserId,
    response.locals.validated,
  );
  response.status(201).json({ data: toPlaylistResponse(playlist) });
};

export const getPlaylistController: RequestHandler<
  ParamsDictionary,
  unknown,
  unknown,
  ParsedQs,
  PlaylistParamsLocals
> = async (_request, response) => {
  const { playlistId } = response.locals.validatedParams;
  const playlist = await playlistService.getById(playlistId, response.locals.authenticatedUserId);
  response.status(200).json({ data: toPlaylistResponse(playlist) });
};

export const updatePlaylistController: RequestHandler<
  ParamsDictionary,
  unknown,
  unknown,
  ParsedQs,
  PlaylistParamsLocals & ValidatedLocals<UpdatePlaylistInput>
> = async (_request, response) => {
  const { playlistId } = response.locals.validatedParams;
  const playlist = await playlistService.update(
    playlistId,
    response.locals.authenticatedUserId,
    response.locals.validated,
  );
  response.status(200).json({ data: toPlaylistResponse(playlist) });
};

export const deletePlaylistController: RequestHandler<
  ParamsDictionary,
  unknown,
  unknown,
  ParsedQs,
  PlaylistParamsLocals
> = async (_request, response) => {
  const { playlistId } = response.locals.validatedParams;
  await playlistService.delete(playlistId, response.locals.authenticatedUserId);
  response.status(204).end();
};
