import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import type { Server } from 'node:http';
import { after, before, test } from 'node:test';
import express from 'express';

import { BusinessError } from '../errors/business-error.js';

const userId = 'a7ce72c6-30dd-4b36-a1cf-26e8a01eb1ab';
const otherUserId = '0ef5236e-628c-484d-9cf5-307869e58c0a';
const jamendoTrackId = 'jamendo-track-123';
const timestamp = new Date('2026-02-03T04:05:06.000Z');

const favoriteCalls: Array<{ operation: string; userId: string; jamendoTrackId?: string }> = [];
let baseUrl = '';
let server: Server;
let favoriteService: (typeof import('../services/favorite.service.js'))['favoriteService'];
let originals: Pick<
  typeof favoriteService,
  'add' | 'remove' | 'listByUser' | 'isFavorited' | 'getByTrackId'
>;
let signAccessToken: (userId: string) => Promise<string>;

before(async () => {
  process.env.JWT_SECRET = randomBytes(32).toString('base64url');

  const [{ default: app }, serviceModule, jwtModule] = await Promise.all([
    import('../app.js'),
    import('../services/favorite.service.js'),
    import('../utils/jwt.js'),
  ]);

  favoriteService = serviceModule.favoriteService;
  signAccessToken = jwtModule.signAccessToken;
  originals = {
    add: favoriteService.add,
    remove: favoriteService.remove,
    listByUser: favoriteService.listByUser,
    isFavorited: favoriteService.isFavorited,
    getByTrackId: favoriteService.getByTrackId,
  };

  favoriteService.add = async (authenticatedUserId, id) => {
    favoriteCalls.push({ operation: 'add', userId: authenticatedUserId, jamendoTrackId: id });
    if (authenticatedUserId === otherUserId) {
      throw new BusinessError('USER_NOT_FOUND', 'Usuário não encontrado.');
    }
    if (id === 'duplicate') {
      throw new BusinessError('FAVORITE_ALREADY_EXISTS', 'Esta faixa já está nos favoritos.');
    }
    return { userId: authenticatedUserId, jamendoTrackId: id, createdAt: timestamp };
  };
  favoriteService.listByUser = async (authenticatedUserId) => {
    favoriteCalls.push({ operation: 'list', userId: authenticatedUserId });
    return authenticatedUserId === userId
      ? [{ userId: authenticatedUserId, jamendoTrackId, createdAt: timestamp }]
      : [];
  };
  favoriteService.getByTrackId = async (authenticatedUserId, id) => {
    favoriteCalls.push({ operation: 'get', userId: authenticatedUserId, jamendoTrackId: id });
    if (authenticatedUserId !== userId) {
      throw new BusinessError('FAVORITE_NOT_FOUND', 'Favorito não encontrado.');
    }
    if (id !== jamendoTrackId) {
      throw new BusinessError('FAVORITE_NOT_FOUND', 'Favorito não encontrado.');
    }
    return { jamendoTrackId: id };
  };
  favoriteService.isFavorited = async (authenticatedUserId, id) => {
    favoriteCalls.push({ operation: 'check', userId: authenticatedUserId, jamendoTrackId: id });
    return authenticatedUserId === userId && id === jamendoTrackId;
  };
  favoriteService.remove = async (authenticatedUserId, id) => {
    favoriteCalls.push({ operation: 'remove', userId: authenticatedUserId, jamendoTrackId: id });
    if (authenticatedUserId !== userId || id !== jamendoTrackId) {
      throw new BusinessError('FAVORITE_NOT_FOUND', 'Favorito não encontrado.');
    }
  };

  const testApp = express();
  testApp.use(express.json());
  testApp.use(app);
  server = testApp.listen(0, '127.0.0.1');
  await new Promise<void>((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  Object.assign(favoriteService, originals);
  delete process.env.JWT_SECRET;
  if (server) await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

async function request(path: string, options: RequestInit = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const body = response.status === 204 ? undefined : await response.json() as Record<string, unknown>;
  return { response, body };
}

async function authorization(authenticatedUserId = userId): Promise<string> {
  return `Bearer ${await signAccessToken(authenticatedUserId)}`;
}

const favoritesPath = '/api/v1/me/favorites';

test('lista favoritos do usuário autenticado, sem expor userId', async () => {
  favoriteCalls.length = 0;
  const { response, body } = await request(`${favoritesPath}?userId=${otherUserId}`, {
    headers: { authorization: await authorization() },
  });

  assert.equal(response.status, 200);
  assert.deepEqual(body?.data, [{ jamendoTrackId, createdAt: timestamp.toISOString() }]);
  assert.deepEqual(favoriteCalls.at(-1), { operation: 'list', userId });
});

test('adiciona favorito com HTTP 201 e usa a identidade do JWT', async () => {
  favoriteCalls.length = 0;
  const { response, body } = await request(favoritesPath, {
    method: 'POST',
    headers: { authorization: await authorization(), 'content-type': 'application/json' },
    body: JSON.stringify({ jamendoTrackId }),
  });

  assert.equal(response.status, 201);
  assert.deepEqual(body?.data, { jamendoTrackId, createdAt: timestamp.toISOString() });
  assert.deepEqual(favoriteCalls.at(-1), { operation: 'add', userId, jamendoTrackId });
});

test('consulta se a faixa é favorita e retorna 404 quando não é', async () => {
  const found = await request(`${favoritesPath}/${jamendoTrackId}`, {
    headers: { authorization: await authorization() },
  });
  assert.equal(found.response.status, 200);
  assert.deepEqual(found.body?.data, { jamendoTrackId });

  const missing = await request(`${favoritesPath}/not-favorited`, {
    headers: { authorization: await authorization() },
  });
  assert.equal(missing.response.status, 404);
  assert.equal((missing.body?.error as { code: string }).code, 'FAVORITE_NOT_FOUND');
});

test('remove favorito com HTTP 204 sem corpo', async () => {
  favoriteCalls.length = 0;
  const { response, body } = await request(`${favoritesPath}/${jamendoTrackId}`, {
    method: 'DELETE',
    headers: { authorization: await authorization() },
  });

  assert.equal(response.status, 204);
  assert.equal(body, undefined);
  assert.deepEqual(favoriteCalls.at(-1), { operation: 'remove', userId, jamendoTrackId });
});

test('rejeita ausência de autenticação em todos os endpoints', async () => {
  const requests: Array<[string, RequestInit?]> = [
    [favoritesPath],
    [favoritesPath, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jamendoTrackId }) }],
    [`${favoritesPath}/${jamendoTrackId}`],
    [`${favoritesPath}/${jamendoTrackId}`, { method: 'DELETE' }],
  ];

  for (const [path, options] of requests) {
    const { response } = await request(path, options);
    assert.equal(response.status, 401);
  }
});

test('rejeita ID de faixa acima do limite de 64 caracteres', async () => {
  const { response, body } = await request(`${favoritesPath}/${'x'.repeat(65)}`, {
    headers: { authorization: await authorization() },
  });
  assert.equal(response.status, 400);
  assert.equal((body?.error as { code: string }).code, 'VALIDATION_ERROR');
});

test('rejeita body vazio, ID vazio, propriedades desconhecidas e userId do cliente', async () => {
  const token = await authorization();
  const headers = { authorization: token, 'content-type': 'application/json' };
  for (const body of [{}, { jamendoTrackId: '' }, { jamendoTrackId: 'x'.repeat(65) }, { jamendoTrackId, userId: otherUserId }]) {
    const { response } = await request(favoritesPath, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    assert.equal(response.status, 400);
  }
  const noBody = await request(favoritesPath, { method: 'POST', headers });
  assert.equal(noBody.response.status, 400);
});

test('mapeia favorito duplicado para HTTP 409', async () => {
  const { response, body } = await request(favoritesPath, {
    method: 'POST',
    headers: { authorization: await authorization(), 'content-type': 'application/json' },
    body: JSON.stringify({ jamendoTrackId: 'duplicate' }),
  });
  assert.equal(response.status, 409);
  assert.equal((body?.error as { code: string }).code, 'FAVORITE_ALREADY_EXISTS');
});

test('mapeia favorito inexistente e de outro usuário para HTTP 404', async () => {
  const token = await authorization(otherUserId);
  const { response, body } = await request(`${favoritesPath}/${jamendoTrackId}`, {
    headers: { authorization: token },
  });
  assert.equal(response.status, 404);
  assert.equal((body?.error as { code: string }).code, 'FAVORITE_NOT_FOUND');

  const removeResult = await request(`${favoritesPath}/${jamendoTrackId}`, {
    method: 'DELETE',
    headers: { authorization: token },
  });
  assert.equal(removeResult.response.status, 404);
});

test('preserva GET /health', async () => {
  const { response, body } = await request('/health');
  assert.equal(response.status, 200);
  assert.deepEqual(body, { status: 'ok', service: 'vibra-api' });
});
