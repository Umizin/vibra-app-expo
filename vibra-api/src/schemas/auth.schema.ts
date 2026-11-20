import { z } from 'zod';

export const registerSchema = z
  .object({
    email: z
      .string()
      .email('Informe um e-mail válido.')
      .refine((email) => [...email].length <= 254, 'O e-mail deve ter até 254 caracteres.'),
    displayName: z
      .string()
      .trim()
      .min(1, 'Informe o nome de exibição.')
      .refine((name) => [...name].length <= 80, 'O nome deve ter até 80 caracteres.'),
    password: z.string().min(8, 'A senha deve ter ao menos 8 caracteres.').max(128, 'A senha deve ter até 128 caracteres.'),
  })
  .strict();

export const loginSchema = z
  .object({
    email: z
      .string()
      .email('Informe um e-mail válido.')
      .refine((email) => [...email].length <= 254, 'O e-mail deve ter até 254 caracteres.'),
    password: z.string().min(8, 'A senha deve ter ao menos 8 caracteres.').max(128, 'A senha deve ter até 128 caracteres.'),
  })
  .strict();

export type RegisterInput = z.output<typeof registerSchema>;
export type LoginInput = z.output<typeof loginSchema>;
