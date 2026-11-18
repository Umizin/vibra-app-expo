import type { Prisma } from '../../generated/prisma/client.js';

import { getPrismaClient } from '../database/prisma.js';

const profileSelect = {
  id: true,
  email: true,
  displayName: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

export type UserProfile = Prisma.UserGetPayload<{ select: typeof profileSelect }>;

export interface CreateUserRepositoryInput {
  email: string;
  displayName: string;
  passwordHash: string;
}

export interface UpdateUserRepositoryInput {
  email?: string;
  displayName?: string;
}

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

export const userRepository = {
  async findById(id: string): Promise<UserProfile | null> {
    return getPrismaClient().user.findUnique({
      where: { id },
      select: profileSelect,
    });
  },

  async findByEmail(email: string): Promise<UserProfile | null> {
    return getPrismaClient().user.findUnique({
      where: { email: normalizeEmail(email) },
      select: profileSelect,
    });
  },

  async create(input: CreateUserRepositoryInput): Promise<UserProfile> {
    return getPrismaClient().user.create({
      data: {
        email: normalizeEmail(input.email),
        displayName: input.displayName,
        passwordHash: input.passwordHash,
      },
      select: profileSelect,
    });
  },

  async update(id: string, input: UpdateUserRepositoryInput): Promise<UserProfile> {
    const data: Prisma.UserUpdateInput = {};
    if (input.email !== undefined) data.email = normalizeEmail(input.email);
    if (input.displayName !== undefined) data.displayName = input.displayName;

    return getPrismaClient().user.update({
      where: { id },
      data,
      select: profileSelect,
    });
  },
};
