import { z } from 'zod';

export const updateUserProfileSchema = z
  .object({
    displayName: z
      .string()
      .trim()
      .min(1, 'Informe o nome de exibição.')
      .refine((name) => [...name].length <= 80, 'O nome deve ter até 80 caracteres.')
      .optional(),
    email: z
      .string()
      .email('Informe um e-mail válido.')
      .refine((email) => [...email].length <= 254, 'O e-mail deve ter até 254 caracteres.')
      .optional(),
  })
  .strict()
  .refine((data) => data.displayName !== undefined || data.email !== undefined, {
    message: 'Informe ao menos um campo para atualizar.',
  });

export type UpdateUserProfileInput = z.output<typeof updateUserProfileSchema>;
