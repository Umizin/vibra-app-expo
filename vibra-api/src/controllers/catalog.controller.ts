import type { RequestHandler } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { ParsedQs } from 'qs';

import type { AuthenticatedLocals } from '../middlewares/auth.middleware.js';
import type { ValidatedLocals } from '../middlewares/validate.middleware.js';
import type {
  CatalogAlbumParams,
  CatalogAlbumsQuery,
  CatalogArtistParams,
  CatalogArtistsQuery,
  CatalogTrackParams,
  CatalogTracksQuery,
} from '../schemas/catalog.schema.js';
import { catalogService } from '../services/catalog.service.js';

export const searchTracksController: RequestHandler<
  ParamsDictionary,
  unknown,
  unknown,
  ParsedQs,
  AuthenticatedLocals & ValidatedLocals<CatalogTracksQuery>
> = async (_request, response) => {
  const query = response.locals.validated;
  const result = query.ids
    ? await catalogService.getTracksByIds(query.ids)
    : await catalogService.searchTracks(query);
  response.status(200).json(result);
};

export const getTrackController: RequestHandler<
  ParamsDictionary,
  unknown,
  unknown,
  ParsedQs,
  AuthenticatedLocals & ValidatedLocals<CatalogTrackParams, 'validatedParams'>
> = async (_request, response) => {
  const track = await catalogService.getTrackById(response.locals.validatedParams.trackId);
  response.status(200).json({ data: track });
};

export const searchArtistsController: RequestHandler<ParamsDictionary, unknown, unknown, ParsedQs,
  AuthenticatedLocals & ValidatedLocals<CatalogArtistsQuery>> = async (_request, response) => {
  response.status(200).json(await catalogService.searchArtists(response.locals.validated));
};

export const getArtistController: RequestHandler<ParamsDictionary, unknown, unknown, ParsedQs,
  AuthenticatedLocals & ValidatedLocals<CatalogArtistParams, 'validatedParams'>> = async (_request, response) => {
  const artist = await catalogService.getArtistById(response.locals.validatedParams.artistId);
  response.status(200).json({ data: artist });
};

export const searchAlbumsController: RequestHandler<ParamsDictionary, unknown, unknown, ParsedQs,
  AuthenticatedLocals & ValidatedLocals<CatalogAlbumsQuery>> = async (_request, response) => {
  response.status(200).json(await catalogService.searchAlbums(response.locals.validated));
};

export const getAlbumController: RequestHandler<ParamsDictionary, unknown, unknown, ParsedQs,
  AuthenticatedLocals & ValidatedLocals<CatalogAlbumParams, 'validatedParams'>> = async (_request, response) => {
  const album = await catalogService.getAlbumById(response.locals.validatedParams.albumId);
  response.status(200).json({ data: album });
};
