import { z } from "zod";

import { normalizePhoneNumber } from "../../../utilities/index.js";
import * as repo from "../repositories/index.js";
import { notFound } from "src/types/app-errors.js";

const updateSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

export const listUsers = async (params: { search?: string; skip: number; take: number }) => {
  const [items, total] = await repo.findUsers(params);
  return { items, total };
};

export const getUser = async (id: string) => {
  const user = await repo.findUserById(id);
  if (!user) throw notFound("USER_NOT_FOUND", "User not found.");
  return user;
};

export const updateUser = async (id: string, raw: unknown) => {
  await getUser(id);
  const input = updateSchema.parse(raw);
  return repo.updateUser(id, {
    ...input,
    phone: input.phone === undefined ? undefined : input.phone === null ? null : normalizePhoneNumber(input.phone),
  });
};
