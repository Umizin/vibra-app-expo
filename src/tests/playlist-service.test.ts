// Frontend tests run with the existing backend tsx/node:test toolchain.
// @ts-nocheck
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';

import { ApiClientError, apiClient } from '@/services/api';
import { definirTokenDeAcesso, obterTokenDeAcesso } from '@/services/sessao';
import { criarPlaylistService } from '@/services/playlistService';

const playlist = {
  id: 'a465e5fa-ae82-4ad0-9cb5-24ad4da4b84f',
  name: 'Para ouvir',
  description: null,
  createdAt: '2026-11-20T10:00:00.000Z',
  updatedAt: '2026-11-20T10:00:00.000Z',
  trackCount: 1,
};
const playlistTrack = {
  jamendoTrackId: 'jamendo-000123',
  position: 7,
  addedAt: '2026-11-20T10:05:00.000Z',
};

let originalFetch: typeof fetch;
let originalApiUrl: string | undefined;

before(() => {
  originalApiUrl = process.env.EXPO_PUBLIC_API_URL;
  process.env.EXPO_PUBLIC_API_URL = 'http://vibra.test:3001';
  originalFetch = globalThis.fetch;
});

after(() => {
  globalThis.fetch = originalFetch;
  if (originalApiUrl === undefined) delete process.env.EXPO_PUBLIC_API_URL;
  else process.env.EXPO_PUBLIC_API_URL = originalApiUrl;
  definirTokenDeAcesso(null);
});

test('playlistService executa operações com caminhos, corpos, envelopes e IDs string corretos', async () => {
  const calls: Array<{ method: string; path: string; body?: unknown; options?: unknown }> = [];
  const api = {
    get: async (path: string, options: unknown) => {
      calls.push({ method: 'GET', path, options });
      if (path.endsWith('/tracks')) return { data: [playlistTrack] };
      if (path.includes('/tracks/')) return { data: playlistTrack };
      if (path.endsWith('/me/playlists')) return { data: [playlist] };
      return { data: playlist };
    },
    post: async (path: string, body: unknown, options: unknown) => {
      calls.push({ method: 'POST', path, body, options });
      return { data: path.endsWith('/tracks') ? playlistTrack : playlist };
    },
    patch: async (path: string, body: unknown, options: unknown) => {
      calls.push({ method: 'PATCH', path, body, options });
      return { data: { ...playlist, ...body } };
    },
    delete: async (path: string, options: unknown) => {
      calls.push({ method: 'DELETE', path, options });
    },
  };
  const service = criarPlaylistService(api);

  assert.deepEqual(await service.listarPlaylists(), [playlist]);
  assert.equal((await service.criarPlaylist({ name: 'Para ouvir', description: 'Mix' })).id, playlist.id);
  assert.equal((await service.buscarPlaylist(playlist.id)).id, playlist.id);
  assert.equal((await service.atualizarPlaylist(playlist.id, { name: 'Nova' })).name, 'Nova');
  assert.equal((await service.atualizarPlaylist(playlist.id, { description: null })).description, null);
  await service.excluirPlaylist(playlist.id);
  assert.deepEqual(await service.listarFaixas(playlist.id), [playlistTrack]);
  assert.equal((await service.adicionarFaixa(playlist.id, {
    jamendoTrackId: 'jamendo-000123', position: 7,
  })).jamendoTrackId, 'jamendo-000123');
  assert.equal((await service.buscarFaixa(playlist.id, 'jamendo-000123')).jamendoTrackId, 'jamendo-000123');
  await service.removerFaixa(playlist.id, 'jamendo-000123');

  assert.deepEqual(calls.map(({ method, path }) => [method, path]), [
    ['GET', '/api/v1/me/playlists'],
    ['POST', '/api/v1/me/playlists'],
    ['GET', `/api/v1/playlists/${playlist.id}`],
    ['PATCH', `/api/v1/playlists/${playlist.id}`],
    ['PATCH', `/api/v1/playlists/${playlist.id}`],
    ['DELETE', `/api/v1/playlists/${playlist.id}`],
    ['GET', `/api/v1/playlists/${playlist.id}/tracks`],
    ['POST', `/api/v1/playlists/${playlist.id}/tracks`],
    ['GET', `/api/v1/playlists/${playlist.id}/tracks/jamendo-000123`],
    ['DELETE', `/api/v1/playlists/${playlist.id}/tracks/jamendo-000123`],
  ]);
  assert.deepEqual(calls[1]?.body, { name: 'Para ouvir', description: 'Mix' });
  assert.deepEqual(calls[4]?.body, { description: null });
  assert.deepEqual(calls[7]?.body, { jamendoTrackId: 'jamendo-000123', position: 7 });
  assert.ok(calls.every((call) => call.options?.authenticated === true));
  assert.equal(typeof (await service.buscarPlaylist(playlist.id)).id, 'string');
  assert.equal(typeof (await service.buscarFaixa(playlist.id, 'jamendo-000123')).jamendoTrackId, 'string');
});

test('playlistService usa o cliente centralizado com Bearer e aceita DELETE 204 sem JSON', async () => {
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    requests.push({ url: String(input), init });
    if (new URL(String(input)).pathname.endsWith('/me/playlists')) {
      return new Response(JSON.stringify({ data: [playlist] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    return new Response(null, { status: 204 });
  }) as typeof fetch;
  definirTokenDeAcesso('jwt-playlist-test');

  const service = criarPlaylistService(apiClient);
  assert.equal((await service.listarPlaylists())[0]?.id, playlist.id);
  await service.excluirPlaylist(playlist.id);

  assert.equal(requests[0]?.init?.method, 'GET');
  assert.equal(requests[1]?.init?.method, 'DELETE');
  assert.ok(requests.every((request) =>
    (request.init?.headers as Record<string, string>).authorization === 'Bearer jwt-playlist-test'));
  assert.equal(obterTokenDeAcesso(), 'jwt-playlist-test');
});

test('playlistService preserva erros 401, 404 e 409 e propaga falha de rede tipada', async () => {
  const service = criarPlaylistService(apiClient);
  const errorResponse = (status: number, code: string) => new Response(JSON.stringify({
    error: { code, message: `Erro ${status}` },
  }), { status, headers: { 'content-type': 'application/json' } });

  definirTokenDeAcesso('jwt-playlist-test');
  globalThis.fetch = (async () => errorResponse(401, 'UNAUTHORIZED')) as typeof fetch;
  await assert.rejects(service.listarPlaylists(), (error: unknown) =>
    error instanceof ApiClientError && error.status === 401 && error.code === 'UNAUTHORIZED');
  assert.equal(obterTokenDeAcesso(), null);

  for (const [status, code] of [[404, 'PLAYLIST_NOT_FOUND'], [409, 'TRACK_ALREADY_IN_PLAYLIST']]) {
    definirTokenDeAcesso('jwt-playlist-test');
    globalThis.fetch = (async () => errorResponse(status, code)) as typeof fetch;
    await assert.rejects(service.listarPlaylists(), (error: unknown) =>
      error instanceof ApiClientError && error.status === status && error.code === code);
  }

  definirTokenDeAcesso('jwt-playlist-test');
  globalThis.fetch = (async () => { throw new TypeError('network details'); }) as typeof fetch;
  await assert.rejects(service.listarPlaylists(), (error: unknown) =>
    error instanceof ApiClientError && error.kind === 'network');
});

test('playlistService rejeita envelopes e recursos em formato incompatível', async () => {
  const invalidApi = {
    get: async () => ({ data: [{ ...playlist, id: 123 }] }),
    post: async () => ({ data: null }),
    patch: async () => ({ data: null }),
    delete: async () => undefined,
  };
  const service = criarPlaylistService(invalidApi);
  await assert.rejects(service.listarPlaylists(), (error: unknown) =>
    error instanceof ApiClientError && error.kind === 'invalid-response');
});
