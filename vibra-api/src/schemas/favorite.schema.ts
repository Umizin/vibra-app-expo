import { z } from 'zod';

const jamendoTrackIdSchema = z
  .string()
  .min(1, 'Informe o ID da faixa Jamendo.')
  .max(64, 'O ID da faixa Jamendo deve ter até 64 caracteres.');

export const addFavoriteSchema = z
  .object({ jamendoTrackId: jamendoTrackIdSchema })
  .strict();

export const favoriteParamsSchema = z
  .object({ jamendoTrackId: jamendoTrackIdSchema })
  .strict();

export type AddFavoriteInput = z.output<typeof addFavoriteSchema>;
export type FavoriteParams = z.output<typeof favoriteParamsSchema>;
