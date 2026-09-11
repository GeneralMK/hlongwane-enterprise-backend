import type { Prisma, ProductStatus } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'

const productInclude = {
  brand: true,
  category: true,
  images: { include: { fileUpload: true }, orderBy: { position: 'asc' as const } },
  variants: { include: { inventory: true } }
}

export function listProducts(args: { search?: string; status?: ProductStatus; brandId?: string; categoryId?: string; take?: number; skip?: number }) {
  const where: Prisma.ProductWhereInput = {
    status: args.status,
    brandId: args.brandId,
    categoryId: args.categoryId,
    ...(args.search ? { OR: [{ name: { contains: args.search, mode: 'insensitive' } }, { description: { contains: args.search, mode: 'insensitive' } }] } : {})
  }
  return prisma.product.findMany({ where, include: productInclude, orderBy: { createdAt: 'desc' }, take: args.take ?? 24, skip: args.skip ?? 0 })
}

export function findProductById(id: string) {
  return prisma.product.findUnique({ where: { id }, include: productInclude })
}

export function findProductBySlug(slug: string) {
  return prisma.product.findUnique({ where: { slug }, include: productInclude })
}

export function createProduct(data: Prisma.ProductCreateInput) {
  return prisma.product.create({ data, include: productInclude })
}

export function updateProduct(id: string, data: Prisma.ProductUpdateInput) {
  return prisma.product.update({ where: { id }, data, include: productInclude })
}
