import type { Context } from 'koa'
import * as service from './service.js'

export async function listProductsController(ctx: Context) {
  const products = await service.listProducts({
    search: typeof ctx.query.search === 'string' ? ctx.query.search : undefined,
    brandId: typeof ctx.query.brandId === 'string' ? ctx.query.brandId : undefined,
    categoryId: typeof ctx.query.categoryId === 'string' ? ctx.query.categoryId : undefined
  })
  ctx.body = { success: true, products }
}

export async function getProductController(ctx: Context) {
  const product = await service.getProduct({ id: ctx.params.id })
  ctx.body = { success: true, product }
}
