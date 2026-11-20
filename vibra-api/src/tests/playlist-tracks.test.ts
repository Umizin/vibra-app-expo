import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import type { Server } from 'node:http';
import { after, before, test } from 'node:test';
import express from 'express';

import { BusinessError } from '../errors/business-error.js';
import type { PlaylistTrackRecord } from '../repositories/playlist-track.repository.js';
import type { AddPlaylistTrackRepositoryInput } from '../repositories/playlist-track.repository.js';

const ownerId = 'a7ce72c6-30dd-4b36-a1cf-26e8a01eb1ab';
const otherOwnerId = '0ef5236e-628c-484d-9cf5-307869e58c0a';
const playlistId = 'f25c5233-1499-4e4d-ae2d-9f8cebb4427c';
const trackId = 'jamendo-track-123';
const timestamp = new Date('2026-02-03T04:05:06.000Z');

function makeTrack(overrides: Partial<PlaylistTrackRecord> = {}): PlaylistTrackRecord {
  return {
    id: 'b5f547ce-e896-4a52-8105-f393356d3bc8',
    playlistId,
    jamendoTrackId: trackId,
    position: 0,
    addedAt: timestamp,
    ...overrides,
  };
}

const savedTrack = makeTrack();
const savedTracks = [savedTrack, makeTrack({ jamendoTrackId: 'another-track', position: 1 })];
const addCalls: AddPlaylistTrackRepositoryInput[] = [];
const listCalls: Array<{ playlistId: string; ownerId: string }> = [];
const getCalls: Array<{ playlistId: string; ownerId: string; jamendoTrackId: string }> = [];
const removeCalls: Array<{ playlistId: string; ownerId: string; jamendoTrackId: string }> = [];

let baseUrl = '';
let server: Server;
let playlistTrackService: (typeof import('../services/playlist-track.service.js'))['playlistTrackService'];
let originals: Pick<typeof playlistTrackService, 'add' | 'list' | 'getByJamendoTrackId' | 'remove'>;
let signAccessToken: (userId: string) => Promise<string>;

before(async () => {
  process.env.JWT_SECRET = randomBytes(32).toString('base64url');

  const [{ default: app }, serviceModule, jwtModule] = await Promise.all([
    import('../app.js'),
    import('../services/playlist-track.service.js'),
    import('../utils/jwt.js'),
  ]);

  playlistTrackService = serviceModule.playlistTrackService;
  signAccessToken = jwtModule.signAccessToken;
  originals = {
    add: playlistTrackService.add,
    list: playlistTrackService.list,
    getByJamendoTrackId: playlistTrackService.getByJamendoTrackId,
    remove: playlistTrackService.remove,
  };

  playlistTrackService.add = async (input) => {
    addCalls.push(input);
    if (input.ownerId !== ownerId) throw new BusinessError('PLAYLIST_NOT_FOUND', 'Playlist não encontrada.');
    if (input.playlistId !== playlistId) throw new BusinessError('PLAYLIST_NOT_FOUND', 'Playlist não encontrada.');
    if (input.jamendoTrackId === 'duplicate') {
      throw new BusinessError('TRACK_ALREADY_IN_PLAYLIST', 'Esta faixa já está na playlist.');
    }
    if (input.position === 9) {
      throw new BusinessError('PLAYLIST_POSITION_IN_USE', 'Esta posição já está ocupada na playlist.');
    }
    return makeTrack({ ...input });
  };
  playlistTrackService.list = async (id, authenticatedOwnerId) => {
    listCalls.push({ playlistId: id, ownerId: authenticatedOwnerId });
    if (id !== playlistId || authenticatedOwnerId !== ownerId) {
      throw new BusinessError('PLAYLIST_NOT_FOUND', 'Playlist não encontrada.');
    }
    return savedTracks;
  };
  playlistTrackService.getByJamendoTrackId = async (id, authenticatedOwnerId, jamendoTrackId) => {
    getCalls.push({ playlistId: id, ownerId: authenticatedOwnerId, jamendoTrackId });
    if (id !== playlistId || authenticatedOwnerId !== ownerId) {
      throw new BusinessError('PLAYLIST_NOT_FOUND', 'Playlist não encontrada.');
    }
    if (jamendoTrackId !== trackId) throw new BusinessError('TRACK_NOT_FOUND', 'Faixa não encontrada na playlist.');
    return savedTrack;
  };
  playlistTrackService.remove = async (id, authenticatedOwnerId, jamendoTrackId) => {
    removeCalls.push({ playlistId: id, ownerId: authenticatedOwnerId, jamendoTrackId });
    if (id !== playlistId || authenticatedOwnerId !== ownerId) {
      throw new BusinessError('PLAYLIST_NOT_FOUND', 'Playlist não encontrada.');
    }
    if (jamendoTrackId !== trackId) throw new BusinessError('TRACK_NOT_FOUND', 'Faixa não encontrada na playlist.');
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
  Object.assign(playlistTrackService, originals);
  delete process.env.JWT_SECRET;
  if (server) await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

async function request(path: string, options: RequestInit = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const body = response.status === 204 ? undefined : await response.json() as Record<string, unknown>;
  return { response, body };
}

async function authorization(userId = ownerId): Promise<string> {
  return `Bearer ${await signAccessToken(userId)}`;
}

const tracksPath = `/api/v1/playlists/${playlistId}/tracks`;

test('lista faixas em ordem recebida do Service usando o proprietário do JWT', async () => {
  listCalls.length = 0;
  const { response, body } = await request(`${tracksPath}?userId=${otherOwnerId}`, {
    headers: { authorization: await authorization() },
  });

  assert.equal(response.status, 200);
  assert.deepEqual(body?.data, [
    { jamendoTrackId: trackId, position: 0, addedAt: timestamp.toISOString() },
    { jamendoTrackId: 'another-track', position: 1, addedAt: timestamp.toISOString() },
  ]);
  assert.deepEqual(listCalls, [{ playlistId, ownerId }]);
});

test('adiciona faixa com HTTP 201 e identidade do proprietário derivada do JWT', async () => {
  addCalls.length = 0;
  const { response, body } = await request(tracksPath, {
    method: 'POST',
    headers: { authorization: await authorization(), 'content-type': 'application/json' },
    body: JSON.stringify({ jamendoTrackId: trackId, position: 3 }),
  });

  assert.equal(response.status, 201);
  assert.deepEqual(body?.data, { jamendoTrackId: trackId, position: 3, addedAt: timestamp.toISOString() });
  assert.deepEqual(addCalls.at(-1), { playlistId, ownerId, jamendoTrackId: trackId, position: 3 });
});

test('consulta uma faixa individual', async () => {
  getCalls.length = 0;
  const { response, body } = await request(`${tracksPath}/${trackId}`, {
    headers: { authorization: await authorization() },
  });

  assert.equal(response.status, 200);
  assert.deepEqual(body?.data, { jamendoTrackId: trackId, position: 0, addedAt: timestamp.toISOString() });
  assert.deepEqual(getCalls.at(-1), { playlistId, ownerId, jamendoTrackId: trackId });
});

test('remove faixa com HTTP 204 e sem corpo', async () => {
  removeCalls.length = 0;
  const { response, body } = await request(`${tracksPath}/${trackId}`, {
    method: 'DELETE',
    headers: { authorization: await authorization() },
  });

  assert.equal(response.status, 204);
  assert.equal(body, undefined);
  assert.deepEqual(removeCalls.at(-1), { playlistId, ownerId, jamendoTrackId: trackId });
});

test('rejeita ausência de autenticação em todos os endpoints', async () => {
  const paths: Array<[string, RequestInit?]> = [
    [tracksPath],
    [tracksPath, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jamendoTrackId: trackId, position: 1 }) }],
    [`${tracksPath}/${trackId}`],
    [`${tracksPath}/${trackId}`, { method: 'DELETE' }],
  ];

  for (const [path, options] of paths) {
    const { response } = await request(path, options);
    assert.equal(response.status, 401);
  }
});

test('rejeita UUID de playlist inválido', async () => {
  const { response, body } = await request('/api/v1/playlists/not-a-uuid/tracks', {
    headers: { authorization: await authorization() },
  });
  assert.equal(response.status, 400);
  assert.equal((body?.error as { code: string }).code, 'VALIDATION_ERROR');
});

test('rejeita IDs de faixa acima de 64 caracteres', async () => {
  const token = await authorization();
  const { response } = await request(`${tracksPath}/${'x'.repeat(65)}`, {
    headers: { authorization: token },
  });
  assert.equal(response.status, 400);
});

test('rejeita corpo ausente, posição negativa, fracionária, fora do limite e propriedades desconhecidas', async () => {
  const token = await authorization();
  const headers = { authorization: token, 'content-type': 'application/json' };
  const invalidBodies: unknown[] = [
    undefined,
    { jamendoTrackId: trackId, position: -1 },
    { jamendoTrackId: trackId, position: 1.5 },
    { jamendoTrackId: trackId, position: 2_147_483_648 },
    { jamendoTrackId: trackId, position: 1, userId: otherOwnerId },
    { jamendoTrackId: '', position: 1 },
  ];

  for (const body of invalidBodies) {
    const { response } = await request(tracksPath, {
      method: 'POST',
      headers,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    assert.equal(response.status, 400);
  }
});

test('mapeia playlist inexistente ou de outro usuário para 404', async () => {
  const { response, body } = await request(`/api/v1/playlists/${playlistId}/tracks`, {
    headers: { authorization: await authorization(otherOwnerId) },
  });
  assert.equal(response.status, 404);
  assert.equal((body?.error as { code: string }).code, 'PLAYLIST_NOT_FOUND');
});

test('mapeia faixa inexistente para 404', async () => {
  const { response, body } = await request(`${tracksPath}/missing-track`, {
    headers: { authorization: await authorization() },
  });
  assert.equal(response.status, 404);
  assert.equal((body?.error as { code: string }).code, 'TRACK_NOT_FOUND');
});

test('mapeia faixa duplicada e posição duplicada para HTTP 409', async () => {
  const token = await authorization();
  for (const [payload, code] of [
    [{ jamendoTrackId: 'duplicate', position: 4 }, 'TRACK_ALREADY_IN_PLAYLIST'],
    [{ jamendoTrackId: 'new-track', position: 9 }, 'PLAYLIST_POSITION_IN_USE'],
  ] as const) {
    const { response, body } = await request(tracksPath, {
      method: 'POST',
      headers: { authorization: token, 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    assert.equal(response.status, 409);
    assert.equal((body?.error as { code: string }).code, code);
  }
});

test('não permite listar, consultar, incluir ou remover faixas de playlist alheia', async () => {
  const token = await authorization(otherOwnerId);
  const responses = await Promise.all([
    request(tracksPath, { headers: { authorization: token } }),
    request(`${tracksPath}/${trackId}`, { headers: { authorization: token } }),
    request(tracksPath, {
      method: 'POST',
      headers: { authorization: token, 'content-type': 'application/json' },
      body: JSON.stringify({ jamendoTrackId: trackId, position: 1 }),
    }),
    request(`${tracksPath}/${trackId}`, { method: 'DELETE', headers: { authorization: token } }),
  ]);
  for (const { response, body } of responses) {
    assert.equal(response.status, 404);
    assert.equal((body?.error as { code: string }).code, 'PLAYLIST_NOT_FOUND');
  }
});

test('preserva GET /health', async () => {
  const { response, body } = await request('/health');
  assert.equal(response.status, 200);
  assert.deepEqual(body, { status: 'ok', service: 'vibra-api' });
});
