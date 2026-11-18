import { BusinessError } from '../errors/business-error.js';
import { isPrismaErrorCode, uniqueConstraintTarget } from '../errors/prisma-error.js';
import type { AddPlaylistTrackRepositoryInput } from '../repositories/playlist-track.repository.js';
import { playlistTrackRepository } from '../repositories/playlist-track.repository.js';
import { playlistRepository } from '../repositories/playlist.repository.js';

function hasTargetIdentifier(target: string[], identifier: string): boolean {
  const normalizedTarget = target.join('_').toLowerCase().replace(/[^a-z0-9]/g, '');
  return normalizedTarget.includes(identifier.toLowerCase().replace(/[^a-z0-9]/g, ''));
}

export const playlistTrackService = {
  async add(input: AddPlaylistTrackRepositoryInput) {
    try {
      const track = await playlistTrackRepository.add(input);
      if (!track) throw new BusinessError('PLAYLIST_NOT_FOUND', 'Playlist não encontrada.');
      return track;
    } catch (error) {
      if (isPrismaErrorCode(error, 'P2002')) {
        const target = uniqueConstraintTarget(error);
        if (hasTargetIdentifier(target, 'position')) {
          throw new BusinessError('PLAYLIST_POSITION_IN_USE', 'Esta posição já está ocupada na playlist.');
        }
        if (hasTargetIdentifier(target, 'playlistId') && hasTargetIdentifier(target, 'jamendoTrackId')) {
          throw new BusinessError('TRACK_ALREADY_IN_PLAYLIST', 'Esta faixa já está na playlist.');
        }
        throw error;
      }
      if (isPrismaErrorCode(error, 'P2003')) {
        throw new BusinessError('PLAYLIST_NOT_FOUND', 'Playlist não encontrada.');
      }
      throw error;
    }
  },

  async list(playlistId: string, ownerId: string) {
    const tracks = await playlistTrackRepository.listByPlaylist(playlistId, ownerId);
    if (!tracks) throw new BusinessError('PLAYLIST_NOT_FOUND', 'Playlist não encontrada.');
    return tracks;
  },

  async getByJamendoTrackId(playlistId: string, ownerId: string, jamendoTrackId: string) {
    const track = await playlistTrackRepository.findByJamendoTrackId(playlistId, ownerId, jamendoTrackId);
    if (!track) {
      const playlist = await playlistRepository.findByIdAndOwner(playlistId, ownerId);
      if (!playlist) throw new BusinessError('PLAYLIST_NOT_FOUND', 'Playlist não encontrada.');
      throw new BusinessError('TRACK_NOT_FOUND', 'Faixa não encontrada na playlist.');
    }
    return track;
  },

  async remove(playlistId: string, ownerId: string, jamendoTrackId: string): Promise<void> {
    const removed = await playlistTrackRepository.remove(playlistId, ownerId, jamendoTrackId);
    if (!removed) {
      const playlist = await playlistRepository.findByIdAndOwner(playlistId, ownerId);
      if (!playlist) throw new BusinessError('PLAYLIST_NOT_FOUND', 'Playlist não encontrada.');
      throw new BusinessError('TRACK_NOT_FOUND', 'Faixa não encontrada na playlist.');
    }
  },
};
