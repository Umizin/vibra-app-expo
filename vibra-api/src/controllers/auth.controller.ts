import type { RequestHandler } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { ParsedQs } from 'qs';

import type { ValidatedLocals } from '../middlewares/validate.middleware.js';
import type { LoginInput, RegisterInput } from '../schemas/auth.schema.js';
import { authService } from '../services/auth.service.js';

export const registerController: RequestHandler<
  ParamsDictionary,
  unknown,
  unknown,
  ParsedQs,
  ValidatedLocals<RegisterInput>
> = async (_request, response) => {
  const result = await authService.register(response.locals.validated);
  response.status(201).json({ data: result });
};

export const loginController: RequestHandler<
  ParamsDictionary,
  unknown,
  unknown,
  ParsedQs,
  ValidatedLocals<LoginInput>
> = async (_request, response) => {
  const result = await authService.login(response.locals.validated);
  response.status(200).json({ data: result });
};
