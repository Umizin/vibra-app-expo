import { z } from 'zod';

const playlistNameSchema = z
  .string()
  .trim()
  .min(1, 'Informe o nome da playlist.')
  .refine((name) => [...name].length <= 80, 'O nome da playlist deve ter até 80 caracteres.');

const playlistDescriptionSchema = z
  .string()
  .refine((description) => [...description].length <= 500, 'A descrição deve ter até 500 caracteres.');

export const createPlaylistSchema = z
  .object({
    name: playlistNameSchema,
    description: playlistDescriptionSchema.optional(),
  })
  .strict();

export const updatePlaylistSchema = z
  .object({
    name: playlistNameSchema.optional(),
    description: playlistDescriptionSchema.nullable().optional(),
  })
  .strict()
  .refine((data) => data.name !== undefined || data.description !== undefined, {
    message: 'Informe ao menos um campo para atualizar.',
  });

export const playlistIdParamsSchema = z.object({ playlistId: z.string().uuid('O ID da playlist deve ser um UUID válido.') }).strict();

export type CreatePlaylistInput = z.output<typeof createPlaylistSchema>;
export type UpdatePlaylistInput = z.output<typeof updatePlaylistSchema>;
export type PlaylistIdParams = z.output<typeof playlistIdParamsSchema>;
