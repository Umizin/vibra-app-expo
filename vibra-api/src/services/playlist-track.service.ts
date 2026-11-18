import { BusinessError } from '../errors/business-error.js';
import { isPrismaErrorCode, uniqueConstraintTarget } from '../errors/prisma-error.js';
import type { AddPlaylistTrackRepositoryInput } from '../repositories/playlist-track.repository.js';
import { playlistTrackRepository } from '../repositories/playlist-track.repository.js';
import { playlistRepository } from '../repositories/playlist.repository.js';

async function ensurePlaylistOwner(playlistId: string, ownerId: string): Promise<void> {
  const playlist = await playlistRepository.findByIdAndOwner(playlistId, ownerId);
  if (!playlist) throw new BusinessError('PLAYLIST_NOT_FOUND', 'Playlist não encontrada.');
}

export const playlistTrackService = {
  async add(input: AddPlaylistTrackRepositoryInput) {
    try {
      const track = await playlistTrackRepository.add(input);
      if (!track) throw new BusinessError('PLAYLIST_NOT_FOUND', 'Playlist não encontrada.');
      return track;
    } catch (error) {
      if (isPrismaErrorCode(error, 'P2002')) {
        const target = uniqueConstraintTarget(error).join(' ');
        if (target.includes('position')) {
          throw new BusinessError('PLAYLIST_POSITION_IN_USE', 'Esta posição já está ocupada na playlist.');
        }
        throw new BusinessError('TRACK_ALREADY_IN_PLAYLIST', 'Esta faixa já está na playlist.');
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
    await ensurePlaylistOwner(playlistId, ownerId);
    const track = await playlistTrackRepository.findByJamendoTrackId(playlistId, ownerId, jamendoTrackId);
    if (!track) throw new BusinessError('TRACK_NOT_FOUND', 'Faixa não encontrada na playlist.');
    return track;
  },

  async remove(playlistId: string, ownerId: string, jamendoTrackId: string): Promise<void> {
    await ensurePlaylistOwner(playlistId, ownerId);
    const removed = await playlistTrackRepository.remove(playlistId, ownerId, jamendoTrackId);
    if (!removed) throw new BusinessError('TRACK_NOT_FOUND', 'Faixa não encontrada na playlist.');
  },
};
