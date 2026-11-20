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

const trackPaginationSchema = {
  offset: z.coerce.number().int().min(0).max(2_147_483_647).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
};

const trackIdsSchema = z.string()
  .transform((value) => value.split(',').map((id) => id.trim()))
  .pipe(z.array(jamendoIdSchema).min(1, 'Informe ao menos um ID de faixa.').max(50, 'Informe no máximo 50 IDs de faixa.'))
  .refine((ids) => new Set(ids).size === ids.length, 'Não informe IDs de faixa duplicados.');

export const catalogTracksQuerySchema = z.object({
  q: searchTermSchema,
  artistId: jamendoIdSchema.optional(),
  albumId: jamendoIdSchema.optional(),
  genre: z.enum(vibraGenres).optional(),
  ids: trackIdsSchema.optional(),
  ...trackPaginationSchema,
}).strict()
  .superRefine((query, context) => {
    if (query.ids && (query.q || query.artistId || query.albumId || query.genre ||
        query.offset !== undefined || query.limit !== undefined)) {
      context.addIssue({
        code: 'custom',
        path: ['ids'],
        message: 'O parâmetro ids não pode ser combinado com busca, filtros ou paginação.',
      });
    }
  })
  .transform(({ offset, limit, ...query }) => ({
    ...query,
    offset: offset ?? 0,
    limit: limit ?? 20,
  }));

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
