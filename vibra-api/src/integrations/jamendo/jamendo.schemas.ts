import { z } from 'zod';

const jamendoHeadersSchema = z
  .object({
    status: z.string().nullable().optional(),
    code: z.union([z.string(), z.number()]).nullable().optional(),
    error_message: z.string().nullable().optional(),
    warnings: z.string().nullable().optional(),
    results_count: z.number().int().nonnegative().nullable().optional(),
    results_fullcount: z.number().int().nonnegative().nullable().optional(),
  })
  .passthrough();

export const jamendoEnvelopeSchema = z
  .object({
    headers: jamendoHeadersSchema,
    results: z.array(z.record(z.string(), z.unknown())),
  })
  .passthrough();
