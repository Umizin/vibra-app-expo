import type { RequestHandler } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { ParsedQs } from 'qs';

import type { AuthenticatedLocals } from '../middlewares/auth.middleware.js';
import type { ValidatedLocals } from '../middlewares/validate.middleware.js';
import type { UpdateUserProfileInput } from '../schemas/user.schema.js';
import { userService } from '../services/user.service.js';

type PublicProfile = {
  id: string;
  email: string;
  displayName: string;
  createdAt: Date;
  updatedAt: Date;
};

function toPublicProfile(profile: PublicProfile): PublicProfile {
  return {
    id: profile.id,
    email: profile.email,
    displayName: profile.displayName,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
}

export const getMyProfileController: RequestHandler<
  ParamsDictionary,
  unknown,
  unknown,
  ParsedQs,
  AuthenticatedLocals
> = async (_request, response) => {
  const profile = await userService.getProfile(response.locals.authenticatedUserId);
  response.status(200).json({ data: toPublicProfile(profile) });
};

export const updateMyProfileController: RequestHandler<
  ParamsDictionary,
  unknown,
  unknown,
  ParsedQs,
  AuthenticatedLocals & ValidatedLocals<UpdateUserProfileInput>
> = async (_request, response) => {
  const profile = await userService.updateProfile(
    response.locals.authenticatedUserId,
    response.locals.validated,
  );
  response.status(200).json({ data: toPublicProfile(profile) });
};
