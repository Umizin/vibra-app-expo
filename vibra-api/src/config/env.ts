import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const schemaDeAmbiente = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  FRONTEND_ORIGIN: z.string().url({ message: 'deve ser uma URL válida' }),
  DATABASE_URL: z.string().url().optional(),
  JAMENDO_CLIENT_ID: z.string().trim().min(1).optional(),
  JWT_SECRET: z.string().refine((secret) => Buffer.byteLength(secret, 'utf8') >= 32, {
    message: 'deve conter pelo menos 32 bytes',
  }),
});

const resultado = schemaDeAmbiente.safeParse(process.env);

if (!resultado.success) {
  const detalhes = resultado.error.issues
    .map((issue) => `${issue.path.join('.') || 'ambiente'}: ${issue.message}`)
    .join('\n');

  throw new Error(`Configuração de ambiente inválida:\n${detalhes}`);
}

export const env = resultado.data;
