import prisma from "prisma";
import { ProductStatus, type Prisma } from "@prisma/client";
export interface FindProductsParams {
  search?: string;
  status?: ProductStatus;
  brandId?: string;
  categoryId?: string;
  isFeatured?: boolean;
  skip: number;
  take: number;
}
export const list = async (p: FindProductsParams) => {
  const where: Prisma.ProductWhereInput = {
    ...(p.status && { status: p.status }),
    ...(p.brandId && { brandId: p.brandId }),
    ...(p.categoryId && { categoryId: p.categoryId }),
    ...(typeof p.isFeatured === "boolean" && { isFeatured: p.isFeatured }),
    ...(p.search && {
      OR: [
        { name: { contains: p.search, mode: "insensitive" } },
        { shortDescription: { contains: p.search, mode: "insensitive" } },
      ],
    }),
  };
  return Promise.all([
    prisma.product.findMany({
      where,
      skip: p.skip,
      take: p.take,
      include: {
        brand: true,
        category: true,
        images: { include: { fileUpload: true }, orderBy: { position: "asc" } },
        variants: { where: { isActive: true }, include: { inventory: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.product.count({ where }),
  ]);
};
export const byId = (id: string) =>
  prisma.product.findUnique({
    where: { id },
    include: {
      brand: true,
      category: true,
      images: { include: { fileUpload: true }, orderBy: { position: "asc" } },
      variants: { include: { inventory: true, serializedDevices: true } },
    },
  });
export const create = (data: Prisma.ProductCreateInput) =>
  prisma.product.create({ data, include: { brand: true, category: true } });
export const update = (id: string, data: Prisma.ProductUpdateInput) =>
  prisma.product.update({
    where: { id },
    data,
    include: { brand: true, category: true },
  });
export const archive = (id: string) =>
  prisma.product.update({
    where: { id },
    data: { status: ProductStatus.ARCHIVED },
  });
