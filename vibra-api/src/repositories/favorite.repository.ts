import { getPrismaClient } from '../database/prisma.js';

export const favoriteRepository = {
  async add(userId: string, jamendoTrackId: string) {
    return getPrismaClient().favorite.create({
      data: { userId, jamendoTrackId },
    });
  },

  async remove(userId: string, jamendoTrackId: string): Promise<boolean> {
    const result = await getPrismaClient().favorite.deleteMany({
      where: { userId, jamendoTrackId },
    });
    return result.count > 0;
  },

  async listByUser(userId: string) {
    return getPrismaClient().favorite.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  },

  async isFavorited(userId: string, jamendoTrackId: string): Promise<boolean> {
    const favorite = await getPrismaClient().favorite.findUnique({
      where: { userId_jamendoTrackId: { userId, jamendoTrackId } },
      select: { userId: true },
    });
    return favorite !== null;
  },
};
