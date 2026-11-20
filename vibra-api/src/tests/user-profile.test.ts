import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import type { Server } from 'node:http';
import { after, before, test } from 'node:test';
import express from 'express';

import { BusinessError } from '../errors/business-error.js';
import type { UpdateUserRepositoryInput } from '../repositories/user.repository.js';

const testUserId = 'a7ce72c6-30dd-4b36-a1cf-26e8a01eb1ab';
const missingUserId = '0ef5236e-628c-484d-9cf5-307869e58c0a';
const profile = {
  id: testUserId,
  email: 'vibra-profile-test@example.invalid',
  displayName: 'Perfil de teste',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-02T00:00:00.000Z'),
  passwordHash: 'hash-interno-que-nao-pode-ser-retornado',
};

let baseUrl = '';
let server: Server;
let userService: (typeof import('../services/user.service.js'))['userService'];
let originalGetProfile: typeof userService.getProfile;
let originalUpdateProfile: typeof userService.updateProfile;
let signAccessToken: (userId: string) => Promise<string>;
const chamadasDeAtualizacao: Array<{ userId: string; data: UpdateUserRepositoryInput }> = [];

before(async () => {
  process.env.JWT_SECRET = randomBytes(32).toString('base64url');

  const [{ default: app }, userServiceModule, jwtModule] = await Promise.all([
    import('../app.js'),
    import('../services/user.service.js'),
    import('../utils/jwt.js'),
  ]);

  userService = userServiceModule.userService;
  signAccessToken = jwtModule.signAccessToken;
  originalGetProfile = userService.getProfile;
  originalUpdateProfile = userService.updateProfile;

  userService.getProfile = async (id) => {
    if (id === testUserId) return profile;
    throw new BusinessError('USER_NOT_FOUND', 'Usuário não encontrado.');
  };

  userService.updateProfile = async (id, data) => {
    chamadasDeAtualizacao.push({ userId: id, data });
    if (id !== testUserId) {
      throw new BusinessError('USER_NOT_FOUND', 'Usuário não encontrado.');
    }
    if (data.email === 'ocupado@example.invalid') {
      throw new BusinessError('EMAIL_ALREADY_IN_USE', 'Este e-mail já está em uso.');
    }
    return { ...profile, ...data, updatedAt: new Date() };
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
  userService.getProfile = originalGetProfile;
  userService.updateProfile = originalUpdateProfile;
  delete process.env.JWT_SECRET;
  if (server) await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

async function tokenFor(userId = testUserId): Promise<string> {
  return signAccessToken(userId);
}

async function jsonRequest(path: string, options: RequestInit = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  return { response, body: await response.json() as Record<string, unknown> };
}

test('consulta o perfil autenticado sem retornar passwordHash', async () => {
  const token = await tokenFor();
  const { response, body } = await jsonRequest('/api/v1/users/me', {
    headers: { authorization: `Bearer ${token}`, 'x-user-id': missingUserId },
  });

  assert.equal(response.status, 200);
  assert.deepEqual(body.data, {
    id: profile.id,
    email: profile.email,
    displayName: profile.displayName,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
  });
  assert.equal(JSON.stringify(body).includes('passwordHash'), false);
});

test('rejeita consulta sem token e com token inválido', async () => {
  const semToken = await jsonRequest('/api/v1/users/me');
  assert.equal(semToken.response.status, 401);

  const tokenInvalido = await jsonRequest('/api/v1/users/me', {
    headers: { authorization: 'Bearer token-invalido' },
  });
  assert.equal(tokenInvalido.response.status, 401);
});

test('rejeita perfil de usuário inexistente identificado pelo sub do token', async () => {
  const token = await tokenFor(missingUserId);
  const { response, body } = await jsonRequest('/api/v1/users/me', {
    headers: { authorization: `Bearer ${token}` },
  });

  assert.equal(response.status, 404);
  assert.equal((body.error as { code: string }).code, 'USER_NOT_FOUND');
});

test('atualiza somente o nome usando a identidade do JWT', async () => {
  chamadasDeAtualizacao.length = 0;
  const token = await tokenFor();
  const { response, body } = await jsonRequest('/api/v1/users/me?userId=' + missingUserId, {
    method: 'PATCH',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ displayName: '  Novo nome  ' }),
  });

  assert.equal(response.status, 200);
  assert.equal((body.data as { displayName: string }).displayName, 'Novo nome');
  assert.equal(chamadasDeAtualizacao[0]?.userId, testUserId);
  assert.deepEqual(chamadasDeAtualizacao[0]?.data, { displayName: 'Novo nome' });
});

test('atualiza somente e-mail sem alterar os demais campos', async () => {
  chamadasDeAtualizacao.length = 0;
  const token = await tokenFor();
  const { response } = await jsonRequest('/api/v1/users/me', {
    method: 'PATCH',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'Vibra-New@example.invalid' }),
  });

  assert.equal(response.status, 200);
  assert.deepEqual(chamadasDeAtualizacao[0]?.data, { email: 'Vibra-New@example.invalid' });
});

test('atualiza nome e e-mail juntos', async () => {
  chamadasDeAtualizacao.length = 0;
  const token = await tokenFor();
  const { response } = await jsonRequest('/api/v1/users/me', {
    method: 'PATCH',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ displayName: 'Novo nome', email: 'novo@example.invalid' }),
  });

  assert.equal(response.status, 200);
  assert.deepEqual(chamadasDeAtualizacao[0]?.data, { displayName: 'Novo nome', email: 'novo@example.invalid' });
});

test('rejeita corpo vazio, campos desconhecidos e tentativas de enviar dados administrativos', async () => {
  const token = await tokenFor();
  const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };

  for (const payload of [{}, { displayName: 'Nome', extra: 'valor' }, { userId: missingUserId, displayName: 'Nome' }, { passwordHash: 'invasao' }]) {
    const { response } = await jsonRequest('/api/v1/users/me', {
      method: 'PATCH',
      headers,
      body: JSON.stringify(payload),
    });
    assert.equal(response.status, 400);
  }
});

test('converte e-mail duplicado em conflito HTTP 409', async () => {
  const token = await tokenFor();
  const { response, body } = await jsonRequest('/api/v1/users/me', {
    method: 'PATCH',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'ocupado@example.invalid' }),
  });

  assert.equal(response.status, 409);
  assert.equal((body.error as { code: string }).code, 'EMAIL_ALREADY_IN_USE');
});

test('não permite atualizar perfil de outro usuário', async () => {
  const token = await tokenFor(missingUserId);
  const { response, body } = await jsonRequest('/api/v1/users/me', {
    method: 'PATCH',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ displayName: 'Tentativa de alteração' }),
  });

  assert.equal(response.status, 404);
  assert.equal((body.error as { code: string }).code, 'USER_NOT_FOUND');
  assert.equal(chamadasDeAtualizacao.at(-1)?.userId, missingUserId);
});
