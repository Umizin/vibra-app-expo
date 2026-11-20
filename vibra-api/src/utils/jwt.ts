import { SignJWT, errors, jwtVerify } from 'jose';

import { env } from '../config/env.js';

const issuer = 'vibra-api';
const audience = 'vibra-api';
const validityInSeconds = 7 * 24 * 60 * 60;
const secretKey = new TextEncoder().encode(env.JWT_SECRET);
const uuidPattern = /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i;

export class InvalidAccessTokenError extends Error {
  constructor() {
    super('Token de acesso inválido.');
    this.name = 'InvalidAccessTokenError';
  }
}

export async function signAccessToken(userId: string): Promise<string> {
  if (!uuidPattern.test(userId)) throw new Error('O identificador do usuário deve ser um UUID válido.');

  return new SignJWT({})
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuer(issuer)
    .setAudience(audience)
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${validityInSeconds}s`)
    .sign(secretKey);
}

export async function verifyAccessToken(token: string): Promise<string> {
  try {
    const { payload, protectedHeader } = await jwtVerify(token, secretKey, {
      algorithms: ['HS256'],
      issuer,
      audience,
    });

    if (
      protectedHeader.alg !== 'HS256' ||
      typeof payload.sub !== 'string' ||
      !uuidPattern.test(payload.sub) ||
      typeof payload.iat !== 'number' ||
      typeof payload.exp !== 'number'
    ) {
      throw new InvalidAccessTokenError();
    }

    return payload.sub;
  } catch (error) {
    if (error instanceof errors.JOSEError || error instanceof InvalidAccessTokenError) {
      throw new InvalidAccessTokenError();
    }
    throw error;
  }
}

export const accessTokenExpiresIn = validityInSeconds;
