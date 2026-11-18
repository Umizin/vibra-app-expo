import { userRepository } from '../repositories/user.repository.js';
import type { CreateUserRepositoryInput, UpdateUserRepositoryInput } from '../repositories/user.repository.js';
import { BusinessError } from '../errors/business-error.js';
import { isPrismaErrorCode } from '../errors/prisma-error.js';

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

export const userService = {
  async create(input: CreateUserRepositoryInput) {
    try {
      return await userRepository.create({ ...input, email: normalizeEmail(input.email) });
    } catch (error) {
      if (isPrismaErrorCode(error, 'P2002')) {
        throw new BusinessError('EMAIL_ALREADY_IN_USE', 'Este e-mail já está em uso.');
      }
      throw error;
    }
  },

  async getProfile(id: string) {
    const user = await userRepository.findById(id);
    if (!user) throw new BusinessError('USER_NOT_FOUND', 'Usuário não encontrado.');
    return user;
  },

  async updateProfile(id: string, input: UpdateUserRepositoryInput) {
    if (input.email === undefined && input.displayName === undefined) {
      throw new BusinessError('INVALID_UPDATE', 'Informe ao menos um dado para atualizar.');
    }

    try {
      return await userRepository.update(id, {
        ...input,
        ...(input.email === undefined ? {} : { email: normalizeEmail(input.email) }),
      });
    } catch (error) {
      if (isPrismaErrorCode(error, 'P2002')) {
        throw new BusinessError('EMAIL_ALREADY_IN_USE', 'Este e-mail já está em uso.');
      }
      if (isPrismaErrorCode(error, 'P2025')) {
        throw new BusinessError('USER_NOT_FOUND', 'Usuário não encontrado.');
      }
      throw error;
    }
  },
};
