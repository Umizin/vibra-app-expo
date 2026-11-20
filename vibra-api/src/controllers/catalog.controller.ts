import type { RequestHandler } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { ParsedQs } from 'qs';

import type { AuthenticatedLocals } from '../middlewares/auth.middleware.js';
import type { ValidatedLocals } from '../middlewares/validate.middleware.js';
import type { CatalogTrackParams, CatalogTracksQuery } from '../schemas/catalog.schema.js';
import { catalogService } from '../services/catalog.service.js';

export const searchTracksController: RequestHandler<
  ParamsDictionary,
  unknown,
  unknown,
  ParsedQs,
  AuthenticatedLocals & ValidatedLocals<CatalogTracksQuery>
> = async (_request, response) => {
  const result = await catalogService.searchTracks(response.locals.validated);
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
