import * as repo from "../repositories/index.js";
export const listMyNotifications = async (p: {
  userId: string;
  skip: number;
  take: number;
}) => {
  const [items, total] = await Promise.all([
    repo.listForUser(p.userId, p.skip, p.take),
    repo.countForUser(p.userId),
  ]);
  return { items, total };
};
