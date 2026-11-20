import argon2 from 'argon2';

import { BusinessError } from '../errors/business-error.js';
import { userRepository } from '../repositories/user.repository.js';
import { userService } from './user.service.js';
import type { LoginInput, RegisterInput } from '../schemas/auth.schema.js';
import { accessTokenExpiresIn, signAccessToken } from '../utils/jwt.js';

const invalidCredentials = () => new BusinessError('INVALID_CREDENTIALS', 'E-mail ou senha inválidos.');

export const authService = {
  async register(input: RegisterInput) {
    const passwordHash = await argon2.hash(input.password, { type: argon2.argon2id });
    const user = await userService.create({
      email: input.email,
      displayName: input.displayName,
      passwordHash,
    });
    const accessToken = await signAccessToken(user.id);

    return {
      user,
      accessToken,
      tokenType: 'Bearer' as const,
      expiresIn: accessTokenExpiresIn,
    };
  },

  async login(input: LoginInput) {
    const user = await userRepository.findByEmailForAuthentication(input.email.trim().toLowerCase());
    if (!user) throw invalidCredentials();

    const senhaValida = await argon2.verify(user.passwordHash, input.password);
    if (!senhaValida) throw invalidCredentials();

    const { passwordHash: _passwordHash, ...profile } = user;
    const accessToken = await signAccessToken(profile.id);

    return {
      user: profile,
      accessToken,
      tokenType: 'Bearer' as const,
      expiresIn: accessTokenExpiresIn,
    };
  },
};
