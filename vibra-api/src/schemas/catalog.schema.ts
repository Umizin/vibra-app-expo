import { z } from 'zod';

export const vibraGenres = ['MPB', 'Eletrônica', 'Rock', 'Lo-fi', 'Indie', 'Pop'] as const;

const jamendoIdSchema = z
  .string()
  .trim()
  .min(1, 'Informe um ID Jamendo.')
  .max(64, 'O ID Jamendo deve ter até 64 caracteres.')
  .regex(/^\d+$/, 'O ID Jamendo deve conter somente dígitos.');

const searchTermSchema = z
  .string()
  .trim()
  .max(200, 'A busca deve ter até 200 caracteres.')
  .transform((value) => value || undefined)
  .optional();

const catalogExternalIdSchema = z
  .string()
  .trim()
  .min(1, 'Informe um ID Jamendo.')
  .max(64, 'O ID Jamendo deve ter até 64 caracteres.');

const paginationSchema = {
  offset: z.coerce.number().int().min(0).max(2_147_483_647).default(0),
  limit: z.coerce.number().int().min(1).max(50).default(20),
};

export const catalogTracksQuerySchema = z.object({
  q: searchTermSchema,
  artistId: jamendoIdSchema.optional(),
  albumId: jamendoIdSchema.optional(),
  genre: z.enum(vibraGenres).optional(),
  ...paginationSchema,
}).strict();

export const catalogTrackParamsSchema = z.object({ trackId: jamendoIdSchema }).strict();

export const catalogArtistsQuerySchema = z.object({
  q: searchTermSchema,
  ...paginationSchema,
}).strict();

export const catalogArtistParamsSchema = z.object({ artistId: catalogExternalIdSchema }).strict();

export const catalogAlbumsQuerySchema = z.object({
  q: searchTermSchema,
  artistId: catalogExternalIdSchema.optional(),
  ...paginationSchema,
}).strict();

export const catalogAlbumParamsSchema = z.object({ albumId: catalogExternalIdSchema }).strict();

export type CatalogTracksQuery = z.output<typeof catalogTracksQuerySchema>;
export type CatalogTrackParams = z.output<typeof catalogTrackParamsSchema>;
export type CatalogArtistsQuery = z.output<typeof catalogArtistsQuerySchema>;
export type CatalogArtistParams = z.output<typeof catalogArtistParamsSchema>;
export type CatalogAlbumsQuery = z.output<typeof catalogAlbumsQuerySchema>;
export type CatalogAlbumParams = z.output<typeof catalogAlbumParamsSchema>;
