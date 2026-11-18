import app from './app.js';
import { env } from './config/env.js';

const server = app.listen(env.PORT, () => {
  console.info(`Vibra API escutando na porta ${env.PORT} (${env.NODE_ENV}).`);
});

function encerrarServidor(signal: NodeJS.Signals) {
  console.info(`Sinal ${signal} recebido; encerrando o servidor HTTP.`);
  server.close((error) => {
    if (error) {
      console.error('Falha ao encerrar o servidor HTTP:', error);
      process.exitCode = 1;
    }
  });
}

process.on('SIGINT', encerrarServidor);
process.on('SIGTERM', encerrarServidor);
