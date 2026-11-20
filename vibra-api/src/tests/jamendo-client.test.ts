import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  JamendoApiError,
  JamendoCredentialMissingError,
  JamendoHttpError,
  JamendoInvalidResourceError,
  JamendoJsonError,
  JamendoProviderUnavailableError,
  JamendoResponseError,
  JamendoTimeoutError,
} from '../integrations/jamendo/jamendo.errors.js';
import { JamendoClient } from '../integrations/jamendo/jamendo.client.js';
import type { JamendoClientOptions } from '../integrations/jamendo/jamendo.client.js';

const clientId = 'jamendo-test-client-id-42';

function successfulPayload() {
  return {
    headers: { status: 'success', code: 0, error_message: '', warnings: '', results_count: 1 },
    results: [{ id: '12345', name: 'Faixa de teste', future_field: { retained: true } }],
  };
}

function client(options: Partial<JamendoClientOptions> = {}) {
  return new JamendoClient({
    clientIdProvider: () => clientId,
    ...options,
  });
}

test('monta GET HTTPS no host fixo, adiciona client_id e formato JSON', async () => {
  let capturedUrl: URL | undefined;
  let capturedInit: RequestInit | undefined;
  const jamendo = client({
    fetchImpl: async (input, init) => {
      capturedUrl = new URL(String(input));
      capturedInit = init;
      return new Response(JSON.stringify(successfulPayload()), { status: 200 });
    },
  });

  const envelope = await jamendo.get('tracks', {
    search: 'ambient focus',
    tags: ['ambient', 'focus'],
    limit: 12,
    client_id: 'attacker-value',
    format: 'xml',
  });

  assert.ok(capturedUrl);
  assert.equal(capturedUrl.protocol, 'https:');
  assert.equal(capturedUrl.hostname, 'api.jamendo.com');
  assert.equal(capturedUrl.pathname, '/v3.0/tracks/');
  assert.equal(capturedUrl.searchParams.get('client_id'), clientId);
  assert.equal(capturedUrl.searchParams.get('format'), 'json');
  assert.equal(capturedUrl.searchParams.get('search'), 'ambient focus');
  assert.equal(capturedUrl.searchParams.get('tags'), 'ambient focus');
  assert.equal(capturedUrl.searchParams.get('limit'), '12');
  assert.equal(capturedInit?.method, 'GET');
  assert.ok(capturedInit?.signal instanceof AbortSignal);
  assert.deepEqual(envelope.results[0], successfulPayload().results[0]);
});

test('não aceita recurso que tente substituir o host fixo', async () => {
  let fetchCalled = false;
  const jamendo = client({ fetchImpl: async () => {
    fetchCalled = true;
    return new Response(JSON.stringify(successfulPayload()));
  } });

  await assert.rejects(
    jamendo.get('https://attacker.example' as never),
    JamendoInvalidResourceError,
  );
  assert.equal(fetchCalled, false);
});

test('converte timeout em erro específico', async () => {
  const jamendo = client({
    timeoutMs: 5,
    fetchImpl: async (_input, init) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(init.signal?.reason), { once: true });
    }),
  });

  await assert.rejects(jamendo.get('tracks'), JamendoTimeoutError);
});

test('trata erros HTTP 4xx e 5xx sem incluir a credencial', async () => {
  for (const status of [401, 503]) {
    const jamendo = client({ fetchImpl: async () => new Response('provider error', { status }) });
    await assert.rejects(jamendo.get('tracks'), (error: unknown) => {
      assert.ok(error instanceof JamendoHttpError);
      assert.equal(error.status, status);
      assert.equal(error.message.includes(clientId), false);
      return true;
    });
  }
});

test('trata falhas de rede sem propagar a credencial em mensagem ou detalhe técnico', async () => {
  const jamendo = client({
    fetchImpl: async () => { throw new TypeError(`Falha em https://api.jamendo.com/?client_id=${clientId}`); },
  });

  await assert.rejects(jamendo.get('tracks'), (error: unknown) => {
    assert.ok(error instanceof JamendoProviderUnavailableError);
    assert.equal(error.message.includes(clientId), false);
    assert.equal(JSON.stringify(error.technicalCause).includes(clientId), false);
    assert.match(JSON.stringify(error.technicalCause), /REDACTED/);
    return true;
  });
});

test('trata JSON inválido', async () => {
  const jamendo = client({ fetchImpl: async () => new Response('{ inválido', { status: 200 }) });
  await assert.rejects(jamendo.get('tracks'), JamendoJsonError);
});

test('trata envelope de erro Jamendo mesmo com HTTP 200', async () => {
  const jamendo = client({ fetchImpl: async () => new Response(JSON.stringify({
    headers: { status: 'failed', code: 10, error_message: `invalid client ${clientId}` },
    results: [],
  }), { status: 200 }) });

  await assert.rejects(jamendo.get('tracks'), (error: unknown) => {
    assert.ok(error instanceof JamendoApiError);
    assert.equal(error.message.includes(clientId), false);
    assert.equal(JSON.stringify(error.technicalCause).includes(clientId), false);
    return true;
  });
});

test('retorna envelope válido e preserva campos de resultados sem presumi-los', async () => {
  const jamendo = client({ fetchImpl: async () => new Response(JSON.stringify(successfulPayload()), { status: 200 }) });
  const envelope = await jamendo.get('artists/albums', { id: '987' });

  assert.equal(envelope.headers.results_count, 1);
  assert.deepEqual(envelope.results[0], successfulPayload().results[0]);
});

test('rejeita resposta incompatível com o schema geral', async () => {
  const jamendo = client({ fetchImpl: async () => new Response(JSON.stringify({ headers: {}, results: 'invalid' }), { status: 200 }) });
  await assert.rejects(jamendo.get('albums'), JamendoResponseError);
});

test('falha de modo seguro quando não há client_id e não chama fetch', async () => {
  let fetchCalled = false;
  const jamendo = new JamendoClient({
    clientIdProvider: () => undefined,
    fetchImpl: async () => {
      fetchCalled = true;
      return new Response(JSON.stringify(successfulPayload()));
    },
  });

  await assert.rejects(jamendo.get('tracks'), (error: unknown) => {
    assert.ok(error instanceof JamendoCredentialMissingError);
    assert.equal(error.message.includes(clientId), false);
    return true;
  });
  assert.equal(fetchCalled, false);
});
