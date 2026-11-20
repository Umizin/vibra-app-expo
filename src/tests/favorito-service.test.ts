// @ts-nocheck
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ApiClientError } from '@/services/api';
import { criarFavoritoService } from '@/services/favoritoService';

test('favoritoService lista, adiciona e remove com caminhos e corpo corretos', async () => {
  const calls: Array<{ method: string; path: string; body?: unknown; options?: unknown }> = [];
  const api = {
    get: async (path: string, options: unknown) => {
      calls.push({ method: 'GET', path, options });
      return { data: [{ jamendoTrackId: '123', createdAt: '2026-11-20T10:00:00.000Z' }] };
    },
    post: async (path: string, body: unknown, options: unknown) => {
      calls.push({ method: 'POST', path, body, options });
      return { data: body };
    },
    delete: async (path: string, options: unknown) => {
      calls.push({ method: 'DELETE', path, options });
    },
  };
  const service = criarFavoritoService(api);

  assert.deepEqual(await service.listar(), ['123']);
  await service.adicionar('456');
  await service.remover('456');

  assert.deepEqual(calls.map(({ method, path }) => [method, path]), [
    ['GET', '/api/v1/me/favorites'],
    ['POST', '/api/v1/me/favorites'],
    ['DELETE', '/api/v1/me/favorites/456'],
  ]);
  assert.deepEqual(calls[1]?.body, { jamendoTrackId: '456' });
  assert.ok(calls.every((call) => call.options?.authenticated === true));
});

test('favoritoService rejeita resposta de listagem inválida', async () => {
  const service = criarFavoritoService({
    get: async () => ({ data: [{ jamendoTrackId: 123 }] }),
    post: async () => undefined,
    delete: async () => undefined,
  });
  await assert.rejects(service.listar(), (error: unknown) =>
    error instanceof ApiClientError && error.kind === 'invalid-response');
});
