import type { ProductStatus } from '@prisma/client'
import { requirePermission } from '../../auth/guard.js'
import type { AppContext } from '../../types/context.js'
import * as service from './service.js'

export const productResolvers = {
  Query: {
    products: (_: unknown, args: { filter?: { search?: string; status?: ProductStatus; brandId?: string; categoryId?: string; take?: number; skip?: number } }) => service.listProducts(args.filter ?? {}),
    product: (_: unknown, args: { id?: string; slug?: string }) => service.getProduct(args)
  },
  Mutation: {
    createProduct: (_: unknown, args: { input: unknown }, ctx: AppContext) => {
      requirePermission(ctx.user, 'products.create')
      return service.createProduct(args.input)
    },
    updateProduct: (_: unknown, args: { id: string; input: unknown }, ctx: AppContext) => {
      requirePermission(ctx.user, 'products.update')
      return service.updateProduct(args.id, args.input)
    }
  },
  ProductImage: {
    url: (image: { fileUpload?: { publicUrl?: string | null } }) => image.fileUpload?.publicUrl ?? null
  },
  ProductVariant: {
    price: (variant: { price: { toString(): string } }) => variant.price.toString(),
    salePrice: (variant: { salePrice?: { toString(): string } | null }) => variant.salePrice?.toString() ?? null
  },
  Product: {
    createdAt: (product: { createdAt: Date }) => product.createdAt.toISOString(),
    updatedAt: (product: { updatedAt: Date }) => product.updatedAt.toISOString()
  }
}
