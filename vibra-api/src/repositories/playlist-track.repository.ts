import type { Prisma } from '../../generated/prisma/client.js';

import { getPrismaClient } from '../database/prisma.js';

export type PlaylistTrackRecord = Prisma.PlaylistTrackGetPayload<{}>;

export interface AddPlaylistTrackRepositoryInput {
  playlistId: string;
  ownerId: string;
  jamendoTrackId: string;
  position: number;
}

export const playlistTrackRepository = {
  async add(input: AddPlaylistTrackRepositoryInput): Promise<PlaylistTrackRecord | null> {
    const prisma = getPrismaClient();
    const playlist = await prisma.playlist.findFirst({
      where: { id: input.playlistId, ownerId: input.ownerId },
      select: { id: true },
    });
    if (!playlist) return null;

    return prisma.playlistTrack.create({
      data: {
        playlistId: input.playlistId,
        jamendoTrackId: input.jamendoTrackId,
        position: input.position,
      },
    });
  },

  async listByPlaylist(playlistId: string, ownerId: string): Promise<PlaylistTrackRecord[] | null> {
    const prisma = getPrismaClient();
    const playlist = await prisma.playlist.findFirst({
      where: { id: playlistId, ownerId },
      select: { id: true },
    });
    if (!playlist) return null;

    return prisma.playlistTrack.findMany({
      where: { playlistId },
      orderBy: { position: 'asc' },
    });
  },

  async findByJamendoTrackId(
    playlistId: string,
    ownerId: string,
    jamendoTrackId: string,
  ): Promise<PlaylistTrackRecord | null> {
    return getPrismaClient().playlistTrack.findFirst({
      where: {
        playlistId,
        jamendoTrackId,
        playlist: { ownerId },
      },
    });
  },

  async remove(playlistId: string, ownerId: string, jamendoTrackId: string): Promise<boolean> {
    const result = await getPrismaClient().playlistTrack.deleteMany({
      where: {
        playlistId,
        jamendoTrackId,
        playlist: { ownerId },
      },
    });
    return result.count > 0;
  },
};
