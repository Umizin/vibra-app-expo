import type { ErrorRequestHandler } from 'express';

export const errorMiddleware: ErrorRequestHandler = (error, _request, response, _next) => {
  const erroDeJson =
    error instanceof SyntaxError &&
    'status' in error &&
    error.status === 400;

  if (erroDeJson) {
    response.status(400).json({
      error: {
        code: 'INVALID_JSON',
        message: 'O corpo da requisição contém JSON inválido.',
      },
    });
    return;
  }

  console.error('Erro não tratado na API:', error);
  response.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Ocorreu um erro interno.',
    },
  });
};
