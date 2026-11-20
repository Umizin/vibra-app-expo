import type { RequestHandler } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { ParsedQs } from 'qs';
import { z } from 'zod';

export type ValidatedRequestPart = 'body' | 'params' | 'query';

export type ValidatedLocals<TData> = {
  validated: TData;
};

export function validate<TSchema extends z.ZodType>(
  schema: TSchema,
  part: ValidatedRequestPart,
): RequestHandler<ParamsDictionary, unknown, unknown, ParsedQs, ValidatedLocals<z.output<TSchema>>> {
  return async (request, response, next) => {
    const result = await schema.safeParseAsync(request[part]);

    if (!result.success) {
      next(result.error);
      return;
    }

    response.locals.validated = result.data;
    next();
  };
}
