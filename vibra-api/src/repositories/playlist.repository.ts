import type { Prisma } from '../../generated/prisma/client.js';

import { getPrismaClient } from '../database/prisma.js';

export type PlaylistRecord = Prisma.PlaylistGetPayload<{
  include: { _count: { select: { tracks: true } } };
}>;

export interface CreatePlaylistRepositoryInput {
  ownerId: string;
  name: string;
  description?: string | null;
}

export interface UpdatePlaylistRepositoryInput {
  name?: string;
  description?: string | null;
}

const playlistWithTrackCount = {
  _count: { select: { tracks: true } },
} satisfies Prisma.PlaylistInclude;

export const playlistRepository = {
  async create(input: CreatePlaylistRepositoryInput): Promise<PlaylistRecord> {
    return getPrismaClient().playlist.create({
      data: {
        ownerId: input.ownerId,
        name: input.name,
        description: input.description,
      },
      include: playlistWithTrackCount,
    });
  },

  async findByIdAndOwner(id: string, ownerId: string): Promise<PlaylistRecord | null> {
    return getPrismaClient().playlist.findFirst({
      where: { id, ownerId },
      include: playlistWithTrackCount,
    });
  },

  async listByOwner(ownerId: string): Promise<PlaylistRecord[]> {
    return getPrismaClient().playlist.findMany({
      where: { ownerId },
      orderBy: { updatedAt: 'desc' },
      include: playlistWithTrackCount,
    });
  },

  async update(id: string, ownerId: string, input: UpdatePlaylistRepositoryInput): Promise<PlaylistRecord | null> {
    const result = await getPrismaClient().playlist.updateMany({
      where: { id, ownerId },
      data: input,
    });

    if (result.count === 0) return null;

    return getPrismaClient().playlist.findFirst({
      where: { id, ownerId },
      include: playlistWithTrackCount,
    });
  },

  async delete(id: string, ownerId: string): Promise<boolean> {
    const result = await getPrismaClient().playlist.deleteMany({ where: { id, ownerId } });
    return result.count > 0;
  },
};
