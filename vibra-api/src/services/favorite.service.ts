import { BusinessError } from '../errors/business-error.js';
import { isPrismaErrorCode } from '../errors/prisma-error.js';
import { favoriteRepository } from '../repositories/favorite.repository.js';

export const favoriteService = {
  async add(userId: string, jamendoTrackId: string) {
    try {
      return await favoriteRepository.add(userId, jamendoTrackId);
    } catch (error) {
      if (isPrismaErrorCode(error, 'P2002')) {
        throw new BusinessError('FAVORITE_ALREADY_EXISTS', 'Esta faixa já está nos favoritos.');
      }
      if (isPrismaErrorCode(error, 'P2003')) {
        throw new BusinessError('USER_NOT_FOUND', 'Usuário não encontrado.');
      }
      throw error;
    }
  },

  async remove(userId: string, jamendoTrackId: string): Promise<void> {
    const removed = await favoriteRepository.remove(userId, jamendoTrackId);
    if (!removed) throw new BusinessError('FAVORITE_NOT_FOUND', 'Favorito não encontrado.');
  },

  listByUser(userId: string) {
    return favoriteRepository.listByUser(userId);
  },

  async getByTrackId(userId: string, jamendoTrackId: string) {
    const isFavorited = await favoriteRepository.isFavorited(userId, jamendoTrackId);
    if (!isFavorited) {
      throw new BusinessError('FAVORITE_NOT_FOUND', 'Favorito não encontrado.');
    }
    return { jamendoTrackId };
  },

  isFavorited(userId: string, jamendoTrackId: string) {
    return favoriteRepository.isFavorited(userId, jamendoTrackId);
  },
};
