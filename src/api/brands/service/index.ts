import { z } from "zod";

import { slugify } from "../../../utilities/index.js";
import * as repo from "../repositories/index.js";
import { notFound } from "src/types/app-errors.js";
const createSchema = z.object({ name: z.string().min(1), slug: z.string().optional(), description: z.string().optional(), logoFileId: z.string().uuid().optional() });
const updateSchema = createSchema.partial().extend({ description: z.string().nullable().optional(), logoFileId: z.string().uuid().nullable().optional(), isActive: z.boolean().optional() });
export const listBrands = repo.list;
export const getBrand = async (id: string) => { const x = await repo.byId(id); if (!x) throw notFound("BRAND_NOT_FOUND","Brand not found."); return x; };
export const createBrand = (raw: unknown) => { const i=createSchema.parse(raw); return repo.create({...i, slug:i.slug?slugify(i.slug):slugify(i.name)}); };
export const updateBrand = async (id:string, raw:unknown) => { await getBrand(id); const i=updateSchema.parse(raw); return repo.update(id,{...i, ...(i.slug?{slug:slugify(i.slug)}:{})}); };
