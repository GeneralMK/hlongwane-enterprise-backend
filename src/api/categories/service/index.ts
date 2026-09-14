import { z } from "zod";

import { slugify } from "../../../utilities/index.js";
import * as repo from "../repositories/index.js";
import { notFound } from "src/types/app-errors.js";
const createSchema = z.object({
  name: z.string().min(1),
  slug: z.string().optional(),
  description: z.string().optional(),
  imageFileId: z.string().uuid().optional(),
  parentId: z.string().uuid().optional(),
});
const updateSchema = createSchema
  .partial()
  .extend({
    description: z.string().nullable().optional(),
    imageFileId: z.string().uuid().nullable().optional(),
    parentId: z.string().uuid().nullable().optional(),
    isActive: z.boolean().optional(),
  });
export const listCategories = repo.list;
export const getCategory = async (id: string) => {
  const x = await repo.byId(id);
  if (!x) throw notFound("CATEGORY_NOT_FOUND", "Category not found.");
  return x;
};
export const createCategory = (raw: unknown) => {
  const i = createSchema.parse(raw);
  return repo.create({
    ...i,
    slug: i.slug ? slugify(i.slug) : slugify(i.name),
  });
};
export const updateCategory = async (id: string, raw: unknown) => {
  await getCategory(id);
  const i = updateSchema.parse(raw);
  return repo.update(id, {
    ...i,
    ...(i.slug ? { slug: slugify(i.slug) } : {}),
  });
};
