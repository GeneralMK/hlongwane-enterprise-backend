import { ProductStatus } from '@prisma/client'
import { z } from 'zod'
import * as repo from './repository.js'

const productInput = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  shortDescription: z.string().optional(),
  description: z.string().optional(),
  brandId: z.string().uuid(),
  categoryId: z.string().uuid(),
  warrantyMonths: z.number().int().nonnegative().optional(),
  isFeatured: z.boolean().optional()
})

export function listProducts(input: { search?: string; status?: ProductStatus; brandId?: string; categoryId?: string; take?: number; skip?: number }) {
  return repo.listProducts(input)
}

export async function getProduct(idOrSlug: { id?: string; slug?: string }) {
  const product = idOrSlug.id ? await repo.findProductById(idOrSlug.id) : idOrSlug.slug ? await repo.findProductBySlug(idOrSlug.slug) : null
  if (!product) throw new Error('Product not found')
  return product
}

export async function createProduct(input: unknown) {
  const data = productInput.parse(input)
  return repo.createProduct({
    name: data.name,
    slug: data.slug,
    shortDescription: data.shortDescription,
    description: data.description,
    status: ProductStatus.DRAFT,
    warrantyMonths: data.warrantyMonths,
    isFeatured: data.isFeatured ?? false,
    brand: { connect: { id: data.brandId } },
    category: { connect: { id: data.categoryId } }
  })
}

export async function updateProduct(id: string, input: unknown) {
  const data = productInput.partial().parse(input)
  return repo.updateProduct(id, {
    name: data.name,
    slug: data.slug,
    shortDescription: data.shortDescription,
    description: data.description,
    warrantyMonths: data.warrantyMonths,
    isFeatured: data.isFeatured,
    ...(data.brandId ? { brand: { connect: { id: data.brandId } } } : {}),
    ...(data.categoryId ? { category: { connect: { id: data.categoryId } } } : {})
  })
}
