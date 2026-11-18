import { disconnectPrisma, getPrismaClient } from '../database/prisma.js';

let client: ReturnType<typeof getPrismaClient> | undefined;

try {
  client = getPrismaClient();
  const rows = await client.$queryRaw<Array<{ result: number }>>`SELECT 1 AS result`;

  if (rows[0]?.result !== 1) {
    throw new Error('A consulta de verificação retornou um resultado inesperado.');
  }

  console.info('Conexão com PostgreSQL estabelecida com sucesso.');
} catch (error) {
  if (error instanceof Error && error.message.startsWith('DATABASE_URL')) {
    console.error(error.message);
  } else {
    console.error('Não foi possível conectar ao PostgreSQL. Verifique o serviço e a configuração DATABASE_URL.');
  }
  process.exitCode = 1;
} finally {
  if (client) {
    try {
      await disconnectPrisma();
    } catch {
      console.error('Não foi possível encerrar a conexão com PostgreSQL de forma limpa.');
      process.exitCode = 1;
    }
  }
}
