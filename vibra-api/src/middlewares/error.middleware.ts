import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';

import { BusinessError, type BusinessErrorCode } from '../errors/business-error.js';

const errosDeNegocio: Record<BusinessErrorCode, { status: number; message: string }> = {
  EMAIL_ALREADY_IN_USE: { status: 409, message: 'Este e-mail já está em uso.' },
  USER_NOT_FOUND: { status: 404, message: 'Usuário não encontrado.' },
  PLAYLIST_NOT_FOUND: { status: 404, message: 'Playlist não encontrada.' },
  TRACK_NOT_FOUND: { status: 404, message: 'Faixa não encontrada.' },
  TRACK_ALREADY_IN_PLAYLIST: { status: 409, message: 'Esta faixa já está na playlist.' },
  PLAYLIST_POSITION_IN_USE: { status: 409, message: 'Esta posição já está ocupada na playlist.' },
  FAVORITE_ALREADY_EXISTS: { status: 409, message: 'Esta faixa já está nos favoritos.' },
  FAVORITE_NOT_FOUND: { status: 404, message: 'Favorito não encontrado.' },
  INVALID_EMAIL: { status: 422, message: 'O e-mail informado é inválido.' },
  INVALID_DISPLAY_NAME: { status: 422, message: 'O nome de exibição informado é inválido.' },
  INVALID_UPDATE: { status: 422, message: 'Os dados enviados para atualização são inválidos.' },
};

export const errorMiddleware: ErrorRequestHandler = (error, _request, response, next) => {
  if (response.headersSent) {
    next(error);
    return;
  }

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

  if (error instanceof BusinessError) {
    const erro = errosDeNegocio[error.code];
    response.status(erro.status).json({
      error: {
        code: error.code,
        message: erro.message,
      },
    });
    return;
  }

  if (error instanceof ZodError) {
    response.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Os dados enviados são inválidos.',
        details: error.issues.map((issue) => ({
          field: issue.path.map(String).join('.'),
          message: issue.message,
        })),
      },
    });
    return;
  }

  console.error('Erro não tratado na API.');
  response.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Ocorreu um erro interno.',
    },
  });
};
