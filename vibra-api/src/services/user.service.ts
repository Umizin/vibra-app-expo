import { userRepository } from '../repositories/user.repository.js';
import type { CreateUserRepositoryInput, UpdateUserRepositoryInput } from '../repositories/user.repository.js';
import { BusinessError } from '../errors/business-error.js';
import { isPrismaErrorCode } from '../errors/prisma-error.js';

const normalizeEmail = (email: string): string => email.trim().toLowerCase();
const characterCount = (value: string): number => [...value].length;

function validateEmail(email: string): string {
  const normalizedEmail = normalizeEmail(email);
  if (normalizedEmail.length === 0 || characterCount(normalizedEmail) > 254) {
    throw new BusinessError('INVALID_EMAIL', 'O e-mail deve ser informado e ter até 254 caracteres.');
  }
  return normalizedEmail;
}

function validateDisplayName(displayName: string): string {
  const normalizedName = displayName.trim();
  if (normalizedName.length === 0 || characterCount(normalizedName) > 80) {
    throw new BusinessError('INVALID_DISPLAY_NAME', 'O nome de exibição deve ser informado e ter até 80 caracteres.');
  }
  return normalizedName;
}

export const userService = {
  async create(input: CreateUserRepositoryInput) {
    const email = validateEmail(input.email);
    const displayName = validateDisplayName(input.displayName);
    try {
      return await userRepository.create({ ...input, email, displayName });
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

    const email = input.email === undefined ? undefined : validateEmail(input.email);
    const displayName = input.displayName === undefined ? undefined : validateDisplayName(input.displayName);

    try {
      return await userRepository.update(id, {
        ...(email === undefined ? {} : { email }),
        ...(displayName === undefined ? {} : { displayName }),
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
