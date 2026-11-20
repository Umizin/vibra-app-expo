import type { RequestHandler } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { ParsedQs } from 'qs';

import type { AuthenticatedLocals } from '../middlewares/auth.middleware.js';
import type { ValidatedLocals } from '../middlewares/validate.middleware.js';
import type {
  AddPlaylistTrackInput,
  PlaylistTrackItemParams,
  PlaylistTrackParams,
} from '../schemas/playlist-track.schema.js';
import { playlistTrackService } from '../services/playlist-track.service.js';

type PlaylistParamsLocals = AuthenticatedLocals & ValidatedLocals<PlaylistTrackParams, 'validatedParams'>;
type PlaylistTrackItemLocals = AuthenticatedLocals &
  ValidatedLocals<PlaylistTrackItemParams, 'validatedParams'>;

function toPlaylistTrackResponse(track: {
  jamendoTrackId: string;
  position: number;
  addedAt: Date;
}) {
  return {
    jamendoTrackId: track.jamendoTrackId,
    position: track.position,
    addedAt: track.addedAt,
  };
}

export const listPlaylistTracksController: RequestHandler<
  ParamsDictionary,
  unknown,
  unknown,
  ParsedQs,
  PlaylistParamsLocals
> = async (_request, response) => {
  const { playlistId } = response.locals.validatedParams;
  const tracks = await playlistTrackService.list(playlistId, response.locals.authenticatedUserId);
  response.status(200).json({ data: tracks.map(toPlaylistTrackResponse) });
};

export const addPlaylistTrackController: RequestHandler<
  ParamsDictionary,
  unknown,
  unknown,
  ParsedQs,
  PlaylistParamsLocals & ValidatedLocals<AddPlaylistTrackInput>
> = async (_request, response) => {
  const { playlistId } = response.locals.validatedParams;
  const track = await playlistTrackService.add({
    playlistId,
    ownerId: response.locals.authenticatedUserId,
    ...response.locals.validated,
  });
  response.status(201).json({ data: toPlaylistTrackResponse(track) });
};

export const getPlaylistTrackController: RequestHandler<
  ParamsDictionary,
  unknown,
  unknown,
  ParsedQs,
  PlaylistTrackItemLocals
> = async (_request, response) => {
  const { playlistId, jamendoTrackId } = response.locals.validatedParams;
  const track = await playlistTrackService.getByJamendoTrackId(
    playlistId,
    response.locals.authenticatedUserId,
    jamendoTrackId,
  );
  response.status(200).json({ data: toPlaylistTrackResponse(track) });
};

export const removePlaylistTrackController: RequestHandler<
  ParamsDictionary,
  unknown,
  unknown,
  ParsedQs,
  PlaylistTrackItemLocals
> = async (_request, response) => {
  const { playlistId, jamendoTrackId } = response.locals.validatedParams;
  await playlistTrackService.remove(playlistId, response.locals.authenticatedUserId, jamendoTrackId);
  response.status(204).end();
};
