import prisma from "prisma";
export const list = () => prisma.brand.findMany({ orderBy: { name: "asc" }, include: { logoFile: true } });
export const byId = (id: string) => prisma.brand.findUnique({ where: { id }, include: { logoFile: true } });
export const create = (data: { name: string; slug: string; description?: string; logoFileId?: string }) =>
  prisma.brand.create({ data, include: { logoFile: true } });
export const update = (id: string, data: { name?: string; slug?: string; description?: string | null; logoFileId?: string | null; isActive?: boolean }) =>
  prisma.brand.update({ where: { id }, data, include: { logoFile: true } });
