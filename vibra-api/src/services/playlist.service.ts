import { BusinessError } from '../errors/business-error.js';
import { isPrismaErrorCode } from '../errors/prisma-error.js';
import type {
  CreatePlaylistRepositoryInput,
  UpdatePlaylistRepositoryInput,
} from '../repositories/playlist.repository.js';
import { playlistRepository } from '../repositories/playlist.repository.js';

export const playlistService = {
  async create(ownerId: string, input: Omit<CreatePlaylistRepositoryInput, 'ownerId'>) {
    try {
      return await playlistRepository.create({ ...input, ownerId });
    } catch (error) {
      if (isPrismaErrorCode(error, 'P2003')) {
        throw new BusinessError('USER_NOT_FOUND', 'Usuário não encontrado.');
      }
      throw error;
    }
  },

  listByOwner(ownerId: string) {
    return playlistRepository.listByOwner(ownerId);
  },

  async getById(id: string, ownerId: string) {
    const playlist = await playlistRepository.findByIdAndOwner(id, ownerId);
    if (!playlist) throw new BusinessError('PLAYLIST_NOT_FOUND', 'Playlist não encontrada.');
    return playlist;
  },

  async update(id: string, ownerId: string, input: UpdatePlaylistRepositoryInput) {
    if (input.name === undefined && input.description === undefined) {
      throw new BusinessError('INVALID_UPDATE', 'Informe ao menos um dado para atualizar.');
    }

    const playlist = await playlistRepository.update(id, ownerId, input);
    if (!playlist) throw new BusinessError('PLAYLIST_NOT_FOUND', 'Playlist não encontrada.');
    return playlist;
  },

  async delete(id: string, ownerId: string): Promise<void> {
    const deleted = await playlistRepository.delete(id, ownerId);
    if (!deleted) throw new BusinessError('PLAYLIST_NOT_FOUND', 'Playlist não encontrada.');
  },
};
