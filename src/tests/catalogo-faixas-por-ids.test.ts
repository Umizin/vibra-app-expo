// Frontend tests run with the existing backend tsx/node:test toolchain.
// @ts-nocheck
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';

import { ApiClientError } from '@/services/api';
import { definirTokenDeAcesso } from '@/services/sessao';

const faixaApi = {
  id: '12345',
  titulo: 'Faixa real',
  artistaId: '9',
  artista: 'Artista real',
  duracaoEmSegundos: 120,
  tags: ['ambient'],
};

let originalFetch;
let originalApiUrl;
let catalogo;

before(async () => {
  originalApiUrl = process.env.EXPO_PUBLIC_API_URL;
  process.env.EXPO_PUBLIC_API_URL = 'http://vibra.test:3001';
  originalFetch = globalThis.fetch;
  catalogo = (await import('@/services/catalogoService')).catalogoService;
});

after(() => {
  globalThis.fetch = originalFetch;
  if (originalApiUrl === undefined) delete process.env.EXPO_PUBLIC_API_URL;
  else process.env.EXPO_PUBLIC_API_URL = originalApiUrl;
  definirTokenDeAcesso(null);
});

test('buscarFaixasPorIds consulta o catálogo autenticado em lote e devolve missingIds', async () => {
  const requests = [];
  globalThis.fetch = (async (input, init) => {
    requests.push({ url: new URL(String(input)), init });
    return new Response(JSON.stringify({
      data: [faixaApi],
      requestedIds: ['12345', '999'],
      missingIds: ['999'],
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  });
  definirTokenDeAcesso('catalog-batch-token');

  const result = await catalogo.buscarFaixasPorIds(['12345', '999']);
  assert.deepEqual(result.requestedIds, ['12345', '999']);
  assert.deepEqual(result.missingIds, ['999']);
  assert.equal(result.data[0]?.id, '12345');
  assert.equal(result.data[0]?.titulo, 'Faixa real');
  assert.equal(requests[0]?.url.pathname, '/api/v1/catalog/tracks');
  assert.equal(requests[0]?.url.searchParams.get('ids'), '12345,999');
  assert.equal(requests[0]?.url.searchParams.get('q'), null);
  assert.equal((requests[0]?.init.headers).authorization, 'Bearer catalog-batch-token');
});

test('IDs não numéricos entram em missingIds sem chamada HTTP', async () => {
  let called = false;
  globalThis.fetch = (async () => {
    called = true;
    return new Response('{}', { status: 500 });
  });
  definirTokenDeAcesso('catalog-batch-token');
  const result = await catalogo.buscarFaixasPorIds(['abc', 'not-jamendo']);
  assert.equal(called, false);
  assert.deepEqual(result, { data: [], requestedIds: ['abc', 'not-jamendo'], missingIds: ['abc', 'not-jamendo'] });
});

test('lista vazia não chama a API', async () => {
  let called = false;
  globalThis.fetch = async () => { called = true; return new Response('{}', { status: 500 }); };
  assert.deepEqual(await catalogo.buscarFaixasPorIds([]), { data: [], requestedIds: [], missingIds: [] });
  assert.equal(called, false);
});

test('rejeita mais de 50 IDs ou IDs duplicados antes da requisição', async () => {
  let called = false;
  globalThis.fetch = async () => { called = true; return new Response('{}', { status: 500 }); };
  await assert.rejects(catalogo.buscarFaixasPorIds(Array.from({ length: 51 }, (_, index) => String(index + 1))), RangeError);
  await assert.rejects(catalogo.buscarFaixasPorIds(['1', '1']), RangeError);
  assert.equal(called, false);
});

test('propaga 401 do catálogo em lote', async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({
    error: { code: 'UNAUTHORIZED', message: 'Sua sessão expirou. Entre novamente.' },
  }), { status: 401, headers: { 'content-type': 'application/json' } });
  definirTokenDeAcesso('catalog-batch-token');
  await assert.rejects(catalogo.buscarFaixasPorIds(['12345']), (error) =>
    error instanceof ApiClientError && error.status === 401);
});
