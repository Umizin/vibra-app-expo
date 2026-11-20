import type { RequestHandler } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { ParsedQs } from 'qs';

import type { AuthenticatedLocals } from '../middlewares/auth.middleware.js';
import type { ValidatedLocals } from '../middlewares/validate.middleware.js';
import type { AddFavoriteInput, FavoriteParams } from '../schemas/favorite.schema.js';
import { favoriteService } from '../services/favorite.service.js';

type FavoriteParamsLocals = AuthenticatedLocals & ValidatedLocals<FavoriteParams, 'validatedParams'>;

function toFavoriteResponse(favorite: { jamendoTrackId: string; createdAt: Date }) {
  return {
    jamendoTrackId: favorite.jamendoTrackId,
    createdAt: favorite.createdAt,
  };
}

export const listFavoritesController: RequestHandler<
  ParamsDictionary,
  unknown,
  unknown,
  ParsedQs,
  AuthenticatedLocals
> = async (_request, response) => {
  const favorites = await favoriteService.listByUser(response.locals.authenticatedUserId);
  response.status(200).json({ data: favorites.map(toFavoriteResponse) });
};

export const addFavoriteController: RequestHandler<
  ParamsDictionary,
  unknown,
  unknown,
  ParsedQs,
  AuthenticatedLocals & ValidatedLocals<AddFavoriteInput>
> = async (_request, response) => {
  const favorite = await favoriteService.add(
    response.locals.authenticatedUserId,
    response.locals.validated.jamendoTrackId,
  );
  response.status(201).json({ data: toFavoriteResponse(favorite) });
};

export const getFavoriteController: RequestHandler<
  ParamsDictionary,
  unknown,
  unknown,
  ParsedQs,
  FavoriteParamsLocals
> = async (_request, response) => {
  const { jamendoTrackId } = response.locals.validatedParams;
  const favorite = await favoriteService.getByTrackId(
    response.locals.authenticatedUserId,
    jamendoTrackId,
  );
  response.status(200).json({ data: favorite });
};

export const removeFavoriteController: RequestHandler<
  ParamsDictionary,
  unknown,
  unknown,
  ParsedQs,
  FavoriteParamsLocals
> = async (_request, response) => {
  const { jamendoTrackId } = response.locals.validatedParams;
  await favoriteService.remove(response.locals.authenticatedUserId, jamendoTrackId);
  response.status(204).end();
};
