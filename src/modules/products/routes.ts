import Router from '@koa/router'
import { getProductController, listProductsController } from './controller.js'

export const productRouter = new Router({ prefix: '/products' })
productRouter.get('/', listProductsController)
productRouter.get('/:id', getProductController)
