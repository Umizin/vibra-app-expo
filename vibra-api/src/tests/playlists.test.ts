import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import type { Server } from 'node:http';
import { after, before, test } from 'node:test';
import express from 'express';

import { BusinessError } from '../errors/business-error.js';
import type { PlaylistRecord } from '../repositories/playlist.repository.js';
import type { CreatePlaylistRepositoryInput, UpdatePlaylistRepositoryInput } from '../repositories/playlist.repository.js';

const ownerId = 'a7ce72c6-30dd-4b36-a1cf-26e8a01eb1ab';
const otherOwnerId = '0ef5236e-628c-484d-9cf5-307869e58c0a';
const playlistId = 'f25c5233-1499-4e4d-ae2d-9f8cebb4427c';
const timestamp = new Date('2026-02-03T04:05:06.000Z');

function makePlaylist(overrides: Partial<PlaylistRecord> = {}): PlaylistRecord {
  return {
    id: playlistId,
    ownerId,
    name: 'Playlist de teste',
    description: 'Descrição de teste',
    createdAt: timestamp,
    updatedAt: timestamp,
    _count: { tracks: 3 },
    ...overrides,
  };
}

const ownPlaylist = makePlaylist();
const createCalls: Array<{ ownerId: string; input: Omit<CreatePlaylistRepositoryInput, 'ownerId'> }> = [];
const listCalls: string[] = [];
const getCalls: Array<{ playlistId: string; ownerId: string }> = [];
const updateCalls: Array<{ playlistId: string; ownerId: string; input: UpdatePlaylistRepositoryInput }> = [];
const deleteCalls: Array<{ playlistId: string; ownerId: string }> = [];

let baseUrl = '';
let server: Server;
let playlistService: (typeof import('../services/playlist.service.js'))['playlistService'];
let originals: Pick<typeof playlistService, 'create' | 'listByOwner' | 'getById' | 'update' | 'delete'>;
let signAccessToken: (userId: string) => Promise<string>;

before(async () => {
  process.env.JWT_SECRET = randomBytes(32).toString('base64url');

  const [{ default: app }, serviceModule, jwtModule] = await Promise.all([
    import('../app.js'),
    import('../services/playlist.service.js'),
    import('../utils/jwt.js'),
  ]);

  playlistService = serviceModule.playlistService;
  signAccessToken = jwtModule.signAccessToken;
  originals = {
    create: playlistService.create,
    listByOwner: playlistService.listByOwner,
    getById: playlistService.getById,
    update: playlistService.update,
    delete: playlistService.delete,
  };

  playlistService.create = async (authenticatedOwnerId, input) => {
    createCalls.push({ ownerId: authenticatedOwnerId, input });
    if (authenticatedOwnerId === otherOwnerId) {
      throw new BusinessError('USER_NOT_FOUND', 'Usuário não encontrado.');
    }
    return makePlaylist({ ownerId: authenticatedOwnerId, ...input });
  };
  playlistService.listByOwner = async (authenticatedOwnerId) => {
    listCalls.push(authenticatedOwnerId);
    return authenticatedOwnerId === ownerId ? [ownPlaylist] : [];
  };
  playlistService.getById = async (id, authenticatedOwnerId) => {
    getCalls.push({ playlistId: id, ownerId: authenticatedOwnerId });
    if (id !== playlistId || authenticatedOwnerId !== ownerId) {
      throw new BusinessError('PLAYLIST_NOT_FOUND', 'Playlist não encontrada.');
    }
    return ownPlaylist;
  };
  playlistService.update = async (id, authenticatedOwnerId, input) => {
    updateCalls.push({ playlistId: id, ownerId: authenticatedOwnerId, input });
    if (id !== playlistId || authenticatedOwnerId !== ownerId) {
      throw new BusinessError('PLAYLIST_NOT_FOUND', 'Playlist não encontrada.');
    }
    return makePlaylist({ ...input, ownerId: authenticatedOwnerId });
  };
  playlistService.delete = async (id, authenticatedOwnerId) => {
    deleteCalls.push({ playlistId: id, ownerId: authenticatedOwnerId });
    if (id !== playlistId || authenticatedOwnerId !== ownerId) {
      throw new BusinessError('PLAYLIST_NOT_FOUND', 'Playlist não encontrada.');
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
  Object.assign(playlistService, originals);
  delete process.env.JWT_SECRET;
  if (server) await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

async function request(path: string, options: RequestInit = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const body = response.status === 204 ? undefined : await response.json() as Record<string, unknown>;
  return { response, body };
}

async function bearerFor(userId = ownerId): Promise<string> {
  return `Bearer ${await signAccessToken(userId)}`;
}

test('cria playlist com HTTP 201 usando o proprietário do token', async () => {
  createCalls.length = 0;
  const { response, body } = await request('/api/v1/me/playlists', {
    method: 'POST',
    headers: { authorization: await bearerFor(), 'content-type': 'application/json' },
    body: JSON.stringify({ name: '  Favoritas  ', description: 'Seleção pessoal' }),
  });

  assert.equal(response.status, 201);
  assert.equal((body?.data as { name: string }).name, 'Favoritas');
  assert.equal(createCalls[0]?.ownerId, ownerId);
  assert.deepEqual(createCalls[0]?.input, { name: 'Favoritas', description: 'Seleção pessoal' });
});

test('lista somente as playlists do usuário autenticado', async () => {
  listCalls.length = 0;
  const { response, body } = await request(`/api/v1/me/playlists?userId=${otherOwnerId}`, {
    headers: { authorization: await bearerFor() },
  });

  assert.equal(response.status, 200);
  assert.equal((body?.data as unknown[]).length, 1);
  assert.deepEqual(listCalls, [ownerId]);
});

test('consulta a playlist própria com HTTP 200', async () => {
  getCalls.length = 0;
  const { response, body } = await request(`/api/v1/playlists/${playlistId}`, {
    headers: { authorization: await bearerFor() },
  });

  assert.equal(response.status, 200);
  assert.equal((body?.data as { id: string }).id, playlistId);
  assert.deepEqual(getCalls[0], { playlistId, ownerId });
});

test('atualiza o nome', async () => {
  updateCalls.length = 0;
  const { response, body } = await request(`/api/v1/playlists/${playlistId}`, {
    method: 'PATCH',
    headers: { authorization: await bearerFor(), 'content-type': 'application/json' },
    body: JSON.stringify({ name: '  Novo título  ' }),
  });

  assert.equal(response.status, 200);
  assert.equal((body?.data as { name: string }).name, 'Novo título');
  assert.deepEqual(updateCalls[0], { playlistId, ownerId, input: { name: 'Novo título' } });
});

test('atualiza somente a descrição, inclusive podendo limpá-la com null', async () => {
  updateCalls.length = 0;
  const { response } = await request(`/api/v1/playlists/${playlistId}`, {
    method: 'PATCH',
    headers: { authorization: await bearerFor(), 'content-type': 'application/json' },
    body: JSON.stringify({ description: 'Descrição revisada' }),
  });

  assert.equal(response.status, 200);
  assert.deepEqual(updateCalls[0]?.input, { description: 'Descrição revisada' });
});

test('rejeita atualização vazia', async () => {
  const { response, body } = await request(`/api/v1/playlists/${playlistId}`, {
    method: 'PATCH',
    headers: { authorization: await bearerFor(), 'content-type': 'application/json' },
    body: JSON.stringify({}),
  });

  assert.equal(response.status, 400);
  assert.equal((body?.error as { code: string }).code, 'VALIDATION_ERROR');
});

test('exclui com HTTP 204 e sem corpo', async () => {
  deleteCalls.length = 0;
  const { response, body } = await request(`/api/v1/playlists/${playlistId}`, {
    method: 'DELETE',
    headers: { authorization: await bearerFor() },
  });

  assert.equal(response.status, 204);
  assert.equal(body, undefined);
  assert.deepEqual(deleteCalls[0], { playlistId, ownerId });
});

test('rejeita sem autenticação em cada endpoint', async () => {
  const requests: Array<[string, RequestInit?]> = [
    ['/api/v1/me/playlists'],
    ['/api/v1/me/playlists', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'X' }) }],
    [`/api/v1/playlists/${playlistId}`],
    [`/api/v1/playlists/${playlistId}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'X' }) }],
    [`/api/v1/playlists/${playlistId}`, { method: 'DELETE' }],
  ];

  for (const [path, options] of requests) {
    const { response, body } = await request(path, options);
    assert.equal(response.status, 401);
    assert.equal((body?.error as { code: string }).code, 'UNAUTHORIZED');
  }
});

test('rejeita UUID inválido antes de chamar o Service', async () => {
  const beforeCount = getCalls.length;
  const { response, body } = await request('/api/v1/playlists/not-a-uuid', {
    headers: { authorization: await bearerFor() },
  });

  assert.equal(response.status, 400);
  assert.equal((body?.error as { code: string }).code, 'VALIDATION_ERROR');
  assert.equal(getCalls.length, beforeCount);
});

test('rejeita nome vazio e acima de 80 caracteres', async () => {
  const headers = { authorization: await bearerFor(), 'content-type': 'application/json' };
  for (const name of ['', '   ', 'x'.repeat(81)]) {
    const { response } = await request('/api/v1/me/playlists', {
      method: 'POST',
      headers,
      body: JSON.stringify({ name }),
    });
    assert.equal(response.status, 400);
  }
});

test('rejeita descrição acima do limite Prisma de 500 caracteres', async () => {
  const { response } = await request('/api/v1/me/playlists', {
    method: 'POST',
    headers: { authorization: await bearerFor(), 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Válida', description: 'x'.repeat(501) }),
  });
  assert.equal(response.status, 400);
});

test('rejeita propriedades desconhecidas e userId do cliente', async () => {
  const token = await bearerFor();
  const headers = { authorization: token, 'content-type': 'application/json' };
  for (const body of [
    { name: 'Playlist', extra: true },
    { name: 'Playlist', userId: otherOwnerId },
    { name: 'Playlist', ownerId: otherOwnerId },
  ]) {
    const { response } = await request('/api/v1/me/playlists', {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    assert.equal(response.status, 400);
  }

  const patchResponse = await request(`/api/v1/playlists/${playlistId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ name: 'Alteração indevida', userId: otherOwnerId }),
  });
  assert.equal(patchResponse.response.status, 400);
});

test('oculta playlist de outro proprietário em consulta, atualização e exclusão', async () => {
  for (const [method, calls] of [
    ['GET', getCalls],
    ['PATCH', updateCalls],
    ['DELETE', deleteCalls],
  ] as const) {
    const beforeCount = calls.length;
    const { response, body } = await request(`/api/v1/playlists/${playlistId}`, {
      method,
      headers: {
        authorization: await bearerFor(otherOwnerId),
        ...(method === 'PATCH' ? { 'content-type': 'application/json' } : {}),
      },
      ...(method === 'PATCH' ? { body: JSON.stringify({ name: 'Tentativa' }) } : {}),
    });
    assert.equal(response.status, 404);
    assert.equal((body?.error as { code: string }).code, 'PLAYLIST_NOT_FOUND');
    assert.equal(calls.length, beforeCount + 1);
    assert.equal(calls.at(-1)?.ownerId, otherOwnerId);
  }
});

test('mapeia usuário inexistente sem expor erro interno', async () => {
  const { response, body } = await request('/api/v1/me/playlists', {
    method: 'POST',
    headers: { authorization: await bearerFor(otherOwnerId), 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Teste' }),
  });

  assert.equal(response.status, 404);
  assert.equal((body?.error as { code: string }).code, 'USER_NOT_FOUND');
});

test('preserva o endpoint GET /health', async () => {
  const { response, body } = await request('/health');
  assert.equal(response.status, 200);
  assert.deepEqual(body, { status: 'ok', service: 'vibra-api' });
});
