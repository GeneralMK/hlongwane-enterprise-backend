import Router from '@koa/router'
import { getOrderController, transitionOrderController } from './controller.js'

export const orderRouter = new Router({ prefix: '/orders' })
orderRouter.get('/:id', getOrderController)
orderRouter.patch('/:id/status', transitionOrderController)
