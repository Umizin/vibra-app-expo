import type { RequestHandler } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { ParsedQs } from 'qs';
import { z } from 'zod';

export type ValidatedRequestPart = 'body' | 'params' | 'query';

export type ValidatedLocals<TData, TKey extends string = 'validated'> = {
  [key in TKey]: TData;
};

export function validate<TSchema extends z.ZodType>(
  schema: TSchema,
  part: ValidatedRequestPart,
): RequestHandler<ParamsDictionary, unknown, unknown, ParsedQs, ValidatedLocals<z.output<TSchema>>>;
export function validate<TSchema extends z.ZodType, TKey extends string>(
  schema: TSchema,
  part: ValidatedRequestPart,
  localKey: TKey,
): RequestHandler<
  ParamsDictionary,
  unknown,
  unknown,
  ParsedQs,
  ValidatedLocals<z.output<TSchema>, TKey>
>;
export function validate<TSchema extends z.ZodType>(
  schema: TSchema,
  part: ValidatedRequestPart,
  localKey = 'validated',
): RequestHandler {
  return async (request, response, next) => {
    const result = await schema.safeParseAsync(request[part]);

    if (!result.success) {
      next(result.error);
      return;
    }

    Object.assign(response.locals, { [localKey]: result.data });
    next();
  };
}
