import { z } from 'zod';

const playlistIdSchema = z.string().uuid('O ID da playlist deve ser um UUID válido.');
const jamendoTrackIdSchema = z
  .string()
  .min(1, 'Informe o ID da faixa Jamendo.')
  .max(64, 'O ID da faixa Jamendo deve ter até 64 caracteres.');

export const playlistTrackParamsSchema = z
  .object({ playlistId: playlistIdSchema })
  .strict();

export const playlistTrackItemParamsSchema = z
  .object({ playlistId: playlistIdSchema, jamendoTrackId: jamendoTrackIdSchema })
  .strict();

export const addPlaylistTrackSchema = z
  .object({
    jamendoTrackId: jamendoTrackIdSchema,
    position: z
      .number()
      .int('A posição deve ser um número inteiro.')
      .min(0, 'A posição não pode ser negativa.')
      .max(2_147_483_647, 'A posição excede o limite aceito.'),
  })
  .strict();

export type PlaylistTrackParams = z.output<typeof playlistTrackParamsSchema>;
export type PlaylistTrackItemParams = z.output<typeof playlistTrackItemParamsSchema>;
export type AddPlaylistTrackInput = z.output<typeof addPlaylistTrackSchema>;
