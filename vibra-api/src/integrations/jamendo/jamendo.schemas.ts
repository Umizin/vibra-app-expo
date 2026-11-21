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

const externalIdSchema = z
  .union([z.string().min(1), z.number().int().nonnegative()])
  .transform(String);

const optionalExternalIdSchema = z
  .union([externalIdSchema, z.literal(''), z.null()])
  .optional()
  .transform((value) => value === undefined || value === null || value === '' ? undefined : value);

const optionalTextSchema = z
  .union([z.string(), z.null()])
  .optional()
  .transform((value) => value === undefined || value === null || value === '' ? undefined : value);

const optionalUrlSchema = z
  .union([
    z.string().url().refine((value) => value.startsWith('https://')),
    z.literal(''),
    z.null(),
  ])
  .optional()
  .transform((value) => value === undefined || value === null || value === '' ? undefined : value);

const optionalHttpUrlSchema = z
  .union([
    z.string().url().refine((value) => /^https?:\/\//i.test(value)),
    z.literal(''),
    z.null(),
  ])
  .optional()
  .transform((value) => value === undefined || value === null || value === '' ? undefined : value);

const jamendoMusicInfoSchema = z.object({
  tags: z.object({
    genres: z.array(z.string()).nullable().optional(),
    instruments: z.array(z.string()).nullable().optional(),
    vartags: z.array(z.string()).nullable().optional(),
  }).passthrough().optional().nullable(),
}).passthrough().optional().nullable();

export const jamendoTrackSchema = z.object({
  id: externalIdSchema,
  name: z.string().min(1),
  artist_id: externalIdSchema,
  artist_name: z.string().min(1),
  duration: z.number().int().nonnegative(),
  album_id: optionalExternalIdSchema,
  album_name: optionalTextSchema,
  image: optionalUrlSchema,
  audio: optionalUrlSchema,
  license_ccurl: optionalTextSchema,
  shareurl: optionalUrlSchema,
  shorturl: optionalUrlSchema,
  musicinfo: jamendoMusicInfoSchema,
}).passthrough();

export const jamendoTrackEnvelopeSchema = jamendoEnvelopeSchema.extend({
  results: z.array(jamendoTrackSchema),
});

export const jamendoArtistSchema = z.object({
  id: externalIdSchema,
  name: z.string().min(1),
  website: optionalHttpUrlSchema,
  image: optionalUrlSchema,
  shareurl: optionalUrlSchema,
  shorturl: optionalUrlSchema,
}).passthrough();

export const jamendoArtistEnvelopeSchema = jamendoEnvelopeSchema.extend({
  results: z.array(jamendoArtistSchema),
});

export const jamendoAlbumSchema = z.object({
  id: externalIdSchema,
  name: z.string().min(1),
  artist_id: optionalExternalIdSchema,
  artist_name: z.string().min(1),
  image: optionalUrlSchema,
  releasedate: optionalTextSchema,
  shareurl: optionalUrlSchema,
  shorturl: optionalUrlSchema,
}).passthrough();

export const jamendoAlbumEnvelopeSchema = jamendoEnvelopeSchema.extend({
  results: z.array(jamendoAlbumSchema),
});

export type JamendoTrack = z.output<typeof jamendoTrackSchema>;
export type JamendoArtist = z.output<typeof jamendoArtistSchema>;
export type JamendoAlbum = z.output<typeof jamendoAlbumSchema>;
