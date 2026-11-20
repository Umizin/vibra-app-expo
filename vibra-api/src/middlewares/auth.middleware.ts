import { errors } from 'jose';
import type { RequestHandler } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { ParsedQs } from 'qs';

import { InvalidAccessTokenError, verifyAccessToken } from '../utils/jwt.js';

export type AuthenticatedLocals = {
  authenticatedUserId: string;
};

function respondUnauthorized(response: Parameters<RequestHandler>[1]): void {
  response.status(401).json({
    error: {
      code: 'UNAUTHORIZED',
      message: 'Autenticação necessária.',
    },
  });
}

export const authMiddleware: RequestHandler<
  ParamsDictionary,
  unknown,
  unknown,
  ParsedQs,
  AuthenticatedLocals
> = async (request, response, next) => {
  const authorization = request.get('authorization');
  const bearerToken = authorization?.match(/^Bearer\s+([^\s]+)$/i)?.[1];

  if (!bearerToken) {
    respondUnauthorized(response);
    return;
  }

  try {
    response.locals.authenticatedUserId = await verifyAccessToken(bearerToken);
    next();
  } catch (error) {
    if (error instanceof InvalidAccessTokenError || error instanceof errors.JOSEError) {
      respondUnauthorized(response);
      return;
    }
    next(error);
  }
};
